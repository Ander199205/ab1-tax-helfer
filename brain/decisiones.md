# Decisiones

- 2026-11-04 — Producto independiente en su propio repo (carpeta local `abweb-tax-organizer`; nombre del repo en GitHub según lo cree Ander), creado copiando la base de `panel-contenido` (Next 15, shadcn, `Repository<T>`, `createCrudHandlers`, `useCrud`). Sin monorepo ni paquete compartido hasta que haya un tercer producto.
- 2026-11-04 — Para los clientes de ab1web (autónomos y pymes en Alemania). Primero uso y prueba internos; después producto de venta.
- 2026-11-04 — Alcance: reunir y ordenar justificantes por año y exportarlos a la asesoría fiscal. Sin cálculos de impuestos ni consejos (StBerG). La portada lo dice: «berechnet keine Steuern und ersetzt keine Steuerberatung».
- 2026-11-04 — Interfaz en alemán; código y documentación en español.
- 2026-11-04 — Tema claro y fuentes del sistema (sin `next/font/google`): nada que descargar de Google ni archivos de fuente que mantener. (Fase 1, riesgo medio, tomada por la fábrica.)
- 2026-11-04 — Secciones: Übersicht, Steuerjahre, Belege, Kategorien, Export. (Fase 1, riesgo medio, tomada por la fábrica; se pueden renombrar en la fase 2.)
- 2026-11-04 — Graphify como mapa del código (skill del proyecto). Sus hooks `PreToolUse` no se suben: fallarían en sesiones sin Graphify instalado.
- 2026-11-04 — `noindex` mientras sea uso interno.

- 2026-11-04 — Tratamiento: «du» en toda la interfaz, como la web de ab1web; la empresa habla en «wir». (Ander)
- 2026-11-04 — Nombre: «ab1 Tax Helfer» (Ander). Riesgo anotado: «Helfer» puede sugerir «Hilfeleistung in Steuersachen» (StBerG); por eso la portada y los textos de venta dicen siempre que no calcula impuestos ni sustituye a la asesoría fiscal. Antes de vender, que lo revise un profesional (nombre y textos).
- 2026-11-04 — Fase 2: gastos e ingresos; año según la fecha y editable; año cerrado en solo lectura (también su checklist) hasta reabrirlo; 9 categorías neutras; checklist inicial de 5 puntos; importe bruto sin IVA. (Ander)
- 2026-11-04 — Colores de estado (Offen cielo, Übergeben ámbar, Abgeschlossen esmeralda; Einnahme esmeralda, Ausgabe pizarra) fuera de los tokens de shadcn, texto oscuro sobre fondo claro (≥ 8,7:1).
- 2026-11-04 — API: solo `application/json`; todas las escrituras en una sola sección crítica mientras los datos estén en JSON.
- 2026-11-04 — Renombrar una categoría está permitido aunque la usen justificantes de un año cerrado: el nombre es solo para ordenar. (Ander, hallazgo D13 de la fase 2)
- 2026-11-04 — Fase 3: hasta 5 archivos por Beleg (PDF, JPG, PNG, WebP; 10 MB), tipo comprobado por bytes, archivos en `data/uploads/` con nombre UUID; fotos en la app y PDF en pestaña nueva; «Datei fehlt» + filtro + recuento enlazado. (Ander)
- 2026-11-04 — «Datei fehlt» usa el mismo ámbar que «übergeben»: los dos piden una acción pendiente.
