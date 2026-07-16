"use client"
import { useState } from "react"
import { signIn } from "@/lib/auth-client"
import { useT } from "@/lib/i18n/provider"

export function SignInForm({ next }: { next: string }) {
  const t = useT()
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  )
  const [error, setError] = useState("")

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus("sending")
    setError("")
    const { error } = await signIn.magicLink({
      email: email.trim(),
      callbackURL: next,
    })
    if (error) {
      setStatus("error")
      setError(error.message || t("signin.errorFallback"))
    } else {
      setStatus("sent")
    }
  }

  if (status === "sent") {
    return (
      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <p className="flex items-start gap-2 text-sm">
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mt-0.5 shrink-0 text-muted-foreground"
            aria-hidden
          >
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m3 7 9 6 9-6" />
          </svg>
          <span>
            {t("signin.sentPrefix")}{" "}
            <span className="font-medium">{email}</span>{" "}
            {t("signin.sentSuffix")}
          </span>
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="mt-3 text-xs text-muted-foreground underline hover:text-foreground"
        >
          {t("signin.useDifferentEmail")}
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-3">
      <input
        type="email"
        required
        autoFocus
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        aria-label={t("signin.emailLabel")}
        className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary/60"
      />
      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
      >
        {status === "sending" ? t("signin.sending") : t("signin.submit")}
      </button>
      {status === "error" && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </form>
  )
}
