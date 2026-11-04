import "server-only";
import type { ReceiptInput, Receipt } from "@/lib/types";
import { createJsonRepository, type Repository } from "./repository";

export const receiptsRepository: Repository<Receipt, ReceiptInput> = createJsonRepository<Receipt, ReceiptInput>("receipts");
