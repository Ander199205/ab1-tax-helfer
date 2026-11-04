import { uploadFiles } from "@/lib/api/files-handlers";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  return uploadFiles(request, id);
}
