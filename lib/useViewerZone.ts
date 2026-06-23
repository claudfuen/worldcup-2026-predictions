"use client";

import { useEffect, useState } from "react";
import type { Zone } from "@/lib/format";

// Resolves the viewer's timezone + locale on the client. Returns `undefined` on the first
// render (server + hydration) so formatters fall back to the ET default and hydration stays
// byte-identical; the real zone arrives in a post-mount effect, triggering a clean re-render.
export function useViewerZone(): { zone: Zone | undefined; ready: boolean } {
  const [zone, setZone] = useState<Zone | undefined>(undefined);
  useEffect(() => {
    try {
      const r = Intl.DateTimeFormat().resolvedOptions();
      setZone({ tz: r.timeZone, locale: r.locale });
    } catch {
      /* keep ET default */
    }
  }, []);
  return { zone, ready: zone !== undefined };
}
