import { ensureSchema } from "@/lib/db/ensure";

// Idempotently create all tables. Safe to run repeatedly.
async function main() {
  await ensureSchema();
  console.log("✓ Schema ready (tables created if missing).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
