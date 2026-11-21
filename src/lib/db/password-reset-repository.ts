import { getDb } from "./client";

export async function createPasswordResetToken(input: {
  email: string;
  tokenHash: string;
  expiresAt: Date;
}) {
  return getDb().begin(async (tx) => {
    await tx`
      DELETE FROM password_reset_tokens
      WHERE expires_at <= now() OR used_at < now() - interval '7 days'
    `;
    const [user] = await tx`
      SELECT id,email
      FROM users
      WHERE lower(email)=${input.email.trim().toLowerCase()} AND role='customer'
      LIMIT 1
      FOR UPDATE
    `;
    if (!user) return null;

    await tx`
      UPDATE password_reset_tokens
      SET used_at=now()
      WHERE user_id=${user.id} AND used_at IS NULL
    `;
    await tx`
      INSERT INTO password_reset_tokens (token_hash,user_id,expires_at)
      VALUES (${input.tokenHash},${user.id},${input.expiresAt})
    `;
    return { email: user.email as string };
  });
}

export async function revokePasswordResetToken(tokenHash: string) {
  await getDb()`
    UPDATE password_reset_tokens
    SET used_at=now()
    WHERE token_hash=${tokenHash} AND used_at IS NULL
  `;
}

export async function resetCustomerPassword(tokenHash: string, passwordHash: string) {
  return getDb().begin(async (tx) => {
    const [token] = await tx`
      SELECT user_id
      FROM password_reset_tokens
      WHERE token_hash=${tokenHash} AND used_at IS NULL AND expires_at > now()
      FOR UPDATE
    `;
    if (!token) return false;

    const [user] = await tx`
      UPDATE users
      SET password_hash=${passwordHash},updated_at=now()
      WHERE id=${token.user_id} AND role='customer'
      RETURNING id
    `;
    await tx`
      UPDATE password_reset_tokens
      SET used_at=now()
      WHERE user_id=${token.user_id} AND used_at IS NULL
    `;
    return Boolean(user);
  });
}
