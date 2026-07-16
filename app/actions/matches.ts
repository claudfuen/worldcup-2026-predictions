"use server"
// Server Action: flag / unflag a match for the signed-in user. Auth is re-checked here because
// Server Actions are reachable via direct POST, not just through the UI (per Next.js guidance).
import { revalidatePath } from "next/cache"
import { getSessionUser, setMatchFlag } from "@/lib/userMatches"

export async function toggleMatch(
  matchNo: number,
  on: boolean
): Promise<{ ok: boolean; on: boolean; error?: "not-signed-in" }> {
  const user = await getSessionUser()
  if (!user) return { ok: false, on: !on, error: "not-signed-in" }

  await setMatchFlag(user.id, matchNo, on)

  // Refresh every view that reflects the user's flagged set.
  revalidatePath("/matches")
  revalidatePath("/schedule")
  revalidatePath(`/match/${matchNo}`)
  return { ok: true, on }
}
