# Encargo 4: seguridad antes de datos reales (fase 4)

- Slug / rama: `feature/fase-4a-cuentas` (4a) y `feature/fase-4b-proteccion` (4b)
- Fecha: 04.11.2026 · Estado: **4a fusionada (`9075d22`)** · 4b sin empezar
- Tamaño: grande → se divide en dos encargos que se especifican aquí y se aprueban por separado

## Por qué en dos partes

| Parte | Qué | Por qué va así |
|---|---|---|
| **4a · Cuentas y base de datos** | Inicio de sesión, cuentas de clientes, cada cuenta ve solo sus datos, SQLite en lugar de JSON | Es la base: sin cuentas no tiene sentido cifrar ni hacer copias por cliente |
| **4b · Protección de los datos** | Cifrado de archivos, análisis de virus, copias de seguridad, cabeceras y límites de intentos, borrar una cuenta con todo | Se apoya en 4a; se puede revisar con calma aparte |

Hasta que 4b esté aprobada, la regla sigue igual: **ningún dato real**.

## 1. Qué podrá hacer quien use la app

**4a**
1. Iniciar sesión con correo y contraseña (pantalla «Anmelden»); cerrar sesión. Sin sesión no se ve nada (ni páginas ni API ni archivos).
2. Ander, como administrador, crea las cuentas de sus clientes (no hay registro público) y puede desactivarlas.
3. Cada cliente ve y cambia **solo sus** años, Belege, categorías y archivos; pedir los de otro da 404.
4. Cambiar la propia contraseña.
5. Todo lo de las fases 2 y 3 sigue funcionando igual, ahora sobre SQLite.

**4b**
6. Los archivos se guardan cifrados en disco; en la app se ven igual que antes.
7. Un archivo con virus se rechaza al subirlo con un mensaje claro.
8. Copia de seguridad diaria cifrada de la base de datos y los archivos; restaurarla está probado.
9. Tras varios intentos fallidos de inicio de sesión, espera obligatoria.
10. Borrar una cuenta borra todos sus datos y archivos (DSGVO art. 17).

## 2. Punto de partida

- `main@2331ebd`: app de un solo usuario sin inicio de sesión; datos en `data/*.json` detrás de `Repository<T>`; archivos en `data/uploads/` sin cifrar; pruebas 42/42 API, flujos 0 fallos, capturas 0 problemas.
- Node 22.23 trae `node:sqlite` (marcado «experimental») y `crypto` (scrypt, AES-256-GCM): se puede hacer **sin dependencias nuevas**.
- `Repository<T>` ya aísla los datos: cambiar JSON por SQLite no toca las pantallas.

## 3. Qué hay que respetar

- Organiza, no asesora; nada de «GoBD-konform» ni «revisionssicher».
- DSGVO: nada de terceros sin AVV; datos en la UE; mínimo de datos (correo, nombre, contraseña cifrada con hash).
- Interfaz en alemán con «du»; accesibilidad y contraste como en las fases 2–3.
- Decisiones anteriores: año cerrado en solo lectura, archivos por bytes, sección crítica de escrituras, solo JSON en la API (salvo subidas).
- Lecciones: probar en el navegador, reiniciar tras compilar, revisores sin escribir en datos vivos, anotar todos los archivos tocados.

## 4. Criterios de aceptación (resumen; se detallan en cada parte)

| # | Criterio | Parte |
|---|---|---|
| 1 | Sin sesión: páginas → «Anmelden»; API y archivos → 401 | 4a |
| 2 | Contraseñas con hash scrypt y sal; sesión en cookie `HttpOnly`, `Secure`, `SameSite=Lax`, caducidad; cerrar sesión la invalida en el servidor | 4a |
| 3 | Aislamiento: con la cuenta A, ningún id de B devuelve datos (404) en ninguna ruta; prueba que recorre todas | 4a |
| 4 | Solo el administrador crea, desactiva y reactiva cuentas; una cuenta desactivada no puede entrar | 4a |
| 5 | Migración: los datos de ejemplo pasan a SQLite y todas las pruebas de las fases 2–3 siguen en verde | 4a |
| 6 | Archivos cifrados (AES-256-GCM, clave fuera del repo): el disco no contiene el PDF legible; la app lo muestra igual | 4b |
| 7 | Archivo de prueba EICAR rechazado; si el antivirus no está disponible, la subida se rechaza (no se acepta sin analizar) | 4b |
| 8 | Copia + restauración probadas: se borra todo, se restaura y las pruebas pasan | 4b |
| 9 | Límite de intentos de inicio de sesión; cabeceras de seguridad (CSP, HSTS, `frame-ancestors`) en todas las respuestas | 4b |
| 10 | Borrar cuenta: no queda nada de ella en la base de datos ni en disco | 4b |

