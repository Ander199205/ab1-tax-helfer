// Importes en formato alemán. Se guardan en céntimos (enteros) para no arrastrar errores de redondeo.
// Sin imports: se prueba directamente con `node --test` (tools/pruebas-api.mjs).

// Sin ceros a la izquierda: «0.500» no puede colarse como 500,00 € (fase 2, revisión D/E).
const GROUPED = /^[1-9]\d{0,2}(\.\d{3}){1,2}(,\d{1,2})?$/; // 1.234 · 1.234,5 · 9.999.999,99
const PLAIN = /^(0|[1-9]\d{0,6})(,\d{1,2})?$/; // 1234 · 1234,56 · 0,5 (hasta 7 cifras)

/**
 * Convierte un importe escrito a la alemana en céntimos, o null si no es válido.
 * Acepta «1.234,56», «1234,56», «1234» y «0,5» (con «€» o espacios alrededor).
 * Rechaza el formato inglés («1,234.56»), más de dos decimales («12,345») y texto.
 */
export function parseAmount(text: string): number | null {
  // Solo se quitan espacios alrededor y un «€» final; «1 2 3» o «5€€» no son importes.
  const value = text.trim().replace(/\s*€$/, "").trim();
  if (!GROUPED.test(value) && !PLAIN.test(value)) return null;
  const [whole, decimals = ""] = value.replace(/\./g, "").split(",");
  return Number(whole) * 100 + Number(decimals.padEnd(2, "0"));
}

const currency = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });

/** 123456 → «1.234,56 €» */
export function formatAmount(cents: number): string {
  return currency.format(cents / 100);
}

/** 123456 → «1234,56» (valor para editar en un campo de texto). */
export function amountToInput(cents: number): string {
  return `${Math.floor(cents / 100)},${String(cents % 100).padStart(2, "0")}`;
}

/** Máximo admitido: 9.999.999,99 €. */
export const MAX_AMOUNT_CENTS = 999_999_999;
