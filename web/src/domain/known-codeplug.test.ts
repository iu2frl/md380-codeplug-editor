import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { parseCodeplug } from "./parser";

type CsvRow = Record<string, string>;

type DatasetCheck = {
  label: string;
  parsedNames: string[];
  parsedCount: number;
  filePattern: RegExp;
  headerCandidates: string[];
};

const WEB_ROOT = resolve(__dirname, "../..");
const DEFAULT_RDT_PATH = join(WEB_ROOT, "testdata", "known", "codeplug.rdt");
const DEFAULT_REFERENCE_DIR = join(WEB_ROOT, "testdata", "known", "reference");
const DEFAULT_DOWNLOADS_DIR = join(WEB_ROOT, "testdata", "known", "downloads");
const DEFAULT_RDT_URL =
  process.env.KNOWN_CODEPLUG_RDT_URL ??
  "https://github.com/vk2kvp/md380-codeplug/blob/master/MD380-90_All_AU_DMR%2Banalog%2BCB_v15.rdt";
const DEFAULT_ZIP_URL =
  process.env.KNOWN_CODEPLUG_ZIP_URL ??
  "https://github.com/vk2kvp/md380-codeplug/blob/master/MD380-90_All_AU_DMR%2Banalog%2BCB_CVS_v15.zip";
const GENERATED_OUTPUT_DIR = join(WEB_ROOT, "test-results", "known", "parsed");

function hasCsvFiles(referenceRoot: string): boolean {
  if (!existsSync(referenceRoot)) {
    return false;
  }
  return walkFiles(referenceRoot).some((file) => file.toLowerCase().endsWith(".csv"));
}

function githubUrlVariants(url: string): string[] {
  const variants = new Set<string>([url]);

  try {
    const parsed = new URL(url);

    if (parsed.hostname === "github.com") {
      if (!parsed.searchParams.has("raw")) {
        const withRaw = new URL(parsed.toString());
        withRaw.searchParams.set("raw", "1");
        variants.add(withRaw.toString());
      }

      if (parsed.pathname.includes("/blob/")) {
        variants.add(`${parsed.origin}${parsed.pathname.replace("/blob/", "/raw/")}`);
      }
    }
  } catch {
    // Keep original URL only if parsing fails.
  }

  return [...variants];
}

function looksLikeHtml(bytes: Uint8Array): boolean {
  const probe = new TextDecoder().decode(bytes.subarray(0, 300)).toLowerCase();
  return probe.includes("<html") || probe.includes("<!doctype html");
}

function looksLikeLfsPointer(bytes: Uint8Array): boolean {
  const probe = new TextDecoder().decode(bytes.subarray(0, 300));
  return probe.includes("version https://git-lfs.github.com/spec/v1");
}

