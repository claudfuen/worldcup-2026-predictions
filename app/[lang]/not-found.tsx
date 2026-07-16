import Link from "next/link"
import { getT, getLocale } from "@/lib/i18n/server"
import { localeHref } from "@/lib/i18n/config"

export default async function NotFound() {
  const t = await getT()
  const locale = await getLocale()
  return (
    <main className="mx-auto flex min-h-[70svh] max-w-md flex-col items-center justify-center px-6 text-center">
      <div className="w-full rounded-2xl border border-border bg-card p-8">
        <svg
          viewBox="0 0 24 24"
          width="26"
          height="26"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mx-auto text-muted-foreground"
          aria-hidden
        >
          <circle cx="12" cy="12" r="9" />
          <path d="m15 9-3.5 1.5L10 14l3.5-1.5L15 9Z" />
        </svg>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          {t("notFound.heading")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("notFound.desc")}
        </p>
        <Link
          href={localeHref(locale, "/")}
          className="mt-5 inline-block rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          {t("notFound.cta")}
        </Link>
      </div>
    </main>
  )
}
