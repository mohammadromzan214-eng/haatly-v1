import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "./AdminLoginForm";
import { getAdminSessionCookieName } from "@/lib/admin-auth";
import { getAuthenticatedAdminSession } from "@/lib/admin-access";

export default async function AdminLoginPage() {
  const cookieStore = await cookies();
  const session = await getAuthenticatedAdminSession(cookieStore.get(getAdminSessionCookieName())?.value);
  if (session) redirect(session.role === "order_admin" ? "/admin/orders" : "/admin/inventory");
  return <AdminLoginForm />;
}