async function downloadToFile(url: string, filePath: string): Promise<void> {
  const candidates = githubUrlVariants(url);
  const failures: string[] = [];

  for (const candidate of candidates) {
    let response: Response;
    try {
      response = await fetch(candidate, { redirect: "follow" });
    } catch (error) {
      failures.push(`${candidate} network error: ${String(error)}`);
      continue;
    }

    if (!response.ok) {
      failures.push(`${candidate} HTTP ${response.status}`);
      continue;
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (looksLikeHtml(bytes)) {
      failures.push(`${candidate} returned HTML page, not file bytes`);
      continue;
    }
    if (looksLikeLfsPointer(bytes)) {
      failures.push(`${candidate} returned a Git LFS pointer, not binary content`);
      continue;
    }

    writeFileSync(filePath, bytes);
    return;
  }

  throw new Error(`Download failed for ${url}. Attempts: ${failures.join(" | ")}`);
}

async function ensureKnownFixtures(rdtPath: string, referenceDir: string): Promise<void> {
  const needsBootstrap = !existsSync(rdtPath) || !hasCsvFiles(referenceDir);
  if (!needsBootstrap) {
    return;
  }

  mkdirSync(DEFAULT_DOWNLOADS_DIR, { recursive: true });
  mkdirSync(dirname(rdtPath), { recursive: true });
  const zipPath = join(DEFAULT_DOWNLOADS_DIR, "known-reference.zip");

  await downloadToFile(DEFAULT_RDT_URL, rdtPath);
  await downloadToFile(DEFAULT_ZIP_URL, zipPath);

  rmSync(referenceDir, { force: true, recursive: true });
  mkdirSync(referenceDir, { recursive: true });

  let extracted = false;

  try {
    execFileSync("unzip", ["-o", zipPath, "-d", referenceDir], { stdio: "pipe" });
    extracted = true;
  } catch {
    extracted = false;
  }

  if (!extracted) {
    try {
      execFileSync(
        "python3",
        [
          "-c",
          "import zipfile, sys; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])",
          zipPath,
          referenceDir,
        ],
        { stdio: "pipe" },
      );
      extracted = true;
    } catch {
      extracted = false;
    }
  }

  if (!extracted) {
    throw new Error(
      `Unable to extract ${zipPath}. Install unzip or python3 zipfile support, and verify KNOWN_CODEPLUG_ZIP_URL is a valid ZIP.`,
    );
  }
}

function walkFiles(root: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(root)) {
    const full = join(root, entry);
    const s = statSync(full);
    if (s.isDirectory()) {
      out.push(...walkFiles(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

function findReferenceFile(referenceRoot: string, pattern: RegExp): string {
  const files = walkFiles(referenceRoot);
  const hit = files.find((file) => pattern.test(file));
  if (!hit) {
    throw new Error(`Unable to find reference CSV matching ${pattern} in ${referenceRoot}`);
  }
  return hit;
}

function parseCsv(text: string): CsvRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    return [];
  }

  const headers = splitCsvLine(lines[0]);
  const rows: CsvRow[] = [];

  for (let index = 1; index < lines.length; index += 1) {
    const values = splitCsvLine(lines[index]);
    const row: CsvRow = {};
    for (let col = 0; col < headers.length; col += 1) {
      row[headers[col]] = values[col] ?? "";
    }
    rows.push(row);
  }

  return rows;
}

function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const ch = line[index];
    if (ch === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += ch;
  }

  values.push(current);
  return values.map((value) => value.trim());
}

function extractNameColumn(rows: CsvRow[], candidates: string[]): string[] {
  if (rows.length === 0) {
    return [];
  }

  const headers = Object.keys(rows[0]);
  const lowerMap = new Map(headers.map((header) => [header.toLowerCase(), header]));

  for (const candidate of candidates) {
    const header = lowerMap.get(candidate.toLowerCase());
    if (header) {
      return rows
        .map((row) => row[header]?.trim() ?? "")
        .filter((name) => name.length > 0);
    }
  }

  throw new Error(`No supported name column found. Available headers: ${headers.join(", ")}`);
}

function overlapRatio(left: string[], right: string[]): number {
  if (left.length === 0 || right.length === 0) {
    return 0;
  }

  const lset = new Set(left.map((item) => item.toLowerCase()));
  const rset = new Set(right.map((item) => item.toLowerCase()));

  let hits = 0;
  for (const value of lset) {
    if (rset.has(value)) {
      hits += 1;
    }
  }

  return hits / Math.max(1, Math.min(lset.size, rset.size));
}

function normalizeName(value: string): string {
  const trimmed = value.trim();
  const withoutPrefix = trimmed.startsWith("'") ? trimmed.slice(1) : trimmed;
  return withoutPrefix.trim();
}

function uniqueNormalizedNames(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const normalized = normalizeName(value);
    const key = normalized.toLowerCase();
    if (!normalized || seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(normalized);
  }
  return out;
}

function writeGeneratedCsv(label: string, names: string[]): void {
  mkdirSync(GENERATED_OUTPUT_DIR, { recursive: true });
  const filePath = join(GENERATED_OUTPUT_DIR, `${label}.generated.csv`);
  const lines = ["name", ...names.map((name) => quoteCsv(name))];
  writeFileSync(filePath, `${lines.join("\n")}\n`, "utf-8");
}

function quoteCsv(value: string): string {
  const escaped = value.replaceAll('"', '""');
  return `"${escaped}"`;
}

describe("Known codeplug integration", () => {
  const rdtPath = process.env.KNOWN_CODEPLUG_RDT ?? DEFAULT_RDT_PATH;
  const referenceDir = process.env.KNOWN_CODEPLUG_CSV_DIR ?? DEFAULT_REFERENCE_DIR;
  const strictMode = process.env.KNOWN_CODEPLUG_STRICT === "1";
  const fixturesPresent = existsSync(rdtPath) && existsSync(referenceDir);

  const caseFn = fixturesPresent || strictMode ? it : it.skip;

  caseFn("compares parsed data with known CSV extracts", async () => {

    await ensureKnownFixtures(rdtPath, referenceDir);

    let rdtBytes: Uint8Array;
    try {
      rdtBytes = new Uint8Array(readFileSync(rdtPath));
    } catch {
      throw new Error(`Missing known fixture RDT at ${rdtPath}. Place your sample there or set KNOWN_CODEPLUG_RDT.`);
    }

    try {
      statSync(referenceDir);
    } catch {
      throw new Error(`Missing reference CSV dir at ${referenceDir}. Place CSV exports there or set KNOWN_CODEPLUG_CSV_DIR.`);
    }

    const parsed = parseCodeplug("known.rdt", rdtBytes);

    const checks: DatasetCheck[] = [
      {
        label: "channels",
        parsedNames: parsed.channels.map((channel) => channel.name),
        parsedCount: parsed.channels.length,
        filePattern: /channels.*\.csv$/i,
        headerCandidates: ["channel name", "name", "channel"],
      },
      {
        label: "contacts",
        parsedNames: parsed.contacts.map((contact) => contact.name),
        parsedCount: parsed.contacts.length,
        filePattern: /contacts.*\.csv$/i,
        headerCandidates: ["contact name", "name", "contact"],
      },
      {
        label: "zones",
        parsedNames: parsed.zones.map((zone) => zone.name),
        parsedCount: parsed.zones.length,
        filePattern: /zones.*\.csv$/i,
        headerCandidates: ["zone name", "name", "zone"],
      },
      {
        label: "groups",
        parsedNames: parsed.groupLists.map((group) => group.name),
        parsedCount: parsed.groupLists.length,
        filePattern: /(group|rx[\s_-]*group).*\.csv$/i,
        headerCandidates: ["rx group list name", "rx group name", "group name", "name", "group"],
      },
      {
        label: "scanlists",
        parsedNames: parsed.scanLists.map((scan) => scan.name),
        parsedCount: parsed.scanLists.length,
        filePattern: /scan.*\.csv$/i,
        headerCandidates: ["scan list name", "scanlist name", "name", "scan list", "scanlist"],
      },
    ];

    for (const check of checks) {
      const referencePath = findReferenceFile(referenceDir, check.filePattern);
      const rows = parseCsv(readFileSync(referencePath, "utf-8"));
      const referenceNames = extractNameColumn(rows, check.headerCandidates);
      const normalizedParsedNames = uniqueNormalizedNames(check.parsedNames);
      const normalizedReferenceNames = uniqueNormalizedNames(referenceNames);

      writeGeneratedCsv(check.label, check.parsedNames);

      const countDelta = Math.abs(normalizedReferenceNames.length - normalizedParsedNames.length);
      const countTolerance = Math.max(2, Math.ceil(normalizedReferenceNames.length * 0.02));
      expect(
        countDelta,
        `${check.label} unique count mismatch: parsed=${normalizedParsedNames.length}, reference=${normalizedReferenceNames.length}, file=${referencePath}`,
      ).toBeLessThanOrEqual(countTolerance);

      const ratio = overlapRatio(normalizedParsedNames, normalizedReferenceNames);
      expect(
        ratio,
        `${check.label} name overlap too low (${ratio.toFixed(3)}). See generated CSV in ${GENERATED_OUTPUT_DIR}`,
      ).toBeGreaterThanOrEqual(0.9);
    }
  });
});
