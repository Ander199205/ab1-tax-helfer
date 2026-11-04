import { updateAccount } from "@/lib/auth/admin-handlers";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const { id } = await params;
  return updateAccount(request, id);
}
