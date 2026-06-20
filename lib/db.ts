// Shared node-postgres pool (Neon). Reused by BetterAuth and the per-user My-Matches queries.
// Cached on globalThis so dev hot-reloads and warm serverless lambdas don't open a new pool each time.
import { Pool } from "pg";

const globalForPg = globalThis as unknown as { __pgPool?: Pool };

// TLS is driven by the connection string (Neon URLs carry `sslmode=require`); Neon presents a
// publicly-valid cert, so no manual ssl override is needed.
export const pool: Pool =
  globalForPg.__pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });

if (process.env.NODE_ENV !== "production") globalForPg.__pgPool = pool;
