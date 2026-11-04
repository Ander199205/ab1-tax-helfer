# Fábrica ab1web · v2 (encargos demostrados)

> Copia de `ab1web/fabrica/FABRICA.md` (v2) para **ab1 Tax Helfer**. Diferencias en este repo:
> - Checklist: `fabrica/checklist-app.md` (en lugar de la skill `ab1web-calidad`). Revisores: 1 diseño y responsive (A),
>   2 accesibilidad (B), 3 idioma y contenido (C), 4 datos, seguridad y técnica (D, E).
> - Controles automáticos: `npx tsc --noEmit`, `npm run lint`, `npm run build` y `node tools/capturas.mjs --url http://localhost:3000 --sin-capturas`.
> - Idioma de la interfaz: solo alemán. Lo que abajo dice «en, de, es» o «idiomas» se lee como «alemán».

## Por qué cambia

La v1 era: especificación → construcción → 4 revisiones → aprobación → fusión → brain.
Funciona, pero tiene dos agujeros que aparecen en cuanto el agente trabaja solo durante horas:

1. **El agente rellena huecos por su cuenta.** Si la especificación no dice algo, decide él (y casi
   siempre «por seguridad» o «por buena práctica»). Así salen cosas que nadie pidió y faltan cosas que sí.
2. **«He comprobado» no es una prueba.** Pasar el script o decir «revisado» no demuestra que el
   visitante pueda hacer lo que pedimos, ni que no se haya roto algo que ya funcionaba.

La v2 mantiene las mismas fases pero cambia tres cosas:

- La **especificación** dice qué podrá hacer el visitante, qué hay que respetar del brain y **cómo se demostrará**.
- La **construcción** incluye su propia revisión: autoverificación, revisores con contexto limpio,
  verificación de hallazgos y controles obligatorios. A la persona solo le llega algo ya revisado.
- Cada encargo deja **evidencias** en `brain/encargos/<slug>.md`, para que los encargos futuros sepan
  qué se probó y cómo.

El objetivo no es que Ander revise más, sino que revise **solo lo que importa**: decisiones de producto,
de marca o legales, y lo que contradiga algo decidido antes.

## Las fases

```
0. Encargo   →  1. Especificación  →  2. Construir + autoverificar  →  3. Revisores (4, contexto limpio)
             →  4. Verificar hallazgos  →  5. Controles obligatorios  →  6. Corregir o justificar
             →  7. Decisión según riesgo  →  8. Aprobación  →  9. Fusión y comprobación en main  →  10. Brain
```

### 1. Especificación (la fase larga, a propósito)

Se rellena `fabrica/plantillas/encargo.md` en `brain/encargos/<slug>.md`. Antes de escribir:

- `grep -n` en `brain/decisiones.md` y `brain/lecciones.md` por las palabras del encargo
  (página, componente, idioma, menú…). Todo lo que aplique se copia al apartado **Qué hay que respetar**.
- Se copian de `ab1web-calidad` las casillas de la checklist que toca el encargo y se convierten
  en criterios medibles («contraste ≥ 4,5:1 medido en píxeles», no «buen contraste»).

La especificación tiene siempre estos apartados:

| Apartado | Pregunta que responde |
|---|---|
| Qué podrá hacer el visitante | Acción concreta, en qué página, idioma y ancho. |
| Punto de partida | Qué hay hoy (informe del script en `main`, captura si es visual). |
| Qué hay que respetar | Decisiones del brain, encargos anteriores y comportamientos que deben seguir igual. |
| Criterios de aceptación | Lista numerada, cada uno medible y con su casilla de la checklist. |
| Cómo se demuestra | Para cada criterio: comando, captura o medida exacta, y qué resultado cuenta como «cumple». |
| Fuera de alcance | Lo que **no** se toca, aunque parezca buena idea. |
| Decisiones abiertas | Huecos que el agente no puede cerrar solo. Se preguntan **antes** de construir. |

**Regla de huecos:** si algo no está en la especificación ni en el brain, el agente **no lo decide**.
Si es trivial (ver tabla de riesgo), lo anota como supuesto y sigue; si no, va a Decisiones abiertas y se pregunta.
Un encargo con Decisiones abiertas sin responder no pasa a construcción.

### 2. Construir y autoverificar

- Rama `feature/<slug>`. Cambios pequeños; un commit por criterio cuando sea posible.
- Tras cada cambio, el constructor ejecuta lo que dice **Cómo se demuestra** para ese criterio
  y pega el resultado (resumido) en el apartado Evidencias del encargo. Sin evidencia, el criterio sigue «pendiente».
- Siempre al final: `node tools/capturas.mjs --sin-capturas --idiomas de,en,es <páginas afectadas>`
  y comparación con el informe de `main` del punto de partida.

### 3. Revisores con contexto limpio

Se lanzan **cuatro subagentes nuevos** (sin la conversación del constructor), uno por bloque de la checklist:

1. Diseño y responsive (A, B) · 2. Accesibilidad (C) · 3. Idioma y contenido (D) · 4. SEO, técnica y legal (E, F, G)

Cada uno recibe solo: la especificación, su bloque de la checklist, `git diff main...HEAD` y permiso para
leer el código **alrededor** del cambio (las mismas clases en otras páginas, reglas CSS que heredan).
Buscan además: efectos en otras páginas, en otros idiomas y en el menú móvil abierto; cosas añadidas que
la especificación no pide; criterios de la especificación que no se cumplen.

