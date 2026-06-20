"use client";
// Toggle a match in/out of the user's My Matches. Optimistic; falls back to /signin when signed out.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleMatch } from "@/app/actions/matches";

export function MatchFlagButton({
  matchNo,
  initialOn,
  isAuthed,
  variant = "icon",
}: {
  matchNo: number;
  initialOn: boolean;
  isAuthed: boolean;
  variant?: "icon" | "button";
}) {
  const router = useRouter();
  const [on, setOn] = useState(initialOn);
  const [pending, start] = useTransition();

  function handle(e: React.MouseEvent) {
    // These buttons often sit inside <Link> cards — don't navigate the card.
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthed) {
      const next = typeof window !== "undefined" ? window.location.pathname : "/matches";
      router.push(`/signin?next=${encodeURIComponent(next)}`);
      return;
    }
    const target = !on;
    setOn(target); // optimistic
    start(async () => {
      const res = await toggleMatch(matchNo, target);
      if (!res.ok) {
        setOn(!target);
        if (res.error === "not-signed-in") router.push("/signin");
      } else {
        router.refresh();
      }
    });
  }

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={handle}
        disabled={pending}
        aria-pressed={on}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium disabled:opacity-60 ${
          on
            ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
            : "border-border text-muted-foreground hover:text-foreground"
        }`}
      >
        <span aria-hidden>{on ? "✓" : "🎟️"}</span>
        {on ? "In my matches" : isAuthed ? "Add to my matches" : "Sign in to save"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={pending}
      aria-pressed={on}
      aria-label={on ? "Remove from my matches" : "Add to my matches"}
      title={on ? "Remove from my matches" : "Add to my matches"}
      className={`shrink-0 rounded-full px-1.5 py-1 text-sm leading-none disabled:opacity-60 ${
        on ? "opacity-100" : "opacity-30 hover:opacity-70 grayscale"
      }`}
    >
      🎟️
    </button>
  );
}
