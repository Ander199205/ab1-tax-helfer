# Encargo 4: seguridad antes de datos reales (fase 4)

- Slug / rama: `feature/fase-4a-cuentas` (4a) y `feature/fase-4b-proteccion` (4b)
- Fecha: 04.11.2026 · Estado: **decisiones abiertas**
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

- [ ] **D1. Base de datos**: (a) **SQLite** en un archivo (`node:sqlite`, sin dependencias nuevas; aviso: Node lo marca «experimental») — **recomendada** para empezar con pocos clientes; el `Repository` permite pasar a PostgreSQL más adelante; (b) SQLite con la librería `better-sqlite3` (estable, dependencia nativa nueva); (c) PostgreSQL ya (servidor aparte, más mantenimiento).
- [ ] **D2. Inicio de sesión**: (a) **correo + contraseña propios** (scrypt de Node, sesiones en la base de datos), sin terceros — **recomendada**; (b) enlace mágico por correo (necesita proveedor de correo con AVV); (c) librería Auth.js.
- [ ] **D3. Cuentas**: (a) **solo el administrador crea cuentas**; cada cuenta = un cliente con sus datos separados — **recomendada**; (b) registro público.
- [ ] **D4. Contraseña olvidada**: (a) **la restablece el administrador** hasta tener correo con AVV — **recomendada**; (b) correo de recuperación ya.
- [ ] **D5. Cifrado de archivos**: (a) **AES-256-GCM en la app** con la clave en una variable de entorno (más el cifrado de disco del servidor cuando se despliegue) — **recomendada**; (b) solo el cifrado de disco del servidor.
- [ ] **D6. Antivirus**: (a) **ClamAV** en el propio servidor (sin terceros); si no está disponible, no se aceptan subidas — **recomendada**; (b) aceptar sin analizar mientras sea uso interno.
- [ ] **D7. Dónde irán los datos al desplegar** (se decide ahora porque condiciona copias y cifrado): (a) **servidor en Alemania** (p. ej. Hetzner, Núremberg/Falkenstein; empresa alemana con AVV) y copias en otro centro de datos alemán — **recomendada**; (b) plataforma de EE. UU. con región UE (Vercel, AWS…): más cómoda, peor encaje con DSGVO por la CLOUD Act.
- [ ] **D8. Duración de la sesión**: (a) **8 horas sin actividad, máximo 30 días** con «angemeldet bleiben» — **recomendada**; (b) otra.

Supuestos de riesgo bajo:
- Cuenta de administrador inicial creada con un comando (`node tools/admin.mjs crear …`), nunca con datos en el repo.
- Datos de ejemplo: dos cuentas inventadas («Muster Design» y «Beispiel Studio») para probar el aislamiento.

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
