import type { Category, CategoryInput, Receipt, ReceiptInput, TaxYear, TaxYearInput } from "@/lib/types";
import { createCrudClient, handle } from "./http";

export const taxYearsApi = createCrudClient<TaxYear, TaxYearInput>("/api/tax-years");
export const receiptsApi = createCrudClient<Receipt, ReceiptInput>("/api/receipts");
export const categoriesApi = createCrudClient<Category, CategoryInput>("/api/categories");

/** Archivos de un Beleg (multipart). Devuelven el Beleg actualizado. */
export const receiptFilesApi = {
  url: (receiptId: string, fileId: string) => `/api/receipts/${receiptId}/files/${fileId}`,
  upload(receiptId: string, files: File[]) {
    const form = new FormData();
    for (const file of files) form.append("files", file);
    return fetch(`/api/receipts/${receiptId}/files`, { method: "POST", body: form }).then((r) => handle<Receipt>(r));
  },
  remove(receiptId: string, fileId: string) {
    return fetch(`/api/receipts/${receiptId}/files/${fileId}`, { method: "DELETE" }).then((r) => handle<Receipt>(r));
  },
};
