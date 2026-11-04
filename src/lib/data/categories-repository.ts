import "server-only";
import type { CategoryInput, Category } from "@/lib/types";
import { createJsonRepository, type Repository } from "./repository";

export const categoriesRepository: Repository<Category, CategoryInput> = createJsonRepository<Category, CategoryInput>("categories");
