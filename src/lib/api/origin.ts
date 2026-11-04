// ¿La petición que cambia algo viene de otra web? El navegador manda Sec-Fetch-Site y Origin y no se
// pueden falsificar desde otra página. Sin esas cabeceras (pruebas, curl) se acepta: igual hace falta sesión.
const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);

export function isCrossSite(request: Request): boolean {
  if (SAFE.has(request.method)) return false;
  const site = request.headers.get("sec-fetch-site");
  const origin = request.headers.get("origin");
  const ownOrigin = new URL(request.url).origin;
  return (site !== null && site !== "same-origin" && site !== "none") || (origin !== null && origin !== ownOrigin);
}

export const CROSS_SITE_ERROR = { error: "Anfrage von einer anderen Seite abgelehnt." };
