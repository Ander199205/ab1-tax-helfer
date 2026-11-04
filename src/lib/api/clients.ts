import type { Category, CategoryInput, Receipt, ReceiptInput, TaxYear, TaxYearInput } from "@/lib/types";
import { createCrudClient } from "./http";

export const taxYearsApi = createCrudClient<TaxYear, TaxYearInput>("/api/tax-years");
export const receiptsApi = createCrudClient<Receipt, ReceiptInput>("/api/receipts");
export const categoriesApi = createCrudClient<Category, CategoryInput>("/api/categories");
