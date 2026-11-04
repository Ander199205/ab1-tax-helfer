# Encargo 2: años, justificantes y categorías con datos ficticios (fase 2)

- Slug / rama: `feature/fase-2-dominio`
- Fecha: 04.11.2026 · Estado: fusionado (`b2687d4`)
- Tamaño: normal

## 1. Qué podrá hacer quien use la app

Con datos ficticios, en alemán, a 375 px (móvil) y 1440 px (escritorio):

1. **Steuerjahre**: ver la lista de años; crear un año; cambiar su estado (offen → an Steuerberatung übergeben → abgeschlossen, y reabrir);
   marcar y desmarcar los puntos de su checklist («Was fehlt noch?») y añadir o quitar puntos.
2. **Belege**: ver los justificantes en una tabla filtrable por año, categoría y tipo; crear, editar y borrar uno
   (fecha, importe, emisor/destinatario, descripción, categoría, tipo, año, nota). Importes escritos a la alemana («1.234,56»).
3. **Kategorien**: crear, renombrar y borrar categorías propias; no se puede borrar una categoría con justificantes.
4. **Übersicht**: por año, número de justificantes, suma de importes por tipo y puntos de la checklist pendientes.
   Sumas, no cálculos fiscales.

**Export** sigue provisional (fase 5). Sin archivos adjuntos (fase 3).

## 2. Punto de partida

- `main@7bd68d1`: 5 rutas provisionales; `tools/capturas.mjs`: 0 problemas en 5 rutas × 4 anchos.
- Piezas listas para reutilizar: `createJsonRepository`, `createCrudHandlers`, `useCrud`, `http.ts`, `FieldWarning`, `PageHeader`, shadcn (`dialog`, `alert-dialog`, `select`, `input`, `textarea`, `badge`, `card`).
- Patrón a copiar de `panel-contenido`: `lib/<dominio>/{parse,rules}.ts`, `data/<dominio>-repository.ts`, `app/api/<dominio>/route.ts` + `[id]/route.ts`, `components/<dominio>/*-view.tsx`.

## 3. Qué hay que respetar

- Organiza, no asesora (StBerG): ninguna etiqueta tipo «absetzbar», «Werbungskosten», «Steuerersparnis»; nada de calcular impuestos ni IVA.
- Interfaz en alemán con «du»; la empresa habla en «wir». Fechas «04.11.2026», importes «1.234,56 €».
- Solo datos ficticios (empresa de ejemplo inventada); `data/*.json` fuera de git; `data/seed/` en git.
- Validación solo en `rules.ts`; lógica propia como gancho de `createCrudHandlers`, nunca en `route.ts`.
- Lecciones: números alemanes (no basta con cambiar coma por punto); barras de acciones con `flex-wrap` en móvil; probar en el navegador antes de entregar; reiniciar `npm start` tras compilar.

## 4. Criterios de aceptación

| # | Criterio (medible) | Casilla |
|---|---|---|
| 1 | API REST para `steuerjahre`, `belege`, `kategorien` (y checklist dentro del año): listar, crear, editar y borrar, con errores `{ errors: { campo } }` en alemán | D1, D4 |
| 2 | Reglas: año entre 2000 y el año actual + 1 y sin duplicados; importe > 0 con máximo 2 decimales; fecha válida; categoría existente; nombre de categoría único (sin distinguir mayúsculas) | D1 |
| 3 | `parseAmount` acepta «1.234,56», «1234,56», «1234» y «0,5»; rechaza «1,234.56», «12,345» y «abc» | C3 |
| 4 | No se puede borrar una categoría con justificantes ni un año con justificantes (409 con mensaje claro) | D1 |
| 5 | Los cuatro flujos del apartado 1 funcionan en el navegador a 375 y 1440 px (prueba con Playwright que crea, edita y borra) | A2–A5, B2, B3 |
| 6 | Importes y fechas en formato alemán en toda la interfaz | C3 |
| 7 | Ningún texto en español/inglés en la interfaz; tuteo con «du»; ninguna palabra de la lista prohibida (StBerG/UWG) | C1, C2, C4 |
| 8 | Estados vacíos (sin años, sin justificantes, filtro sin resultados) con texto y acción | A5 |
| 9 | Controles de la checklist: tsc, lint, build, `capturas.mjs` 0 problemas en 5 rutas × 4 anchos, `npm audit --omit=dev` 0 altas | E1–E3 |

