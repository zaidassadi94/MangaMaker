import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

// Fails if a provider-key-shaped string leaks into the built client bundle.
// Runs over .next/static (the code shipped to browsers).

// Distinctive, provider-specific shapes only — broad "base64-ish" patterns
// false-positive on minified framework identifiers.
const PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: "Google API key", re: /AIza[0-9A-Za-z_-]{35}/ },
  { name: "Anthropic key", re: /sk-ant-[A-Za-z0-9_-]{24,}/ },
  { name: "OpenAI key", re: /sk-(?:proj-)?[A-Za-z0-9]{32,}/ },
  { name: "fal key", re: /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}:[a-f0-9]{20,}/ },
  { name: "AWS access key", re: /AKIA[0-9A-Z]{16}/ },
];

// Also fail if the *actual* configured secret values leak into the bundle.
const SECRET_ENV_VARS = [
  "ANTHROPIC_API_KEY", "GOOGLE_API_KEY", "FAL_KEY",
  "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "DATABASE_AUTH_TOKEN",
  "UPSTASH_REDIS_REST_TOKEN",
];
const LEAKY_VALUES = SECRET_ENV_VARS.map((k) => process.env[k]).filter((v): v is string => typeof v === "string" && v.length >= 12);

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  let entries: string[] = [];
  try {
    entries = await readdir(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry);
    const s = await stat(full);
    if (s.isDirectory()) out.push(...(await walk(full)));
    else if (/\.(js|mjs|cjs|txt|map|json)$/.test(entry)) out.push(full);
  }
  return out;
}

async function main() {
  const target = path.join(process.cwd(), ".next", "static");
  const files = await walk(target);
  if (files.length === 0) {
    console.log("• No built client bundle found (.next/static). Run `pnpm build` first. Skipping.");
    return;
  }

  const findings: string[] = [];
  for (const file of files) {
    const content = await readFile(file, "utf8").catch(() => "");
    for (const { name, re } of PATTERNS) {
      const m = content.match(re);
      if (m) findings.push(`${name} in ${path.relative(process.cwd(), file)} → ${m[0].slice(0, 12)}…`);
    }
    for (const value of LEAKY_VALUES) {
      if (content.includes(value)) findings.push(`configured secret value in ${path.relative(process.cwd(), file)}`);
    }
  }

  if (findings.length > 0) {
    console.error("✗ Potential secrets found in client bundle:");
    for (const f of findings) console.error("  - " + f);
    process.exit(1);
  }
  console.log(`✓ Scanned ${files.length} client files — no key-shaped strings found.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
