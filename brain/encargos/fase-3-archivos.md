# Encargo 3: archivos de los justificantes (fase 3)

- Slug / rama: `feature/fase-3-archivos`
- Fecha: 04.11.2026 · Estado: fusionado (`3caa424`)
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

Ejecutadas el 04.11.2026 en la rama, con `npm start` (puerto 3000) recién compilado y reiniciado:

| # | Resultado | Evidencia |
|---|---|---|
| 1–5 | cumple | `BASE=… node --test tools/pruebas-api.mjs`: **42 pass, 0 fail**. Incluye: subir PDF+PNG (nombre aleatorio en disco), cabeceras (`application/pdf`, `nosniff`, `filename*` UTF-8), PATCH normal sin tocar `files`, «.pdf» que es HTML → 400, 10 MB + 1 → 400, vacío → 400, 6.º archivo → 400 con texto exacto, mezcla válido+inválido → 400 sin nada en disco, JPG/WebP por bytes (manda el contenido, no el tipo declarado), 52 MB → 413 sin leerlo, JSON → 415, ids inventados o de otro Beleg y `..%2F` → 404, quitar borra del disco, borrar Beleg borra sus archivos, año cerrado 409/409/200, quitar uno de ejemplo no borra `data/seed/uploads` |
| 6–8 | cumple | `node tools/pruebas-flujos.mjs`: **44 pasos ✓**, 0 fallos a 375 y 1440 px: X visible al desplazar, rechazo de tipo y tamaño, nuevo Beleg con PDF pendiente, arrastrar PNG, vista previa (foco vuelve a la miniatura), PDF en pestaña nueva y servido como PDF, quitar con foco en la fila vecina, filtro «Nur ohne Datei», Übersicht «Belege ohne Datei» = 9 y su enlace abre la lista filtrada; foco tras borrar categoría en la fila vecina |
| 8 | cumple | a mano: nombre de 170 caracteres → `scrollWidth` 341 = `clientWidth` 341 y X dentro del diálogo; quitar el último archivo con la respuesta retrasada 1,2 s → foco en «Dateien auswählen» dentro del diálogo, no oculto (375 y 1440 px) |
| 9 | cumple | tsc y lint sin errores; build; `capturas.mjs` **0 problemas** (5 rutas × 4 anchos); `npm audit --omit=dev` 0 vulnerabilidades |
| B1 | cumple | revisor B, píxeles reales: «Datei fehlt» 8,73:1, «1 Datei» 19,8:1, ayuda 4,74:1, borde discontinuo 3,64:1 |

## 9. Hallazgos de los revisores

| Gravedad | Bloque | Problema | Estado |
|---|---|---|---|
| bloqueante | A | Un nombre largo ensanchaba el `<fieldset>` (`min-inline-size`) y sacaba la X del diálogo | corregido: `w-full min-w-0`; comprobado a 375 y 1440 |
| bloqueante | B | Al quitar el último archivo, el foco iba al `h1` oculto tras el modal | corregido: el foco va a lo primero enfocable del diálogo; comprobado con respuesta lenta |
| importante | D | Sin límite de cuerpo: 300 MB llegaban a memoria (1,1 GB) | corregido: 411 sin `Content-Length`, 413 por encima de 51 MB, Beleg y año comprobados antes de leer; prueba de 52 MB |
| importante | B | Carrera: con respuesta lenta el foco se perdía tras borrar | corregido: la confirmación espera al borrado («Wird gelöscht …») antes de cerrar |
| importante | B | Botón de subir `disabled` mientras sube → foco a `<body>` | corregido: `aria-disabled` |
| importante | B | Cerrar la vista previa dejaba el foco en `<body>` | corregido: vuelve a la miniatura; en la prueba |
| importante | B | Error de subida no asociado al botón enfocado | corregido: `aria-describedby` en los botones |
| importante | A | Fotos altas sin altura máxima en la vista previa | corregido: `max-h-[70vh]` + `object-contain` |
| importante | C | «Es sind schon 1.» / «schon 0.»; texto duplicado en cliente y servidor | corregido: `tooManyFilesMessage` único |
| menor | C | «gespeichert» → «hochgeladen»; «hinzufügen» → «anhängen»; «Entfernen» en la confirmación; aviso de fallo de subida; frase de año cerrado; «Belege ohne Datei»; filtro «Dateien»; «Byte» | corregidos |
| menor | A | Título «Dateien» + leyenda «Dateien» repetidos | corregido: «Dateien zum Beleg» / «Angehängte Dateien» |
| menor | A | Soltar archivos durante una subida; parpadeo de `dragLeave` | corregidos |
| menor | A | «Ohne Datei» sin enlace a la lista | corregido: enlace a `/belege?jahr=…&datei=ohne` (y su zona táctil de 24 px, que sacó `capturas.mjs`) |
| menor | B | «Wird hochgeladen …» no se anunciaba; el mismo error no se repetía; foco al quitar un pendiente | corregidos (`role=status`, `key` por intento, foco a «Dateien auswählen») |
| menor | D | Archivos huérfanos si falla a mitad; `fs.rm` podía dar 500 tras guardar; CSP en imágenes; código muerto; pruebas que no comprobaban el disco, JPG/WebP ni el PDF en el navegador | corregidos |
| menor | A | «Neuer Beleg» baja a una segunda fila con 4 filtros (1200–1440 px) | **descartado con motivo**: queda alineado a la derecha y legible; se revisará si hay más filtros |
| menor | A1 | «Datei fehlt» con ámbar suelto, igual que «übergeben» | **descartado con motivo**: misma excepción de colores de estado (brain); contraste 8,73:1; los dos significan «falta algo por hacer» |
| menor | A | «Danke für Ihren Einkauf» en el ticket inventado | **descartado**: es el texto del ticket de una tienda, no de la app (revisor C) |
| menor | D9 | `withFiles` con `as unknown as` | **pendiente (fase 4)**: al pasar a SQL el repositorio tendrá un método propio para archivos |
| nota | D | El revisor D/E quitó sin querer el archivo de ejemplo de `beleg-01` en los datos vivos | **resuelto**: `data/seed/` intacto; los datos vivos se repusieron desde la semilla |

