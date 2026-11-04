#!/usr/bin/env node
// Recorre los flujos de la fase 2 en el navegador (Playwright) a 375 y 1440 px.
// Uso, con la app en marcha:  node tools/pruebas-flujos.mjs [--url http://localhost:3000]
// OJO: ejecuta `node tools/admin.mjs demo` antes de cada ancho y al terminar (borra la base de datos local).
import { execFileSync } from "node:child_process";
import fs from "node:fs";
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
const resetData = () => execFileSync(process.execPath, ["--no-warnings", "tools/admin.mjs", "demo"], { stdio: "ignore" });

async function signIn(page, email, password) {
  await page.goto(`${BASE}/anmelden`, { waitUntil: "networkidle" });
  await page.getByLabel("E-Mail").fill(email);
  await page.getByLabel("Passwort").fill(password);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await page.waitForURL(`${BASE}/`);
}

let failures = 0;
let currentPage = null; // para la captura de un paso que falla
async function step(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failures++;
    console.log(`  ✗ ${name}\n     ${String(e.message).split("\n")[0]}`);
    const file = `${OUT}/fallo-${failures}.jpg`;
    await currentPage?.screenshot({ path: file, type: "jpeg", quality: 50 }).catch(() => {});
    console.log(`     captura: ${file}`);
  }
}
const visible = (loc) => loc.first().waitFor({ state: "visible", timeout: 5000 });
const gone = (loc) => loc.first().waitFor({ state: "detached", timeout: 5000 });

