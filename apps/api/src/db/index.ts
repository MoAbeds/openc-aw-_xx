/**
 * Database connection — dual-mode: SQLite (dev) or Postgres (prod)
 *
 * Rules:
 *  - If DATABASE_URL starts with "postgres" → use postgres driver
 *  - Otherwise → use better-sqlite3 (default: ./dev.db)
 */

import "dotenv/config";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import Database from "better-sqlite3";
import postgres from "postgres";
import { schema } from "./schema.js";

const databaseUrl = process.env.DATABASE_URL;

function createDb() {
    if (databaseUrl?.startsWith("postgres")) {
        // ── Postgres (production / staging) ───────────────────────────────────
        const client = postgres(databaseUrl, { max: 10 });
        return drizzlePg(client, { schema });
    }

    // ── SQLite (local development) ─────────────────────────────────────────
    const dbPath = databaseUrl ?? "./dev.db";
    const sqlite = new Database(dbPath);
    // Enable WAL mode for better concurrent read performance
    sqlite.pragma("journal_mode = WAL");
    return drizzleSqlite(sqlite, { schema });
}

export const db = createDb();

export type Database = typeof db;

// Re-export schema for convenient imports elsewhere
export * from "./schema.js";
