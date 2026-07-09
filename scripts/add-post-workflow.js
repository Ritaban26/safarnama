// Additive-only migration for the post/pitch workflow: adds posts.status
// (draft/pending/published), links approval_requests to posts via a new
// nullable post_id, adds an admin-authored admin_note column, and — once a
// human has reviewed the printed introspection output below — relaxes
// approval_requests.media_id to nullable and widens the action_type check
// constraint to allow post-publishing actions. Never rename/drop anything —
// this DB is shared with the travel-archives Express app.
//
// Every statement here is safe to re-run (IF NOT EXISTS / IF EXISTS / DO
// blocks that swallow duplicate_object errors). Nothing here locks the table
// for a full scan: new CHECK constraints are added NOT VALID then validated
// in a separate statement.
//
// TWO-PHASE RUN — do not skip phase 1:
//   Phase 1 (dry run):  node --env-file=.env.local scripts/add-post-workflow.js
//     Runs steps 1-6 only. Step 6 introspects approval_requests' existing
//     constraints and media_id's nullability and prints them. Read the
//     output. If a check constraint on action_type exists under a name
//     other than "approval_requests_action_type_check", update
//     ACTION_TYPE_CONSTRAINT_NAME below to match, then re-run phase 1 to
//     confirm the script now finds it.
//   Phase 2 (apply):    node --env-file=.env.local scripts/add-post-workflow.js --apply
//     Runs steps 7-9 in addition: relaxes media_id to nullable, adds the
//     one-target check constraint, and rebuilds the action_type check
//     constraint using the *existing* allowed values (parsed from the
//     introspection output) plus three new values.
import { Pool } from "pg";

// Adjust this after reading the printed introspection output in phase 1 if
// the actual constraint name on approval_requests.action_type differs.
const ACTION_TYPE_CONSTRAINT_NAME = "approval_requests_action_type_check";

const NEW_ACTION_TYPES = ["publish story", "retract published story", "delete published story"];