const browser = await chromium.launch();
for (const width of [375, 1440]) {
  resetData();
  console.log(`\n@${width}px`);
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  currentPage = page;
  const jsErrors = [];
  page.on("pageerror", (e) => jsErrors.push(e.message));
  page.on("console", (m) => m.type() === "error" && !/status of 40[0139]/.test(m.text()) && jsErrors.push(m.text()));
  const shot = (name) => page.screenshot({ path: `${OUT}/flujo-${name}-${width}.jpg`, type: "jpeg", quality: 55, fullPage: true });

  // 0. Anmelden (fase 4a)
  await step("ohne Anmeldung → Anmelden; falsches Passwort wird abgelehnt", async () => {
    await page.goto(`${BASE}/belege`, { waitUntil: "networkidle" });
    if (!page.url().endsWith("/anmelden")) throw new Error(`sin sesión llegó a ${page.url()}`);
    await page.getByLabel("E-Mail").fill("muster@beispiel.de");
    await page.getByLabel("Passwort").fill("falsch-falsch");
    await page.getByRole("button", { name: "Anmelden" }).click();
    await visible(page.getByText("E-Mail oder Passwort stimmt nicht."));
  });
  await shot("anmelden");
  await step("anmelden als Muster Design", async () => {
    await signIn(page, "muster@beispiel.de", "Demo-Muster-2026!");
    await visible(page.getByText("Angemeldet als"));
    await visible(page.getByText("Muster Design (Demo)"));
    if (await page.getByRole("link", { name: "Verwaltung" }).count()) throw new Error("un cliente ve «Verwaltung»");
  });

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
    // el foco no se pierde en <body>: va a la fila vecina
    await page.waitForFunction(() => document.activeElement && document.activeElement !== document.body);
    const label = await page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? "");
    if (!/umbenennen|löschen|gelöscht/.test(label)) throw new Error(`foco tras borrar en: ${label}`);
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
  const PDF = Buffer.from("%PDF-1.4\n% Beispiel\n");
  const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==", "base64");
  await step("X des Dialogs bleibt beim Scrollen sichtbar", async () => {
    await page.getByRole("button", { name: "Neuer Beleg" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.locator(".overflow-y-auto").first().evaluate((el) => el.scrollTo(0, el.scrollHeight));
    const box = await dialog.getByRole("button", { name: "Schließen" }).boundingBox();
    if (!box || box.y < 0 || box.y > 900) throw new Error(`X fuera de la vista: ${JSON.stringify(box)}`);
    await page.keyboard.press("Escape");
    await gone(page.getByRole("dialog"));
  });
  await step("Dateiauswahl: falscher Typ und zu groß werden abgelehnt", async () => {
    await page.getByRole("button", { name: "Neuer Beleg" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.locator("#files-neu").setInputFiles({ name: "notiz.txt", mimeType: "text/plain", buffer: Buffer.from("hallo") });
    await visible(dialog.getByText("Erlaubt sind PDF, JPG, PNG und WebP"));
    await dialog.locator("#files-neu").setInputFiles({ name: "riesig.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(10 * 1024 * 1024 + 1) });
    await visible(dialog.getByText("zu groß"));
    await page.keyboard.press("Escape");
    await gone(page.getByRole("dialog"));
  });
  await step("neuer Beleg mit 1.234,56 (Jahr folgt dem Datum) und PDF", async () => {
    await page.getByRole("button", { name: "Neuer Beleg" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.locator("#files-neu").setInputFiles({ name: "Rechnung Müller.pdf", mimeType: "application/pdf", buffer: PDF });
    await visible(dialog.getByText("wird beim Speichern hochgeladen"));
    await dialog.getByLabel("Datum").fill("2026-03-15");
    if ((await dialog.getByLabel("Steuerjahr").inputValue()) !== "2026") throw new Error("el año no sigue a la fecha");
    await dialog.getByLabel("Betrag in €").fill("1.234,56");
    await dialog.getByLabel("Von wem").fill("Testfirma Müller");
    await dialog.getByLabel("Kategorie").selectOption({ label: "Büro & Material" });
    await dialog.getByRole("button", { name: "Beleg speichern" }).click();
    await gone(page.getByRole("dialog"));
    await visible(list.getByText("1.234,56 €"));
    await visible(list.getByRole("button", { name: /^1 Datei zum Beleg „Testfirma Müller“/ }));
  });
  await step("Datei per Drag & Drop hinzufügen, Foto ansehen, PDF-Link, Datei entfernen", async () => {
    await list.getByRole("button", { name: /^1 Datei zum Beleg „Testfirma Müller“/ }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByTestId("dropzone").evaluate((zone, b64) => {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const dt = new DataTransfer();
      dt.items.add(new File([bytes], "foto.png", { type: "image/png" }));
      zone.dispatchEvent(new DragEvent("drop", { dataTransfer: dt, bubbles: true, cancelable: true }));
    }, PNG.toString("base64"));
    await visible(dialog.getByText("foto.png"));
    const pdfLink = dialog.getByRole("link", { name: /Rechnung Müller\.pdf/ });
    if ((await pdfLink.getAttribute("target")) !== "_blank") throw new Error("el PDF no abre en pestaña nueva");
    const pdf = await page.request.get(new URL(await pdfLink.getAttribute("href"), BASE).href);
    if (pdf.status() !== 200 || pdf.headers()["content-type"] !== "application/pdf") throw new Error(`PDF: ${pdf.status()} ${pdf.headers()["content-type"]}`);
    await dialog.getByRole("button", { name: "Vorschau von „foto.png“ öffnen" }).click();
    const previewDialog = page.getByRole("dialog", { name: "foto.png" });
    await visible(previewDialog.getByRole("img", { name: "Beleg-Datei foto.png" }));
    await previewDialog.getByRole("button", { name: "Schließen" }).click();
    await gone(page.getByRole("img", { name: "Beleg-Datei foto.png" }));
    // el foco vuelve a la miniatura que abrió la vista previa
    await page.waitForFunction(() => document.activeElement?.getAttribute("aria-label") === "Vorschau von „foto.png“ öffnen");
    await dialog.getByRole("button", { name: "Datei „foto.png“ entfernen" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Entfernen" }).click();
    await gone(page.getByRole("alertdialog"));
    await gone(dialog.getByText("foto.png"));
    // el foco vuelve a la fila que queda, no a <body>
    await page.waitForFunction(() => document.activeElement?.textContent?.includes("Rechnung Müller.pdf"));
    await page.keyboard.press("Escape");
    await gone(page.getByRole("dialog", { name: "Dateien zum Beleg" }));
  });
  await step("Filter: nur ohne Datei", async () => {
    await page.getByLabel("Dateien", { exact: true }).selectOption("ohne");
    await gone(list.getByText("Testfirma Müller"));
    await visible(list.getByText("Stadtbank Leipzig"));
    await page.getByLabel("Dateien", { exact: true }).selectOption("alle");
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
    const missing = await c.locator("dt", { hasText: "Belege ohne Datei" }).locator("xpath=following-sibling::dd[1]").textContent();
    if (missing?.trim() !== "9") throw new Error(`Ohne Datei: ${missing}`);
    await c.getByRole("link", { name: "9 Belege ohne Datei im Steuerjahr 2026 ansehen" }).click();
    await page.waitForURL(/datei=ohne/);
    if ((await page.getByLabel("Dateien", { exact: true }).inputValue()) !== "ohne") throw new Error("el filtro no se abre desde la Übersicht");
  });
  await shot("uebersicht");

  // 5. Abmelden y Verwaltung (fase 4a)
  await step("abmelden → Anmelden; danach keine Seite ohne Anmeldung", async () => {
    await page.getByRole("button", { name: "Abmelden" }).click();
    await page.waitForURL(/\/anmelden$/);
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    if (!page.url().endsWith("/anmelden")) throw new Error("tras cerrar sesión sigue entrando");
  });
  let newPassword = "";
  await step("Verwaltung: Kundenkonto anlegen, Passwort wird einmal angezeigt", async () => {
    await signIn(page, "admin@beispiel.de", "Demo-Admin-2026!");
    await page.getByRole("link", { name: "Verwaltung" }).click();
    await page.waitForURL(/\/verwaltung$/);
    await page.getByLabel("Name des Kunden").fill(`Testkunde ${width}`);
    await page.getByLabel("E-Mail").fill(`test${width}@beispiel.de`);
    await page.getByRole("button", { name: "Konto anlegen" }).click();
    const dialog = page.getByRole("dialog", { name: "Konto angelegt" });
    await visible(dialog);
    newPassword = (await dialog.getByTestId("new-password").textContent()).trim();
    if (!/^[A-Za-z2-9]{4}(-[A-Za-z2-9]{4}){3}$/.test(newPassword)) throw new Error(`contraseña: ${newPassword}`);
    await dialog.getByRole("button", { name: "Fertig" }).click();
    await visible(page.getByText(`Testkunde ${width}`));
  });
  await shot("verwaltung");
  await step("neues Konto meldet sich an und sieht nur ein leeres Konto", async () => {
    await page.getByRole("button", { name: "Abmelden" }).click();
    await page.waitForURL(/\/anmelden$/);
    await signIn(page, `test${width}@beispiel.de`, newPassword);
    await visible(page.getByText("Noch keine Steuerjahre."));
  });

  await step("ohne JavaScript-Fehler", async () => {
    if (jsErrors.length) throw new Error(jsErrors.slice(0, 3).join(" | "));
  });
  await page.close();
}
await browser.close();
resetData();
console.log(`\n${failures} Fehler.`);
process.exitCode = failures ? 1 : 0;
