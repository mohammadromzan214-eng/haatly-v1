import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import nextEnv from "@next/env";
import postgres from "postgres";

nextEnv.loadEnvConfig(process.cwd());

if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL before running migrations.");
const sql = postgres(process.env.DATABASE_URL, { prepare: false, ssl: process.env.NODE_ENV === "production" ? "require" : undefined });
try {
  await sql`CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
  const directory = join(process.cwd(), "db", "migrations");
  const files = (await readdir(directory)).filter((file) => file.endsWith(".sql")).sort();
  for (const file of files) {
    const [existing] = await sql`SELECT name FROM schema_migrations WHERE name=${file}`;
    if (existing) continue;
    const statements = (await readFile(join(directory, file), "utf8")).split(";").map((statement) => statement.trim()).filter(Boolean);
    await sql.begin(async (transaction) => {
      for (const statement of statements) await transaction.unsafe(statement);
      await transaction`INSERT INTO schema_migrations (name) VALUES (${file})`;
    });
    console.log(`Applied migration ${file}`);
  }
} finally {
  await sql.end();
}
