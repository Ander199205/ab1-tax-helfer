import { login } from "@/lib/auth/handlers";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return login(request);
}
