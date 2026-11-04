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
- 2026-11-04 — Un server component que importa `Button`/`Badge` de shadcn arrastra todo `radix-ui` al navegador (la portada pasó de 0,2 a 65 kB). Las páginas cargan datos y pasan a un componente cliente, como dice la convención.
- 2026-11-04 — El tema claro de shadcn trae bordes de campo (1,26:1) y foco (1,54:1) por debajo de 3:1. Medir siempre con píxeles reales.
- 2026-11-04 — Con `asChild`, el `className` que se pasa a `AlertDialogAction` no se mezcla con la variante: usar `variant="destructive"`, no clases sueltas.
- 2026-11-04 — Comprobar reglas (duplicados, año cerrado) y escribir deben ir en la misma sección crítica; si no, dos peticiones simultáneas se las saltan (reproducido con dos POST).
- 2026-11-04 — Los avisos (toasts) abajo tapan botones en móvil y no se cierran mientras el puntero está encima.
- 2026-11-04 — Un control controlado que espera al servidor (checkbox) se nota roto: cambio optimista y vuelta atrás si falla.
- 2026-11-04 — Un `<fieldset>` no se encoge por debajo de su contenido (`min-inline-size: min-content`): `truncate` dentro no funciona sin `min-w-0`.
- 2026-11-04 — En un route handler de Next no hay límite de cuerpo: `request.formData()` lo carga entero en memoria. Comprobar `Content-Length` antes.
- 2026-11-04 — `onCloseAutoFocus` de Radix llega antes que una respuesta lenta del servidor: la confirmación de borrar debe esperar al borrado antes de cerrarse; y el destino de reserva del foco no puede estar detrás de un modal abierto.
- 2026-11-04 — Un botón `disabled` mientras trabaja pierde el foco (va a `<body>`): usar `aria-disabled`.
- 2026-11-04 — Pruebas con diálogos anidados: no pulsar Escape hasta que el de arriba tenga el foco; mejor su botón «Schließen».
- 2026-11-04 — Los revisores no deben escribir en los datos vivos ni aunque crean que un año está cerrado: comprobarlo antes con un GET.
