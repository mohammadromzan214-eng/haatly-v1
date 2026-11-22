export type AdminRole = "super_admin" | "order_admin";

export interface AdminSession {
  role: AdminRole;
  sub: string;
  accountVersion?: number;
  iat: number;
  exp: number;
}

export type AdminLoginIdentity =
  | { role: "super_admin"; sub: string }
  | { role: "order_admin"; sub: string; accountVersion: number };
