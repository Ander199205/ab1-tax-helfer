# CLAUDE.md — ab1 Tax Helfer

Aplicación web para **reunir y ordenar justificantes (Belege) por año fiscal y entregarlos a la asesoría fiscal**.
Primero uso y prueba internos; después, producto de venta para el mercado alemán.
**Organiza, no asesora** (el nombre lleva «Helfer», así que los textos deben dejarlo aún más claro): no calcula impuestos ni da recomendaciones fiscales (StBerG). Ver `docs/producto.md`.

**Estado:** fase 4a en revisión (inicio de sesión, cuentas de clientes separadas, SQLite). Fase 4b (cifrado, antivirus, copias) pendiente: **aún sin datos reales**. Plan de fases en `docs/producto.md`.

## Cómo trabajar

- Proceso: fábrica v2 (`fabrica/FABRICA.md`, prompts en `fabrica/PROMPT.md`). Cada encargo en `brain/encargos/<slug>.md` con sus evidencias.
- Memoria: `brain/decisiones.md` y `brain/lecciones.md` (leer por encabezados con `grep -n`).
- Mapa del código: Graphify (skill `/graphify`). Si existe `graphify-out/graph.json`, usar `graphify query "<pregunta>"`, `graphify path "A" "B"` o `graphify explain "X"` antes de buscar o leer archivos; tras cambiar código, `graphify update .` (sin coste de IA). Si no está instalado: `uv tool install graphifyy`. `graphify-out/` no se sube.
- Controles antes de fusionar: `npx tsc --noEmit`, `npm run lint`, `npm run build` y, con la app en marcha, `node tools/capturas.mjs --url http://localhost:3000 --sin-capturas` con 0 problemas.
- Tras `npm run build`, reinicia `npm start`: un servidor viejo sirve una versión anterior y da errores 400 en los archivos JS.
- Datos de demostración: `TAX_HELFER_DEMO=1 node tools/admin.mjs demo` (borra la base de datos local y carga 3 cuentas `@beispiel.de`: admin, muster, studio; contraseñas en `tools/admin.mjs`, **solo para local**). Se niega si hay cuentas reales.
- Primer administrador real: `node tools/admin.mjs crear-admin <email> "<Nombre>"`; contraseña olvidada: `node tools/admin.mjs restablecer <email>` o «Verwaltung».
- Pruebas (ejecutan `tools/admin.mjs demo` antes y después): `BASE=http://localhost:3000 node --test tools/pruebas-api.mjs` y `node tools/pruebas-flujos.mjs --url http://localhost:3000`.
- Ramas `feature/<slug>`; fusión con `git merge --no-ff`. Sin despliegue todavía.

## Pila (heredada de panel-contenido)

