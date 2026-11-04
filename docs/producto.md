# ab1 Tax Helfer — qué es y qué no es

## Qué es
Una aplicación para **reunir, ordenar y entregar** los justificantes de un año fiscal (facturas, recibos, certificados)
a la asesoría fiscal. Primero la usa Ander internamente; después se ofrecerá a los clientes de ab1web (autónomos y pequeñas empresas en Alemania).

## Qué no es
- No calcula impuestos ni dice qué es deducible (eso es asesoramiento fiscal, StBerG).
- No es un programa de contabilidad ni un archivo con validez GoBD (no se promete conservación legal).
- No envía nada a Hacienda (ELSTER).

## Dominio previsto (fase 2, a especificar)
- `TaxYear` — año, estado: offen / an Steuerberatung übergeben / abgeschlossen
- `Document` — justificante: fecha, importe, categoría, año, notas, estado (archivo en la fase 3)
- `Category` — agrupación propia para ordenar; no es una clasificación fiscal
- `ChecklistItem` — qué falta por año
- `Export` — paquete ZIP + CSV para la asesoría

## Fases
| Fase | Qué | Puerta para pasar |
|---|---|---|
| 0 | Decisiones e informe previo | Respuestas de Ander ✔ (04.11.2026) |
| 1 | Repo base desde `panel-contenido`, fábrica, brain, Graphify | tsc, lint, build y capturas en verde ✔ |
| 2 | Dominio con datos ficticios: años, justificantes (sin archivo), categorías, checklist | Criterios demostrados a 375 y 1440 px ✔ |
| 3 | Subida de archivos local y vista previa | Pruebas de tipos, tamaño y rutas |
| 4 | Seguridad: auth, datos por usuario, SQL, cifrado, copias | Revisión de seguridad; sin esto no hay datos reales |
| 5 | Exportación para la asesoría (ZIP + CSV en formato alemán) | Exportación abierta y comprobada |
| 6 | Página del producto en ab1web (opcional) y despliegue en la UE | Decisión de Ander + Datenschutz actualizado |
