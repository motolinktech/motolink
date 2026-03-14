import pg from "pg";

const TABLE_NAMES = [
  "verification_tokens",
  "history_traces",
  "client_blocks",
  "payment_requests",
  "invites",
  "work_shift_slots",
  "commercial_conditions",
  "plannings",
  "events",
  "deliverymen",
  "clients",
  "groups",
  "regions",
  "branches",
  "users",
  "sessions",
];

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  allowExitOnIdle: true,
});

export async function cleanDatabase() {
  await pool.query(`TRUNCATE ${TABLE_NAMES.join(", ")} RESTART IDENTITY CASCADE`);
}