Next.js 15.5.28 (App Router, TS, `src/`), React 19, Tailwind v4 (config en `src/app/globals.css`), shadcn/ui (`new-york`, `neutral`, `lucide-react`; añadir con `npx shadcn@3.3.1 add <c>`), sonner, `cn` (de shadcn-ui). **Node ≥ 22.18** (las pruebas importan `.ts` directamente).
Datos en SQLite (`node:sqlite`, `data/app.db`, fuera de git) detrás de `Repository<T>`: `repositorio(ownerId)` solo ve los documentos de esa cuenta. Sesiones en la base de datos (cookie `__Host-th_session`, `HttpOnly`, `Secure`, `SameSite=Lax`); contraseñas con scrypt asíncrono (N=2^17). `src/middleware.ts`: todo cambio por la API debe venir de la propia app, y `no-store`; las subidas quedan fuera (Next recorta a 10 MB lo que pasa por el middleware) y comprueban el origen en su manejador.
- En local, usar Chrome o Firefox (Safari antiguo no guarda cookies `Secure` en http://localhost). En producción, siempre HTTPS.

## Mapa

```
src/app/(app)/      todo lo que necesita sesión (layout con requireUser): page.tsx (Übersicht) · steuerjahre/ · belege/ ·
                    kategorien/ · export/ (provisional) · konto/ · verwaltung/ («Kundenkonten», solo admin) · loading.tsx · error.tsx
src/app/anmelden/   inicio de sesión (fuera del grupo) · src/app/api/{tax-years,receipts,categories,auth,admin}
src/lib/db/database.ts  conexión SQLite y esquema (users, sessions, documents)
src/lib/auth/       password.ts (scrypt) · users.ts (cuentas y sesiones) · current-user.ts (cookie, requireUser) · handlers.ts · admin-handlers.ts
src/components/ui/      shadcn (no tocar a mano salvo necesidad)
src/components/layout/  app-sidebar, page-header, field-warning, placeholder-page
src/lib/navigation.ts   secciones de la barra lateral (textos en alemán)
src/lib/types.ts        dominio: TaxYear (+ checklist), Receipt, Category
src/lib/<dominio>/      tax-years/ receipts/ categories/: parse.ts + rules.ts (reglas compartidas cliente/servidor)
src/lib/money.ts        importes en céntimos; parseAmount/formatAmount en formato alemán
src/lib/files/rules.ts  archivos: tipos (por bytes), 5 × 10 MB, mensajes
src/lib/data/file-store.ts  disco: data/uploads/<uuid>.<ext> (ejemplos de solo lectura en data/seed/uploads/)
src/lib/api/files-handlers.ts  subir (multipart, 411/413/415), ver y quitar archivos; rutas en app/api/receipts/[id]/files/
src/components/<dominio>/  vistas cliente (tax-years, receipts, categories, overview)
src/lib/data/           repository.ts (contrato + implementación SQLite por cuenta)
src/lib/api/            crud-route.ts (createCrudHandlers: check/guard/beforeRemove, sección crítica, 415), handlers.ts (reglas entre colecciones), clients.ts, http.ts
src/lib/hooks/          use-crud.ts
src/lib/dates.ts        fechas en formato alemán (TT.MM.JJJJ)
data/seed/              datos ficticios (en git, incl. uploads/ de ejemplo) · data/*.json y data/uploads/ fuera de git
tools/capturas.mjs      informe y capturas con Playwright contra la app en marcha (inicia sesión: --login correo:contraseña)
tools/admin.mjs         demo · crear-admin · restablecer
tools/pruebas-api.mjs   pruebas de la API y de parseAmount (node --test)
tools/pruebas-flujos.mjs  recorridos en el navegador a 375 y 1440 px
tools/estado/           página de estado (plantilla, build.py, datos.json)
fabrica/  brain/  docs/
```

## Convenciones (las de panel-contenido)

- Archivos `kebab-case.tsx`, componentes `PascalCase`, exportaciones con nombre (salvo `page.tsx`/`layout.tsx`).
- `page.tsx`: server component con `dynamic = "force-dynamic"` cuando lee datos; empieza con `<PageHeader title description />`.
- Cliente → `src/lib/api/*` → `src/app/api/*` → `createCrudHandlers` → repositorio. Lógica propia como gancho, nunca en `route.ts`.
- Validación solo en `lib/<dominio>/rules.ts` (formulario y servidor). Errores `{ errors: { campo: mensaje } }`, avisos con `<FieldWarning>`.
- Tema claro, colores con variables de shadcn, fuentes del sistema (sin Google Fonts).
- Accesibilidad: etiqueta en cada campo, `aria-label` en botones de icono, `aria-current` en la navegación, contraste ≥ 4,5:1.

## Idioma (obligatorio)

- Código, comentarios y documentación: español de España.
- **Interfaz: alemán** natural, escrito en alemán. Se tutea con «du» (como la web de ab1web); nunca «Sie». La empresa habla en «wir».
- Importes y fechas en formato alemán: «1.234,56 €», «04.11.2026».

## Reglas

- Ningún dato real (personal o fiscal) hasta que la fase 4b esté aprobada (cifrado, antivirus, copias). Solo datos ficticios.
- Los módulos de `src/lib/db`, `src/lib/auth/{password,users}.ts` y `src/lib/data/repository.ts` usan imports relativos con `.ts` y sin `server-only`: también los cargan `tools/*.mjs`.
- Nada de terceros sin consentimiento (fuentes, analítica, CDNs): DSGVO.
- Sin cálculos de impuestos, consejos fiscales ni promesas («steuerlich absetzbar», «Steuern sparen»…): StBerG y UWG.
- `robots: noindex` mientras sea uso interno.

## Vista previa y página de estado

- **En directo:** con `npm start` (puerto 3000) en marcha, avisar del puerto a la app de Claude para que Ander lo abra en la vista previa.
- **Página de estado:** https://claude.ai/artifact/YJ6zEvrmgD1QPZUjXhrBVy (privada). Al cerrar cada encargo:
  1. Edita `tools/estado/datos.json` (hechos, pendientes, decisiones, fecha y commit de main).
  2. Con la app en marcha: `node tools/capturas.mjs --url http://localhost:3000 > tools/estado/informe.txt`
  3. `python3 tools/estado/build.py tools/estado . tools/estado/informe.txt`
  4. Publica `tools/estado/estado-tax-helfer.html` con el Artifact tool pasando esa `url` (misma dirección).
- Generador copiado de `ab1web/tools/estado/` (misma plantilla).
