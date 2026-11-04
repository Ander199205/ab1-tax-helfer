import type { TaxYear, TaxYearInput } from "../types.ts";
import { createSqlRepository } from "./repository.ts";

export const taxYearsRepository = createSqlRepository<TaxYear, TaxYearInput>("tax-years");
