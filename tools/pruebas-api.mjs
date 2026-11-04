#!/usr/bin/env node
// Pruebas de la API y de parseAmount (fase 2). Sin dependencias: `node --test`.
// Uso, con la app en marcha:  BASE=http://localhost:3000 node --test tools/pruebas-api.mjs
// OJO: borra data/*.json y data/uploads/ antes y después (los datos vuelven a los de data/seed/). Solo datos ficticios.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { parseAmount, formatAmount } from "../src/lib/money.ts";

const BASE = process.env.BASE ?? "http://localhost:3000";
const resetData = () => {
  for (const f of fs.readdirSync("data")) if (f.endsWith(".json")) fs.rmSync(path.join("data", f));
  fs.rmSync(path.join("data", "uploads"), { recursive: true, force: true });
};

async function api(method, url, body, { raw, type = "application/json" } = {}) {
  const res = await fetch(BASE + url, {
    method,
    headers: body !== undefined || raw !== undefined ? { "Content-Type": type } : undefined,
    body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

const receipt = (over = {}) => ({
  date: "2026-03-15",
  amountCents: 123456,
  kind: "ausgabe",
  party: "Testfirma",
  description: "Test",
  categoryId: "kat-buero",
  year: 2026,
  note: "",
  ...over,
});

describe("parseAmount (C3)", () => {
  for (const [text, cents] of [["1.234,56", 123456], ["1234,56", 123456], ["1234", 123400], ["0,5", 50], ["0,05", 5], ["1.000.000", 100000000], ["9.999.999,99", 999999999], [" 19,99 € ", 1999]]) {
    test(`acepta «${text}»`, () => assert.equal(parseAmount(text), cents));
  }
  // «0.500» rechazado: con punto decimal inglés se guardaría 500,00 € (revisión D/E).
  for (const text of ["1,234.56", "12,345", "abc", "", "-5", "1.23", "12.34,5", "0.500", "000.000", "00012,50", "1 2 3", "0,5€€", ",50", "9".repeat(400)]) {
    test(`rechaza «${text}»`, () => assert.equal(parseAmount(text), null));
  }
  test("«12.345.678,90» se lee bien y lo rechaza el máximo de rules.ts", () => assert.equal(parseAmount("12.345.678,90"), 1234567890));
  test("formatAmount da formato alemán", () => assert.equal(formatAmount(123456).replace(/\s/g, " "), "1.234,56 €"));
});

describe("API", () => {
  before(resetData);
  after(resetData);

  test("listar las tres colecciones (datos de ejemplo)", async () => {
    assert.equal((await api("GET", "/api/categories")).body.length, 9);
    assert.equal((await api("GET", "/api/tax-years")).body.length, 2);
    assert.equal((await api("GET", "/api/receipts")).body.length, 20);
  });

  test("año: crear con la lista inicial, duplicado, fuera de rango", async () => {
    const created = await api("POST", "/api/tax-years", { year: 2024 });
    assert.equal(created.status, 201);
    assert.equal(created.body.status, "offen");
    assert.equal(created.body.checklist.length, 5);
    const dup = await api("POST", "/api/tax-years", { year: 2024 });
    assert.equal(dup.status, 400);
    assert.match(dup.body.errors.year, /gibt es schon/);
    const old = await api("POST", "/api/tax-years", { year: 1999 });
    assert.equal(old.status, 400);
    assert.match(old.body.errors.year, /zwischen 2000/);
    const future = await api("POST", "/api/tax-years", { year: new Date().getFullYear() + 2 });
    assert.equal(future.status, 400);
  });

  test("justificante: crear, editar y borrar", async () => {
    const c = await api("POST", "/api/receipts", receipt());
    assert.equal(c.status, 201);
    const u = await api("PATCH", `/api/receipts/${c.body.id}`, { amountCents: 50 });
    assert.equal(u.status, 200);
    assert.equal(u.body.amountCents, 50);
    assert.equal(u.body.party, "Testfirma");
    assert.equal((await api("DELETE", `/api/receipts/${c.body.id}`)).status, 204);
    assert.equal((await api("DELETE", `/api/receipts/${c.body.id}`)).status, 404);
  });

  test("justificante: errores de campo en alemán", async () => {
    const r = await api("POST", "/api/receipts", receipt({ amountCents: 0, date: "2026-02-30", party: " ", kind: "x" }));
    assert.equal(r.status, 400);
    assert.deepEqual(Object.keys(r.body.errors).sort(), ["amountCents", "date", "kind", "party"]);
    assert.match(r.body.error, /Bitte prüf die markierten Felder/);
    const decimals = await api("POST", "/api/receipts", receipt({ amountCents: 12.5 }));
    assert.equal(decimals.status, 400);
    const cat = await api("POST", "/api/receipts", receipt({ categoryId: "no-existe" }));
    assert.match(cat.body.errors.categoryId, /gibt es nicht mehr/);
    const year = await api("POST", "/api/receipts", receipt({ year: 2023, date: "2023-05-01" }));
    assert.match(year.body.errors.year, /Leg zuerst das Steuerjahr 2023 an/);
    const bad = await api("POST", "/api/receipts", { foo: 1 });
    assert.equal(bad.status, 400);
  });

  test("año distinto al de la fecha (D2)", async () => {
    const r = await api("POST", "/api/receipts", receipt({ date: "2025-12-30", year: 2026 }));
    assert.equal(r.status, 201);
    assert.equal(r.body.year, 2026);
  });

  test("año cerrado: justificantes en solo lectura hasta reabrir (D3)", async () => {
    const years = (await api("GET", "/api/tax-years")).body;
    const y2025 = years.find((y) => y.year === 2025);
    assert.equal((await api("PATCH", `/api/tax-years/${y2025.id}`, { status: "abgeschlossen" })).status, 200);
    const inClosed = (await api("GET", "/api/receipts")).body.find((r) => r.year === 2025);
    const edit = await api("PATCH", `/api/receipts/${inClosed.id}`, { amountCents: 100 });
    assert.equal(edit.status, 409);
    assert.match(edit.body.error, /abgeschlossen/);
    assert.equal((await api("DELETE", `/api/receipts/${inClosed.id}`)).status, 409);
    assert.equal((await api("POST", "/api/receipts", receipt({ date: "2025-06-01", year: 2025 }))).status, 409);
    const moveIn = (await api("GET", "/api/receipts")).body.find((r) => r.year === 2026);
    assert.equal((await api("PATCH", `/api/receipts/${moveIn.id}`, { year: 2025 })).status, 409);
    const note = await api("PATCH", `/api/tax-years/${y2025.id}`, { note: "geändert" });
    assert.equal(note.status, 409);
    const toggled = y2025.checklist.map((i, n) => (n === 0 ? { ...i, done: !i.done } : i));
    const checklist = await api("PATCH", `/api/tax-years/${y2025.id}`, { checklist: toggled });
    assert.equal(checklist.status, 409);
    assert.match(checklist.body.error, /abgeschlossen/);
    assert.equal((await api("PATCH", `/api/tax-years/${y2025.id}`, { status: "offen" })).status, 200);
    assert.equal((await api("PATCH", `/api/receipts/${inClosed.id}`, { amountCents: 100 })).status, 200);
  });

  test("borrados bloqueados (409) y permitidos", async () => {
    const years = (await api("GET", "/api/tax-years")).body;
    const y2026 = years.find((y) => y.year === 2026);
    const delYear = await api("DELETE", `/api/tax-years/${y2026.id}`);
    assert.equal(delYear.status, 409);
    assert.match(delYear.body.error, /^Zum Steuerjahr 2026 gehören noch \d+ Belege\. /);
    const delCat = await api("DELETE", "/api/categories/kat-buero");
    assert.equal(delCat.status, 409);
    assert.match(delCat.body.error, /„Büro & Material“ wird noch von/);
    const y2024 = years.find((y) => y.year === 2024);
    assert.equal((await api("DELETE", `/api/tax-years/${y2024.id}`)).status, 204);
  });

  test("cuerpos y tipos inválidos", async () => {
    const r = (await api("GET", "/api/receipts")).body[0];
    for (const raw of ["{kaputt", "null", "[]"]) {
      const res = await api("PATCH", `/api/receipts/${r.id}`, undefined, { raw });
      assert.equal(res.status, 400, `PATCH ${raw}`);
    }
    const after = (await api("GET", "/api/receipts")).body.find((x) => x.id === r.id);
    assert.equal(after.updatedAt, r.updatedAt, "un PATCH rechazado no cambia nada");
    const plain = await api("POST", "/api/categories", undefined, { raw: '{"name":"X"}', type: "text/plain" });
    assert.equal(plain.status, 415);
    const ids = await api("POST", "/api/tax-years", { year: 2027, checklist: [{ id: "a", title: "x" }, { id: "a", title: "y" }] });
    assert.equal(ids.status, 400);
    assert.match(ids.body.errors.checklist, /doppelt/);
    const done = await api("POST", "/api/tax-years", { year: 2027, checklist: [{ title: "x", done: "true" }] });
    assert.equal(done.status, 400);
    const big = await api("POST", "/api/receipts", receipt({ amountCents: 1234567890 }));
    assert.match(big.body.errors.amountCents, /höchstens 9\.999\.999,99/);
    const far = await api("POST", "/api/receipts", receipt({ date: "1900-01-01" }));
    assert.match(far.body.errors.date, /zwischen 2000/);
  });

  test("peticiones simultáneas no se saltan las reglas", async () => {
    const results = await Promise.all([1, 2, 3].map(() => api("POST", "/api/categories", { name: "Rennen" })));
    assert.deepEqual(results.map((r) => r.status).sort(), [201, 400, 400]);
    const created = results.find((r) => r.status === 201).body;
    assert.equal((await api("DELETE", `/api/categories/${created.id}`)).status, 204);
  });

  test("año con justificantes: no se puede cambiar el número", async () => {
    const y2026 = (await api("GET", "/api/tax-years")).body.find((y) => y.year === 2026);
    const r = await api("PATCH", `/api/tax-years/${y2026.id}`, { year: 2024 });
    assert.equal(r.status, 400);
    assert.match(r.body.errors.year, /Jahreszahl lässt sich nicht mehr ändern/);
  });

  test("categoría: crear, nombre único sin distinguir mayúsculas, renombrar, borrar", async () => {
    const c = await api("POST", "/api/categories", { name: "Werkzeug" });
    assert.equal(c.status, 201);
    const dup = await api("POST", "/api/categories", { name: "  werkzeug " });
    assert.equal(dup.status, 400);
    assert.match(dup.body.errors.name, /gibt es schon/);
    const empty = await api("POST", "/api/categories", { name: "" });
    assert.equal(empty.status, 400);
    const renamed = await api("PATCH", `/api/categories/${c.body.id}`, { name: "Werkzeug & Geräte" });
    assert.equal(renamed.body.name, "Werkzeug & Geräte");
    assert.equal((await api("PATCH", `/api/categories/${c.body.id}`, { name: "Sonstiges" })).status, 400);
    assert.equal((await api("DELETE", `/api/categories/${c.body.id}`)).status, 204);
  });

  // ── Archivos (fase 3) ──
  const PDF = new TextEncoder().encode("%PDF-1.4\n% Beispiel\n");
  const PNG = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==", "base64"));
  async function upload(receiptId, files) {
    const form = new FormData();
    for (const [name, bytes, type] of files) form.append("files", new Blob([bytes], { type }), name);
    const res = await fetch(`${BASE}/api/receipts/${receiptId}/files`, { method: "POST", body: form });
    return { status: res.status, body: await res.json() };
  }
  const uploadsOnDisk = () => (fs.existsSync("data/uploads") ? fs.readdirSync("data/uploads") : []);
  const fresh = async () => (await api("POST", "/api/receipts", receipt({ party: "Dateitest" }))).body;

  test("archivos: subir PDF y PNG, ver con cabeceras, nombre aleatorio en disco", async () => {
    const r = await fresh();
    assert.deepEqual(r.files, []);
    const up = await upload(r.id, [["Rechnung März.pdf", PDF, "application/pdf"], ["foto.png", PNG, "image/png"]]);
    assert.equal(up.status, 201);
    assert.deepEqual(up.body.files.map((f) => [f.name, f.type, f.size]), [["Rechnung März.pdf", "application/pdf", PDF.length], ["foto.png", "image/png", PNG.length]]);
    const disk = uploadsOnDisk();
    for (const f of up.body.files) assert.ok(disk.some((d) => d.startsWith(f.id)), "archivo en disco con el id");
    assert.ok(!disk.some((d) => d.includes("Rechnung")), "el nombre original no se usa en disco");
    const res = await fetch(`${BASE}/api/receipts/${r.id}/files/${up.body.files[0].id}`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("content-type"), "application/pdf");
    assert.equal(res.headers.get("x-content-type-options"), "nosniff");
    assert.match(res.headers.get("content-disposition"), /filename\*=UTF-8''Rechnung%20M%C3%A4rz\.pdf/);
    assert.deepEqual(new Uint8Array(await res.arrayBuffer()), PDF);
    // un PATCH normal no toca los archivos
    const patched = await api("PATCH", `/api/receipts/${r.id}`, { note: "x", files: [] });
    assert.equal(patched.body.files.length, 2);
  });

  test("archivos: rechazos (tipo por bytes, tamaño, número, vacío, sin multipart)", async () => {
    const r = await fresh();
    const fake = await upload(r.id, [["rechnung.pdf", new TextEncoder().encode("<html>no</html>"), "application/pdf"]]);
    assert.equal(fake.status, 400);
    assert.match(fake.body.errors.files, /Erlaubt sind PDF, JPG, PNG und WebP/);
    const big = new Uint8Array(10 * 1024 * 1024 + 1); big.set(PDF);
    const tooBig = await upload(r.id, [["gross.pdf", big, "application/pdf"]]);
    assert.equal(tooBig.status, 400);
    assert.match(tooBig.body.error, /zu groß/);
    const empty = await upload(r.id, [["leer.pdf", new Uint8Array(0), "application/pdf"]]);
    assert.equal(empty.status, 400);
    assert.equal((await upload(r.id, [1, 2, 3, 4, 5].map((n) => [`${n}.pdf`, PDF, "application/pdf"]))).status, 201);
    const sixth = await upload(r.id, [["6.pdf", PDF, "application/pdf"]]);
    assert.equal(sixth.status, 400);
    assert.match(sixth.body.error, /Höchstens 5 Dateien/);
    const mixed = await upload((await fresh()).id, [["ok.pdf", PDF, "application/pdf"], ["boese.pdf", new TextEncoder().encode("MZ"), "application/pdf"]]);
    assert.equal(mixed.status, 400, "si uno falla no se guarda ninguno");
    const json = await api("POST", `/api/receipts/${r.id}/files`, { files: [] });
    assert.equal(json.status, 415);
  });

  test("archivos: 404 con ids inventados o de otro Beleg", async () => {
    assert.equal((await fetch(`${BASE}/api/receipts/beleg-02/files/8f1c2a10-1111-4a1a-9a01-000000000001`)).status, 404);
    assert.equal((await fetch(`${BASE}/api/receipts/beleg-01/files/..%2F..%2Fpackage.json`)).status, 404);
    assert.equal((await fetch(`${BASE}/api/receipts/no-existe/files/x`)).status, 404);
  });

  test("archivos: quitar borra del disco; borrar el Beleg borra sus archivos", async () => {
    const r = await fresh();
    const up = await upload(r.id, [["a.pdf", PDF, "application/pdf"], ["b.png", PNG, "image/png"]]);
    const [a, b] = up.body.files;
    const del = await api("DELETE", `/api/receipts/${r.id}/files/${a.id}`);
    assert.equal(del.status, 200);
    assert.deepEqual(del.body.files.map((f) => f.id), [b.id]);
    assert.ok(!uploadsOnDisk().some((d) => d.startsWith(a.id)));
    assert.equal((await api("DELETE", `/api/receipts/${r.id}`)).status, 204);
    assert.ok(!uploadsOnDisk().some((d) => d.startsWith(b.id)));
  });

  test("archivos: año cerrado → subir y quitar 409, ver 200", async () => {
    const y2025 = (await api("GET", "/api/tax-years")).body.find((y) => y.year === 2025);
    await api("PATCH", `/api/tax-years/${y2025.id}`, { status: "abgeschlossen" });
    assert.equal((await upload("beleg-01", [["x.pdf", PDF, "application/pdf"]])).status, 409);
    assert.equal((await api("DELETE", "/api/receipts/beleg-01/files/8f1c2a10-1111-4a1a-9a01-000000000001")).status, 409);
    assert.equal((await fetch(`${BASE}/api/receipts/beleg-01/files/8f1c2a10-1111-4a1a-9a01-000000000001`)).status, 200);
    await api("PATCH", `/api/tax-years/${y2025.id}`, { status: "offen" });
    // quitar un archivo de ejemplo no borra el original de data/seed/uploads
    assert.equal((await api("DELETE", "/api/receipts/beleg-01/files/8f1c2a10-1111-4a1a-9a01-000000000001")).status, 200);
    assert.ok(fs.existsSync("data/seed/uploads/8f1c2a10-1111-4a1a-9a01-000000000001.pdf"));
  });
});