## 10. Controles obligatorios

- [x] Criterios con evidencia «cumple»
- [x] Script sin avisos (0 problemas)
- [x] HTML válido en lo tocado
- [x] Contraste medido: ver B1
- [x] Textos en alemán con «du»; nada en español o inglés
- [x] Ninguna decisión del brain contradicha
- [x] Fuera de la lista del apartado 6 se tocaron: `src/lib/data/receipts-repository.ts` (archivos vacíos al crear), `src/lib/api/crud-route.ts` (`exclusive` exportado, `afterRemove`), `src/lib/hooks/use-crud.ts` (`onCreated`), `src/components/layout/confirm-delete.tsx` y `page-header.tsx` (foco tras borrar), `src/components/categories/categories-view.tsx` y `tax-years/tax-years-view.tsx` (`data-row`), `src/app/page.tsx` y `src/app/belege/page.tsx` (recuento y `?datei=`), `tools/pruebas-flujos.mjs` (captura de pasos fallidos), `docs/producto.md` (marca la fase 3 como hecha), `fabrica/plantillas/encargo.md` (la plantilla incluye siempre los archivos de documentación; lección del 04.11.2026). Todos por criterios o hallazgos de esta fase.
- [x] tsc, lint, build y `npm audit --omit=dev` en verde

No ejecutados: ninguno.

## 11. Decisiones tomadas

- 04.11.2026 — Ander — D1–D6 según lo recomendado (5 archivos, PDF/JPG/PNG/WebP, 10 MB, fotos en la app y PDF en pestaña nueva, marca + filtro + recuento, archivos de ejemplo).
- 04.11.2026 — medio — subida limitada a 51 MB por petición (411/413) antes de leer el cuerpo — fábrica
- 04.11.2026 — medio — la confirmación de borrar espera a que termine el borrado antes de cerrarse (en toda la app) — fábrica
- 04.11.2026 — bajo — los archivos de un Beleg ya guardado se suben al elegirlos, sin esperar a «Speichern»; en uno nuevo, justo después de crearlo — fábrica
- 04.11.2026 — bajo — CSP `default-src 'none'` solo en imágenes (en PDF rompería el visor del navegador) — fábrica
- 04.11.2026 — bajo — sin análisis de virus ni cifrado en disco hasta la fase 4 (solo datos inventados) — fábrica

## 12. Fusión

- Aprobado por el aprobador (contexto limpio) tras repetir pruebas de API, recorridos, capturas, cabeceras con `curl`, tsc, lint y audit; dos vueltas solo por archivos de documentación sin anotar.
- Commit de fusión: `3caa424` · Vuelta atrás: `git revert -m 1 3caa424`
- En `main` tras fusionar: `pruebas-api.mjs` 42/42, `pruebas-flujos.mjs` 0 fallos, `capturas.mjs` 0 problemas (5 rutas × 4 anchos). Nada empeoró fuera del encargo.
