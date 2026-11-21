import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getCustomerSessionCookieName, verifyCustomerSession } from "@/lib/customer-auth";
import { deleteCustomerAddress, getCustomerAddresses, saveCustomerAddress } from "@/lib/db/customer-repository";
import type { CustomerAddress } from "@/components/CustomerAuthProvider";

async function customerId(request: NextRequest) {
  const session = await verifyCustomerSession(request.cookies.get(getCustomerSessionCookieName())?.value);
  return session?.id ?? null;
}

function validAddress(value: Partial<CustomerAddress>) {
  return typeof value.label === "string" && value.label.trim().length > 0
    && typeof value.name === "string" && value.name.trim().length > 0
    && typeof value.phone === "string" && /^(?:\+?880|0)1[3-9]\d{8}$/.test(value.phone.replace(/[\s-]/g, ""))
    && typeof value.area === "string" && value.area.trim().length > 0
    && typeof value.city === "string" && value.city.trim().length > 0
    && typeof value.details === "string" && value.details.trim().length > 0;
}

export async function GET(request: NextRequest) {
  const id = await customerId(request);
  if (!id) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    return NextResponse.json({ addresses: await getCustomerAddresses(id) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Could not load customer addresses.", error);
    return NextResponse.json({ error: "Could not load addresses." }, { status: 500 });
  }
}

async function writeAddress(request: NextRequest, editing: boolean) {
  const userId = await customerId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  let body: Partial<CustomerAddress>;
  try {
    body = JSON.parse(await request.text()) as Partial<CustomerAddress>;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!validAddress(body)) return NextResponse.json({ error: "Complete all address fields with a valid phone number." }, { status: 400 });
  const id = editing ? body.id : randomUUID();
  if (!id) return NextResponse.json({ error: "Address id is required." }, { status: 400 });

  try {
    if (editing && !(await getCustomerAddresses(userId)).some((address) => address.id === id)) {
      return NextResponse.json({ error: "Address was not found." }, { status: 404 });
    }
    const address: CustomerAddress = {
      id,
      label: body.label!.trim(),
      name: body.name!.trim(),
      phone: body.phone!.trim(),
      area: body.area!.trim(),
      city: body.city!.trim(),
      details: body.details!.trim(),
      default: Boolean(body.default),
    };
    return NextResponse.json({ addresses: await saveCustomerAddress(userId, address) });
  } catch (error) {
    console.error("Could not save customer address.", error);
    return NextResponse.json({ error: "Could not save address." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return writeAddress(request, false);
}

export async function PUT(request: NextRequest) {
  return writeAddress(request, true);
}

export async function DELETE(request: NextRequest) {
  const id = await customerId(request);
  if (!id) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const addressId = request.nextUrl.searchParams.get("id");
  if (!addressId) return NextResponse.json({ error: "Address id is required." }, { status: 400 });
  try {
    return NextResponse.json({ addresses: await deleteCustomerAddress(id, addressId) });
  } catch (error) {
    console.error("Could not delete customer address.", error);
    return NextResponse.json({ error: "Could not delete address." }, { status: 500 });
  }
}