## 5. Cómo se demuestra

| # | Prueba | Cumple si… |
|---|---|---|
| 1, 2, 4 | `tools/pruebas-api.mjs` (nuevo): llamadas `fetch` a la API con casos válidos e inválidos | todas las aserciones pasan; salida pegada en Evidencias |
| 3 | Prueba unitaria de `parseAmount` en el mismo script (sin dependencias nuevas: `node --test`) | todos los casos pasan |
| 5, 6, 8 | `tools/pruebas-flujos.mjs` (nuevo, Playwright ya instalado): recorre los cuatro flujos a 375 y 1440 px + capturas clave | sin errores; 2–4 capturas revisadas |
| 7 | `grep` de la lista prohibida y de «Sie »/«Ihr» en `src/`; lectura de los textos nuevos por el revisor de idioma | sin resultados; revisor sin hallazgos bloqueantes |
| 9 | Comandos de la checklist E | salida sin errores |

## 6. Fuera de alcance

- Archivos adjuntos y vista previa (fase 3); usuarios, inicio de sesión y base de datos (fase 4); exportación (fase 5).
- IVA, impuestos, reglas fiscales, importación de extractos bancarios, varios clientes o empresas.
- Archivos que se espera tocar: `src/lib/{types,money}.ts`, `src/lib/<dominio>/*`, `src/lib/data/*-repository.ts`, `src/lib/api/{handlers,<dominio>}.ts`,
  `src/app/{page,steuerjahre,belege,kategorien}/**`, `src/app/api/**`, `src/components/<dominio>/**`, `data/seed/*.json`, `tools/pruebas-*.mjs`, `brain/`, `CLAUDE.md`.

## 7. Decisiones abiertas (se responden antes de construir)

- [x] **D1. ¿Qué se guarda?** (a) gastos e ingresos, con un campo «Art: Ausgabe / Einnahme» — **recomendada**: a la asesoría se le entregan los dos; (b) solo gastos.
- [x] **D2. Año de cada justificante**: (a) se pone solo según la fecha y se puede cambiar — **recomendada** (p. ej. una factura de diciembre pagada en enero); (b) siempre el de la fecha.
- [x] **D3. Año «abgeschlossen»**: (a) sus justificantes quedan en solo lectura hasta reabrirlo — **recomendada**; (b) se pueden seguir editando.
- [x] **D4. Categorías iniciales** (neutras, para ordenar, no fiscales): Büro & Material · Software & Abos · Fahrten & Reisen · Telefon & Internet · Fortbildung · Versicherungen · Bank & Gebühren · Einnahmen · Sonstiges. (a) sí — **recomendada**; (b) empezar vacío.
- [x] **D5. Checklist inicial de cada año nuevo**: Kontoauszüge (Januar–Dezember) · Ausgangsrechnungen · Eingangsrechnungen · Verträge (Miete, Versicherungen) · Sonstige Nachweise. (a) sí — **recomendada**; (b) vacía.
- [x] **D6. Importe**: (a) un solo importe bruto, sin desglose de IVA — **recomendada** para esta fase; (b) neto + IVA.

Supuestos de riesgo bajo que la fábrica toma por su cuenta:
- Importes guardados en céntimos (enteros) para evitar errores de redondeo; moneda solo EUR.
- Datos de ejemplo: una empresa inventada («Muster Design», Leipzig), años 2025 y 2026, unos 20 justificantes.
- Tabla en escritorio y tarjetas en móvil para Belege.

---

## 8. Evidencias

Comandos ejecutados el 04.11.2026 sobre la rama, con la app en marcha (`npm start`, puerto 3100) tras recompilar y reiniciar:

