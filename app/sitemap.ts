import type { MetadataRoute } from "next";

const SITE_URL = "https://worldcup2026predictions.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/groups", "/bracket", "/schedule", "/methodology"].map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: "hourly" as const,
    priority: path === "" ? 1 : 0.8,
  }));
  const matches = Array.from({ length: 104 }, (_, i) => ({
    url: `${SITE_URL}/match/${i + 1}`,
    changeFrequency: "hourly" as const,
    priority: 0.5,
  }));
  return [...routes, ...matches];
}