Formato de hallazgo: `archivo:línea — casilla — problema — prueba (comando o medida) — arreglo propuesto`.

### 4. Verificar hallazgos

Antes de tratar un hallazgo como fallo, el constructor (u otro subagente) lo **contrasta con el código real**:

- Reproduce la prueba. Si no se reproduce, se descarta con la razón.
- Junta duplicados (los cuatro revisores suelen ver lo mismo desde ángulos distintos).
- Ordena por gravedad: **bloqueante** (casilla ●, rompe un criterio o una decisión del brain) → **importante** → **menor**.

### 5. Controles obligatorios

Un encargo no puede marcarse terminado si falla cualquiera de estos:

- [ ] Todos los criterios de aceptación con evidencia «cumple».
- [ ] `tools/capturas.mjs --sin-capturas --idiomas de,en,es`: ningún aviso **nuevo** respecto a `main` en las páginas afectadas (0 scroll horizontal, 0 textos partidos, 0 terceros).
- [ ] HTML válido en lo tocado (sin etiquetas sin cerrar ni ids duplicados).
- [ ] (ab1 Tax Helfer) `tsc`, `lint`, `build` sin errores y `npm audit --omit=dev` sin altas nuevas.
- [ ] Contraste medido de todo color nuevo o cambiado (ratio anotado).
- [ ] Textos nuevos presentes en `en`, `de` y `es`; nada en inglés en la versión alemana.
- [ ] Ninguna decisión de `brain/decisiones.md` contradicha.
- [ ] Nada fuera de alcance tocado (`git diff --stat` contra la lista de archivos esperados).

Un control **que no se pudo ejecutar** no cuenta como superado: se anota como «no ejecutado — motivo»
y aparece arriba en el resumen para la persona.

### 6. Corregir o justificar

Cada hallazgo verificado vuelve al constructor con su prueba. Termina en uno de dos estados:

- **Corregido** — con la nueva evidencia.
- **Descartado** — con la razón escrita (p. ej. «fuera de alcance, va al encargo X», «el revisor midió el token, no los píxeles»).

Máximo **3 vueltas**. Si a la tercera sigue habiendo bloqueantes, se para y se pregunta.

### 7. Decisión según riesgo

| Riesgo | Ejemplos | Qué hace la fábrica |
|---|---|---|
| Bajo | Errata, espaciado, `nowrap` que falta, alt vacío en decorativa, aviso de un control automático | Lo arregla, lo anota en el encargo y sigue. |
| Medio | Cambio que afecta a otras páginas, nueva regla CSS global, texto visible nuevo | Lo arregla, lo anota y lo **destaca** en el resumen final. |
| Alto | Toca marca, tono, precios o promesas (UWG), textos legales, datos personales o terceros (DSGVO), contradice el brain, añade algo no pedido | **Para y pregunta.** No se decide en nombre de «la seguridad» ni de «las buenas prácticas». |

Toda decisión, de cualquier riesgo, queda escrita en el encargo con su fecha.

### 8. Aprobación

Un agente aprobador (contexto limpio) lee **solo** el encargo con sus evidencias y `git diff --stat`.
Aprueba si cada criterio tiene evidencia que se puede repetir y los controles obligatorios están en verde.
No vuelve a revisar el código entero.

A la persona le llega un resumen de 5–10 líneas:

1. Qué puede hacer ahora el visitante (los criterios, cumplidos).
2. Cómo se ha comprobado (comandos y capturas clave, 2 como máximo).
3. Decisiones tomadas por la fábrica (riesgo medio) y decisiones que esperan respuesta (riesgo alto).
4. Controles no ejecutados y pendientes que pasan a otro encargo.

### 9. Fusión y comprobación en main

- `git merge --no-ff feature/<slug>` en `main` solo con aprobación (y respuesta de la persona si hubo riesgo alto).
- Después de fusionar, en `main`: se repite el informe del script en **todas** las páginas (no solo las afectadas)
  y se compara con el último informe guardado. Si algo empeora fuera del encargo, se avisa.
- **Vuelta atrás:** el encargo anota el commit de fusión. Si falla, `git revert -m 1 <commit>` y se reabre el encargo.

### 10. Brain

- El encargo (`brain/encargos/<slug>.md`) queda con especificación, evidencias y decisiones: es la prueba de lo hecho.
- Decisiones nuevas de producto → una línea en `brain/decisiones.md` con fecha y enlace al encargo.
- Fallos que se repiten → una línea en `brain/lecciones.md` y, si son generales, una casilla nueva en la checklist o un control nuevo en el paso 5.
- Se actualiza la página de estado (ver `CLAUDE.md`).

## Encargos pequeños

Para una errata o un color que no cambia nada más: especificación de 3 líneas (qué, dónde, cómo se demuestra),
un solo revisor del bloque afectado y los controles obligatorios. Sin rebajar los controles.

## Trabajo autónomo largo

Si la fábrica va a encadenar varios encargos sin la persona delante, usa `fabrica/PROMPT.md` (sección «Varios encargos»).
Las paradas obligatorias (riesgo alto, 3 vueltas sin resolver, control obligatorio imposible de ejecutar) siguen valiendo:
la fábrica **aparca ese encargo** con la pregunta escrita y pasa al siguiente que no dependa de él.