| # | Resultado | Evidencia |
|---|---|---|
| 1, 2, 4 | cumple | `BASE=… node --test tools/pruebas-api.mjs`: **35 pass, 0 fail** (CRUD de las tres colecciones, errores en alemán, duplicados, rangos, 409 al borrar, año cerrado, JSON roto, 415, peticiones simultáneas) |
| 3 | cumple | mismas pruebas: `parseAmount` acepta 8 formatos alemanes y rechaza 14 (incl. «1,234.56», «0.500», «1 2 3») |
| 5, 6, 8 | cumple | `node tools/pruebas-flujos.mjs`: 18 pasos × 2 anchos (375 y 1440 px), **0 fallos**, sin errores de JavaScript; capturas `flujo-*-{375,1440}.jpg` revisadas |
| 6 | cumple | importes con `Intl` de-DE («1.234,56 €»), fechas `formatDay` («15.03.2026»); revisor C sin hallazgos |
| 7 | cumple | `grep` de palabras prohibidas y de «Sie»/«Ihr»: solo falsos positivos («transparent»); revisor C: tuteo coherente, sin español ni inglés visible |
| 9 | cumple | tsc y lint sin errores; build; `capturas.mjs`: **0 problemas** en 5 rutas × 4 anchos; `npm audit --omit=dev`: 0 vulnerabilidades |
| B1 | cumple | píxeles reales: borde de campo #868686 → **3,64:1**; foco #222 → **15,9:1**; badges de estado 8,8–14:1; avisos ámbar 7,1:1 |

## 9. Hallazgos de los revisores

Cuatro revisores con contexto limpio (A diseño, B accesibilidad, C idioma, D+E datos y técnica). Verificados contra el código antes de tratarlos (paso 4).

| Gravedad | Bloque | Problema | Estado |
|---|---|---|---|
| bloqueante | B1 | Borde de campos 1,26:1 (`--input` de shadcn) | corregido: `--input` oklch(0.62) → 3,64:1 |
| bloqueante | B1 | Indicador de foco 1,54:1 | corregido: `--ring` oklch(0.25) → 15,9:1 |
| importante | D1 | Comprobaciones y escritura fuera de la misma sección crítica: **reproducido** (dos POST simultáneos crearon dos «Rennen») | corregido: `exclusive()` en `crud-route.ts`; prueba de 3 POST simultáneos |
| importante | D1 | PATCH con JSON roto respondía 200 y tocaba `updatedAt` | corregido: 400; prueba |
| importante | C3 | «0.500» se guardaba como 500,00 € | corregido: sin ceros a la izquierda; pruebas |
| importante | C2 | «gehören noch 3 Belegen» (dativo) | corregido: nominativo/dativo; prueba con el texto exacto |
| importante | C2/A | El diálogo decía que «Von wem» era opcional | corregido: texto de campos obligatorios |
| importante | A4 | Botones «Anlegen» y renombrar sin estado de guardado (doble envío) | corregido: `disabled` + «Wird angelegt …» |
| importante | A5 | Sin pantallas de carga ni de error (la de Next sale en inglés) | corregido: `loading.tsx`, `error.tsx`, `not-found.tsx` en alemán |
| importante | A5 | Estado vacío de Belege sin acción | corregido: botón «Ersten Beleg anlegen». Años y categorías: el formulario está justo encima → **descartado** (la acción ya está a la vista) |
| importante | A1 | Colores de estado sueltos (sky/amber/emerald/slate) | **descartado con motivo**: shadcn no tiene tokens de estado; colores medidos ≥ 8,7:1; decisión en el brain. Botón destructivo: corregido (`variant="destructive"`; antes salía negro porque `asChild` perdía la clase) |
| importante | A2/A3 | A 768 px el estado «An Steuerberatung übergeben» se salía de la tarjeta en la portada | corregido: 2 columnas desde 1024 px, `dd` sin cortes |
| importante | B3 | Foco al `<body>` al cerrar el diálogo de Beleg y al terminar de renombrar | corregido: vuelve al botón que lo abrió; comprobado en `pruebas-flujos.mjs` |
| importante | B2 | Error de renombrar sin `aria-describedby` | corregido |
| importante | B5 | La región en vivo de sumas desaparecía con filtro vacío | corregido: `role="status"` fija |
| menor | varios | 10 textos alemanes (Kategorien, «Leg», «prüf», «Jahreszahl», «Checkliste», «Von wem?/An wen?», «Von / An», nota de la semilla, «Cerrar» en `dialog.tsx`) | corregidos |
| menor | B/A | Encabezados h1→h3; foco al primer campo con error; borrar desactivado no enfocable; resumen partido a 375; placeholder cortado | corregidos |
| menor | D | ids repetidos y `done` no booleano en la checklist; fecha fuera de rango; `Content-Type` no JSON (CSRF); semilla con fechas futuras; código muerto en `dates.ts`; `engines` | corregidos (415 para no-JSON; `engines` ≥ 22.18) |
| menor | A9 | La tabla de Belege solo desde 1280 px | **descartado con motivo**: con la barra lateral no cabe antes; por debajo, tarjetas en 2 columnas |
| menor | A10 | En móvil, la X del diálogo largo desaparece al desplazar | pendiente (queda «Abbrechen» al final); va a la fase 3 |
| sospecha | B11 | Foco tras borrar una fila | pendiente, fase 3 |
| menor | D13 | Renombrar una categoría usada en un año cerrado cambia lo que muestran sus Belege | **pendiente de decisión de Ander** (riesgo bajo; hoy se permite) |

