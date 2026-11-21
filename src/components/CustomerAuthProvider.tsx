"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { CustomerSession } from "@/lib/customer-auth";
export type { CustomerSession } from "@/lib/customer-auth";

export interface CustomerAddress {
  id: string;
  label: string;
  name: string;
  phone: string;
  area: string;
  city: string;
  details: string;
  default: boolean;
}

interface CustomerAuthContextValue {
  customer: CustomerSession | null;
  addresses: CustomerAddress[];
  ready: boolean;
  error: string;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (input: { name: string; email: string; phone: string; password: string }) => Promise<{ ok: boolean; error?: string }>;
  forgotPassword: (email: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (input: Pick<CustomerSession, "name" | "email" | "phone">) => Promise<boolean>;
  saveAddress: (address: Omit<CustomerAddress, "id">, id?: string) => Promise<boolean>;
  deleteAddress: (id: string) => Promise<boolean>;
}

const CustomerAuthContext = createContext<CustomerAuthContextValue | null>(null);

async function parseResponse<T>(response: Response): Promise<T & { error?: string }> {
  return response.json().catch(() => ({ error: "Unexpected server response." })) as Promise<T & { error?: string }>;
}

export function CustomerAuthProvider({ children }: { children: React.ReactNode }) {
  const [customer, setCustomer] = useState<CustomerSession | null>(null);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  const refreshAddresses = useCallback(async () => {
    const response = await fetch("/api/customer/addresses", { cache: "no-store", credentials: "same-origin" });
    const result = await parseResponse<{ addresses?: CustomerAddress[] }>(response);
    if (!response.ok) throw new Error(result.error ?? "Could not load addresses.");
    setAddresses(result.addresses ?? []);
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/customer/session", { cache: "no-store", credentials: "same-origin" })
      .then(async (response) => {
        const result = await parseResponse<{ customer: CustomerSession | null }>(response);
        if (!response.ok) throw new Error(result.error ?? "Could not restore customer session.");
        if (!active) return;
        setCustomer(result.customer);
        if (result.customer) await refreshAddresses();
        setError("");
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not restore customer session.");
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => { active = false; };
  }, [refreshAddresses]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await fetch("/api/customer/login", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
        body: JSON.stringify({ email, password }),
      });
      const result = await parseResponse<{ customer?: CustomerSession }>(response);
      if (!response.ok || !result.customer) return { ok: false, error: result.error ?? "Unable to sign in." };
      setCustomer(result.customer);
      await refreshAddresses();
      setError("");
      return { ok: true };
    } catch (cause) {
      return { ok: false, error: cause instanceof Error ? cause.message : "Unable to sign in." };
    }
  }, [refreshAddresses]);

  const register = useCallback(async (input: { name: string; email: string; phone: string; password: string }) => {
    try {
      const response = await fetch("/api/customer/register", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
        body: JSON.stringify(input),
      });
      const result = await parseResponse<{ customer?: CustomerSession }>(response);
      if (!response.ok || !result.customer) return { ok: false, error: result.error ?? "Unable to create account." };
      setCustomer(result.customer);
      setAddresses([]);
      setError("");
      return { ok: true };
    } catch (cause) {
      return { ok: false, error: cause instanceof Error ? cause.message : "Unable to create account." };
    }
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    try {
      const response = await fetch("/api/customer/forgot-password", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
        body: JSON.stringify({ email }),
      });
      const result = await parseResponse<Record<string, never>>(response);
      return response.ok ? { ok: true } : { ok: false, error: result.error ?? "Unable to process request." };
    } catch (cause) {
      return { ok: false, error: cause instanceof Error ? cause.message : "Unable to process request." };
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/customer/logout", { method: "POST", credentials: "same-origin" });
    setCustomer(null);
    setAddresses([]);
  }, []);

  const updateProfile = useCallback(async (input: Pick<CustomerSession, "name" | "email" | "phone">) => {
    const response = await fetch("/api/customer/profile", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
      body: JSON.stringify(input),
    });
    const result = await parseResponse<{ customer?: CustomerSession }>(response);
    if (!response.ok || !result.customer) {
      setError(result.error ?? "Could not save your profile.");
      return false;
    }
    setCustomer(result.customer);
    setError("");
    return true;
  }, []);

  const saveAddress = useCallback(async (address: Omit<CustomerAddress, "id">, id?: string) => {
    const response = await fetch("/api/customer/addresses", {
      method: id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
      body: JSON.stringify({ ...address, id }),
    });
    const result = await parseResponse<{ addresses?: CustomerAddress[] }>(response);
    if (!response.ok || !result.addresses) {
      setError(result.error ?? "Could not save this address.");
      return false;
    }
    setAddresses(result.addresses);
    setError("");
    return true;
  }, []);

  const deleteAddress = useCallback(async (id: string) => {
    const response = await fetch(`/api/customer/addresses?id=${encodeURIComponent(id)}`, { method: "DELETE", credentials: "same-origin" });
    const result = await parseResponse<{ addresses?: CustomerAddress[] }>(response);
    if (!response.ok || !result.addresses) {
      setError(result.error ?? "Could not delete this address.");
      return false;
    }
    setAddresses(result.addresses);
    setError("");
    return true;
  }, []);

  const value = useMemo(() => ({ customer, addresses, ready, error, login, register, forgotPassword, logout, updateProfile, saveAddress, deleteAddress }), [customer, addresses, ready, error, login, register, forgotPassword, logout, updateProfile, saveAddress, deleteAddress]);
  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
}

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext);
  if (!context) throw new Error("useCustomerAuth must be used inside <CustomerAuthProvider>");
  return context;
}
