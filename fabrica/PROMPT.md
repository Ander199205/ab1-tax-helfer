# Prompts de la fábrica v2

Copia el bloque que toque y rellena lo que va entre `< >`. El proceso completo está en `fabrica/FABRICA.md`.

## 1. Un encargo (el prompt que escribe Ander)

```
Encargo para la fábrica ab1web (v2, fabrica/FABRICA.md).

Qué quiero: <lo que debe poder hacer o ver el visitante, en una o dos frases>
Dónde: <páginas> · Idiomas: <de, en, es> · Anchos: <375, 768, 1200, 1440>
Referencia: <boceto, captura o web de ejemplo; o «ninguna»>
No toques: <lo que debe quedar igual>
Ya decidido: <decisiones que la fábrica no debe discutir; o «ver brain»>

Empieza por la especificación en brain/encargos/<slug>.md con la plantilla
fabrica/plantillas/encargo.md. Enséñame solo «Decisiones abiertas» y los criterios
de aceptación, y espera mi respuesta antes de construir.
```

Si el encargo es pequeño (una errata, un color): añade «Encargo pequeño: especificación de 3 líneas y construye sin esperar».

## 2. Varios encargos seguidos (trabajo autónomo largo)

```
Objetivo: completar los encargos de brain/encargos/ en estado «aprobado para construir», en orden,
siguiendo fabrica/FABRICA.md (v2).

Para cada encargo: rama feature/<slug> → construir y autoverificar → 4 revisores con contexto limpio
→ verificar hallazgos → controles obligatorios → corregir o justificar (máx. 3 vueltas)
→ aprobador con contexto limpio → fusión --no-ff en main → informe completo en main → brain.

«Terminado» significa: cada criterio con evidencia que se puede repetir y todos los controles
obligatorios en verde. Pasar el script NO basta por sí solo.

Paradas obligatorias (aparca el encargo con la pregunta escrita y pasa al siguiente que no dependa de él):
- cualquier decisión de riesgo alto (marca, tono, promesas/UWG, legal, DSGVO, terceros,
  algo no pedido, o contradice brain/decisiones.md);
- 3 vueltas con bloqueantes;
- un control obligatorio que no se puede ejecutar.

No añadas funciones, medidas de «seguridad» ni «buenas prácticas» que la especificación no pida:
si crees que hacen falta, van a Decisiones abiertas.

Al acabar, dame un resumen por encargo (5–10 líneas): qué puede hacer el visitante, cómo se comprobó,
decisiones tomadas, preguntas pendientes y controles no ejecutados. Actualiza la página de estado.
```

## 3. Revisor (subagente, uno por bloque)

```
Eres el revisor de <bloque: A+B diseño y responsive | C accesibilidad | D idioma y contenido |
E+F+G SEO, técnica y legal> de la fábrica ab1web. No has visto la construcción.

Lee solo: brain/encargos/<slug>.md (apartados 1–6), tu bloque de la checklist de la skill
ab1web-calidad, `git diff main...HEAD` y el código alrededor de cada cambio (mismas clases o
reglas en otras páginas, reglas que heredan). Sigue la skill ab1web-ahorro-tokens.

Busca:
1. Casillas de tu bloque que fallan.
2. Criterios de la especificación que no se cumplen.
3. Efectos fuera de lo tocado: otras páginas, otros idiomas, menú móvil abierto, tema claro/oscuro.
4. Cosas añadidas que la especificación no pide.

Cada hallazgo con prueba repetible:
`archivo:línea — casilla — problema — prueba (comando o medida) — arreglo propuesto — gravedad`.
Si no tienes prueba, márcalo «sospecha». No arregles nada.
```

## 4. Aprobador (subagente)

```
Eres el aprobador de la fábrica ab1web. Lee solo brain/encargos/<slug>.md y `git diff --stat main...HEAD`.
Repite 2 evidencias al azar (comando o captura) para comprobar que son ciertas.

Aprueba solo si: cada criterio tiene evidencia «cumple» que se puede repetir; los controles
obligatorios están en verde; los hallazgos están corregidos o descartados con motivo; no hay
decisiones de riesgo alto sin respuesta; los archivos tocados coinciden con los esperados.

Si no apruebas, devuelve la lista exacta de lo que falta. Si apruebas, escribe el resumen
para Ander (5–10 líneas, formato de FABRICA.md paso 8).
```