## 10. Controles obligatorios

- [x] Criterios con evidencia «cumple»
- [x] Script sin avisos (0 problemas, 5 rutas × 4 anchos)
- [x] HTML válido en lo tocado (lo genera React; encabezados corregidos)
- [x] Contraste medido: ver evidencia B1
- [x] Textos en alemán con «du»; nada en español o inglés visible
- [x] Ninguna decisión del brain contradicha
- [x] Fuera de alcance: también se tocaron `layout.tsx` (avisos arriba), `globals.css` (bordes y foco), `ui/dialog.tsx` («Schließen»), `field-warning.tsx` (color y `live`), `crud-route.ts` (ganchos, bloqueo, 415). Todos por hallazgos de esta fase; anotados en 11.
  Además, fuera de la lista del apartado 6:
  - `src/app/loading.tsx`, `src/app/error.tsx`, `src/app/not-found.tsx` — nuevos, por el hallazgo A5 (carga, error y 404 en alemán).
  - `src/lib/dates.ts` — se quitan funciones heredadas sin uso (hallazgo D12).
  - `src/components/layout/confirm-delete.tsx`, `empty-state.tsx`, `native-select.tsx` — componentes comunes a las tres secciones, por eso en `layout/` y no en `components/<dominio>/`.
  - `src/lib/api/clients.ts` — los tres clientes CRUD en un solo archivo, en lugar de uno por dominio (son tres líneas).
  - `docs/producto.md` — solo marca la fase 2 como hecha.
  - `package.json` y `package-lock.json` — nombre `ab1-tax-helfer` y `engines.node ≥ 22.18`.
  - `brain/decisiones.md`, `brain/lecciones.md`, `CLAUDE.md` — previstos en el apartado 6 («`brain/`, `CLAUDE.md`»).
- [x] (Tax Organizer) tsc, lint, build y `npm audit --omit=dev` en verde

No ejecutados: ninguno.

## 11. Decisiones tomadas

- 04.11.2026 — Ander — D1–D6 según lo recomendado (gastos e ingresos; año según la fecha y editable; año cerrado en solo lectura; 9 categorías; checklist inicial; importe bruto sin IVA).
- 04.11.2026 — medio — `NativeSelect` (desplegable nativo) en lugar del `Select` de Radix: mejor en móvil y con teclado — fábrica
- 04.11.2026 — medio — avisos (toasts) arriba en el centro en toda la app: abajo tapaban botones en móvil — fábrica
- 04.11.2026 — medio — bordes de campo y foco más oscuros en toda la app (WCAG 1.4.11) — fábrica
- 04.11.2026 — medio — una sola sección crítica para todas las escrituras (prototipo JSON); en la fase 4 la sustituyen las restricciones SQL — fábrica
- 04.11.2026 — medio — la API solo acepta `application/json` (415) — fábrica
- 04.11.2026 — bajo — colores de estado fuera de los tokens de shadcn, con contraste medido — fábrica
- 04.11.2026 — bajo — número de Belege visible en cada categoría (explica por qué no se puede borrar) — fábrica
- 04.11.2026 — bajo — tabla de Belege desde 1280 px, tarjetas por debajo — fábrica
- 04.11.2026 — bajo — Node ≥ 22.18 (las pruebas importan `money.ts` directamente) — fábrica

## 12. Fusión

- Aprobado por el aprobador (contexto limpio) tras repetir pruebas de API, recorridos, capturas, contraste, tsc, lint y audit.
- Commit de fusión: `b2687d4` · Vuelta atrás: `git revert -m 1 b2687d4`
- En `main` tras fusionar: `capturas.mjs` 0 problemas (5 rutas × 4 anchos), `pruebas-api.mjs` 35/35, `pruebas-flujos.mjs` 0 fallos. Nada empeoró fuera del encargo.
