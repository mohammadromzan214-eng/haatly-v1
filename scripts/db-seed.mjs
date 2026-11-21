import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import postgres from "postgres";

if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL before running seeds.");
const sql = postgres(process.env.DATABASE_URL, { prepare: false, ssl: process.env.NODE_ENV === "production" ? "require" : undefined });
try {
  const directory = join(process.cwd(), "db", "seeds");
  const files = (await readdir(directory)).filter((file) => file.endsWith(".sql")).sort();
  for (const file of files) {
    const statements = (await readFile(join(directory, file), "utf8")).split(";").map((statement) => statement.trim()).filter(Boolean);
    await sql.begin(async (transaction) => {
      for (const statement of statements) await transaction.unsafe(statement);
    });
    console.log(`Applied seed ${file}`);
  }
} finally {
  await sql.end();
}
