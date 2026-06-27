import Link from "next/link";

export type Crumb = { label: string; href?: string };

// Orientation + upward navigation for SEO landers who arrive deep (a match/team/group page) with no
// sense of where they are. Each ancestor is a real link, so every deep page exposes its parents.
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-muted-foreground flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
      {items.map((c, i) => (
        <span key={i} className="inline-flex items-center gap-x-1.5">
          {i > 0 && <span className="text-muted-2" aria-hidden>›</span>}
          {c.href ? (
            <Link href={c.href} className="hover:text-foreground transition-colors">{c.label}</Link>
          ) : (
            <span className="text-foreground/70" aria-current="page">{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
