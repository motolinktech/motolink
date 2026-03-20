import "dotenv/config";
import { execSync } from "node:child_process";
import { readFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getApp, getApps, initializeApp } from "firebase/app";
import { deleteObject, getMetadata, getStorage, listAll, ref, uploadBytes } from "firebase/storage";

const MAX_BACKUPS = 2;
const STORAGE_PATH = "backups";

function getFirebaseStorage() {
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };

  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  return getStorage(app);
}

function parseDatabaseUrl(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parsed.port || "5432",
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.slice(1),
  };
}

function runPgDump(): string {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  const { host, port, user, password, database } = parseDatabaseUrl(databaseUrl);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `backup-${timestamp}.sql`;
  const filePath = join(tmpdir(), fileName);

  console.log(`Running pg_dump for database "${database}"...`);

  execSync(`pg_dump -h ${host} -p ${port} -U ${user} -d ${database} -f ${filePath}`, {
    env: { ...process.env, PGPASSWORD: password },
    stdio: "inherit",
  });

  console.log(`Dump saved to ${filePath}`);
  return filePath;
}

async function cleanOldBackups(storage: ReturnType<typeof getStorage>) {
  const backupsRef = ref(storage, STORAGE_PATH);
  const { items } = await listAll(backupsRef);

  if (items.length < MAX_BACKUPS) {
    console.log(`Found ${items.length} existing backup(s), no cleanup needed`);
    return;
  }

  const metadataList = await Promise.all(
    items.map(async (item) => ({
      ref: item,
      metadata: await getMetadata(item),
    })),
  );

  metadataList.sort((a, b) => {
    const timeA = new Date(a.metadata.timeCreated).getTime();
    const timeB = new Date(b.metadata.timeCreated).getTime();
    return timeA - timeB;
  });

  const toDelete = metadataList.slice(0, metadataList.length - MAX_BACKUPS + 1);

  for (const item of toDelete) {
    console.log(`Deleting old backup: ${item.ref.name}`);
    await deleteObject(item.ref);
  }
}

async function uploadBackup(storage: ReturnType<typeof getStorage>, filePath: string) {
  const fileName = filePath.split("/").pop()!;
  const storageRef = ref(storage, `${STORAGE_PATH}/${fileName}`);
  const fileBuffer = readFileSync(filePath);

  console.log(`Uploading ${fileName} to Firebase Storage...`);
  await uploadBytes(storageRef, fileBuffer);
  console.log("Upload complete");
}

async function main() {
  const storage = getFirebaseStorage();
  const filePath = runPgDump();

  try {
    await cleanOldBackups(storage);
    await uploadBackup(storage, filePath);
    console.log("Backup completed successfully");
  } finally {
    unlinkSync(filePath);
    console.log("Local temp file cleaned up");
  }
}

main()
  .catch((err) => {
    console.error("Backup failed:", err);
    process.exitCode = 1;
  })
  .finally(() => {
    process.exit();
  });
