import postgres from "postgres";

const globalForPostgres = globalThis as typeof globalThis & {
  haatlySql?: ReturnType<typeof postgres>;
};

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL must be configured before using database-backed features.");
  }

  if (!globalForPostgres.haatlySql) {
    globalForPostgres.haatlySql = postgres(url, {
      max: 10, // ৫ থেকে বাড়িয়ে ১০ করা হলো
      idle_timeout: 20, // ২০ সেকেন্ড অলস থাকলে কানেকশন অটো বন্ধ হবে
      connect_timeout: 10, // ১০ সেকেন্ডের মধ্যে কানেক্ট না হলে আটকে থাকবে না
      max_lifetime: 60 * 30, // ৩০ মিনিট পর কানেকশন রিফ্রেশ হবে
      prepare: false, // Supabase Transaction Pooler-এর জন্য বাধ্যতামূলক
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
    });
  }

  return globalForPostgres.haatlySql;
}