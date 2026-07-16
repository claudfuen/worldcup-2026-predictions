"use client"
import useSWR from "swr"

const fetcher = async (url: string) => {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`${r.status}`)
  return r.json()
}

// Adaptive client polling for anything that shows live results. SSR provides the first paint (`fallbackData`),
// then SWR revalidates on an interval that depends on the data. Hidden tabs don't poll (SWR's refreshWhenHidden
// default is false) but snap up to date on refocus/reconnect; `keepPreviousData` avoids a flash while in flight.
//
// Cadence: by default FAST while `isLive(data)` (12s — matches the server's ~12s ESPN cache), SLOW otherwise
// (60s). Pass `opts.interval` for full control over the per-poll delay, including returning 0 to STOP polling
// (e.g. a settled/far-future match that will never move) — this is how callers avoid unbounded background load.
export function useLivePoll<T>(
  key: string,
  fallbackData: T,
  isLive: (data: T | undefined) => boolean,
  opts?: {
    liveMs?: number
    idleMs?: number
    interval?: (data: T | undefined) => number
  }
): T {
  const liveMs = opts?.liveMs ?? 12_000
  const idleMs = opts?.idleMs ?? 60_000
  const interval =
    opts?.interval ??
    ((latest: T | undefined) => (isLive(latest) ? liveMs : idleMs))
  const { data } = useSWR<T>(key, fetcher, {
    fallbackData,
    refreshInterval: interval,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    keepPreviousData: true,
    dedupingInterval: 5_000,
  })
  return data ?? fallbackData
}
