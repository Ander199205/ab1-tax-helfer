import { categoriesHandlers } from "@/lib/api/handlers";

export const dynamic = "force-dynamic";

export async function GET() {
  return categoriesHandlers.list();
}

export async function POST(request: Request) {
  return categoriesHandlers.create(request);
}
