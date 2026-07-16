import type { ReactNode } from "react"
import Link from "next/link"
import { Flag } from "@/components/flag"
import { getT } from "@/lib/i18n/server"
import type { RelLink } from "@/components/related-links"

// The page-foot exploration block: a grid of rich PREVIEW cards (bracket teaser, group tables, title race)
// — real windows into related entities — plus an optional thin row of secondary pill links (teams, schedule).
// Replaces the old text-only "keep exploring" rail so deep landers get a genuine glimpse of where to go next.
export async function ExploreSection({
  title,
  children,
  links,
}: {
  title?: string
  children: ReactNode
  links?: RelLink[]
}) {
  const t = await getT()
  const heading = title ?? t("home.exploreTournament")
  return (
    <section className="mt-12 border-t border-border pt-8">
      <h2 className="mb-4 font-mono text-xs font-semibold tracking-[0.1em] text-muted-foreground uppercase">
        {heading}
      </h2>
      <div className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {children}
      </div>
      {links && links.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {links.map((l, i) => (
            <Link
              key={i}
              href={l.href}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2.5 text-sm transition-colors hover:border-primary/45 hover:bg-muted/40 sm:py-1.5"
            >
              {l.code && <Flag code={l.code} size={16} />}
              <span className="font-medium">{l.label}</span>
              {l.hint && <span className="text-xs text-muted-2">{l.hint}</span>}
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
