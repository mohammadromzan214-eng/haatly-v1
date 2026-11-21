import postgres from "postgres";

const globalForPostgres = globalThis as typeof globalThis & { haatlySql?: ReturnType<typeof postgres> };

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL must be configured before using database-backed features.");
  if (!globalForPostgres.haatlySql) {
    globalForPostgres.haatlySql = postgres(url, {
      max: 5,
      prepare: false,
      ssl: process.env.NODE_ENV === "production" ? "require" : undefined,
    });
  }
  return globalForPostgres.haatlySql;
}
