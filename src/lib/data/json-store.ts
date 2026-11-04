// Utilidades para leer y escribir colecciones JSON en la carpeta /data.
// Solo se usa en el servidor (route handlers y server components).
import "server-only";
import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

// Cola de escrituras por archivo para evitar que dos peticiones se pisen.
const queues = new Map<string, Promise<unknown>>();

/** Se ejecuta la primera vez que no existe `data/<name>.json`; devuelve datos heredados o null. */
export type Migrate<T> = () => Promise<T[] | null>;

const fileOf = (name: string) => path.join(DATA_DIR, `${name}.json`);

async function writeFile(name: string, items: unknown[]) {
  await fs.writeFile(fileOf(name), JSON.stringify(items, null, 2) + "\n", "utf8");
}

/** Lee `data/<name>.json` si existe; si no, devuelve null. */
export async function readOptionalCollection<T>(name: string): Promise<T[] | null> {
  try {
    return JSON.parse(await fs.readFile(fileOf(name), "utf8")) as T[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

/**
 * Lee `data/<name>.json`. Si no existe, lo crea a partir de `migrate` (datos heredados)
 * o, en su defecto, copiando `data/seed/<name>.json`.
 */
export async function readCollection<T>(name: string, migrate?: Migrate<T>): Promise<T[]> {
  const existing = await readOptionalCollection<T>(name);
  if (existing) return existing;

  const migrated = migrate ? await migrate() : null;
  if (migrated) {
    await writeFile(name, migrated);
    return migrated;
  }

  const seed = await fs.readFile(path.join(DATA_DIR, "seed", `${name}.json`), "utf8");
  await fs.writeFile(fileOf(name), seed, "utf8");
  return JSON.parse(seed) as T[];
}

/** Ejecuta `mutate` sobre la colección y guarda el resultado, en serie por archivo. */
export async function updateCollection<T, R>(
  name: string,
  mutate: (items: T[]) => { items: T[]; result: R },
  migrate?: Migrate<T>,
): Promise<R> {
  const previous = queues.get(name) ?? Promise.resolve();
  const next = previous
    .catch(() => undefined)
    .then(async () => {
      const items = await readCollection<T>(name, migrate);
      const { items: updated, result } = mutate(items);
      await writeFile(name, updated);
      return result;
    });
  queues.set(name, next);
  return next;
}

/** Lee `data/seed/<name>.json` (datos de ejemplo originales). */
export async function readSeed<T>(name: string): Promise<T[]> {
  return JSON.parse(await fs.readFile(path.join(DATA_DIR, "seed", `${name}.json`), "utf8")) as T[];
}
