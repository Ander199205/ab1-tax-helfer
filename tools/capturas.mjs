#!/usr/bin/env node
// Capturas y comprobaciones rápidas de ab1 Tax Helfer (copiado de ab1web/tools/capturas.mjs).
// Uso con la app en marcha (npm run dev o npm start):
//   node tools/capturas.mjs --url http://localhost:3000 [--login correo:contraseña] [--out .capturas] [--anchos 375,768,1200,1440] [--sin-capturas] / /belege …
// --login: inicia sesión antes (por defecto, la cuenta de demostración muster@beispiel.de; ver tools/admin.mjs demo).
// Sin rutas: revisa todas las secciones de src/lib/navigation.ts.
// La interfaz solo está en alemán: --idiomas no se usa (se deja por compatibilidad con ab1web).
//
// Primero imprime un informe en texto (barato en tokens); las capturas son JPEG
// a escala 1, calidad 55 y como máximo 1800 px de alto, para mirarlas solo si el
// informe no basta.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  ({ chromium } = await import("playwright"));
}

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return def;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};
const url = opt("url", "http://localhost:3000");
const [loginEmail, loginPassword] = opt("login", "muster@beispiel.de:Demo-Muster-2026!").split(/:(.*)/s);
const out = path.resolve(opt("out", ".capturas"));
const anchos = opt("anchos", "375,768,1200,1440").split(",").map(Number);
const idiomas = opt("idiomas", "de").split(",");
const sinCapturas = args.includes("--sin-capturas");
const paginas = args.filter((a) => !a.startsWith("--"));

