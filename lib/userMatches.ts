// Per-user "My Matches" data access (server-only). Backed by the `user_match` Postgres table.
// The match metadata (teams, projections, kickoff) lives in the shared prediction payload; this
// module only stores WHICH matches a user has flagged (plus optional ticket count / note).
import { headers } from "next/headers"
import { pool } from "./db"
import { auth } from "./auth"

export interface UserMatchRow {
  matchNo: number
  tickets: number | null
  note: string | null
}

// Current signed-in user (or null). Validated server-side against the session store.
export async function getSessionUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user ?? null
}

export async function getUserMatchNumbers(userId: string): Promise<number[]> {
  const { rows } = await pool.query<{ match_no: number }>(
    "SELECT match_no FROM user_match WHERE user_id = $1",
    [userId]
  )
  return rows.map((r) => r.match_no)
}

export async function getUserMatches(userId: string): Promise<UserMatchRow[]> {
  const { rows } = await pool.query<{
    match_no: number
    tickets: number | null
    note: string | null
  }>(
    "SELECT match_no, tickets, note FROM user_match WHERE user_id = $1 ORDER BY match_no",
    [userId]
  )
  return rows.map((r) => ({
    matchNo: r.match_no,
    tickets: r.tickets,
    note: r.note,
  }))
}

// Flag (on=true) or unflag (on=false) a match for a user. Idempotent.
export async function setMatchFlag(
  userId: string,
  matchNo: number,
  on: boolean
): Promise<void> {
  if (on) {
    await pool.query(
      "INSERT INTO user_match (user_id, match_no) VALUES ($1, $2) ON CONFLICT (user_id, match_no) DO NOTHING",
      [userId, matchNo]
    )
  } else {
    await pool.query(
      "DELETE FROM user_match WHERE user_id = $1 AND match_no = $2",
      [userId, matchNo]
    )
  }
}
