import { Pool } from "pg";

declare global {
  var __pgPool: Pool | undefined;
}

// Reuse the pool across dev HMR reloads to avoid exhausting connections.
const pool =
  globalThis.__pgPool ??
  new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });

if (process.env.NODE_ENV !== "production") globalThis.__pgPool = pool;

export default pool;
