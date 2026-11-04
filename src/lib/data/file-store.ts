// Archivos de los Belege en disco: data/uploads/<uuid>.<ext>, fuera de public/ y fuera de git.
// Los archivos de ejemplo viven en data/seed/uploads/ (en git) y solo se leen, nunca se borran.
import "server-only";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { FILE_EXTENSIONS } from "@/lib/files/rules";
import type { FileType, ReceiptFile } from "@/lib/types";

const UPLOADS = path.join(process.cwd(), "data", "uploads");
const SEED_UPLOADS = path.join(process.cwd(), "data", "seed", "uploads");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Nombre en disco a partir del id guardado; nunca a partir de algo que mande el navegador. */
function diskName(file: Pick<ReceiptFile, "id" | "type">) {
  if (!UUID.test(file.id)) throw new Error("Ungültige Datei-ID");
  return `${file.id}.${FILE_EXTENSIONS[file.type]}`;
}

export async function saveFile(bytes: Uint8Array, type: FileType): Promise<string> {
  await fs.mkdir(UPLOADS, { recursive: true });
  const id = randomUUID();
  await fs.writeFile(path.join(UPLOADS, `${id}.${FILE_EXTENSIONS[type]}`), bytes, { flag: "wx" });
  return id;
}

export async function readFile(file: ReceiptFile): Promise<Buffer | null> {
  for (const dir of [UPLOADS, SEED_UPLOADS]) {
    try {
      return await fs.readFile(path.join(dir, diskName(file)));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  return null;
}

/** Borra el archivo subido (los de ejemplo se quedan). */
export async function deleteFile(file: ReceiptFile): Promise<void> {
  await fs.rm(path.join(UPLOADS, diskName(file)), { force: true });
}
