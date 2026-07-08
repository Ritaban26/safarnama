// Additive-only migration: adds a nullable storage_key column to media so
// uploads can record the raw storage object key (needed for signed URLs
// ahead of the private-bucket flip). Never rename/drop — this DB is shared
// with the travel-archives Express app.
import { Pool } from "pg";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query("ALTER TABLE media ADD COLUMN IF NOT EXISTS storage_key text;");
    console.log("OK: media.storage_key ensured");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
