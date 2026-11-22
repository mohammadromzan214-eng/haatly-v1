import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminDataProvider } from "@/components/admin/AdminDataProvider";
import { getAdminSessionCookieName } from "@/lib/admin-auth";
import { getAuthenticatedAdminSession } from "@/lib/admin-access";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Haatly Admin" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const session = await getAuthenticatedAdminSession(cookieStore.get(getAdminSessionCookieName())?.value);
  if (!session) redirect("/admin/login");

  return (
    <div className="min-h-screen bg-paper lg:flex">
      <AdminSidebar role={session.role} />
      {session.role === "super_admin" ? (
        <AdminDataProvider><div className="min-w-0 flex-1">{children}</div></AdminDataProvider>
      ) : (
        <div className="min-w-0 flex-1">{children}</div>
      )}
    </div>
  );
}
