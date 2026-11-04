# Encargo <n>: <título corto>

- Slug / rama: `feature/<slug>`
- Fecha: DD.MM.AAAA · Estado: especificación | decisiones abiertas | construcción | revisión | aprobado | fusionado (`<commit>`) | aparcado
- Tamaño: normal | pequeño

## 1. Qué podrá hacer el visitante

<Una o tres frases. Acción concreta, página, idiomas, anchos. Ej.: «En el móvil (375 px), el visitante abre el menú,
pulsa “Kontakt” y llega al formulario; con Escape el menú se cierra y el foco vuelve al botón».>

## 2. Punto de partida

- Informe en `main` (`node tools/capturas.mjs --sin-capturas --idiomas de,en,es <páginas>`): <resumen de avisos>
- Captura de referencia si es visual: `.capturas/<archivo>` (ancho)
- Boceto o ejemplo que manda la persona, si lo hay: <ruta>

## 3. Qué hay que respetar

Del brain (`grep -n "<palabras>" brain/*.md`):
- <decisión o lección> — <fecha>

Comportamientos que deben seguir igual:
- <p. ej. idioma guardado en `ab1web-language-v2`; menú plegable a 820 px; pie con Impressum y Datenschutz>

## 4. Criterios de aceptación

| # | Criterio (medible) | Casilla |
|---|---|---|
| 1 | | |
| 2 | | |

## 5. Cómo se demuestra

| # | Prueba (comando, captura o medida) | Cuenta como «cumple» si… |
|---|---|---|
| 1 | | |
| 2 | | |

## 6. Fuera de alcance

- <lo que no se toca>
- Archivos que se espera tocar: <lista> (el control 5 compara con `git diff --stat`)

## 7. Decisiones abiertas (se responden antes de construir)

- [ ] <pregunta concreta con 2–3 opciones y la recomendada>

Supuestos de riesgo bajo que la fábrica toma por su cuenta:
- <supuesto>

---

## 8. Evidencias (las rellena la construcción)

| # | Resultado | Evidencia | Commit |
|---|---|---|---|
| 1 | cumple / no cumple / pendiente | <salida resumida, ratio, captura> | |

## 9. Hallazgos de los revisores

| Gravedad | Archivo:línea | Casilla | Problema | Prueba | Estado (corregido / descartado — motivo) |
|---|---|---|---|---|---|

## 10. Controles obligatorios

- [ ] Criterios con evidencia «cumple»
- [ ] Script sin avisos nuevos respecto a `main`
- [ ] HTML válido en lo tocado
- [ ] Contraste medido de colores nuevos: <ratios>
- [ ] Textos en `en`, `de`, `es`; nada en inglés en DE
- [ ] Ninguna decisión del brain contradicha
- [ ] Nada fuera de alcance tocado

No ejecutados: <control — motivo>

## 11. Decisiones tomadas

- DD.MM.AAAA — riesgo bajo/medio/alto — <decisión> — <quién: fábrica / Ander>

## 12. Fusión

- Commit de fusión: `<hash>` · Vuelta atrás: `git revert -m 1 <hash>`
- Informe en `main` tras fusionar (todas las páginas): <resumen; ¿algo empeoró fuera del encargo?>
