import { TEAMS } from "./data/teams";

// URL slug for a team, e.g. "South Korea" -> "south-korea", "Türkiye" -> "turkiye".
export function teamSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics (ü -> u)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function teamFromSlug(slug: string): (typeof TEAMS)[number] | undefined {
  return TEAMS.find((t) => teamSlug(t.name) === slug);
}
