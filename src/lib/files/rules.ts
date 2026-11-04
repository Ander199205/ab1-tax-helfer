// Reglas de los archivos adjuntos, compartidas por cliente y servidor (decisiones D1–D3 de la fase 3).
import { FILE_TYPES, type FileType } from "@/lib/types";

export const MAX_FILES = 5;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const FILE_EXTENSIONS: Record<FileType, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
/** Valor para `<input type="file" accept>`. */
export const ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp";

export const isImage = (type: FileType) => type !== "application/pdf";

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) =>
  signature.every((b, i) => bytes[offset + i] === b);

/**
 * Tipo real del archivo según sus primeros bytes, o null si no es PDF, JPG, PNG ni WebP.
 * No se fía de la extensión ni del tipo que manda el navegador.
 */
export function detectType(bytes: Uint8Array): FileType | null {
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf"; // %PDF-
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
  return null;
}

/** Comprobación previa en el navegador (por tipo declarado y tamaño). El servidor vuelve a mirar los bytes. */
export function checkFiles(files: { name: string; size: number; type: string }[], alreadyAttached: number): string | null {
  if (files.length === 0) return null;
  if (alreadyAttached + files.length > MAX_FILES) {
    return `Höchstens ${MAX_FILES} Dateien pro Beleg. Es sind schon ${alreadyAttached}.`;
  }
  for (const f of files) {
    if (f.size === 0) return `„${f.name}“ ist leer.`;
    if (f.size > MAX_FILE_BYTES) return `„${f.name}“ ist zu groß (höchstens 10 MB).`;
    if (f.type && !(FILE_TYPES as readonly string[]).includes(f.type)) {
      return `„${f.name}“: Erlaubt sind PDF, JPG, PNG und WebP.`;
    }
  }
  return null;
}

const sizeFormat = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 });
/** 1234567 → «1,2 MB» */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${sizeFormat.format(bytes / 1024)} KB`;
  return `${sizeFormat.format(bytes / 1024 / 1024)} MB`;
}

export const fileCountLabel = (n: number) => (n === 1 ? "1 Datei" : `${n} Dateien`);
