# Checklist de calidad — Tax Organizer (app)

Derivada de la checklist de `ab1web-calidad` (web). Se quita lo que es de web pública (SEO, hreflang, Open Graph)
y se añade lo propio de una app con datos. ● = bloqueante.

## A. Diseño y responsive
- [ ] A1 ● Colores y radios con variables de shadcn; nada de colores sueltos.
- [ ] A2 ● Sin scroll horizontal de página a 375, 768, 1200 y 1440 px.
- [ ] A3 ● Navegación y botones sin texto partido; barras de acciones con `flex-wrap` en móvil.
- [ ] A4 Estados hover, focus-visible, deshabilitado y cargando en botones y campos.
- [ ] A5 Estados vacíos, de error y de carga diseñados (no pantallas en blanco).

## B. Accesibilidad (WCAG 2.2 AA)
- [ ] B1 ● Contraste de texto ≥ 4,5:1 (grande ≥ 3:1); bordes de campo, iconos y foco ≥ 3:1.
- [ ] B2 ● Cada campo con `<Label>`; errores asociados al campo y legibles por lector de pantalla.
- [ ] B3 ● Todo funciona con teclado; diálogos atrapan el foco y Escape los cierra.
- [ ] B4 `aria-label` en botones de icono; `aria-current` en navegación; zonas táctiles ≥ 24 px.

## C. Idioma y contenido (alemán)
- [ ] C1 ● Ningún texto visible en español o inglés (incluidos `aria-label`, mensajes de error y avisos).
- [ ] C2 ● Alemán natural, sin tratamiento directo hasta decidir «du»/«Sie».
- [ ] C3 ● Importes «1.234,56 €» y fechas «04.11.2026»; entrada de números alemanes aceptada.
- [ ] C4 ● Sin consejos fiscales ni promesas («absetzbar», «Steuern sparen», «garantiert»): StBerG y UWG.

## D. Datos y seguridad
- [ ] D1 ● Validación en `lib/<dominio>/rules.ts`, la misma en cliente y servidor.
- [ ] D2 ● Ningún dato real antes de la fase 4; `data/*.json` y `data/uploads/` fuera de git.
- [ ] D3 ● Ninguna petición a terceros (fuentes, analítica, CDN).
- [ ] D4 ● Errores del servidor sin detalles internos (rutas, trazas).
- [ ] D5 (desde la fase 3) Archivos: lista blanca de tipos, tamaño máximo, nombre aleatorio, fuera de `public/`.

## E. Técnica
- [ ] E1 ● `npx tsc --noEmit`, `npm run lint` y `npm run build` sin errores.
- [ ] E2 ● `node tools/capturas.mjs --url … --sin-capturas`: 0 problemas (incluye errores de JavaScript y de consola).
- [ ] E3 ● `npm audit --omit=dev` sin vulnerabilidades altas nuevas.
- [ ] E4 Dependencias nuevas solo con motivo escrito en el encargo.
