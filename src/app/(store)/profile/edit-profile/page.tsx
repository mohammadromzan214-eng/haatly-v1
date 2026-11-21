"use client";

import { useEffect, useState } from "react";
import { Camera, CircleUserRound, Save } from "lucide-react";
import { useCustomerAuth } from "@/components/CustomerAuthProvider";

export default function EditProfilePage() {
  const { customer, updateProfile, error: persistenceError } = useCustomerAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!customer) return;
    setName(customer.name);
    setPhone(customer.phone);
    setEmail(customer.email);
  }, [customer]);

  if (!customer) return null;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (name.trim().length < 2) {
      setError("Enter your full name.");
      return;
    }
    if (!/^(?:\+?880|0)1[3-9]\d{8}$/.test(phone.replace(/[\s-]/g, ""))) {
      setError("Enter a valid Bangladesh mobile number.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    const updated = await updateProfile({ name: name.trim(), phone: phone.trim(), email: email.trim().toLowerCase() });
    if (!updated) {
      setError("Could not save your profile. Please retry.");
      return;
    }
    setError("");
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-clay">Account</p>
      <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">Edit profile</h1>
      <form onSubmit={submit} className="mt-8 max-w-2xl rounded-[28px] border border-line bg-paper p-6 md:p-8">
        <div className="flex flex-col items-center border-b border-line pb-6 sm:flex-row sm:gap-5">
          <div className="relative grid size-24 place-items-center rounded-full bg-paper-2 text-clay">
            <CircleUserRound className="size-16" strokeWidth={1.3} />
            <span className="absolute bottom-0 right-0 grid size-8 place-items-center rounded-full bg-ink text-paper"><Camera className="size-4" /></span>
          </div>
          <div className="mt-3 text-center sm:mt-0 sm:text-left"><p className="font-display text-xl font-bold">Profile photo</p><p className="mt-1 text-sm text-muted">Image upload will be available when storage is connected.</p></div>
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-semibold">Full name<input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className="mt-2 w-full rounded-xl border border-line bg-paper px-4 py-3 font-normal outline-none focus:border-ink" /></label>
          <label className="text-sm font-semibold">Phone number<input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" className="mt-2 w-full rounded-xl border border-line bg-paper px-4 py-3 font-normal outline-none focus:border-ink" /></label>
          <label className="text-sm font-semibold sm:col-span-2">Email address<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className="mt-2 w-full rounded-xl border border-line bg-paper px-4 py-3 font-normal outline-none focus:border-ink" /></label>
        </div>
        {error && <p role="alert" className="mt-4 text-sm font-medium text-clay">{error}</p>}
        {persistenceError && <p role="alert" className="mt-2 text-sm font-medium text-clay">{persistenceError}</p>}
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-paper hover:bg-clay"><Save className="size-4" />Save profile</button>
          {saved && <p role="status" className="text-sm font-semibold text-forest">Profile saved in this browser.</p>}
        </div>
      </form>
    </div>
  );
}
