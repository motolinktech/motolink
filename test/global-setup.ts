import { execSync } from "node:child_process";

const ENV = {
  ...process.env,
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5433/test?schema=public",
};

function run(cmd: string) {
  execSync(cmd, { stdio: "inherit", env: ENV });
}

export function setup() {
  console.log("\n[test-setup] Starting test database container...");
  run("docker compose up -d test-db --wait --no-deps");

  console.log("[test-setup] Running prisma generate...");
  run("pnpm prisma generate");

  console.log("[test-setup] Running prisma migrate deploy...");
  run("pnpm prisma migrate deploy");

  console.log("[test-setup] Database ready.\n");
}

export function teardown() {
  console.log("\n[test-teardown] Stopping test database container...");
  run("docker compose stop test-db");
  run("docker compose rm -f -v test-db");
  console.log("[test-teardown] Done.\n");
}
