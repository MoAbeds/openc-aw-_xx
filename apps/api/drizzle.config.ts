import { defineConfig } from "drizzle-kit";
import "dotenv/config";

const databaseUrl = process.env.DATABASE_URL;
const isPostgres = databaseUrl?.startsWith("postgres");

export default defineConfig({
    schema: "./src/db/schema.ts",
    out: "./drizzle",
    dialect: isPostgres ? "postgresql" : "sqlite",
    dbCredentials: isPostgres
        ? { url: databaseUrl! }
        : { url: databaseUrl ?? "./dev.db" },
    verbose: true,
    strict: true,
});
