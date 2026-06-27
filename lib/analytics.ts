import { track } from "@vercel/analytics";
import { sendGAEvent } from "@next/third-parties/google";

type EventProps = Record<string, string | number | boolean>;

// One call -> BOTH analytics backends, so key events are captured wherever we look:
//  - Vercel Analytics custom events (track) — needs the Vercel Pro plan; no-ops otherwise (safe).
//  - Google Analytics 4 event (sendGAEvent) — works on the free tier (measurement id via NEXT_PUBLIC_GA_ID).
// Client-only; guarded so it never throws during SSR or if a backend isn't initialised.
export function trackEvent(name: string, props: EventProps = {}): void {
  if (typeof window === "undefined") return;
  try {
    track(name, props);
  } catch {
    /* vercel analytics unavailable */
  }
  try {
    sendGAEvent("event", name, props);
  } catch {
    /* gtag not ready */
  }
}
