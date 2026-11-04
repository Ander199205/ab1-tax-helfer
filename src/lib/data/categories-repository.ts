import type { Category, CategoryInput } from "../types.ts";
import { createSqlRepository } from "./repository.ts";

export const categoriesRepository = createSqlRepository<Category, CategoryInput>("categories");
