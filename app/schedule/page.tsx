import { getPredictions } from "@/lib/getPredictions";
import { ScheduleList } from "@/components/schedule-list";
import { getSessionUser, getUserMatchNumbers } from "@/lib/userMatches";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SchedulePage() {
  const user = await getSessionUser();
  const [data, myMatchNumbers] = await Promise.all([
    getPredictions(),
    user ? getUserMatchNumbers(user.id) : Promise.resolve<number[]>([]),
  ]);
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Schedule</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          All 104 matches, times in ET. Undefined knockout slots show the most likely team; defined matches show the
          model favorite. Tap the 🎟️ to save a match to My Matches.
        </p>
      </div>
      <ScheduleList matches={data.matches} myMatchNumbers={myMatchNumbers} isAuthed={Boolean(user)} />
    </main>
  );
}
