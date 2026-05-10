import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { card, fit } from "../ui/layout";

type ExtensionRow = {
  name: string;
  description?: string;
  downloadsMonthly?: number;
  categories?: string[];
  recommendation?: string;
  risk?: { score?: number };
  sisoFit?: { score?: number };
};

function catalogPath() {
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, "..", "..", "..", "..", "data", "extensions", "extension-catalog.json");
}

function formatDownloads(value?: number) {
  if (!value) return "?/mo";
  if (value >= 1000) return `${Math.round(value / 100) / 10}K/mo`;
  return `${value}/mo`;
}

function loadRows() {
  const path = catalogPath();
  if (!existsSync(path)) return { path, rows: [] as ExtensionRow[], total: 0, generatedAt: "" };
  const parsed = JSON.parse(readFileSync(path, "utf8"));
  const rows = Array.isArray(parsed.packages) ? parsed.packages : [];
  return { path, rows, total: Number(parsed.totalPackages ?? rows.length), generatedAt: String(parsed.generatedAt ?? "") };
}

export function extensionRows(width: number, maxRows: number) {
  const catalog = loadRows();
  if (!catalog.rows.length) {
    return card("extensions", [
      "Catalog not built yet",
      "Run: node scripts/scrape-pi-packages.mjs --pages=47 --detail-limit=all",
    ], width).slice(0, maxRows).map((row) => fit(row, width)).join("\n");
  }
  const body = [
    `${catalog.total} packages · ${catalog.generatedAt ? new Date(catalog.generatedAt).toLocaleString() : "local catalog"}`,
    "",
    ...catalog.rows.slice(0, Math.max(1, maxRows - 4)).map((pkg, index) => {
      const score = pkg.sisoFit?.score ?? 0;
      const risk = pkg.risk?.score ?? 0;
      const category = pkg.categories?.[0] ?? "uncategorized";
      return `${String(index + 1).padStart(2)} ${pkg.name} · ${score} fit · ${risk} risk · ${formatDownloads(pkg.downloadsMonthly)} · ${category} · ${pkg.recommendation ?? "watch"}`;
    }),
  ];
  return card("extensions", body, width).slice(0, maxRows).map((row) => fit(row, width)).join("\n");
}
