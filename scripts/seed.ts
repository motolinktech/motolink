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
  users: [
    {
      name: "Gerente RJ",
      email: "gerente.rj@gmail.com",
      password: "1234567Aa!",
      role: "MANAGER",
      status: "ACTIVE",
      branchCode: "RJ",
    },
    {
      name: "Gerente SP",
      email: "gerente.sp@gmail.com",
      password: "1234567Aa!",
      role: "MANAGER",
      status: "ACTIVE",
      branchCode: "SP",
    },
    {
      name: "Gerente Campinas",
      email: "gerente.cam@gmail.com",
      password: "1234567Aa!",
      role: "MANAGER",
      status: "ACTIVE",
      branchCode: "CAM",
    },
    {
      name: "Usuário RJ Pendente",
      email: "user.rj.pending@gmail.com",
      password: "1234567Aa!",
      role: "USER",
      status: "PENDING",
      branchCode: "RJ",
    },
    {
      name: "Usuário RJ Bloqueado",
      email: "user.rj.blocked@gmail.com",
      password: "1234567Aa!",
      role: "USER",
      status: "BLOCKED",
      branchCode: "RJ",
    },
    {
      name: "Usuário SP Pendente",
      email: "user.sp.pending@gmail.com",
      password: "1234567Aa!",
      role: "USER",
      status: "PENDING",
      branchCode: "SP",
    },
    {
      name: "Usuário SP Bloqueado",
      email: "user.sp.blocked@gmail.com",
      password: "1234567Aa!",
      role: "USER",
      status: "BLOCKED",
      branchCode: "SP",
    },
    {
      name: "Usuário Campinas Pendente",
      email: "user.cam.pending@gmail.com",
      password: "1234567Aa!",
      role: "USER",
      status: "PENDING",
      branchCode: "CAM",
    },
    {
      name: "Usuário Campinas Bloqueado",
      email: "user.cam.blocked@gmail.com",
      password: "1234567Aa!",
      role: "USER",
      status: "BLOCKED",
      branchCode: "CAM",
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
    const user = await db.user.upsert({
      where: { email: adminData.email },
      update: {
        name: adminData.name,
        password: await hash().create(adminData.password),
        role: adminData.role,
        status: adminData.status,
        branches: branchIds,
      },
      create: {
        name: adminData.name,
        email: adminData.email,
        password: await hash().create(adminData.password),
        role: adminData.role,
        status: adminData.status,
        branches: branchIds,
      },
    });
    console.log(`User ensured: ${user.email}`);
  }

  // ── Manager users ──

  for (const userData of data.users) {
    const branchId = branchRecords.find((b) => b.code === userData.branchCode)!.id;
    const user = await db.user.upsert({
      where: { email: userData.email },
      update: {
        name: userData.name,
        password: await hash().create(userData.password),
        role: userData.role,
        status: userData.status,
        branches: [branchId],
      },
      create: {
        name: userData.name,
        email: userData.email,
        password: await hash().create(userData.password),
        role: userData.role,
        status: userData.status,
        branches: [branchId],
      },
    });
    console.log(`User ensured: ${user.email}`);
  }

  // ── Groups ──

  for (const branch of branchRecords) {
    await db.group.deleteMany({ where: { branchId: branch.id } });
    for (let i = 1; i <= 2; i++) {
      const group = await db.group.create({
        data: {
          name: `Grupo ${i} - ${branch.name}`,
          description: `Grupo ${i} da filial ${branch.name}`,
          branchId: branch.id,
        },
      });
      console.log(`GROUP created: ${group.name}`);
    }
  }

  // ── Regions ──

  const regionRecords: { id: string; branchId: string }[] = [];

  for (const branch of branchRecords) {
    await db.region.deleteMany({ where: { branchId: branch.id } });
    for (let i = 1; i <= 2; i++) {
      const region = await db.region.create({
        data: {
          name: `Região ${i} - ${branch.name}`,
          description: `Região ${i} da filial ${branch.name}`,
          branchId: branch.id,
        },
      });
      regionRecords.push({ id: region.id, branchId: branch.id });
      console.log(`REGION created: ${region.name}`);
    }
  }

  // ── Deliverymen ──

  for (const branch of branchRecords) {
    await db.deliveryman.deleteMany({ where: { branchId: branch.id } });

    const regionForBranch = regionRecords.find((r) => r.branchId === branch.id);

    const deliverymen = [
      {
        name: `Entregador 1 - ${branch.name}`,
        document: "123.456.789-00",
        phone: "(21) 99999-0001",
        contractType: "CLT",
        mainPixKey: "entregador1@pix.com",
        branchId: branch.id,
        regionId: regionForBranch?.id ?? null,
        isBlocked: false,
      },
      {
        name: `Entregador 2 - ${branch.name}`,
        document: "987.654.321-00",
        phone: "(21) 99999-0002",
        contractType: "PJ",
        mainPixKey: "entregador2@pix.com",
        branchId: branch.id,
        regionId: regionForBranch?.id ?? null,
        isBlocked: false,
      },
      {
        name: `Entregador Bloqueado - ${branch.name}`,
        document: "111.222.333-44",
        phone: "(21) 99999-0003",
        contractType: "CLT",
        mainPixKey: "bloqueado@pix.com",
        branchId: branch.id,
        regionId: regionForBranch?.id ?? null,
        isBlocked: true,
      },
    ];

    for (const d of deliverymen) {
      const deliveryman = await db.deliveryman.create({ data: d });
      console.log(`DELIVERYMAN created: ${deliveryman.name}${deliveryman.isBlocked ? " (BLOCKED)" : ""}`);
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
