"use client";

import { useEffect, useMemo, useState } from "react";
import type { Zone } from "@/lib/format";
import { useLocale } from "@/lib/i18n/client";
import { localeConfig } from "@/lib/i18n/config";

// Resolves the date/time rendering context for a viewer:
//   - TIMEZONE: the viewer's own (so kickoff times show in their local clock). Undefined on the first
//     render (server + hydration) so formatters fall back to the ET default and hydration stays
//     byte-identical; the real zone arrives in a post-mount effect, triggering a clean re-render.
//   - LOCALE: the SITE language (the [lang] in the URL), NOT the browser's — so month/day names match
//     the chosen locale (e.g. "dom, 28 jun" on /es) regardless of the visitor's OS language.
export function useViewerZone(): { zone: Zone; ready: boolean } {
  const siteLocale = localeConfig(useLocale()).intl;
  const [tz, setTz] = useState<string | undefined>(undefined);
  useEffect(() => {
    try {
      setTz(Intl.DateTimeFormat().resolvedOptions().timeZone);
    } catch {
      /* keep ET default */
    }
  }, []);
  const zone = useMemo<Zone>(() => ({ tz, locale: siteLocale }), [tz, siteLocale]);
  return { zone, ready: tz !== undefined };
}
