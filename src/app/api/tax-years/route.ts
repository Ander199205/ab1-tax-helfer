import { taxYearsHandlers } from "@/lib/api/handlers";

export const dynamic = "force-dynamic";

export async function GET() {
  return taxYearsHandlers.list();
}

export async function POST(request: Request) {
  return taxYearsHandlers.create(request);
}
