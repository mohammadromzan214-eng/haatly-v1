"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Pencil, Search, UserRound, UserRoundX } from "lucide-react";
import { formatPrice } from "@/lib/site";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  active: boolean;
  createdAt: string;
  orderCount: number;
  lastOrderAt: string | null;
  orderValue: number;
}

interface CustomerOrder {
  code: string;
  placedAt: string;
  status: string;
  paymentStatus: string;
  total: number;
}

interface CustomerDetails {
  customer: Pick<Customer, "id" | "name" | "email" | "phone" | "active" | "createdAt">;
  orders: CustomerOrder[];
}

interface CustomerForm {
  name: string;
  email: string;
  phone: string;
}

function formatDate(value: string | null) {
  if (!value) return "No orders yet";
  return new Date(value).toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric" });
}

function messageFrom(result: { error?: string }, fallback: string) {
  return typeof result.error === "string" ? result.error : fallback;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState("");
  const [searchText, setSearchText] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [details, setDetails] = useState<CustomerDetails | null>(null);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState<CustomerForm>({ name: "", email: "", phone: "" });
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadCustomers = useCallback(async (search: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      const response = await fetch(`/api/admin/customers?${params}`, { cache: "no-store" });
      const result = await response.json() as { customers?: Customer[]; error?: string };
      if (!response.ok) throw new Error(messageFrom(result, "Could not load customers."));
      setCustomers(result.customers ?? []);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load customers.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCustomers("");
  }, [loadCustomers]);

  async function toggleDetails(customer: Customer) {
    if (selectedId === customer.id) {
      setSelectedId("");
      setDetails(null);
      setEditingId("");
      return;
    }
    setSelectedId(customer.id);
    setDetails(null);
    setEditingId("");
    setDetailsLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/customers?id=${encodeURIComponent(customer.id)}`, { cache: "no-store" });
      const result = await response.json() as CustomerDetails & { error?: string };
      if (!response.ok || !result.customer) throw new Error(messageFrom(result, "Could not load customer details."));
      setDetails(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load customer details.");
    } finally {
      setDetailsLoading(false);
    }
  }

  function startEditing(customer: Customer) {
    setEditingId(customer.id);
    setForm({ name: customer.name, email: customer.email, phone: customer.phone });
    setError("");
    setMessage("");
  }

  async function saveCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const customer = customers.find((item) => item.id === editingId);
    if (!customer) return;
    setSavingId(customer.id);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/customers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: customer.id, ...form, active: customer.active }),
      });
      const result = await response.json() as { customer?: CustomerDetails["customer"]; error?: string };
      if (!response.ok || !result.customer) throw new Error(messageFrom(result, "Could not save customer details."));
      setMessage("Customer profile updated.");
      setEditingId("");
      await loadCustomers(query);
      setDetails((current) => current?.customer.id === customer.id && result.customer
        ? { ...current, customer: result.customer }
        : current);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save customer details.");
    } finally {
      setSavingId("");
    }
  }

  async function setCustomerActive(customer: Customer) {
    const active = !customer.active;
    if (!active && !window.confirm(`Disable ${customer.name}'s account? Existing customer sessions will stop working immediately.`)) return;
    setSavingId(customer.id);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/customers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          active,
        }),
      });
      const result = await response.json() as { customer?: CustomerDetails["customer"]; error?: string };
      if (!response.ok || !result.customer) throw new Error(messageFrom(result, "Could not update account status."));
      setCustomers((current) => current.map((item) => item.id === customer.id
        ? { ...item, ...result.customer }
        : item));
      setDetails((current) => current?.customer.id === customer.id && result.customer
        ? { ...current, customer: result.customer }
        : current);
      setMessage(`${customer.name}'s account is ${active ? "enabled" : "disabled"}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update account status.");
    } finally {
      setSavingId("");
    }
  }

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery(searchText.trim());
    void loadCustomers(searchText.trim());
  }

  return (
    <main className="pb-16">
      <header className="border-b border-line px-5 py-8 md:px-10">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-clay">Sales · Accounts</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">Customers</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">Search customer records, review order history, edit contact details, and enable or disable accounts.</p>
      </header>

      <section className="px-5 py-6 md:px-10">
        <form onSubmit={search} className="flex flex-col gap-3 sm:flex-row">
          <label className="relative flex-1">
            <span className="sr-only">Search customers</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input value={searchText} onChange={(event) => setSearchText(event.target.value)} maxLength={120} placeholder="Search name, email, or phone" className="w-full rounded-full border border-line bg-paper py-3 pl-11 pr-4 text-sm outline-none focus:border-forest" />
          </label>
          <button type="submit" className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-paper">Search</button>
        </form>

        {error && <p role="alert" className="mt-4 rounded-xl bg-clay/10 px-4 py-3 text-sm text-clay">{error}</p>}
        {message && <p role="status" className="mt-4 rounded-xl bg-forest/10 px-4 py-3 text-sm text-forest">{message}</p>}

        <div className="mt-5 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">{query ? `Results for “${query}”` : "Customer directory"}</h2>
          <span className="rounded-full bg-paper-2 px-3 py-1 text-xs font-semibold">{customers.length} shown</span>
        </div>

        {loading ? (
          <div className="mt-4 animate-pulse rounded-[24px] border border-line bg-paper p-8 text-sm text-muted">Loading customers…</div>
        ) : customers.length ? (
          <div className="mt-4 space-y-3">
            {customers.map((customer) => {
              const expanded = selectedId === customer.id;
              return (
                <article key={customer.id} className="overflow-hidden rounded-[24px] border border-line bg-paper">
                  <div className="flex flex-wrap items-center justify-between gap-4 p-5">
                    <button type="button" onClick={() => void toggleDetails(customer)} aria-expanded={expanded} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <div className={`grid size-11 shrink-0 place-items-center rounded-2xl ${customer.active ? "bg-forest/10 text-forest" : "bg-paper-2 text-muted"}`}><UserRound className="size-5" /></div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate font-display text-lg font-bold">{customer.name}</span>
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${customer.active ? "bg-forest/10 text-forest" : "bg-paper-2 text-muted"}`}>{customer.active ? "Active" : "Disabled"}</span>
                        </div>
                        <p className="truncate text-sm text-muted">{customer.email}{customer.phone ? ` · ${customer.phone}` : ""}</p>
                      </div>
                      {expanded ? <ChevronUp className="ml-auto size-4 shrink-0 text-muted" /> : <ChevronDown className="ml-auto size-4 shrink-0 text-muted" />}
                    </button>
                    <div className="flex items-center gap-4">
                      <div className="hidden text-right sm:block">
                        <p className="text-sm font-bold">{customer.orderCount} order{customer.orderCount === 1 ? "" : "s"}</p>
                        <p className="mt-1 text-xs text-muted">Order value {formatPrice(customer.orderValue)}</p>
                      </div>
                      <button type="button" onClick={() => startEditing(customer)} className="grid size-10 place-items-center rounded-full border border-line hover:bg-paper-2" aria-label={`Edit ${customer.name}`}><Pencil className="size-4" /></button>
                      <button type="button" onClick={() => void setCustomerActive(customer)} disabled={savingId === customer.id} className={`grid size-10 place-items-center rounded-full border disabled:opacity-50 ${customer.active ? "border-clay/30 text-clay hover:bg-clay/10" : "border-forest/30 text-forest hover:bg-forest/10"}`} aria-label={`${customer.active ? "Disable" : "Enable"} ${customer.name}`}>
                        <UserRoundX className="size-4" />
                      </button>
                    </div>
                  </div>

                  {editingId === customer.id && (
                    <form onSubmit={saveCustomer} className="grid gap-3 border-t border-line bg-paper-2/40 p-5 sm:grid-cols-2">
                      <label className="text-xs font-semibold">Name<input required minLength={2} maxLength={120} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm font-normal" /></label>
                      <label className="text-xs font-semibold">Email<input required type="email" maxLength={254} value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm font-normal" /></label>
                      <label className="text-xs font-semibold sm:col-span-2">Phone<input type="tel" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} placeholder="Optional" className="mt-1.5 w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm font-normal" /></label>
                      <div className="flex gap-2 sm:col-span-2">
                        <button type="submit" disabled={savingId === customer.id} className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper disabled:opacity-50">{savingId === customer.id ? "Saving…" : "Save profile"}</button>
                        <button type="button" onClick={() => setEditingId("")} className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold">Cancel</button>
                      </div>
                    </form>
                  )}

                  {expanded && (
                    <div className="border-t border-line bg-paper-2/30 px-5 py-5">
                      {detailsLoading && <p className="text-sm text-muted">Loading order history…</p>}
                      {!detailsLoading && details && (
                        <>
                          <div className="grid gap-3 text-sm sm:grid-cols-3">
                            <p><span className="text-muted">Joined</span><br /><strong>{formatDate(details.customer.createdAt)}</strong></p>
                            <p><span className="text-muted">Last order</span><br /><strong>{formatDate(customer.lastOrderAt)}</strong></p>
                            <p><span className="text-muted">Non-cancelled order value</span><br /><strong>{formatPrice(customer.orderValue)}</strong></p>
                          </div>
                          <h3 className="mt-5 font-display font-bold">Order history</h3>
                          {details.orders.length ? (
                            <div className="mt-2 divide-y divide-line rounded-xl border border-line bg-paper">
                              {details.orders.map((order) => (
                                <div key={order.code} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                                  <div><p className="font-mono text-xs font-bold">{order.code}</p><p className="mt-1 text-xs text-muted">{formatDate(order.placedAt)} · {order.status.replaceAll("_", " ")}</p></div>
                                  <div className="text-right"><p className="font-bold">{formatPrice(order.total)}</p><p className="mt-1 text-xs capitalize text-muted">{order.paymentStatus}</p></div>
                                </div>
                              ))}
                            </div>
                          ) : <p className="mt-2 text-sm text-muted">No orders are linked to this customer account.</p>}
                        </>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : <div className="mt-4 rounded-[24px] border border-line bg-paper p-8 text-sm text-muted">{query ? "No customers match that search." : "No customer accounts have registered yet."}</div>}
      </section>
    </main>
  );
}