## 5. Cómo se demuestra

Pruebas automáticas ampliadas (API y navegador) con **dos cuentas de prueba**, más una prueba de aislamiento que recorre todas las rutas con ids de la otra cuenta; en 4b, comprobación del disco (bytes cifrados), EICAR y un ensayo de copia y restauración. Cuatro revisores; el de seguridad (D/E) con más peso.

## 6. Fuera de alcance

- Despliegue en un servidor (fase 6). Aquí todo corre en local; se deja preparado.
- Registro público, pago, varias personas por cuenta de cliente, inicio de sesión con Google/Apple.
- Recuperar contraseña por correo (necesita un proveedor de correo con AVV): de momento la restablece el administrador.
- Textos legales (Datenschutzerklärung, AVV con los clientes): los redacta un profesional; la fábrica comprueba que existan antes de vender.

## 7. Decisiones abiertas (se responden antes de construir)

- [x] **D1. Base de datos**: (a) **SQLite** en un archivo (`node:sqlite`, sin dependencias nuevas; aviso: Node lo marca «experimental») — **recomendada** para empezar con pocos clientes; el `Repository` permite pasar a PostgreSQL más adelante; (b) SQLite con la librería `better-sqlite3` (estable, dependencia nativa nueva); (c) PostgreSQL ya (servidor aparte, más mantenimiento).
- [x] **D2. Inicio de sesión**: (a) **correo + contraseña propios** (scrypt de Node, sesiones en la base de datos), sin terceros — **recomendada**; (b) enlace mágico por correo (necesita proveedor de correo con AVV); (c) librería Auth.js.
- [x] **D3. Cuentas**: (a) **solo el administrador crea cuentas**; cada cuenta = un cliente con sus datos separados — **recomendada**; (b) registro público.
- [x] **D4. Contraseña olvidada**: (a) **la restablece el administrador** hasta tener correo con AVV — **recomendada**; (b) correo de recuperación ya.
- [x] **D5. Cifrado de archivos**: (a) **AES-256-GCM en la app** con la clave en una variable de entorno (más el cifrado de disco del servidor cuando se despliegue) — **recomendada**; (b) solo el cifrado de disco del servidor.
- [x] **D6. Antivirus**: (a) **ClamAV** en el propio servidor (sin terceros); si no está disponible, no se aceptan subidas — **recomendada**; (b) aceptar sin analizar mientras sea uso interno.
- [x] **D7. Dónde irán los datos al desplegar** (se decide ahora porque condiciona copias y cifrado): (a) **servidor en Alemania** (p. ej. Hetzner, Núremberg/Falkenstein; empresa alemana con AVV) y copias en otro centro de datos alemán — **recomendada**; (b) plataforma de EE. UU. con región UE (Vercel, AWS…): más cómoda, peor encaje con DSGVO por la CLOUD Act.
- [x] **D8. Duración de la sesión**: (a) **8 horas sin actividad, máximo 30 días** con «angemeldet bleiben» — **recomendada**; (b) otra.

Supuestos de riesgo bajo:
- Cuenta de administrador inicial creada con un comando (`node tools/admin.mjs crear …`), nunca con datos en el repo.
- Datos de ejemplo: dos cuentas inventadas («Muster Design» y «Beispiel Studio») para probar el aislamiento.

---

## 8. Evidencias (4a)

Ejecutadas el 04.11.2026 en `feature/fase-4a-cuentas`, con `npm start` recién compilado y reiniciado:

