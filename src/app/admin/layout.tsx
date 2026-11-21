import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminDataProvider } from "@/components/admin/AdminDataProvider";
import { getAdminSessionCookieName, verifyAdminSession } from "@/lib/admin-auth";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Haatly Admin" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const authenticated = await verifyAdminSession(cookieStore.get(getAdminSessionCookieName())?.value);
  if (!authenticated) redirect("/admin/login");

  return (
    <div className="min-h-screen bg-paper lg:flex">
      <AdminSidebar />
      <AdminDataProvider>
        <div className="min-w-0 flex-1">{children}</div>
      </AdminDataProvider>
    </div>
  );
}
