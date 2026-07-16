import Link from "next/link"
import { Flag } from "@/components/flag"
import { getT, getLocale } from "@/lib/i18n/server"
import { localeHref } from "@/lib/i18n/config"
import type { GroupView } from "@/lib/predictions"

// A launchpad tile for the group stage: each group's current leader at a glance + a qualification stat,
// the whole tile linking into /groups. A glimpse, not the full standings.
export async function GroupsPreview({
  groups,
  className = "",
}: {
  groups: GroupView[]
  className?: string
}) {
  const t = await getT()
  const locale = await getLocale()
  const clinched = groups
    .flatMap((g) => g.teams)
    .filter(
      (t) =>
        t.status === "won_group" ||
        t.status === "second" ||
        t.status === "advanced"
    ).length
  return (
    <Link
      href={localeHref(locale, "/groups")}
      className={`group flex flex-col rounded-2xl border border-border bg-card card-surface p-4 transition-colors hover:border-primary/50 hover:bg-surface-raised dark:inset-ring dark:inset-ring-white/8 hover:dark:inset-ring-primary/30 ${className}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="eyebrow text-muted-foreground">{t("nav.groups")}</h2>
        <span
          className="text-muted-2 transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
          aria-hidden
        >
          →
        </span>
      </div>
      <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
        {groups.map((g) => (
          <div key={g.group} className="flex items-center gap-1.5 text-xs">
            <span className="w-3 shrink-0 font-mono text-muted-2">
              {g.group}
            </span>
            <Flag code={g.teams[0]?.code ?? null} size={14} />
            <span className="min-w-0 truncate font-medium text-foreground/80">
              {g.teams[0]?.name}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 text-xs text-muted-2">
        {t("home.groupsClinched", { clinched })}
      </div>
    </Link>
  )
}
