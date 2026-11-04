import { taxYearsHandlers } from "@/lib/api/handlers";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const { id } = await params;
  return taxYearsHandlers.update(request, id);
}

export async function DELETE(_request: Request, { params }: Context) {
  const { id } = await params;
  return taxYearsHandlers.remove(id);
}
