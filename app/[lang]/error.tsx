"use client"

import Link from "next/link"
import { useT } from "@/lib/i18n/provider"
import { useLocale } from "@/lib/i18n/client"
import { localeHref } from "@/lib/i18n/config"

// Catches a failed render (e.g. ESPN/KV briefly unavailable) instead of crashing to a blank screen.
export default function Error({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useT()
  const locale = useLocale()
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
          <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
          <path d="M21 3v5h-5" />
        </svg>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          {t("errorPage.heading")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("errorPage.desc")}
        </p>
        <div className="mt-5 flex items-center justify-center gap-2">
          <button
            onClick={reset}
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            {t("errorPage.tryAgain")}
          </button>
          <Link
            href={localeHref(locale, "/")}
            className="rounded-full border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            {t("errorPage.overview")}
          </Link>
        </div>
      </div>
    </main>
  )
}
