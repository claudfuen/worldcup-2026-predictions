// One-off: seed the static MY_MATCHES (ticket counts + notes) onto a real user account, so the
// original owner keeps their matches after the switch to per-user flagging.
// The user must have signed in once (via magic link) so their row exists.
//   bun run scripts/seed-my-matches.ts you@example.com
import { pool } from "../lib/db"
import { MY_MATCHES } from "../lib/data/tickets"

const email = process.argv[2]
if (!email) {
  console.error("Usage: bun run scripts/seed-my-matches.ts <email>")
  process.exit(1)
}

const { rows } = await pool.query<{ id: string }>(
  `SELECT id FROM "user" WHERE email = $1`,
  [email]
)
if (rows.length === 0) {
  console.error(
    `No user with email "${email}". Sign in once via magic link first, then re-run.`
  )
  process.exit(1)
}
const userId = rows[0].id

for (const m of MY_MATCHES) {
  await pool.query(
    `INSERT INTO user_match (user_id, match_no, tickets, note) VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, match_no) DO UPDATE SET tickets = EXCLUDED.tickets, note = EXCLUDED.note`,
    [userId, m.match, m.tickets, m.note ?? null]
  )
}
console.log(`✅ Seeded ${MY_MATCHES.length} matches for ${email}`)
await pool.end()
