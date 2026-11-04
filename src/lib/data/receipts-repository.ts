import type { Receipt, ReceiptInput } from "../types.ts";
import { createSqlRepository } from "./repository.ts";

export const receiptsRepository = createSqlRepository<Receipt, ReceiptInput>("receipts", {
  // Los archivos no vienen en la entrada: un Beleg nuevo empieza sin archivos.
  // Un PATCH normal no puede tocar `files`: parseReceiptInput no los incluye y `update` conserva
  // los campos que no vienen en el cambio. Solo files-handlers.ts los escribe.
  onCreate: (receipt) => ({ ...receipt, files: [] }),
});
