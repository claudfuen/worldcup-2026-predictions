// Create the per-user My-Matches table. Run AFTER `bun run auth:migrate` (which creates the
// BetterAuth "user" table this references). Bun auto-loads .env.local, so DATABASE_URL is set.
//   bun run scripts/db-init.ts
import { pool } from "../lib/db"

const SQL = `
CREATE TABLE IF NOT EXISTS user_match (
  user_id    text        NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  match_no   integer     NOT NULL,
  tickets    integer,
  note       text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, match_no)
);
CREATE INDEX IF NOT EXISTS user_match_user_idx ON user_match (user_id);
`

await pool.query(SQL)
console.log("✅ user_match table ready")
await pool.end()
