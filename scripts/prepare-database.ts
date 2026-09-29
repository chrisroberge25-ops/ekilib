import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(name: string) {
  if (!existsSync(name)) return;
  for (const line of readFileSync(name, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

if (!process.env.DATABASE_URL) process.env.DATABASE_URL = "file:./dev.db";

const postgres = process.env.DATABASE_URL.startsWith("postgres");
const schemaPath = resolve("prisma/schema.prisma");
let schema = readFileSync(schemaPath, "utf8");
schema = schema.replace(/provider\s*=\s*"(sqlite|postgresql)"/, `provider = "${postgres ? "postgresql" : "sqlite"}"`);
schema = schema.replace(/\n\s*directUrl\s*=\s*env\("DATABASE_URL_UNPOOLED"\)/, "");
if (postgres && process.env.DATABASE_URL_UNPOOLED) {
  schema = schema.replace(
    /url\s*=\s*env\("DATABASE_URL"\)/,
    'url      = env("DATABASE_URL")\n  directUrl = env("DATABASE_URL_UNPOOLED")',
  );
}
writeFileSync(schemaPath, schema);

execSync("npx prisma generate", { stdio: "inherit" });

if (process.argv.includes("--generate-only")) process.exit(0);

const pushEnv = { ...process.env };
if (postgres && process.env.DATABASE_URL_UNPOOLED) {
  pushEnv.DATABASE_URL = process.env.DATABASE_URL_UNPOOLED;
}
execSync("npx prisma db push --skip-generate", {
  stdio: "inherit",
  env: pushEnv,
});
execSync("npx tsx prisma/seed.ts", { stdio: "inherit", env: process.env });
