// Archivos de un Beleg: subir (multipart), ver y quitar. Mismas reglas de año cerrado que los Belege.
import "server-only";
import { NextResponse } from "next/server";
import { deleteFile, readFile, saveFile } from "@/lib/data/file-store";
import { receiptsRepository } from "@/lib/data/receipts-repository";
import { detectType, MAX_FILE_BYTES, MAX_FILES, tooManyFilesMessage } from "@/lib/files/rules";
import { isClosed } from "@/lib/tax-years/rules";
import type { ReceiptFile, ReceiptInput } from "@/lib/types";
import { currentUser, unauthorized } from "@/lib/auth/current-user";
import { exclusive } from "./crud-route";
import { closedMessage, findYear } from "./handlers";

const NOT_FOUND = () => NextResponse.json({ error: "Beleg oder Datei nicht gefunden." }, { status: 404 });
const fileError = (message: string) => NextResponse.json({ error: message, errors: { files: message } }, { status: 400 });

// Los archivos no están en ReceiptInput (ningún PATCH normal los toca); aquí se escriben a propósito.
const withFiles = (files: ReceiptFile[]) => ({ files }) as unknown as Partial<ReceiptInput>;

/** Tope del cuerpo entero: 5 archivos de 10 MB más el margen del formato multipart. */
const MAX_BODY_BYTES = MAX_FILES * MAX_FILE_BYTES + 1024 * 1024;

export async function uploadFiles(request: Request, receiptId: string) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const receipts = receiptsRepository(user.id);
  if (!(request.headers.get("content-type") ?? "").startsWith("multipart/form-data")) {
    return NextResponse.json({ error: "Nur Datei-Uploads werden angenommen." }, { status: 415 });
  }
  // Antes de leer nada: sin tamaño declarado o con uno excesivo no se acepta (revisión D/E: un
  // envío de 300 MB llegaba entero a memoria). Los navegadores siempre mandan Content-Length con FormData.
  const declared = Number(request.headers.get("content-length"));
  if (!declared) return NextResponse.json({ error: "Die Dateigröße fehlt." }, { status: 411 });
  if (declared > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Zu große Datenmenge (höchstens 5 Dateien mit je 10 MB)." }, { status: 413 });
  }
  const existing = await receipts.get(receiptId);
  if (!existing) return NOT_FOUND();
  if (isClosed(await findYear(user.id, existing.year))) {
    return NextResponse.json({ error: closedMessage(existing.year) }, { status: 409 });
  }
  const form = await request.formData().catch(() => null);
  const uploads = (form?.getAll("files") ?? []).filter((v): v is File => v instanceof File);
  if (uploads.length === 0) return fileError("Wähle mindestens eine Datei aus.");

  return exclusive(async () => {
    const receipt = await receipts.get(receiptId);
    if (!receipt) return NOT_FOUND();
    if (isClosed(await findYear(user.id, receipt.year))) {
      return NextResponse.json({ error: closedMessage(receipt.year) }, { status: 409 });
    }
    const current = receipt.files ?? [];
    if (current.length + uploads.length > MAX_FILES) {
      return fileError(tooManyFilesMessage(current.length));
    }
    // Primero se comprueba todo; si un archivo falla, no se guarda ninguno.
    const checked: { file: File; bytes: Uint8Array; type: NonNullable<ReturnType<typeof detectType>> }[] = [];
    for (const file of uploads) {
      if (file.size === 0) return fileError(`„${file.name}“ ist leer.`);
      if (file.size > MAX_FILE_BYTES) return fileError(`„${file.name}“ ist zu groß (höchstens 10 MB).`);
      const bytes = new Uint8Array(await file.arrayBuffer());
      const type = detectType(bytes);
      if (!type) return fileError(`„${file.name}“: Erlaubt sind PDF, JPG, PNG und WebP.`);
      checked.push({ file, bytes, type });
    }
    const added: ReceiptFile[] = [];
    try {
      for (const { file, bytes, type } of checked) {
        const id = await saveFile(bytes, type);
        added.push({ id, name: file.name.slice(0, 200) || "Datei", type, size: file.size, uploadedAt: new Date().toISOString() });
      }
      const updated = await receipts.update(receiptId, withFiles([...current, ...added]));
      return NextResponse.json(updated, { status: 201 });
    } catch (error) {
      // Si algo falla a mitad, no quedan archivos huérfanos en disco.
      for (const file of added) await deleteFile(file).catch(() => undefined);
      throw error;
    }
  });
}

export async function serveFile(receiptId: string, fileId: string) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const receipt = await receiptsRepository(user.id).get(receiptId);
  const file = receipt?.files?.find((f) => f.id === fileId);
  if (!file) return NOT_FOUND();
  const bytes = await readFile(file);
  if (!bytes) return NOT_FOUND();
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": file.type,
      "Content-Length": String(bytes.length),
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
      // Defensa adicional para imágenes; a los PDF no se les pone: el visor del navegador no funciona con CSP sandbox.
      ...(file.type === "application/pdf" ? {} : { "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'" }),
    },
  });
}

export async function removeFile(receiptId: string, fileId: string) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const receipts = receiptsRepository(user.id);
  return exclusive(async () => {
    const receipt = await receipts.get(receiptId);
    const file = receipt?.files?.find((f) => f.id === fileId);
    if (!receipt || !file) return NOT_FOUND();
    if (isClosed(await findYear(user.id, receipt.year))) {
      return NextResponse.json({ error: closedMessage(receipt.year) }, { status: 409 });
    }
    // Primero el registro y después el disco: como mucho queda un archivo huérfano, nunca un registro sin archivo.
    const updated = await receipts.update(receiptId, withFiles(receipt.files.filter((f) => f.id !== fileId)));
    await deleteFile(file).catch((error) => console.error("Datei ließ sich nicht löschen", file.id, error));
    return NextResponse.json(updated);
  });
}
