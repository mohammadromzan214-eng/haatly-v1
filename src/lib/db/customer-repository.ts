import { randomBytes } from "node:crypto";
import { getDb } from "./client";
import { hashPassword, verifyPassword } from "../password";
import type { CustomerAddress, CustomerSession } from "@/components/CustomerAuthProvider";

export interface DatabaseUser extends CustomerSession {
  role: "customer" | "admin" | "seller";
  passwordHash: string | null;
  active: boolean;
  sessionVersion: number;
}

export async function registerOrLoginGoogleCustomer(input: { subject: string; name: string; email: string }) {
  const normalizedEmail = input.email.trim().toLowerCase();
  return getDb().begin(async (tx) => {
    const [googleUser] = await tx`
      SELECT id,name,email,phone,role,password_hash,is_active,session_version FROM users
      WHERE google_sub=${input.subject} AND role='customer'
      FOR UPDATE
    `;
    if (googleUser) {
      if (!googleUser.is_active) throw new Error("This TOQAEE account is disabled.");
      return userFromRow(googleUser);
    }

    const [emailUser] = await tx`
      SELECT id,name,email,phone,role,password_hash,google_sub,is_active,session_version FROM users
      WHERE lower(email)=${normalizedEmail}
      FOR UPDATE
    `;
    if (emailUser) {
      if (emailUser.role !== "customer" || (emailUser.google_sub && emailUser.google_sub !== input.subject)) {
        throw new Error("This Google account cannot be linked to the existing TOQAEE account.");
      }
      if (!emailUser.is_active) throw new Error("This TOQAEE account is disabled.");
      const [linkedUser] = await tx`
        UPDATE users
        SET google_sub=${input.subject},auth_provider='google',name=${input.name.trim() || emailUser.name},updated_at=now()
        WHERE id=${emailUser.id}
        RETURNING id,name,email,phone,role,password_hash,is_active,session_version
      `;
      return userFromRow(linkedUser);
    }

    const [createdUser] = await tx`
      INSERT INTO users (id,name,email,phone,password_hash,role,google_sub,auth_provider)
      VALUES (${`cus_${randomBytes(12).toString("hex")}`},${input.name.trim() || normalizedEmail.split("@")[0]},
        ${normalizedEmail},'',NULL,'customer',${input.subject},'google')
      RETURNING id,name,email,phone,role,password_hash,is_active,session_version
    `;
    return userFromRow(createdUser);
  });
}

export function hashCustomerPassword(password: string) {
  return hashPassword(password);
}

function userFromRow(row: Record<string, unknown>) : DatabaseUser {
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    phone: row.phone as string,
    role: row.role as DatabaseUser["role"],
    passwordHash: row.password_hash as string | null,
    active: row.is_active !== false,
    sessionVersion: Number(row.session_version ?? 0),
  };
}

export async function getUserById(id: string) {
  const [row] = await getDb()`SELECT id,name,email,phone,role,password_hash,is_active,session_version FROM users WHERE id=${id}`;
  return row ? userFromRow(row) : null;
}

export async function authenticateCustomer(email: string, password: string) {
  const [row] = await getDb()`SELECT id,name,email,phone,role,password_hash,is_active,session_version FROM users WHERE email=${email.trim().toLowerCase()} AND role='customer' AND is_active AND password_hash IS NOT NULL`;
  if (!row) return null;
  const user = userFromRow(row);
  return verifyPassword(password, user.passwordHash) ? user : null;
}

export async function getCustomerSessionState(id: string) {
  const [row] = await getDb()`
    SELECT id,name,email,phone,role,is_active,session_version
    FROM users WHERE id=${id} AND role='customer'
  `;
  if (!row) return null;
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    phone: row.phone as string,
    role: row.role as DatabaseUser["role"],
    active: row.is_active as boolean,
    sessionVersion: Number(row.session_version),
  };
}

export async function registerCustomer(input: { name: string; email: string; phone: string; password: string }) {
  const id = `cus_${randomBytes(12).toString("hex")}`;
  const passwordHash = hashPassword(input.password);
  const [row] = await getDb()`
    INSERT INTO users (id,name,email,phone,password_hash,role)
    VALUES (${id},${input.name.trim()},${input.email.trim().toLowerCase()},${input.phone.trim()},${passwordHash},'customer')
    ON CONFLICT (email) DO NOTHING
    RETURNING id,name,email,phone,role,password_hash,is_active,session_version
  `;
  return row ? userFromRow(row) : null;
}

export async function updateCustomerProfile(id: string, input: { name: string; email: string; phone: string }) {
  const [row] = await getDb()`
    UPDATE users SET name=${input.name.trim()},email=${input.email.trim().toLowerCase()},phone=${input.phone.trim()},updated_at=now()
    WHERE id=${id} AND role='customer' AND is_active
    RETURNING id,name,email,phone,role,password_hash,is_active,session_version
  `;
  return row ? userFromRow(row) : null;
}

export async function getCustomerAddresses(userId: string): Promise<CustomerAddress[]> {
  const rows = await getDb()`SELECT id,label,recipient_name AS name,phone,area,city,details,is_default AS "default" FROM addresses WHERE user_id=${userId} ORDER BY is_default DESC, created_at`;
  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    name: row.name,
    phone: row.phone,
    area: row.area,
    city: row.city,
    details: row.details,
    default: row.default,
  }));
}

export async function saveCustomerAddress(userId: string, address: CustomerAddress) {
  await getDb().begin(async (tx) => {
    if (address.default) await tx`UPDATE addresses SET is_default=false WHERE user_id=${userId}`;
    await tx`
      INSERT INTO addresses (id,user_id,label,recipient_name,phone,area,city,details,is_default)
      VALUES (${address.id},${userId},${address.label},${address.name},${address.phone},${address.area},${address.city},${address.details},${address.default})
      ON CONFLICT (id) DO UPDATE SET label=EXCLUDED.label,recipient_name=EXCLUDED.recipient_name,phone=EXCLUDED.phone,area=EXCLUDED.area,city=EXCLUDED.city,details=EXCLUDED.details,is_default=EXCLUDED.is_default,updated_at=now()
    `;
  });
  return getCustomerAddresses(userId);
}

export async function deleteCustomerAddress(userId: string, id: string) {
  await getDb()`DELETE FROM addresses WHERE id=${id} AND user_id=${userId}`;
  return getCustomerAddresses(userId);
}

export async function getCustomerWishlist(userId: string) {
  const rows = await getDb()`SELECT product_id FROM wishlist_items WHERE user_id=${userId} ORDER BY added_at DESC`;
  return rows.map((row) => row.product_id as string);
}

export async function setCustomerWishlistItem(userId: string, productId: string, saved: boolean) {
  if (saved) {
    await getDb()`INSERT INTO wishlist_items (user_id,product_id) SELECT ${userId},id FROM products WHERE id=${productId} ON CONFLICT (user_id,product_id) DO NOTHING`;
  } else {
    await getDb()`DELETE FROM wishlist_items WHERE user_id=${userId} AND product_id=${productId}`;
  }
  return getCustomerWishlist(userId);
}

export function toSession(user: DatabaseUser): CustomerSession {
  return { id: user.id, name: user.name, email: user.email, phone: user.phone };
}