const APPLY = process.argv.includes("--apply");

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    // --- Step 1: posts.status -------------------------------------------------
    await pool.query(
      "ALTER TABLE posts ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published';"
    );
    console.log("OK: posts.status ensured (default 'published')");

    // --- Step 2: explicit backfill (redundant safety net; DEFAULT already
    // covers new rows, but be explicit/idempotent for existing rows) --------
    const backfill = await pool.query(
      "UPDATE posts SET status = 'published' WHERE status IS NULL;"
    );
    console.log(`OK: backfilled ${backfill.rowCount} posts.status row(s) (should typically be 0)`);

    // --- Step 3: posts_status_check -------------------------------------------
    await pool.query(`
      DO $$
      BEGIN
        ALTER TABLE posts
          ADD CONSTRAINT posts_status_check
          CHECK (status IN ('draft', 'pending', 'published')) NOT VALID;
      EXCEPTION
        WHEN duplicate_object THEN
          RAISE NOTICE 'posts_status_check already exists, skipping ADD CONSTRAINT';
      END
      $$;
    `);
    await pool.query("ALTER TABLE posts VALIDATE CONSTRAINT posts_status_check;");
    console.log("OK: posts_status_check ensured + validated");

    // --- Step 4: approval_requests.post_id ------------------------------------
    await pool.query(
      "ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS post_id integer REFERENCES posts(id);"
    );
    console.log("OK: approval_requests.post_id ensured (nullable)");

    // --- Step 5: approval_requests.admin_note ---------------------------------
    await pool.query(
      "ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS admin_note text;"
    );
    console.log("OK: approval_requests.admin_note ensured (nullable)");

    // --- Step 6: introspect before touching media_id / action_type -----------
    const constraintRows = await pool.query(
      `SELECT conname, pg_get_constraintdef(oid) AS def
       FROM pg_constraint
       WHERE conrelid = 'approval_requests'::regclass;`
    );
    const mediaIdRows = await pool.query(
      `SELECT column_name, is_nullable
       FROM information_schema.columns
       WHERE table_name = 'approval_requests' AND column_name = 'media_id';`
    );

    console.log("\n--- approval_requests constraints ---");
    console.table(constraintRows.rows);
    console.log("--- approval_requests.media_id nullability ---");
    console.table(mediaIdRows.rows);

    console.log(
      "\nReview the printed constraint name and media_id nullability above.\n" +
        "If media_id is NOT NULL, this script (with --apply) will relax it to nullable.\n" +
        `If a check constraint on action_type exists under a different name than\n` +
        `"${ACTION_TYPE_CONSTRAINT_NAME}", edit ACTION_TYPE_CONSTRAINT_NAME at the top of\n` +
        "this file before re-running with --apply.\n"
    );

    if (!APPLY) {
      console.log("DRY RUN complete (no --apply passed). Steps 7-9 were NOT run.");
      console.log(
        "Re-run with: node --env-file=.env.local scripts/add-post-workflow.js --apply"
      );
      return;
    }

    console.log("--apply passed: proceeding with steps 7-9...\n");

    // --- Step 7: relax media_id to nullable -----------------------------------
    // DROP NOT NULL is naturally idempotent in Postgres (no error if the
    // column is already nullable), but we still guard defensively so a
    // transient/unexpected error here doesn't abort the whole run silently.
    try {
      await pool.query("ALTER TABLE approval_requests ALTER COLUMN media_id DROP NOT NULL;");
      console.log("OK: approval_requests.media_id is nullable");
    } catch (err) {
      console.error("WARN: failed to relax media_id nullability:", err.message);
      throw err;
    }

    // --- Step 8: approval_requests_one_target_check ---------------------------
    await pool.query(`
      DO $$
      BEGIN
        ALTER TABLE approval_requests
          ADD CONSTRAINT approval_requests_one_target_check
          CHECK (
            (media_id IS NOT NULL AND post_id IS NULL) OR
            (media_id IS NULL AND post_id IS NOT NULL)
          ) NOT VALID;
      EXCEPTION
        WHEN duplicate_object THEN
          RAISE NOTICE 'approval_requests_one_target_check already exists, skipping ADD CONSTRAINT';
      END
      $$;
    `);
    await pool.query(
      "ALTER TABLE approval_requests VALIDATE CONSTRAINT approval_requests_one_target_check;"
    );
    console.log("OK: approval_requests_one_target_check ensured + validated");

    // --- Step 9: widen action_type check constraint ---------------------------
    const existingConstraint = constraintRows.rows.find(
      (row) => row.conname === ACTION_TYPE_CONSTRAINT_NAME
    );

    if (!existingConstraint) {
      console.error(
        `ABORT: no constraint named "${ACTION_TYPE_CONSTRAINT_NAME}" was found on ` +
          "approval_requests (see the constraint list printed above). Update " +
          "ACTION_TYPE_CONSTRAINT_NAME at the top of this file to match the actual " +
          "constraint name and re-run with --apply. Steps 1-8 already applied " +
          "successfully and are safe to leave as-is."
      );
      process.exitCode = 1;
      return;
    }

    // Parse the existing allowed values out of e.g.:
    //   CHECK (action_type = ANY (ARRAY['mark as public'::text, 'retract'::text]))
    // or
    //   CHECK (action_type IN ('mark as public', 'retract'))
    const quotedValueMatches = [...existingConstraint.def.matchAll(/'([^']*)'/g)];
    const existingValues = quotedValueMatches.map((m) => m[1]);

    if (existingValues.length === 0) {
      console.error(
        `ABORT: could not parse any quoted values out of the existing constraint ` +
          `definition for "${ACTION_TYPE_CONSTRAINT_NAME}":\n  ${existingConstraint.def}\n` +
          "Inspect this manually and adjust the script before re-running."
      );
      process.exitCode = 1;
      return;
    }

    const mergedValues = [...new Set([...existingValues, ...NEW_ACTION_TYPES])];
    const inList = mergedValues.map((v) => `'${v.replace(/'/g, "''")}'`).join(", ");

    console.log(
      `Rebuilding "${ACTION_TYPE_CONSTRAINT_NAME}" with values: ${mergedValues.join(", ")}`
    );

    await pool.query(
      `ALTER TABLE approval_requests DROP CONSTRAINT IF EXISTS "${ACTION_TYPE_CONSTRAINT_NAME}";`
    );
    await pool.query(
      `ALTER TABLE approval_requests
         ADD CONSTRAINT "${ACTION_TYPE_CONSTRAINT_NAME}"
         CHECK (action_type IN (${inList})) NOT VALID;`
    );
    await pool.query(
      `ALTER TABLE approval_requests VALIDATE CONSTRAINT "${ACTION_TYPE_CONSTRAINT_NAME}";`
    );
    console.log(`OK: ${ACTION_TYPE_CONSTRAINT_NAME} rebuilt + validated`);

    console.log("\nAll steps complete.");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
