import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { hash } from "@/lib/hash";
import { PrismaClient } from "../generated/prisma/client";

const pool = new Pool({
  connectionString: `${process.env.DATABASE_URL}`,
});
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

const data = {
  branches: [
    { code: "RJ", name: "Rio de Janeiro" },
    { code: "SP", name: "São Paulo" },
    { code: "CAM", name: "Campinas" },
  ],
  admins: [
    {
      name: "Administrador",
      email: "admin@gmail.com",
      password: "1234567Aa!",
      role: "ADMIN",
      status: "ACTIVE",
    },
  ],
};

async function main() {
  // ── Branches ──

  const branchRecords: { id: string; code: string; name: string }[] = [];

  for (const b of data.branches) {
    const branch = await db.branch.upsert({
      where: { code: b.code },
      update: { name: b.name },
      create: { code: b.code, name: b.name },
    });
    branchRecords.push({ id: branch.id, code: branch.code, name: branch.name });
    console.log(`BRANCH ensured: ${branch.code} - ${branch.name}`);
  }

  const branchIds = branchRecords.map((b) => b.id);

  // ── Admin user ──

  for (const adminData of data.admins) {
    const existing = await db.user.findUnique({
      where: { email: adminData.email },
    });

    if (existing) {
      console.log(`User already exists: ${existing.email}`);
    } else {
      const hashedPassword = await hash().create(adminData.password);

      const user = await db.user.create({
        data: {
          name: adminData.name,
          email: adminData.email,
          password: hashedPassword,
          role: adminData.role,
          status: adminData.status,
        },
      });
      console.log(`Created ADMIN: ${user.email}`);
    }
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await db.$disconnect();
      await pool.end();
      process.exit();
    } catch (_) {
      // ignore
    }
  });
