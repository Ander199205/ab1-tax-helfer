import { createAccount, listAccounts } from "@/lib/auth/admin-handlers";

export const dynamic = "force-dynamic";

export async function GET() {
  return listAccounts();
}

export async function POST(request: Request) {
  return createAccount(request);
}
