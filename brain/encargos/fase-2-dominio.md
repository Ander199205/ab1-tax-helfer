# Encargo 2: años, justificantes y categorías con datos ficticios (fase 2)

- Slug / rama: `feature/fase-2-dominio`
- Fecha: 04.11.2026 · Estado: **decisiones abiertas**
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

- [ ] **D1. ¿Qué se guarda?** (a) gastos e ingresos, con un campo «Art: Ausgabe / Einnahme» — **recomendada**: a la asesoría se le entregan los dos; (b) solo gastos.
- [ ] **D2. Año de cada justificante**: (a) se pone solo según la fecha y se puede cambiar — **recomendada** (p. ej. una factura de diciembre pagada en enero); (b) siempre el de la fecha.
- [ ] **D3. Año «abgeschlossen»**: (a) sus justificantes quedan en solo lectura hasta reabrirlo — **recomendada**; (b) se pueden seguir editando.
- [ ] **D4. Categorías iniciales** (neutras, para ordenar, no fiscales): Büro & Material · Software & Abos · Fahrten & Reisen · Telefon & Internet · Fortbildung · Versicherungen · Bank & Gebühren · Einnahmen · Sonstiges. (a) sí — **recomendada**; (b) empezar vacío.
- [ ] **D5. Checklist inicial de cada año nuevo**: Kontoauszüge (Januar–Dezember) · Ausgangsrechnungen · Eingangsrechnungen · Verträge (Miete, Versicherungen) · Sonstige Nachweise. (a) sí — **recomendada**; (b) vacía.
- [ ] **D6. Importe**: (a) un solo importe bruto, sin desglose de IVA — **recomendada** para esta fase; (b) neto + IVA.

Supuestos de riesgo bajo que la fábrica toma por su cuenta:
- Importes guardados en céntimos (enteros) para evitar errores de redondeo; moneda solo EUR.
- Datos de ejemplo: una empresa inventada («Muster Design», Leipzig), años 2025 y 2026, unos 20 justificantes.
- Tabla en escritorio y tarjetas en móvil para Belege.

---

## 8. Evidencias
(pendiente)

## 9. Hallazgos de los revisores
(pendiente)

## 10. Controles obligatorios
(pendiente)

## 11. Decisiones tomadas
(pendiente)

## 12. Fusión
(pendiente)