| # | Resultado | Evidencia |
|---|---|---|
| 1 | cumple | `pruebas-api.mjs`: sin sesión, las 4 rutas GET, POST/PATCH/DELETE y los archivos → 401; las 7 páginas → 307 a `/anmelden` |
| 2 | cumple | cookie `__Host-th_session` con `HttpOnly; Secure; SameSite=lax`, sin `Expires` salvo «angemeldet bleiben»; hash `scrypt$131072$8$1$` (OWASP) en la BD, nunca el token (solo su SHA-256); cerrar sesión, volver a entrar, cambiar o restablecer la contraseña y desactivar invalidan las sesiones; caducidad por inactividad (9 h → 401), absoluta (`expires_at` pasado → 401) y tope de 30 días al alargar |
| 3 | cumple | prueba que **lee todas las rutas de `src/app/api/**/route.ts`** y prueba cada método con ids de la otra cuenta, en las dos direcciones: 404 (403 en admin), y las listas no contienen ids ajenos; categoría ajena → 400 |
| 4 | cumple | cliente → 403 en `/api/admin/*`; alta con contraseña inicial de 16 caracteres; desactivada → 401 en la sesión abierta y 403 al entrar; restablecer → la antigua deja de valer; el admin no puede desactivarse |
| 5 | cumple | **53/53** pruebas de la API (incl. todas las de las fases 2–3) y `pruebas-flujos.mjs` 0 fallos a 375 y 1440 px (incl. iniciar sesión, contraseña falsa, cerrar sesión, alta desde «Kundenkonten» y entrar con la cuenta nueva) |
| — | cumple | `capturas.mjs --login`: 0 problemas en 6 rutas × 4 anchos y en `/verwaltung` con admin; tsc y lint sin errores; `npm audit --omit=dev` 0 vulnerabilidades |
| — | cumple | a mano: 900×400 el pie no tapa la navegación (la lista se desplaza); 667×375 la barra mide 105 px y no es fija; protección de `demo` probada con una BD aparte que tenía una cuenta real |

## 9. Hallazgos de los revisores (4a)

Tres revisores con contexto limpio: A+B (diseño y accesibilidad), C (idioma), D+E (seguridad y técnica). Ninguno bloqueante.

| Gravedad | Bloque | Problema | Estado |
|---|---|---|---|
| importante | D | `scryptSync` bloqueaba el servidor: 30 intentos simultáneos → 3 s de espera para todos | corregido: scrypt asíncrono + límite de intentos (5 por correo y 100 por IP cada 15 min → 429), adelantado de la 4b; prueba |
| importante | D | Clave de `documents` sin `owner_id` | corregido: `PRIMARY KEY (owner_id, collection, id)` con migración automática |
| importante | D | `demo` podía crear un admin con contraseña pública en un servidor | corregido: exige `TAX_HELFER_DEMO=1` y nunca con `NODE_ENV=production`. Bloquear en producción el inicio de sesión de cuentas `@beispiel.de` → **pendiente (fase 6)** |
| importante | D | CSRF desde subdominio hermano (logout, subidas) y cookie plantable | corregido: comprobación de `Sec-Fetch-Site`/`Origin` en todo cambio (middleware + subidas) y cookie `__Host-`; prueba |
| importante | E | La prueba de aislamiento no recorría todas las rutas ni las dos direcciones; sin pruebas de caducidad | corregido: rutas sacadas del sistema de archivos × métodos × 2 direcciones; caducidades y re-login probados |
| importante | A | Filas de cuentas aplastadas a 768 px; correo cortado | corregido: texto a lo ancho hasta 1024 px, acciones debajo, correo con `break-all` |
| importante | B | Foco a `<body>` al cerrar el diálogo de la contraseña | corregido: vuelve al botón o al campo del nombre; en la prueba |
| importante | A | Pie de la barra tapaba enlaces en ventanas bajas | corregido: barra en columna, navegación desplazable, pie en flujo |
| importante | B | Barra fija de 154 px en móvil horizontal (2.4.11) | corregido: «Abmelden» en la fila del logo y barra no fija en horizontal |
| importante | A | Nombre largo cortado en el pie | corregido: salto de línea en escritorio; en móvil, en el `aria-label` y `title` |
| importante | A4 | Doble envío en alta, inicio de sesión, contraseña y cierre de sesión | corregido: los manejadores comprueban `busy` |
| importante | C | «Verwaltung» suena a Hacienda y como rol no se entiende | corregido: sección «Kundenkonten» (la ruta sigue siendo `/verwaltung`), rol «Admin», «ab1 Team (Demo)» |
| menor | D | Sesión sin «remember» sin tope absoluto; sesiones viejas sin borrar; re-login no borraba la anterior; `remember` perdido al cambiar la contraseña | corregidos |
| menor | D | N=2^15 por debajo de OWASP; contraseñas tipo «aaaaaaaaaa»; sin máximo; hash ficticio al importar | corregidos (N=2^17 con recálculo al entrar; lista y variedad mínima; 256 máx.; cálculo perezoso) |
| menor | E | `transaction()` sin anidar y aceptando async; `busy_timeout` de 5 s; comentario de `exclusive` desfasado; `crear-admin` sin validar | corregidos (SAVEPOINT, tipo síncrono, 1 s) |
| menor | D | API sin `Cache-Control: no-store` | corregido en el middleware; prueba |
| menor | B/A | Gestor de contraseñas sin `username` en Konto; foco al primer error; casilla de 16 px; foco al llegar a «Anmelden»; enlaces ocultos en la barra móvil | corregidos (campo oculto, foco, fila pulsable, `autoFocus`, degradado en el borde) |
| menor | C | 10 textos (anmelden/abmelden, «Schreib uns», «angelegt am», «Name (Firma oder Person)», etc.) | corregidos |
| menor | C | Mensajes técnicos («Ungültige Daten.», «Nur JSON …») | **descartado**: solo salen con peticiones mal formadas, nunca desde la interfaz |
| menor | E | Aviso «experimental» de `node:sqlite` | aceptado en D1; anotado en decisiones; probar en cada actualización de Node |
| menor | E | JSON viejos de la fase 3 en `data/` | **pendiente de Ander**: el entorno no dejó borrarlos (comprobación de seguridad); no se usan y están fuera de git |
| nota | D | Un cliente que abre `/verwaltung` recibe 200 con redirección en el stream (sin datos) | aceptado: no hay fuga; se revisa al desplegar |
| nota | D | Safari antiguo no guarda cookies `Secure` en `http://localhost` | anotado en CLAUDE.md: en local, Chrome o Firefox; en producción siempre HTTPS |
| nota | — | Al añadir el middleware, Next recortaba a 10 MB las subidas (llegaban vacías) | **encontrado por las pruebas** y corregido: las subidas no pasan por el middleware y comprueban el origen en su manejador |