if (paginas.length === 0) {
  const nav = fs.readFileSync("src/lib/navigation.ts", "utf8");
  for (const m of nav.matchAll(/href: "([^"]+)"/g)) paginas.push(m[1]);
  paginas.push("/konto"); // «Verwaltung» solo con --login de administrador
}
const base = url.replace(/\/$/, "");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
// Sesión (fase 4a): sin ella todas las páginas llevan a «Anmelden».
const loginRes = await fetch(`${base}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: loginEmail, password: loginPassword }),
});
if (!loginRes.ok) {
  console.error(`✗ no se pudo iniciar sesión como ${loginEmail} (${loginRes.status}). ¿Faltan los datos de demostración? node tools/admin.mjs demo`);
  process.exit(1);
}
const sessionCookie = loginRes.headers.get("set-cookie").split(";")[0].split("=");
const externas = new Set();
let problemas = 0;

for (const pagina of paginas) {
  for (const idioma of idiomas) {
  for (const ancho of anchos) {
    const ctx = await browser.newContext({ viewport: { width: ancho, height: 900 }, deviceScaleFactor: 1 });
    await ctx.addCookies([{ name: sessionCookie[0], value: sessionCookie[1], url: base }]);
    await ctx.addInitScript((l) => { try { localStorage.setItem("ab1web-language-v2", l); } catch {} }, idioma);
    const page = await ctx.newPage();
    page.on("request", (r) => { if (!r.url().startsWith(base) && !r.url().startsWith("data:")) externas.add(r.url().split("?")[0]); });
    // Errores de JavaScript: una app de React puede cargar «bien» y mostrar solo «Application error».
    const erroresJs = [];
    page.on("pageerror", (e) => erroresJs.push(`error de JavaScript: ${e.message.slice(0, 160)}`));
    page.on("console", (m) => { if (m.type() === "error") erroresJs.push(`error en consola: ${m.text().slice(0, 160)}`); });
    await page.goto(base + pagina, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);

    const r = await page.evaluate(() => {
      const res = [];
      const de = document.documentElement;
      if (de.scrollWidth > de.clientWidth + 1) {
        const culpables = [...document.querySelectorAll("body *")]
          .filter((el) => el.getBoundingClientRect().right > de.clientWidth + 1)
          .slice(0, 3).map((el) => el.tagName.toLowerCase() + (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).join(".") : ""));
        res.push(`scroll horizontal (${de.scrollWidth}px > ${de.clientWidth}px): ${culpables.join(", ")}`);
      }
      if (!de.lang) res.push("falta lang en <html>");
      if (location.pathname === "/anmelden" && !document.title.startsWith("Anmelden · ")) res.push("redirigida a «Anmelden»: la sesión no vale");
      // Etiquetas HTML que se ven escritas (texto con <b> o <span> rellenado como texto plano)
      const etiquetas = document.body.innerText.match(/<\/?[a-z]+[^>]*>/gi);
      if (etiquetas) res.push(`etiqueta HTML visible como texto: ${[...new Set(etiquetas)].slice(0, 3).join(" ")}`);
      // Enlaces y botones de navegación partidos en dos líneas
      for (const el of document.querySelectorAll("nav a, nav button, header a, header button")) {
        const cs = getComputedStyle(el);
        if (cs.display === "none" || cs.visibility === "hidden" || !el.offsetParent || !el.textContent.trim()) continue;
        if (el.closest(".brand, [class*=logo]")) continue; // el logotipo va en dos líneas a propósito
        // Cuenta las líneas reales del texto (no el alto de la caja, que flex puede estirar)
        // Solo nodos de texto: un icono SVG al lado del texto no cuenta como otra línea.
        const lineas = new Set();
        const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        for (let t = tw.nextNode(); t; t = tw.nextNode()) {
          if (!t.textContent.trim()) continue;
          const rango = document.createRange();
          rango.selectNodeContents(t);
          for (const q of rango.getClientRects()) if (q.width > 0) lineas.add(Math.round(q.top));
        }
        if (lineas.size > 1) res.push(`texto partido en navegación: «${el.textContent.trim()}»`);
      }
      for (const img of document.querySelectorAll("img")) {
        if (!img.hasAttribute("alt")) res.push(`imagen sin alt: ${img.getAttribute("src")}`);
        if (!img.getAttribute("width") || !img.getAttribute("height")) res.push(`imagen sin width/height: ${img.getAttribute("src")}`);
      }
      // Objetivos táctiles pequeños (WCAG 2.5.8: 24 × 24 px como mínimo)
      if (window.innerWidth < 768) {
        for (const el of document.querySelectorAll("a, button, input, select, textarea")) {
          const b = el.getBoundingClientRect();
          if (b.width && b.height && (b.width < 24 || b.height < 24) && !el.closest("p, li")) res.push(`objetivo táctil < 24px: «${(el.textContent || el.getAttribute("aria-label") || el.tagName).trim().slice(0, 30)}» ${Math.round(b.width)}×${Math.round(b.height)}`);
        }
      }
      return res;
    });

    if (/Application error/.test(await page.evaluate(() => document.body.innerText))) r.push("la app muestra «Application error»");
    const unicos = [...new Set([...r, ...erroresJs])];
    problemas += unicos.length;
    console.log(`${unicos.length ? "✗" : "✓"} ${pagina} [${idioma}] @${ancho}px${unicos.length ? "\n   - " + unicos.join("\n   - ") : ""}`);

    if (!sinCapturas) {
      const alto = Math.min(await page.evaluate(() => Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)), 1800);
      const nombre = `${pagina === "/" ? "inicio" : pagina.replace(/^\//, "").replace(/[\\/]/g, "_")}-${idioma}-${ancho}.jpg`;
      await page.screenshot({ path: path.join(out, nombre), type: "jpeg", quality: 55, fullPage: true, clip: { x: 0, y: 0, width: ancho, height: alto } });
    }
    await ctx.close();
  }
  }
}

if (externas.size) { problemas += externas.size; console.log(`✗ peticiones a terceros (DSGVO):\n   - ${[...externas].join("\n   - ")}`); }
await browser.close();
console.log(`\n${problemas} problema(s). ${sinCapturas ? "" : `Capturas en ${path.relative(process.cwd(), out) || "."}/`}`);
process.exitCode = problemas ? 1 : 0;
