import { receiptsHandlers } from "@/lib/api/handlers";

export const dynamic = "force-dynamic";

export async function GET() {
  return receiptsHandlers.list();
}

export async function POST(request: Request) {
  return receiptsHandlers.create(request);
}
