// Host advantage: the three host nations get a home boost only when playing an actual home match in their
// own country. Mexico gets more at its high-altitude venues (Mexico City ~2240m, Guadalajara ~1560m).
const VENUE_COUNTRY: Record<string, "MEX" | "USA" | "CAN"> = {
  "Estadio Azteca": "MEX",
  "Estadio Akron": "MEX",
  "Estadio BBVA": "MEX",
  "BMO Field": "CAN",
  "BC Place Stadium": "CAN",
  "SoFi Stadium": "USA",
  "NRG Stadium": "USA",
  "MetLife Stadium": "USA",
  "Hard Rock Stadium": "USA",
  "Mercedes-Benz Stadium": "USA",
  "Gillette Stadium": "USA",
  "Lincoln Financial Field": "USA",
  "Lumen Field": "USA",
  "Levi's Stadium": "USA",
  "AT&T Stadium": "USA",
  "GEHA Field at Arrowhead Stadium": "USA",
};
const HIGH_ALTITUDE = new Set(["Estadio Azteca", "Estadio Akron"]);

// Elo-point boost for `code` if it is the host nation of the match's venue country.
export function hostEloBoost(code: string, venue: string): number {
  const country = VENUE_COUNTRY[venue];
  if (!country) return 0;
  if (code === "MEX" && country === "MEX") return HIGH_ALTITUDE.has(venue) ? 90 : 60;
  if (code === "USA" && country === "USA") return 50;
  if (code === "CAN" && country === "CAN") return 50;
  return 0;
}