## 10. Controles obligatorios (4a)

- [x] Criterios 1–5 con evidencia «cumple»
- [x] Script sin avisos (0 problemas, con sesión)
- [x] HTML válido en lo tocado
- [x] Contraste medido (revisor A+B: 4,61–7,09:1 en textos, 3,64:1 bordes)
- [x] Textos en alemán con «du»
- [x] Ninguna decisión del brain contradicha
- [x] Archivos tocados: todos en `src/` (auth, db, data, api, app, components), `tools/` (admin, capturas, pruebas), `tsconfig.json` (`allowImportingTsExtensions`), `.gitignore` (BD), `CLAUDE.md`, `brain/`, `docs/producto.md`, `tools/estado/datos.json`. Se borró `src/lib/data/json-store.ts`. Las páginas se movieron a `src/app/(app)/` (mismas URL).
- [x] tsc, lint, build y `npm audit --omit=dev` en verde

No ejecutados: ninguno.

## 11. Decisiones tomadas (4a)

- 04.11.2026 — Ander — D1–D8 según lo recomendado.
- 04.11.2026 — medio — límite de intentos de inicio de sesión adelantado de la 4b a la 4a (en memoria; la 4b decide si va a la BD) — fábrica
- 04.11.2026 — medio — comprobación de origen en todos los cambios y cookie `__Host-` — fábrica
- 04.11.2026 — medio — sección «Kundenkonten» (antes «Verwaltung»), rol «Admin» — fábrica, a propuesta del revisor de idioma
- 04.11.2026 — bajo — páginas con sesión en el grupo `src/app/(app)/` — fábrica
- 04.11.2026 — bajo — `demo` solo con `TAX_HELFER_DEMO=1` — fábrica

## 12. Fusión (4a)

- Aprobada por el aprobador (contexto limpio) tras repetir pruebas de API y navegador, capturas, curl (401, 307, 403 desde otra web, flags de la cookie), tsc, lint y audit. Nota del aprobador: `docs/producto.md` y `tools/estado/datos.json` no estaban en la rama; se actualizan en el cierre, en `main`.
- Commit de fusión: `9075d22` · Vuelta atrás: `git revert -m 1 9075d22`
- En `main` tras fusionar: `pruebas-api.mjs` 53/53, `pruebas-flujos.mjs` 0 fallos, `capturas.mjs` 0 problemas.
