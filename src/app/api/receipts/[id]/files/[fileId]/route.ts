import { removeFile, serveFile } from "@/lib/api/files-handlers";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string; fileId: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { id, fileId } = await params;
  return serveFile(id, fileId);
}

export async function DELETE(_request: Request, { params }: Context) {
  const { id, fileId } = await params;
  return removeFile(id, fileId);
}
