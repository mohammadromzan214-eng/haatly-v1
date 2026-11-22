import "server-only";
import { adminCredentialsMatch, verifyAdminSession } from "./admin-auth";
import type { AdminLoginIdentity, AdminSession } from "./admin-types";
import {
  authenticateOrderAdmin,
  getActiveOrderAdminSessionVersion,
} from "./db/admin-account-repository";

export async function authenticateAdminCredentials(email: string, password: string): Promise<AdminLoginIdentity | null> {
  const normalizedEmail = email.trim().toLowerCase();
  if (adminCredentialsMatch(normalizedEmail, password)) {
    return { role: "super_admin", sub: normalizedEmail };
  }
  return authenticateOrderAdmin(normalizedEmail, password);
}

export async function getAuthenticatedAdminSession(token: string | undefined): Promise<AdminSession | null> {
  const session = await verifyAdminSession(token);
  if (!session || session.role === "super_admin") return session;

  const currentVersion = await getActiveOrderAdminSessionVersion(session.sub);
  return currentVersion === session.accountVersion ? session : null;
}
