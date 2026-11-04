# Lecciones

Heredadas de `panel-contenido` (siguen aplicando):
- Los números alemanes usan punto de miles y coma decimal («1.234,5»): no basta con cambiar la coma por punto.
- Si un endpoint necesita lógica propia, va como gancho en `createCrudHandlers`/`handlers.ts`, nunca en `route.ts`.
- El constructor prueba la interfaz en el navegador antes de entregar.
- `overrides.next.postcss = 8.5.31` en `package.json` por Next 15; al pasar a Next 16, quitarlo. Comprobar con `npm ls postcss`.
- `sharp` 0.35 exige Node ≥ 20.9.
- Las barras de acciones con varios botones necesitan `flex-wrap` o versión solo icono en móvil.

Heredadas de `ab1web`:
- Medir el contraste contra los colores reales, no contra el nombre del token.

Propias:
- 2026-11-04 — `tools/capturas.mjs` contaba el icono SVG de un enlace como una segunda línea de texto («texto partido» falso). Ahora mide solo los nodos de texto.
- 2026-11-04 — Una app de React puede responder 200 y mostrar solo «Application error»: el script ahora informa de errores de JavaScript y de consola.
- 2026-11-04 — Tras `npm run build`, un `npm start` que ya estaba en marcha sirve la versión anterior: los archivos JS nuevos dan 400. Reiniciar siempre el servidor después de compilar.
