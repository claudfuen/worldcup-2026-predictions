// Match times default to US Eastern (the host region) for server render and no-JS, but every
// display passes the viewer's resolved zone so times render in their own local time + locale.
const DEFAULT_TZ = "America/New_York";
const DEFAULT_LOCALE = "en-US";

export type Zone = { tz?: string; locale?: string };

const tzOf = (z?: Zone) => z?.tz || DEFAULT_TZ;
const localeOf = (z?: Zone) => z?.locale || DEFAULT_LOCALE;

// Short zone label for the resolved time, e.g. "EDT", "PST", "GMT+1".
export function zoneLabel(utc: string, z?: Zone): string {
  const parts = new Intl.DateTimeFormat(localeOf(z), { timeZone: tzOf(z), timeZoneName: "short" }).formatToParts(new Date(utc));
  return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
}

export function fmtDateTime(utc: string, z?: Zone): string {
  const s = new Date(utc).toLocaleString(localeOf(z), {
    timeZone: tzOf(z), weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
  return `${s} ${zoneLabel(utc, z)}`;
}

export function fmtTime(utc: string, z?: Zone): string {
  return new Date(utc).toLocaleString(localeOf(z), { timeZone: tzOf(z), hour: "numeric", minute: "2-digit" }) + ` ${zoneLabel(utc, z)}`;
}

// Time without the zone suffix, for dense lists where context already implies the zone.
export function fmtTimeShort(utc: string, z?: Zone): string {
  return new Date(utc).toLocaleString(localeOf(z), { timeZone: tzOf(z), hour: "numeric", minute: "2-digit" });
}

export function fmtDay(utc: string, z?: Zone): string {
  return new Date(utc).toLocaleString(localeOf(z), { timeZone: tzOf(z), weekday: "short", month: "short", day: "numeric" });
}

// YYYY-MM-DD in the given zone, for grouping the schedule by day. Always en-CA so the key
// is locale-independent numeric; only the timezone varies.
export function fmtDayKey(utc: string, z?: Zone): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tzOf(z), year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(utc));
}

// Localized ordinal, e.g. en 1st/2nd/3rd, es 1.º, fr 1er/2e, de 1., it 1º, pt 1º, ru 1-й, hi 1वाँ,
// id ke-1, ja/zh 第1, ko 1위, ar 1. Returns a COMPLETE display ordinal — callers interpolate it whole
// (do not append a suffix in the message catalog). `locale` is a BCP-47 tag; only the language matters.
const ORD_EN: Record<string, string> = { one: "st", two: "nd", few: "rd", other: "th" };
export function ordinal(n: number, locale = DEFAULT_LOCALE): string {
  const lang = locale.split("-")[0];
  switch (lang) {
    case "en":
      return `${n}${ORD_EN[new Intl.PluralRules("en", { type: "ordinal" }).select(n)] ?? "th"}`;
    case "fr":
      return n === 1 ? "1er" : `${n}e`;
    case "es":
      return `${n}.º`;
    case "it":
    case "pt":
      return `${n}º`;
    case "de":
      return `${n}.`;
    case "ru":
      return `${n}-й`;
    case "hi":
      return `${n}वाँ`;
    case "id":
      return `ke-${n}`;
    case "ja":
    case "zh":
      return `第${n}`;
    case "ko":
      return `${n}위`;
    default: // ar + any fallback: a bare number reads fine in a stats context
      return `${n}`;
  }
}

export function pct(v: number): string {
  if (v >= 0.9995) return "100%";
  if (v > 0 && v < 0.005) return "<1%";
  return `${Math.round(v * 100)}%`;
}

// A Monte Carlo frequency is a forecast, never a guarantee, so it must never render as "100%" - only a
// mathematically-clinched state (shown with a ✓ elsewhere) may. Cap displayed sim probabilities at 99%.
// Returns the branded ForecastLabel (this is its ONLY producer), so a raw/uncapped value can't be passed
// where a capped forecast is expected.
export function forecastPct(v: number): import("./view/types").ForecastLabel {
  return pct(Math.min(v, 0.99)) as import("./view/types").ForecastLabel;
}
