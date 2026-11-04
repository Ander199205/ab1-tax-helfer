import "server-only";
import type { Receipt, ReceiptInput } from "@/lib/types";
import { createJsonRepository, type Repository } from "./repository";

export const receiptsRepository: Repository<Receipt, ReceiptInput> = createJsonRepository<Receipt, ReceiptInput>(
  "receipts",
  {
    // Los archivos no vienen en la entrada: un Beleg nuevo empieza sin archivos.
    onCreate: (receipt) => ({ ...receipt, files: [] }),
    // Un PATCH normal no puede tocar `files`: parseReceiptInput no los incluye y el repositorio
    // conserva los campos que no vienen en el cambio. Solo files-handlers.ts los escribe.
  },
);
