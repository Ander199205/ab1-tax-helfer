# CLAUDE.md — abWeb Tax Organizer

Aplicación web para **reunir y ordenar justificantes (Belege) por año fiscal y entregarlos a la asesoría fiscal**.
Primero uso y prueba internos; después, producto de venta para el mercado alemán.
**Organiza, no asesora:** no calcula impuestos ni da recomendaciones fiscales (StBerG). Ver `docs/producto.md`.

**Estado:** fase 1 terminada (base vacía que arranca). Plan de fases en `docs/producto.md`.

## Cómo trabajar

- Proceso: fábrica v2 (`fabrica/FABRICA.md`, prompts en `fabrica/PROMPT.md`). Cada encargo en `brain/encargos/<slug>.md` con sus evidencias.
- Memoria: `brain/decisiones.md` y `brain/lecciones.md` (leer por encabezados con `grep -n`).
- Mapa del código: Graphify (skill `/graphify`). Si existe `graphify-out/graph.json`, usar `graphify query "<pregunta>"`, `graphify path "A" "B"` o `graphify explain "X"` antes de buscar o leer archivos; tras cambiar código, `graphify update .` (sin coste de IA). Si no está instalado: `uv tool install graphifyy`. `graphify-out/` no se sube.
- Controles antes de fusionar: `npx tsc --noEmit`, `npm run lint`, `npm run build` y, con la app en marcha, `node tools/capturas.mjs --url http://localhost:3000 --sin-capturas` con 0 problemas.
- Tras `npm run build`, reinicia `npm start`: un servidor viejo sirve una versión anterior y da errores 400 en los archivos JS.
- Ramas `feature/<slug>`; fusión con `git merge --no-ff`. Sin despliegue todavía.

## Pila (heredada de panel-contenido)

Next.js 15.5.28 (App Router, TS, `src/`), React 19, Tailwind v4 (config en `src/app/globals.css`), shadcn/ui (`new-york`, `neutral`, `lucide-react`; añadir con `npx shadcn@3.3.1 add <c>`), sonner, `cn` (de shadcn-ui). Node ≥ 20.9.
Sin base de datos de momento: JSON en `data/` detrás de `Repository<T>` (`server-only`). Antes de datos reales se cambia por SQL (fase 4).

## Mapa

```
src/app/            page.tsx (Übersicht) · steuerjahre/ · belege/ · kategorien/ · export/   (de momento, páginas provisionales)
src/components/ui/      shadcn (no tocar a mano salvo necesidad)
src/components/layout/  app-sidebar, page-header, field-warning, placeholder-page
src/lib/navigation.ts   secciones de la barra lateral (textos en alemán)
src/lib/data/           repository.ts (contrato + implementación JSON), json-store.ts
src/lib/api/            crud-route.ts (createCrudHandlers), http.ts (cliente)
src/lib/hooks/          use-crud.ts
src/lib/dates.ts        fechas en formato alemán (TT.MM.JJJJ)
data/seed/              datos ficticios (en git) · data/*.json y data/uploads/ fuera de git
tools/capturas.mjs      informe y capturas con Playwright contra la app en marcha
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
- **Interfaz: alemán** natural, escrito en alemán. Forma de tratamiento («du» o «Sie»): **pendiente de decidir**; hasta entonces, textos sin tratamiento directo.
- Importes y fechas en formato alemán: «1.234,56 €», «04.11.2026».

## Reglas

- Ningún dato real (personal o fiscal) hasta la fase 4 (auth, datos por usuario, base de datos, cifrado). Solo datos ficticios.
- Nada de terceros sin consentimiento (fuentes, analítica, CDNs): DSGVO.
- Sin cálculos de impuestos, consejos fiscales ni promesas («steuerlich absetzbar», «Steuern sparen»…): StBerG y UWG.
- `robots: noindex` mientras sea uso interno.
