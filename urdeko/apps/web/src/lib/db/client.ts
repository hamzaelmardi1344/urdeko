import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/env";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __urdekoSql: postgres.Sql | undefined;
}

const globalForDb = globalThis as unknown as { __urdekoSql?: postgres.Sql };

const sql =
  globalForDb.__urdekoSql ??
  postgres(env.DATABASE_URL, {
    max: env.NODE_ENV === "production" ? 10 : 2,
    prepare: false,
  });

if (env.NODE_ENV !== "production") {
  globalForDb.__urdekoSql = sql;
}

export const db = drizzle(sql, { schema, casing: "snake_case" });
export type DB = typeof db;
