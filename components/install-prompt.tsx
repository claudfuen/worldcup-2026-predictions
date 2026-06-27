"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/lib/analytics";

// "Add to Home Screen" prompt for retention. Gated by engagement (a returning visitor, or 3rd page this
// session) so first-time landers aren't nagged; remembers dismissal for 30 days. Android uses the native
// beforeinstallprompt; iOS (no native prompt) gets Share → Add to Home Screen instructions. Lifecycle
// outcomes go to both analytics backends via trackEvent.
const DISMISS_KEY = "wc:install-dismissed-until";
const SESSIONS_KEY = "wc:sessions";
const SESSION_GUARD = "wc:session-started";
const DISMISS_DAYS = 1; // World Cup runs fast — re-prompt the next day rather than waiting weeks

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
}
function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return Boolean(window.matchMedia?.("(display-mode: standalone)").matches || nav.standalone);
}

export function InstallPrompt() {
  const pathname = usePathname();
  const [views, setViews] = useState(0);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [iosTip, setIosTip] = useState(false);

  // Count this tab-session once (returning-visitor signal).
  useEffect(() => {
    try {
      if (!sessionStorage.getItem(SESSION_GUARD)) {
        localStorage.setItem(SESSIONS_KEY, String(Number(localStorage.getItem(SESSIONS_KEY) ?? "0") + 1));
        sessionStorage.setItem(SESSION_GUARD, "1");
      }
    } catch {
      /* storage blocked */
    }
  }, []);

  // Count page views this session (the layout persists across client navigations).
  useEffect(() => setViews((v) => v + 1), [pathname]);

  // QA/preview hatch: append ?install to any URL to force the popup (it's otherwise mobile + gated).
  useEffect(() => {
    try {
      if (new URLSearchParams(window.location.search).has("install")) setShow(true);
    } catch {
      /* ignore */
    }
  }, []);

  // Capture Android's installability event.
  useEffect(() => {
    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBIP);
    return () => window.removeEventListener("beforeinstallprompt", onBIP);
  }, []);

  // Decide whether to surface the prompt. Aggressive (the tournament is short-lived): fire on the first
  // visit after a brief dwell so they glimpse value, and almost instantly for returning/engaged users.
  useEffect(() => {
    if (show || isStandalone()) return;
    let sessions = 0;
    let dismissedUntil = 0;
    try {
      sessions = Number(localStorage.getItem(SESSIONS_KEY) ?? "0");
      dismissedUntil = Number(localStorage.getItem(DISMISS_KEY) ?? "0");
    } catch {
      /* ignore */
    }
    if (Date.now() < dismissedUntil) return;
    if (!deferred && !isIos()) return; // can't install: desktop/Android without the event
    const engaged = sessions >= 2 || views >= 2; // returning, or has clicked into something
    const t = setTimeout(() => {
      setShow(true);
      trackEvent("pwa_prompt_shown", { platform: deferred ? "android" : "ios" });
    }, engaged ? 1200 : 5000);
    return () => clearTimeout(t);
  }, [views, deferred, show]);

  // Lock background scroll while the popup is up (it's a modal).
  useEffect(() => {
    if (!show) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [show]);

  function remember() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 86_400_000));
    } catch {
      /* ignore */
    }
    setShow(false);
    setIosTip(false);
  }
  function dismiss() {
    trackEvent("pwa_install_dismissed", { platform: isIos() ? "ios" : "android" });
    remember();
  }
  async function install() {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice.catch(() => undefined);
      trackEvent("pwa_install_choice", { platform: "android", outcome: choice?.outcome ?? "unknown" });
      setDeferred(null);
      remember();
    } else if (isIos()) {
      trackEvent("pwa_install_ios_instructions", { platform: "ios" });
      setIosTip(true);
    }
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        onClick={dismiss}
        className="animate-in fade-in absolute inset-0 bg-black/60 backdrop-blur-sm duration-200"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add to home screen"
        className="animate-in fade-in zoom-in-95 slide-in-from-bottom-2 bg-surface-raised border-border-strong relative w-full max-w-sm rounded-3xl border p-6 text-center shadow-2xl duration-200 dark:inset-ring dark:inset-ring-white/5"
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="text-muted-2 hover:text-foreground hover:bg-muted/40 absolute top-3 right-3 flex size-8 items-center justify-center rounded-lg"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>

        {!iosTip ? (
          <>
            <span className="border-primary/30 bg-primary/10 mx-auto flex size-16 items-center justify-center rounded-2xl border" aria-hidden>
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                <path d="M8 21h8" /><path d="M12 17v4" /><path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" /><path d="M17 5h3v1a4 4 0 0 1-4 4" /><path d="M7 5H4v1a4 4 0 0 0 4 4" />
              </svg>
            </span>
            <h2 className="font-display mt-4 text-lg font-semibold tracking-tight text-balance">Add World Cup 2026 to your home screen</h2>
            <p className="text-muted-foreground mt-1.5 text-sm text-pretty">One tap to live scores, odds and the bracket — full-screen, like a native app. No searching as the tournament flies by.</p>
            <button
              type="button"
              onClick={install}
              className="bg-primary text-primary-foreground mt-5 w-full rounded-xl px-4 py-3 text-sm font-semibold transition-opacity hover:opacity-90"
            >
              {deferred ? "Add to Home Screen" : "Show me how"}
            </button>
            <button type="button" onClick={dismiss} className="text-muted-foreground hover:text-foreground mt-1 w-full rounded-lg px-4 py-2 text-sm">Maybe later</button>
          </>
        ) : (
          <>
            <span className="border-primary/30 bg-primary/10 mx-auto flex size-16 items-center justify-center rounded-2xl border" aria-hidden>
              <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                <path d="M12 16V4" /><path d="m8 8 4-4 4 4" /><path d="M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
              </svg>
            </span>
            <h2 className="font-display mt-4 text-lg font-semibold tracking-tight">Add it in two taps</h2>
            <p className="text-muted-foreground mt-1.5 text-sm text-pretty">
              Tap the <span className="text-foreground font-medium">Share</span> button in Safari, then choose{" "}
              <span className="text-foreground font-medium">“Add to Home Screen.”</span>
            </p>
            <button type="button" onClick={dismiss} className="text-muted-foreground hover:text-foreground mt-5 w-full rounded-lg px-4 py-2 text-sm">Got it</button>
          </>
        )}
      </div>
    </div>
  );
}
