import "server-only";
import type { TaxYearInput, TaxYear } from "@/lib/types";
import { createJsonRepository, type Repository } from "./repository";

export const taxYearsRepository: Repository<TaxYear, TaxYearInput> = createJsonRepository<TaxYear, TaxYearInput>("tax-years");
