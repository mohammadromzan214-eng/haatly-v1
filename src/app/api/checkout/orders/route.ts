import { NextRequest, NextResponse } from "next/server";
import { customerSessionUnavailableResponse, verifyActiveCustomerRequest } from "@/lib/customer-access";
import { CheckoutError, createCheckoutOrder, type CheckoutAddress } from "@/lib/db/checkout-repository";
import { initiateOrderPayment } from "@/lib/payments/service";
import type { PaymentMethod } from "@/lib/types";

function readAddress(value: unknown, label: string): CheckoutAddress | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const fields = ["name", "phone", "district", "area", "address"] as const;
  if (fields.some((field) => typeof record[field] !== "string")) return null;
  const address: CheckoutAddress = {
    name: (record.name as string).trim(),
    phone: (record.phone as string).trim(),
    district: (record.district as string).trim(),
    area: (record.area as string).trim(),
    address: (record.address as string).trim(),
  };
  if (address.name.length < 2 || address.name.length > 120) throw new CheckoutError(`Enter a valid ${label} name.`, 400);
  if (!/^(?:\+?880|0)1[3-9]\d{8}$/.test(address.phone)) throw new CheckoutError(`Enter a valid ${label} mobile number.`, 400);
  if (!address.district || address.district.length > 100) throw new CheckoutError(`Enter a valid ${label} district.`, 400);
  if (!address.area || address.area.length > 120) throw new CheckoutError(`Enter a valid ${label} area or upazila.`, 400);
  if (address.address.length < 5 || address.address.length > 500) throw new CheckoutError(`Enter a valid ${label} full address.`, 400);
  return address;
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ error: "Invalid checkout request." }, { status: 400 });
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid checkout request." }, { status: 400 });
  }

  try {
    const paymentMethod = body.paymentMethod === undefined ? "cod" : body.paymentMethod;
    if (paymentMethod !== "cod" && paymentMethod !== "bkash" && paymentMethod !== "nagad") {
      throw new CheckoutError("Choose a supported payment method.", 400);
    }
    if (body.billingSameAsDelivery !== undefined && typeof body.billingSameAsDelivery !== "boolean") {
      throw new CheckoutError("Choose whether billing uses the delivery address.", 400);
    }
    const billingSameAsDelivery = body.billingSameAsDelivery !== false;
    const deliveryAddress = readAddress(body.deliveryAddress, "delivery");
    if (!deliveryAddress) throw new CheckoutError("Delivery information is required.", 400);
    const billingAddress = billingSameAsDelivery
      ? deliveryAddress
      : readAddress(body.billingAddress, "billing");
    if (!billingAddress) throw new CheckoutError("Billing information is required.", 400);

    if (body.email !== undefined && body.email !== null && typeof body.email !== "string") {
      throw new CheckoutError("Enter a valid email address.", 400);
    }
    if (body.notes !== undefined && typeof body.notes !== "string") {
      throw new CheckoutError("Order notes must be text.", 400);
    }
    if (body.couponCode !== undefined && body.couponCode !== null && typeof body.couponCode !== "string") {
      throw new CheckoutError("Enter a valid coupon code.", 400);
    }
    const email = typeof body.email === "string" ? body.email.trim() : "";
    if (email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)) {
      throw new CheckoutError("Enter a valid email address.", 400);
    }
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";
    if (notes.length > 2000) throw new CheckoutError("Order notes must be 2,000 characters or fewer.", 400);
    const couponCode = typeof body.couponCode === "string" ? body.couponCode.trim() : "";
    if (couponCode.length > 64) throw new CheckoutError("Coupon code is too long.", 400);

    if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 50) {
      throw new CheckoutError("Your bag is empty or contains too many products.", 400);
    }
    const items = body.items.map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        throw new CheckoutError("Invalid product in your bag.", 400);
      }
      const record = item as Record<string, unknown>;
      if (typeof record.productId !== "string" || !record.productId.trim() || record.productId.length > 128) {
        throw new CheckoutError("Invalid product in your bag.", 400);
      }
      if (!Number.isInteger(record.quantity) || (record.quantity as number) < 1 || (record.quantity as number) > 10) {
        throw new CheckoutError("Product quantities must be between 1 and 10.", 400);
      }
      return { productId: record.productId.trim(), quantity: record.quantity as number };
    });

    const customerCheck = await verifyActiveCustomerRequest(request);
    if (customerCheck.status === "unavailable") return customerSessionUnavailableResponse();
    const customer = customerCheck.status === "authenticated" ? customerCheck.customer : null;
    if (paymentMethod !== "cod" && !customer) {
      throw new CheckoutError("Sign in to use bKash or Nagad. Guest checkout remains available with Cash on Delivery.", 401);
    }
    const result = await createCheckoutOrder({
      customerEmail: email || null,
      deliveryAddress,
      billingAddress,
      billingSameAsDelivery,
      notes,
      items,
      couponCode: couponCode || null,
      paymentMethod: paymentMethod as PaymentMethod,
    }, customer);

    let paymentStatus = "pending";
    let paymentReference: string | null = null;
    let paymentMessage = "Cash on Delivery selected. Payment remains pending until it is collected.";
    if (paymentMethod !== "cod") {
      try {
        const initiation = await initiateOrderPayment({
          paymentId: result.paymentId,
          orderCode: result.code,
          amount: result.total,
          currency: "BDT",
          customerName: deliveryAddress.name,
          customerPhone: deliveryAddress.phone,
          method: paymentMethod,
        });
        paymentStatus = initiation.status;
        paymentReference = initiation.transactionReference;
        paymentMessage = initiation.message;
      } catch (error) {
        console.error(`Could not initiate ${paymentMethod} payment for order ${result.code}.`, error);
        paymentStatus = "failed";
        paymentMessage = "The order was created, but the payment could not be initiated. Contact Haatly support before trying again.";
      }
    }

    return NextResponse.json({
      receiptToken: result.receiptToken,
      orderCode: result.code,
      total: result.total,
      estimatedDelivery: result.estimatedDelivery,
      paymentMethod,
      paymentStatus,
      paymentReference,
      paymentMessage,
    }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof CheckoutError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Could not place checkout order.", error);
    return NextResponse.json({ error: "We could not place the order. Please try again." }, { status: 503 });
  }
}
