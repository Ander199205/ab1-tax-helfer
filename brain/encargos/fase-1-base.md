# Encargo 1: base del producto (fase 1)

- Slug / rama: `main` (primer commit del repo; no hay rama anterior con la que comparar)
- Fecha: 04.11.2026 · Estado: aprobado por la fábrica, pendiente de subir (el repo de GitHub aún no existe)
- Tamaño: normal

## 1. Qué podrá hacer quien use la app

Abrir la app en el navegador (móvil o escritorio), ver la portada «Übersicht» con lo que hace el producto y lo que no hace,
y navegar a las cinco secciones (Übersicht, Steuerjahre, Belege, Kategorien, Export), todas en alemán. Las secciones aún son provisionales.

## 2. Punto de partida

Repo vacío. Base: `panel-contenido@a060716` (Next 15.5.28, shadcn, `Repository<T>`, `createCrudHandlers`, `useCrud`).

## 3. Qué hay que respetar

- Decisiones de la fase 0 (04.11.2026): repo independiente, copiar la base, interfaz en alemán, organiza y no asesora, primero uso interno.
- `panel-contenido`: convenciones de capas y validación; versión exacta de Next y `overrides` de postcss.
- DSGVO: sin terceros (por eso no se copia `next/font/google`).
- `panel-contenido` y `ab1web` no se modifican.

## 4. Criterios de aceptación

| # | Criterio | Casilla |
|---|---|---|
| 1 | `tsc`, `lint` y `build` sin errores | E1 |
| 2 | 5 rutas responden y se ven a 375, 768, 1200 y 1440 px sin scroll horizontal, texto partido ni errores de JS | A2, A3, E2 |
| 3 | `<html lang="de">` y ningún texto visible en español | C1 |
| 4 | Ninguna petición a terceros | D3 |
| 5 | Contraste de los grises de la interfaz ≥ 4,5:1 | B1 |
| 6 | Sin dominio heredado (posts, leads, competencia, Metricool) | — |
| 7 | 0 vulnerabilidades en dependencias de producción | E3 |
| 8 | Fábrica, brain, checklist de la app y Graphify en el repo | — |

## 5. Cómo se demuestra

| # | Prueba | Cumple si… |
|---|---|---|
| 1 | `npx tsc --noEmit && npm run lint && npm run build` | salida sin errores |
| 2–4 | `node tools/capturas.mjs --url http://localhost:3100` (5 rutas × 4 anchos) | «0 problema(s)» |
| 3 | `curl -s localhost:3100/<ruta> \| grep -o '<html[^>]*>'` y `grep -rn` de textos en español en `src/` | `lang="de"`; sin textos visibles en español |
| 5 | Ratio WCAG con los colores de shadcn neutral | ≥ 4,5 |
| 6 | `grep -rni "post\|lead\|competitor\|metricool" src` | sin resultados |
| 7 | `npm audit --omit=dev` | 0 vulnerabilidades |

## 6. Fuera de alcance

- Datos, formularios, API y archivos (fases 2–3). Autenticación (fase 4).
- Archivos que se espera tocar: todos nuevos en este repo; ninguno en `panel-contenido`. En `ab1web` solo `fabrica/productos.md`.

## 7. Decisiones abiertas

Ninguna que bloquee la fase 1. Quedan para Ander (no bloquean): «du»/«Sie» y la marca «abWeb»/«ab1web».

Supuestos de riesgo bajo/medio tomados por la fábrica: tema claro, fuentes del sistema, nombres de las secciones,
icono `ReceiptEuro` para Belege, `noindex`.

---

## 8. Evidencias

| # | Resultado | Evidencia |
|---|---|---|
| 1 | cumple | tsc sin salida; eslint sin avisos; build: 6 rutas estáticas, 103 kB de JS común |
| 2 | cumple | `capturas.mjs`: «0 problema(s)» en 5 rutas × 4 anchos (tras reiniciar el servidor; ver lecciones) |
| 3 | cumple | `<html lang="de">` en `/` y `/steuerjahre`; textos de error traducidos (`use-crud`, `http`, `crud-route`) y fechas `de-DE` |
| 4 | cumple | el script no registra peticiones fuera de localhost |
| 5 | cumple | gris secundario/blanco 4,74:1; gris secundario/barra lateral 4,54:1; enlaces de navegación 7,97:1 |
| 6 | cumple | solo se copiaron piezas genéricas (ui, layout, data, api, hooks, utils, dates) |
| 7 | cumple | `npm audit --omit=dev`: found 0 vulnerabilities |
| 8 | cumple | `fabrica/`, `brain/`, `fabrica/checklist-app.md`, `.claude/skills/graphify/`; `graphify update .`: 314 nodos, 448 aristas, 0 tokens |

## 9. Hallazgos

| Gravedad | Dónde | Problema | Estado |
|---|---|---|---|
| importante | `tools/capturas.mjs` | Marcaba «texto partido» en todos los enlaces del menú (contaba el icono SVG como línea). Captura a 1200 px: el menú está bien | corregido: mide solo nodos de texto |
| bloqueante | `tools/capturas.mjs` | No detectó una pantalla «Application error» (captura a 375 px) | corregido: informa de errores de JS, de consola y de ese texto |
| bloqueante | servidor local | Errores 400 en los JS: un `npm start` anterior a la recompilación | descartado como fallo de la app: tras reiniciar, 0 problemas; anotado en lecciones y en CLAUDE.md |
| menor | Graphify | Sus hooks `PreToolUse` fallarían en sesiones sin Graphify instalado | no se suben; decisión en el brain |

## 10. Controles obligatorios

- [x] Criterios con evidencia «cumple»
- [x] Script sin avisos (0 problemas)
- [x] HTML válido en lo tocado (lo genera Next)
- [x] Contraste medido: 4,54 / 4,74 / 7,97
- [x] Textos en alemán; nada en español en la interfaz
- [x] Ninguna decisión del brain contradicha
- [x] Nada fuera de alcance tocado

No ejecutados: revisores en subagentes con contexto limpio. Este encargo solo copia y adapta la base, así que la revisión
la hizo el propio constructor con el script, las capturas y los `grep`. A partir de la fase 2, los revisores son obligatorios.

## 11. Decisiones tomadas

- 04.11.2026 — medio — tema claro y fuentes del sistema — fábrica
- 04.11.2026 — medio — nombres de las cinco secciones — fábrica
- 04.11.2026 — bajo — hooks de Graphify fuera del repo — fábrica

## 12. Fusión

- Primer commit de `main`. Pendiente de subir a `Ander199205/abweb-tax-organizer` cuando exista el repo.
