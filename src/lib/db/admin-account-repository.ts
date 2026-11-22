import "server-only";
import { randomBytes } from "node:crypto";
import { getDb } from "./client";
import { hashPassword, verifyPassword } from "../password";

export interface OrderAdminAccount {
  id: string;
  name: string;
  email: string;
  active: boolean;
  createdAt: string;
}

export class AdminAccountNotFoundError extends Error {
  constructor() {
    super("Order admin account not found.");
    this.name = "AdminAccountNotFoundError";
  }
}

export class AdminAccountConflictError extends Error {
  constructor() {
    super("An admin account already exists with this email.");
    this.name = "AdminAccountConflictError";
  }
}

const dummyPasswordHash = hashPassword(randomBytes(32).toString("hex"));

export async function authenticateOrderAdmin(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const [row] = await getDb()`
    SELECT email,password_hash,session_version
    FROM admin_accounts
    WHERE lower(email)=${normalizedEmail} AND active=true
    LIMIT 1
  `;
  if (!row) {
    verifyPassword(password, dummyPasswordHash);
    return null;
  }
  if (!verifyPassword(password, row.password_hash)) return null;
  return {
    role: "order_admin" as const,
    sub: row.email as string,
    accountVersion: Number(row.session_version),
  };
}

export async function getActiveOrderAdminSessionVersion(email: string) {
  const [row] = await getDb()`
    SELECT session_version
    FROM admin_accounts
    WHERE lower(email)=${email.trim().toLowerCase()} AND active=true
    LIMIT 1
  `;
  return row ? Number(row.session_version) : null;
}

export async function listOrderAdminAccounts(): Promise<OrderAdminAccount[]> {
  const rows = await getDb()`
    SELECT id,name,email,active,created_at
    FROM admin_accounts
    ORDER BY created_at DESC,email
  `;
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    active: row.active,
    createdAt: new Date(row.created_at).toISOString(),
  }));
}

export async function createOrderAdminAccount(input: { name: string; email: string; password: string }) {
  try {
    const [row] = await getDb()`
      INSERT INTO admin_accounts (id,name,email,password_hash,active)
      VALUES (
        ${`adm_${randomBytes(12).toString("hex")}`},
        ${input.name.trim()},
        ${input.email.trim().toLowerCase()},
        ${hashPassword(input.password)},
        true
      )
      RETURNING id
    `;
    return row.id as string;
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      throw new AdminAccountConflictError();
    }
    throw error;
  }
}

export async function setOrderAdminAccountActive(id: string, active: boolean) {
  const [row] = await getDb()`
    UPDATE admin_accounts
    SET active=${active},session_version=session_version+1,updated_at=now()
    WHERE id=${id}
    RETURNING id
  `;
  if (!row) throw new AdminAccountNotFoundError();
}

export async function resetOrderAdminPassword(id: string, password: string) {
  const [row] = await getDb()`
    UPDATE admin_accounts
    SET password_hash=${hashPassword(password)},session_version=session_version+1,updated_at=now()
    WHERE id=${id}
    RETURNING id
  `;
  if (!row) throw new AdminAccountNotFoundError();
}
