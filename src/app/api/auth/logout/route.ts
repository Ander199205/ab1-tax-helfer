import { logout } from "@/lib/auth/handlers";

export const dynamic = "force-dynamic";

export async function POST() {
  return logout();
}
