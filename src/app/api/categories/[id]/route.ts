import { categoriesHandlers } from "@/lib/api/handlers";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const { id } = await params;
  return categoriesHandlers.update(request, id);
}

export async function DELETE(_request: Request, { params }: Context) {
  const { id } = await params;
  return categoriesHandlers.remove(id);
}
