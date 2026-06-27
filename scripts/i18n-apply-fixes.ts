// Apply reviewed QA fixes to locale catalogs. Reads scripts/_i18n-fixes.json — an array of
// { locale, key, value } (key is a dotted path, e.g. "home.toWinItAll") — and deep-sets each value
// into lib/i18n/messages/<locale>.json. Reports per-locale counts and any keys that don't exist in en.json
// (a guard against typos creating orphan keys).

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DIR = join(import.meta.dir, "../lib/i18n/messages");
const FIXES = join(import.meta.dir, "_i18n-fixes.json");

type Json = { [k: string]: unknown };
const isObj = (v: unknown): v is Json => !!v && typeof v === "object" && !Array.isArray(v);

function hasKey(o: Json, dotted: string): boolean {
  let cur: unknown = o;
  for (const p of dotted.split(".")) {
    if (isObj(cur) && p in cur) cur = (cur as Json)[p];
    else return false;
  }
  return typeof cur === "string";
}

function deepSet(o: Json, dotted: string, value: string): boolean {
  const parts = dotted.split(".");
  let cur: Json = o;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (!isObj(cur[p])) return false;
    cur = cur[p] as Json;
  }
  const leaf = parts[parts.length - 1];
  if (typeof cur[leaf] !== "string") return false;
  cur[leaf] = value;
  return true;
}

const en: Json = JSON.parse(readFileSync(join(DIR, "en.json"), "utf8"));
const fixes: { locale: string; key: string; value: string }[] = JSON.parse(readFileSync(FIXES, "utf8"));

const byLocale = new Map<string, { locale: string; key: string; value: string }[]>();
for (const f of fixes) {
  if (!byLocale.has(f.locale)) byLocale.set(f.locale, []);
  byLocale.get(f.locale)!.push(f);
}

let applied = 0,
  skipped = 0,
  orphan = 0;
for (const [locale, list] of byLocale) {
  const path = join(DIR, `${locale}.json`);
  const data: Json = JSON.parse(readFileSync(path, "utf8"));
  let n = 0;
  for (const f of list) {
    if (!hasKey(en, f.key)) {
      console.warn(`  ⚠️  ${locale}: "${f.key}" not in en.json — skipping (orphan)`);
      orphan++;
      continue;
    }
    if (deepSet(data, f.key, f.value)) {
      n++;
      applied++;
    } else {
      console.warn(`  ⚠️  ${locale}: could not set "${f.key}" (missing path) — skipping`);
      skipped++;
    }
  }
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
  console.log(`✅ ${locale}: applied ${n}/${list.length}`);
}
console.log(`\nTotal applied ${applied}, skipped ${skipped}, orphan ${orphan}.`);
