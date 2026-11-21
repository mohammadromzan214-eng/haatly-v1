import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarDays, Check, CreditCard, MapPin, Package, Truck } from "lucide-react";
import { getCustomerSessionCookieName, verifyCustomerSession } from "@/lib/customer-auth";
import { getCustomerOrderDetails } from "@/lib/db/order-repository";
import { cdn } from "@/lib/image";
import { formatPrice } from "@/lib/site";
import { ORDER_FLOW, ORDER_STATUS_LABEL, paymentMethodLabel, type OrderAddress, type OrderDetails, type OrderStatus } from "@/lib/types";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function AddressDetails({ address }: { address: OrderAddress }) {
  return (
    <address className="mt-3 not-italic leading-relaxed text-ink-soft">
      <span className="font-semibold text-ink">{address.name}</span><br />
      {address.phone}<br />
      {address.address && <>{address.address}<br /></>}
      {[address.area, address.district].filter(Boolean).join(", ")}
    </address>
  );
}

function OrderDetailView({ order }: { order: OrderDetails }) {
  const currentIndex = ORDER_FLOW.indexOf(order.status);
  const eventsByStatus = new Map<OrderStatus, (typeof order.timeline)[number]>();
  for (const event of order.timeline) eventsByStatus.set(event.status, event);

  const orderStatusClass = order.status === "delivered"
    ? "bg-forest/10 text-forest"
    : "bg-marigold/20 text-ink";
  const paymentStatusClass = order.payment.status === "paid"
    ? "bg-forest/10 text-forest"
    : order.payment.status === "failed" || order.payment.status === "refunded"
      ? "bg-clay/10 text-clay"
      : "bg-marigold/20 text-ink";

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/profile/orders" className="inline-flex items-center gap-2 text-sm font-semibold text-ink-soft hover:text-clay">
        <ArrowLeft className="size-4" /> Back to my orders
      </Link>

      <header className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-clay">Order details</p>
          <h1 className="mt-2 break-all font-display text-3xl font-bold tracking-tight md:text-4xl">{order.code}</h1>
        </div>
        <span className={`rounded-full px-4 py-2 text-sm font-semibold ${orderStatusClass}`}>
          {ORDER_STATUS_LABEL[order.status]}
        </span>
      </header>

      <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <section className="rounded-[26px] border border-line bg-paper p-5 md:p-6">
            <div className="flex flex-wrap gap-x-8 gap-y-4 text-sm">
              <p className="flex items-center gap-2 text-ink-soft"><CalendarDays className="size-4 text-clay" />Placed {formatDate(order.placedAt)}</p>
              <p className="flex items-center gap-2 text-ink-soft"><Truck className="size-4 text-clay" />{order.courier || "Haatly Delivery"}</p>
            </div>
          </section>

          <section className="rounded-[26px] border border-line bg-paper p-5 md:p-6">
            <h2 className="flex items-center gap-2 font-display text-2xl font-bold"><Package className="size-5 text-clay" />Ordered products</h2>
            <ul className="mt-5 divide-y divide-line">
              {order.lines.map((line, index) => (
                <li key={`${line.productId || line.sellerId}-${index}`} className="flex items-center gap-3 py-4 first:pt-0 last:pb-0 sm:gap-4">
                  {line.image
                    ? <img src={line.image.startsWith("data:") ? line.image : cdn(line.image, 128, 128)} alt="" className="size-16 shrink-0 rounded-xl object-cover sm:size-20" />
                    : <span className="grid size-16 shrink-0 place-items-center rounded-xl bg-paper-2 sm:size-20"><Package className="size-6 text-muted" /></span>}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{line.title}</p>
                    <p className="mt-1 text-xs text-muted">{line.sellerName ?? "Haatly"} · Qty {line.qty}</p>
                    <p className="mt-1 text-xs text-muted">{formatPrice(line.unitPrice)} each</p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold">{formatPrice(line.unitPrice * line.qty)}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-muted">Subtotal</dt><dd>{formatPrice(order.subtotal)}</dd></div>
              {order.discount > 0 && (
                <div className="flex justify-between gap-4 text-clay">
                  <dt>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</dt>
                  <dd>−{formatPrice(order.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4"><dt className="text-muted">Delivery</dt><dd>{order.deliveryFee ? formatPrice(order.deliveryFee) : "Free"}</dd></div>
              <div className="flex justify-between gap-4 border-t border-line pt-3 font-display text-lg font-bold"><dt>Total</dt><dd>{formatPrice(order.total)}</dd></div>
            </dl>
          </section>

          <section className="rounded-[26px] border border-line bg-paper p-5 md:p-6">
            <h2 className="font-display text-2xl font-bold">Tracking timeline</h2>
            <ol className="mt-6 space-y-0 border-l-2 border-line pl-7">
              {ORDER_FLOW.map((status, index) => {
                const event = eventsByStatus.get(status);
                const reached = Boolean(event) || index <= currentIndex;
                const next = index === currentIndex + 1;
                return (
                  <li key={status} className="relative pb-7 last:pb-0">
                    <span className={`absolute -left-[36px] top-0.5 grid size-5 place-items-center rounded-full ${reached ? "bg-forest" : "border-2 border-line bg-paper"}`}>
                      {reached && <Check className="size-3 text-paper" strokeWidth={3} />}
                    </span>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className={`font-semibold ${reached ? "text-ink" : "text-muted"}`}>{ORDER_STATUS_LABEL[status]}</p>
                      {event && <time className="font-mono text-xs text-muted">{formatDate(event.at)}</time>}
                    </div>
                    <p className="mt-1 text-sm text-ink-soft">
                      {event?.note || (index === currentIndex ? "Current order status" : next ? "Up next" : reached ? "Status reached" : "Awaiting update")}
                    </p>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
          <section className="rounded-[26px] border border-line bg-paper p-5 md:p-6">
            <h2 className="flex items-center gap-2 font-display text-xl font-bold"><CreditCard className="size-5 text-clay" />Payment information</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-muted">Method</dt><dd className="text-right font-medium">{paymentMethodLabel(order.paymentMethod)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Provider</dt><dd className="text-right">{paymentMethodLabel(order.payment.provider)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Status</dt><dd><span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${paymentStatusClass}`}>{order.payment.status}</span></dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Amount</dt><dd className="font-semibold">{formatPrice(order.payment.amount)} <span className="text-xs text-muted">{order.payment.currency}</span></dd></div>
              {order.payment.reference && <div className="flex justify-between gap-3"><dt className="text-muted">Reference</dt><dd className="max-w-40 break-all text-right font-mono text-xs">{order.payment.reference}</dd></div>}
              <div className="flex justify-between gap-3"><dt className="text-muted">Verification</dt><dd className="capitalize">{order.payment.verificationStatus}</dd></div>
              {order.payment.verifiedAt && <div className="flex justify-between gap-3"><dt className="text-muted">Verified</dt><dd className="text-right">{formatDate(order.payment.verifiedAt)}</dd></div>}
            </dl>
          </section>

          <section className="rounded-[26px] border border-line bg-paper p-5 md:p-6">
            <h2 className="flex items-center gap-2 font-display text-xl font-bold"><MapPin className="size-5 text-clay" />Delivery information</h2>
            <AddressDetails address={order.deliveryAddress} />
            {order.billingSameAsDelivery ? (
              <p className="mt-4 border-t border-line pt-4 text-xs text-muted">Billing address is the same as delivery.</p>
            ) : (
              <div className="mt-4 border-t border-line pt-4">
                <h3 className="text-sm font-semibold">Billing address</h3>
                <AddressDetails address={order.billingAddress} />
              </div>
            )}
            {order.notes && (
              <div className="mt-4 border-t border-line pt-4">
                <h3 className="text-sm font-semibold">Order notes</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm text-ink-soft">{order.notes}</p>
              </div>
            )}
          </section>

          {order.customerEmail && (
            <p className="break-all px-1 text-xs text-muted">Email on order: {order.customerEmail}</p>
          )}
        </aside>
      </div>
    </div>
  );
}

export default async function ProfileOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id || id.length > 128) notFound();

  const cookieStore = await cookies();
  const customer = await verifyCustomerSession(cookieStore.get(getCustomerSessionCookieName())?.value);
  if (!customer) redirect(`/login?next=${encodeURIComponent(`/profile/order/${id}`)}`);

  let order: OrderDetails | null;
  try {
    order = await getCustomerOrderDetails(customer.id, id);
  } catch (error) {
    console.error("Could not load customer order details.", error);
    return (
      <div role="alert" className="rounded-[26px] border border-clay/30 bg-clay/5 p-6">
        <h1 className="font-display text-2xl font-bold">Order details are temporarily unavailable</h1>
        <p className="mt-2 text-sm text-ink-soft">Please try again later or return to your order history.</p>
        <Link href="/profile/orders" className="mt-5 inline-flex rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper">
          Back to my orders
        </Link>
      </div>
    );
  }
  if (!order) notFound();

  return <OrderDetailView order={order} />;
}
