import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const ledgerDir = resolve(process.argv[2] ?? "witness");
const namePattern = /^(\d{12})\.json$/;
const hashPattern = /^[0-9a-f]{64}$/;
const timestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const expectedKeys = [
  "destruction_authority_root_hash",
  "issued_at",
  "prev_hash",
  "schema_version",
  "seq",
];

function fail(message) {
  throw new Error(`FAIL CLOSED: ${message}`);
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  }
  return value;
}

function digest(record) {
  return createHash("sha256")
    .update(JSON.stringify(canonical(record)), "utf8")
    .digest("hex");
}

try {
  const entries = (await readdir(ledgerDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();

  if (entries.length === 0) fail("witness history is missing");
  if (entries.some((name) => !namePattern.test(name))) {
    fail("unexpected file in witness directory");
  }

  let prior = null;
  for (let index = 0; index < entries.length; index += 1) {
    const expectedSeq = index + 1;
    const expectedName = `${String(expectedSeq).padStart(12, "0")}.json`;
    const name = entries[index];
    if (name !== expectedName) fail(`missing or out-of-order record at ${expectedName}`);

    let record;
    try {
      record = JSON.parse(await readFile(resolve(ledgerDir, name), "utf8"));
    } catch {
      fail(`${name} is not valid JSON`);
    }

    if (!record || Array.isArray(record) || typeof record !== "object") {
      fail(`${name} is not a JSON object`);
    }
    const keys = Object.keys(record).sort();
    if (JSON.stringify(keys) !== JSON.stringify(expectedKeys)) {
      fail(`${name} has missing or forbidden fields`);
    }
    if (record.schema_version !== "1") fail(`${name} has an unsupported schema`);
    if (!Number.isSafeInteger(record.seq) || record.seq !== expectedSeq) {
      fail(`${name} sequence does not match its path`);
    }
    if (!hashPattern.test(record.prev_hash)) fail(`${name} has an invalid prev_hash`);
    if (!hashPattern.test(record.destruction_authority_root_hash)) {
      fail(`${name} has an invalid root commitment`);
    }
    if (!timestampPattern.test(record.issued_at) || Number.isNaN(Date.parse(record.issued_at))) {
      fail(`${name} has an invalid issued_at`);
    }

    const expectedPrev = prior === null ? "0".repeat(64) : digest(prior);
    if (record.prev_hash !== expectedPrev) fail(`${name} breaks the hash chain`);
    prior = record;
  }

  console.log(`PASS: ${entries.length} records; high-water seq=${entries.length}; head=${digest(prior)}`);
} catch (error) {
  const message = error instanceof Error ? error.message : "unknown verifier error";
  console.error(message.startsWith("FAIL CLOSED:") ? message : `FAIL CLOSED: ${message}`);
  process.exitCode = 1;
}
