#!/usr/bin/env node
// Recorre los flujos de la fase 2 en el navegador (Playwright) a 375 y 1440 px.
// Uso, con la app en marcha:  node tools/pruebas-flujos.mjs [--url http://localhost:3000]
// OJO: borra data/*.json antes de cada ancho y al terminar (vuelven los datos de data/seed/).
import fs from "node:fs";
import path from "node:path";
// Playwright: el del proyecto si está instalado; si no, el global del sistema (igual que tools/capturas.mjs).
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  ({ chromium } = await import("playwright"));
}

const i = process.argv.indexOf("--url");
const BASE = i > -1 ? process.argv[i + 1] : "http://localhost:3000";
const OUT = ".capturas";
fs.mkdirSync(OUT, { recursive: true });
const resetData = () => {
  for (const f of fs.readdirSync("data")) if (f.endsWith(".json")) fs.rmSync(path.join("data", f));
};

let failures = 0;
async function step(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failures++;
    console.log(`  ✗ ${name}\n     ${String(e.message).split("\n")[0]}`);
  }
}
const visible = (loc) => loc.first().waitFor({ state: "visible", timeout: 5000 });
const gone = (loc) => loc.first().waitFor({ state: "detached", timeout: 5000 });

const browser = await chromium.launch();
for (const width of [375, 1440]) {
  resetData();
  console.log(`\n@${width}px`);
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  const jsErrors = [];
  page.on("pageerror", (e) => jsErrors.push(e.message));
  page.on("console", (m) => m.type() === "error" && !/status of 40[09]/.test(m.text()) && jsErrors.push(m.text()));
  const shot = (name) => page.screenshot({ path: `${OUT}/flujo-${name}-${width}.jpg`, type: "jpeg", quality: 55, fullPage: true });

  // 1. Kategorien
  await page.goto(`${BASE}/kategorien`, { waitUntil: "networkidle" });
  await step("Kategorie anlegen", async () => {
    await page.getByLabel("Neue Kategorie").fill("Werkzeug");
    await page.getByRole("button", { name: "Anlegen" }).click();
    await visible(page.getByText("Werkzeug", { exact: true }));
  });
  await step("doppelter Name wird abgelehnt", async () => {
    await page.getByLabel("Neue Kategorie").fill("werkzeug");
    await page.getByRole("button", { name: "Anlegen" }).click();
    await visible(page.getByText("gibt es schon"));
    await page.getByLabel("Neue Kategorie").fill("");
  });
  await step("Kategorie umbenennen", async () => {
    await page.getByRole("button", { name: "„Werkzeug“ umbenennen" }).click();
    await page.getByLabel("Neuer Name für Werkzeug").fill("Werkzeug & Geräte");
    await page.keyboard.press("Enter");
    await visible(page.getByText("Werkzeug & Geräte", { exact: true }));
    // El foco vuelve al botón de renombrar de esa fila
    await page.waitForFunction(() => document.activeElement?.getAttribute("aria-label") === "„Werkzeug & Geräte“ umbenennen");
  });
  await step("Kategorie mit Belegen lässt sich nicht löschen", async () => {
    const b = page.getByRole("button", { name: /„Büro & Material“ kann nicht gelöscht werden/ });
    if ((await b.getAttribute("aria-disabled")) !== "true") throw new Error("el botón no está marcado como desactivado");
  });
  await shot("kategorien");
  await step("Kategorie löschen", async () => {
    await page.getByRole("button", { name: "„Werkzeug & Geräte“ löschen" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Löschen" }).click();
    await gone(page.getByText("Werkzeug & Geräte", { exact: true }));
  });

  // 2. Steuerjahre
  await page.goto(`${BASE}/steuerjahre`, { waitUntil: "networkidle" });
  await step("Steuerjahr 2024 anlegen (mit Startliste)", async () => {
    await page.getByLabel("Neues Steuerjahr").fill("2024");
    await page.getByRole("button", { name: "Anlegen" }).click();
    await visible(page.getByText("Steuerjahr 2024"));
    const card = page.locator("[data-slot=card]", { hasText: "Steuerjahr 2024" });
    await visible(card.getByText("5 von 5 offen"));
  });
  const card2024 = page.locator("[data-slot=card]", { hasText: "Steuerjahr 2024" });
  await step("Punkt abhaken, hinzufügen, entfernen", async () => {
    await card2024.getByLabel("Ausgangsrechnungen", { exact: true }).check();
    await visible(card2024.getByText("4 von 5 offen"));
    await card2024.getByLabel("Neuer Punkt für 2024").fill("Fahrtenbuch");
    await card2024.getByRole("button", { name: "Hinzufügen" }).click();
    await visible(card2024.getByText("Fahrtenbuch"));
    await card2024.getByRole("button", { name: "Punkt „Fahrtenbuch“ entfernen" }).click();
    await gone(card2024.getByText("Fahrtenbuch"));
  });
  await step("abschließen sperrt die Liste, wieder öffnen entsperrt", async () => {
    await card2024.getByLabel("Status").selectOption("abgeschlossen");
    await visible(card2024.getByText("Das Jahr ist abgeschlossen"));
    if (!(await card2024.getByLabel("Eingangsrechnungen", { exact: true }).isDisabled())) throw new Error("checkbox activa en año cerrado");
    await card2024.getByLabel("Status").selectOption("offen");
    await gone(card2024.getByText("Das Jahr ist abgeschlossen"));
  });
  await step("leeres Steuerjahr löschen", async () => {
    await card2024.getByRole("button", { name: "Steuerjahr löschen" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Löschen" }).click();
    await gone(page.getByText("Steuerjahr 2024"));
  });
  await step("2025 abschließen (für Belege-Test)", async () => {
    const c = page.locator("[data-slot=card]", { hasText: "Steuerjahr 2025" });
    await c.getByLabel("Status").selectOption("abgeschlossen");
    await visible(c.getByText("Das Jahr ist abgeschlossen"));
  });
  await shot("steuerjahre");

  // 3. Belege
  await page.goto(`${BASE}/belege`, { waitUntil: "networkidle" });
  const list = width < 1280 ? page.getByRole("list", { name: "Belege" }) : page.locator("table");
  await step("Betrag im englischen Format wird abgelehnt", async () => {
    await page.getByRole("button", { name: "Neuer Beleg" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Betrag in €").fill("1,234.56");
    await dialog.getByRole("button", { name: "Beleg speichern" }).click();
    await visible(dialog.getByText("Schreib den Betrag wie 1.234,56"));
    if ((await page.evaluate(() => document.activeElement?.id)) !== "receipt-date" &&
        (await page.evaluate(() => document.activeElement?.getAttribute("aria-invalid"))) !== "true")
      throw new Error("el foco no va al primer campo con error");
    await page.keyboard.press("Escape");
    await gone(page.getByRole("dialog"));
    await page.waitForFunction(() => document.activeElement?.textContent?.includes("Neuer Beleg"));
  });
  await step("neuer Beleg mit 1.234,56 (Jahr folgt dem Datum)", async () => {
    await page.getByRole("button", { name: "Neuer Beleg" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Datum").fill("2026-03-15");
    if ((await dialog.getByLabel("Steuerjahr").inputValue()) !== "2026") throw new Error("el año no sigue a la fecha");
    await dialog.getByLabel("Betrag in €").fill("1.234,56");
    await dialog.getByLabel("Von wem").fill("Testfirma Müller");
    await dialog.getByLabel("Kategorie").selectOption({ label: "Büro & Material" });
    await dialog.getByRole("button", { name: "Beleg speichern" }).click();
    await gone(page.getByRole("dialog"));
    await visible(list.getByText("1.234,56 €"));
  });
  await step("Beleg bearbeiten (99,5 → 99,50 €)", async () => {
    await page.getByRole("button", { name: "Beleg „Testfirma Müller“ vom 15.03.2026 bearbeiten" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Betrag in €").fill("99,5");
    await dialog.getByRole("button", { name: "Änderungen speichern" }).click();
    await gone(page.getByRole("dialog"));
    await visible(list.getByText("99,50 €"));
  });
  await step("Filter: nur Einnahmen blendet den Beleg aus; leere Auswahl; zurücksetzen", async () => {
    await page.getByLabel("Art", { exact: true }).selectOption("einnahme");
    await gone(list.getByText("Testfirma Müller"));
    await page.getByLabel("Kategorie", { exact: true }).selectOption({ label: "Büro & Material" });
    await visible(page.getByRole("status").getByText("Keine Belege für diese Auswahl."));
    await shot("belege-leer");
    await page.getByRole("button", { name: "Filter zurücksetzen" }).first().click();
    await visible(list.getByText("Testfirma Müller"));
  });
  await step("Belege aus abgeschlossenem Jahr sind gesperrt", async () => {
    await page.getByLabel("Steuerjahr", { exact: true }).selectOption("2025");
    await visible(list.getByText("abgeschlossen"));
    if ((await list.getByRole("button", { name: /bearbeiten/ }).count()) !== 0) throw new Error("hay botones de editar");
    await page.getByLabel("Steuerjahr", { exact: true }).selectOption("alle");
  });
  await shot("belege");
  await step("Beleg löschen", async () => {
    await page.getByRole("button", { name: "Beleg „Testfirma Müller“ vom 15.03.2026 löschen" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Löschen" }).click();
    await gone(list.getByText("Testfirma Müller"));
  });

  // 4. Übersicht
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await step("Übersicht: Summen 2026 im deutschen Format", async () => {
    const c = page.locator("[data-slot=card]", { hasText: "Steuerjahr 2026" });
    await visible(c.getByText("717,88 €"));
    await visible(c.getByText("6.814,56 €"));
    await visible(c.getByText("3 von 5 offen"));
  });
  await shot("uebersicht");

  await step("ohne JavaScript-Fehler", async () => {
    if (jsErrors.length) throw new Error(jsErrors.slice(0, 3).join(" | "));
  });
  await page.close();
}
await browser.close();
resetData();
console.log(`\n${failures} Fehler.`);
process.exitCode = failures ? 1 : 0;
