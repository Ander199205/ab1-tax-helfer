# Encargo 3: archivos de los justificantes (fase 3)

- Slug / rama: `feature/fase-3-archivos`
- Fecha: 04.11.2026 · Estado: construcción
- Tamaño: normal

## 1. Qué podrá hacer quien use la app

Con datos ficticios, en alemán, a 375 px y 1440 px:

1. En el formulario de un Beleg (nuevo o existente), **adjuntar uno o varios archivos** (PDF o foto) arrastrándolos o eligiéndolos; en el móvil, también con la cámara.
2. **Ver** cada archivo: las fotos dentro de la app; los PDF en una pestaña nueva con el visor del navegador.
3. **Quitar** un archivo de un Beleg (con confirmación).
4. **Ver de un vistazo qué Belege no tienen archivo** (marca «Datei fehlt», filtro y número en la Übersicht).
5. En un año abgeschlossen no se pueden subir ni quitar archivos (se pueden ver).

Además, dos pendientes de la fase 2: la X de cerrar los diálogos largos no desaparece en el móvil, y tras borrar algo el foco va a un sitio lógico.

## 2. Punto de partida

- `main@0e51f5a`: Belege sin archivos; `capturas.mjs` 0 problemas; `pruebas-api.mjs` 35/35; `pruebas-flujos.mjs` 0 fallos.
- `.gitignore` ya excluye `data/uploads/`. La API solo acepta JSON (415): la subida necesita su propia ruta `multipart/form-data`.
- Sin dependencias nuevas: Next lee `request.formData()`; el tipo real del archivo se comprueba por sus primeros bytes.

## 3. Qué hay que respetar

- Organiza, no asesora; sin textos de archivo legal: no prometer «GoBD-konform» ni «revisionssicher» (no lo es).
- Solo datos ficticios; los archivos subidos fuera de git y fuera de `public/`.
- Reglas en `lib/<dominio>/rules.ts`; lógica propia en `lib/api/*handlers*.ts`, nunca en `route.ts`.
- Año cerrado en solo lectura (D3 de la fase 2) también para los archivos.
- Lecciones: probar en el navegador; reiniciar `npm start` tras compilar; medir contraste con píxeles; cambios optimistas donde el usuario espera respuesta inmediata; componentes de servidor sin `Button`/`Badge`.

## 4. Criterios de aceptación

| # | Criterio (medible) | Casilla |
|---|---|---|
| 1 | Subir PDF, JPG, PNG o WebP a un Beleg; se guardan en `data/uploads/` con nombre aleatorio y el Beleg guarda nombre original, tipo y tamaño | D5 |
| 2 | Se rechaza (400, mensaje en alemán): tipo no permitido aunque la extensión lo parezca (comprobación por bytes), más del tamaño máximo, más archivos de los permitidos, archivo vacío | D5 |
| 3 | Descarga/visualización solo por `/api/receipts/<id>/files/<fileId>` con `Content-Type` correcto, `X-Content-Type-Options: nosniff` y `Content-Disposition` con el nombre original; ids inventados o de otro Beleg → 404; sin acceso por ruta de disco | D5 |
| 4 | Quitar un archivo lo borra del disco; borrar un Beleg borra sus archivos | D1 |
| 5 | Año cerrado: subir y quitar → 409; ver → permitido | D1 |
| 6 | Marca «Datei fehlt», filtro «Nur ohne Datei» y número de Belege sin archivo por año en la Übersicht | A5 |
| 7 | Flujos en el navegador a 375 y 1440 px: subir (selector y arrastrar), ver foto, abrir PDF, quitar, rechazo de tipo y de tamaño | A2–A5, B2, B3 |
| 8 | La X de los diálogos queda visible al desplazar en móvil; tras borrar, el foco va a la siguiente fila (o a la lista/encabezado si no hay) | A, B3 |
| 9 | Controles: tsc, lint, build, `capturas.mjs` 0 problemas, `npm audit --omit=dev` 0 altas, pruebas ampliadas en verde | E1–E3 |

## 5. Cómo se demuestra

| # | Prueba | Cumple si… |
|---|---|---|
| 1–5 | `tools/pruebas-api.mjs` ampliado: subidas válidas e inválidas (PDF real, PNG real, «.pdf» que es texto, archivo de más de N MB, archivo n.º 6), descarga con cabeceras, 404, borrado en disco, 409 en año cerrado | todas pasan |
| 6–8 | `tools/pruebas-flujos.mjs` ampliado | 0 fallos; capturas revisadas |
| 9 | comandos de la checklist E | sin errores |

## 6. Fuera de alcance

- Leer el contenido (OCR), rellenar campos a partir de la foto, comprimir o recortar imágenes, varias páginas en una foto.
- Análisis de virus (se anota para la fase 4, antes de datos reales). Cifrado en disco (fase 4).
- Archivos que se espera tocar: `src/lib/types.ts`, `src/lib/receipts/*`, `src/lib/files/*` (nuevo), `src/lib/data/file-store.ts` (nuevo), `src/lib/api/{handlers,files-handlers,http,clients}.ts`, `src/app/api/receipts/[id]/files/**`, `src/components/receipts/**`, `src/components/overview/*`, `src/components/ui/dialog.tsx` (X fija), `data/seed/**`, `tools/pruebas-*.mjs`, `brain/`, `CLAUDE.md`, `tools/estado/datos.json`.

## 7. Decisiones abiertas (se responden antes de construir)

- [x] **D1. Archivos por Beleg**: (a) hasta 5 (p. ej. factura de varias páginas fotografiada) — **recomendada**; (b) solo 1.
- [x] **D2. Tipos**: (a) PDF, JPG, PNG y WebP — **recomendada** (los iPhone convierten HEIC a JPG al subir desde el navegador); (b) añadir HEIC (no se ve en la mayoría de navegadores).
- [x] **D3. Tamaño máximo**: (a) 10 MB por archivo — **recomendada**; (b) otro.
- [x] **D4. Ver los archivos**: (a) fotos dentro de la app y PDF en pestaña nueva con el visor del navegador — **recomendada**; (b) también el PDF dentro de la app.
- [x] **D5. Belege sin archivo**: (a) marca «Datei fehlt» + filtro + número en la Übersicht — **recomendada**; (b) sin marcas.
- [x] **D6. Datos de ejemplo**: (a) 3–4 archivos inventados (factura PDF «Muster», foto de un ticket) en algunos Belege — **recomendada**; (b) sin archivos de ejemplo.

Supuestos de riesgo bajo:
- Nombres en disco aleatorios (UUID) y nombre original solo como dato; la subida es independiente del formulario (se sube al elegir, no al pulsar «Speichern») en Belege ya guardados; en un Beleg nuevo, los archivos se suben justo después de crearlo.
- Límite de subida de Next ajustado al tamaño máximo.

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
