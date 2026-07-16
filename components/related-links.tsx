import Link from "next/link"
import { Flag } from "./flag"
import { getT } from "@/lib/i18n/server"

export type RelLink = {
  label: string
  href: string
  code?: string | null // team code -> render a flag (makes team links inviting)
  hint?: string // small trailing context, e.g. "Group H" or "Round of 32"
}

// A "keep exploring" rail of related entities placed at the foot of a page, so a visitor who landed deep
// (from search) always has obvious windows ACROSS the site — the other teams, the group, the bracket, the
// schedule — instead of only the navbar. Tasteful pills, not a link farm.
export async function RelatedLinks({
  title,
  links,
}: {
  title?: string
  links: RelLink[]
}) {
  const t = await getT()
  const heading = title ?? t("relatedLinks.title")
  const items = links.filter(Boolean)
  if (items.length === 0) return null
  return (
    <section className="mt-10 border-t border-border/60 pt-5">
      <h2 className="mb-3 font-mono text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {heading}
      </h2>
      <div className="flex flex-wrap gap-2">
        {items.map((l, i) => (
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
    </section>
  )
}
