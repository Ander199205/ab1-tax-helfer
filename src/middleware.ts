// Antes de cada petición a /api (fase 4a, revisión D/E):
// - un cambio (POST, PATCH, DELETE) solo se acepta si viene de la propia app (protege también el cierre
//   de sesión, que es una petición «simple», frente a otra web o un subdominio hermano);
// - ninguna respuesta de la API se guarda en caché (datos personales, contraseñas iniciales).
// Las subidas de archivos NO pasan por aquí: Next limita a 10 MB el cuerpo que atraviesa el middleware
// (llegaban vacías). files-handlers.ts hace la misma comprobación con isCrossSite.
import { NextResponse, type NextRequest } from "next/server";
import { CROSS_SITE_ERROR, isCrossSite } from "@/lib/api/origin";

export function middleware(request: NextRequest) {
  if (isCrossSite(request)) return NextResponse.json(CROSS_SITE_ERROR, { status: 403 });
  const response = NextResponse.next();
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export const config = { matcher: ["/api/((?!receipts/[^/]+/files).*)"] };
