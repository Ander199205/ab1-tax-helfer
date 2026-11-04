#!/usr/bin/env node
// Pruebas de la API y de parseAmount (fase 2). Sin dependencias: `node --test`.
// Uso, con la app en marcha:  BASE=http://localhost:3000 node --test tools/pruebas-api.mjs
// OJO: borra data/*.json antes y después (los datos vuelven a los de data/seed/). Solo datos ficticios.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { parseAmount, formatAmount } from "../src/lib/money.ts";

const BASE = process.env.BASE ?? "http://localhost:3000";
const resetData = () => {
  for (const f of fs.readdirSync("data")) if (f.endsWith(".json")) fs.rmSync(path.join("data", f));
};

async function api(method, url, body) {
  const res = await fetch(BASE + url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
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
  for (const [text, cents] of [["1.234,56", 123456], ["1234,56", 123456], ["1234", 123400], ["0,5", 50], ["12.345.678,90", 1234567890], [" 19,99 € ", 1999]]) {
    test(`acepta «${text}»`, () => assert.equal(parseAmount(text), cents));
  }
  for (const text of ["1,234.56", "12,345", "abc", "", "-5", "1.23", "12.34,5"]) {
    test(`rechaza «${text}»`, () => assert.equal(parseAmount(text), null));
  }
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
    assert.match(r.body.error, /markierten Felder/);
    const decimals = await api("POST", "/api/receipts", receipt({ amountCents: 12.5 }));
    assert.equal(decimals.status, 400);
    const cat = await api("POST", "/api/receipts", receipt({ categoryId: "no-existe" }));
    assert.match(cat.body.errors.categoryId, /gibt es nicht mehr/);
    const year = await api("POST", "/api/receipts", receipt({ year: 2023, date: "2023-05-01" }));
    assert.match(year.body.errors.year, /Lege zuerst das Steuerjahr 2023 an/);
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
    const checklist = await api("PATCH", `/api/tax-years/${y2025.id}`, { note: "geändert" });
    assert.equal(checklist.status, 409);
    assert.equal((await api("PATCH", `/api/tax-years/${y2025.id}`, { status: "offen" })).status, 200);
    assert.equal((await api("PATCH", `/api/receipts/${inClosed.id}`, { amountCents: 100 })).status, 200);
  });

  test("borrados bloqueados (409) y permitidos", async () => {
    const years = (await api("GET", "/api/tax-years")).body;
    const y2026 = years.find((y) => y.year === 2026);
    const delYear = await api("DELETE", `/api/tax-years/${y2026.id}`);
    assert.equal(delYear.status, 409);
    assert.match(delYear.body.error, /Belegen/);
    const delCat = await api("DELETE", "/api/categories/kat-buero");
    assert.equal(delCat.status, 409);
    assert.match(delCat.body.error, /„Büro & Material“ wird noch von/);
    const y2024 = years.find((y) => y.year === 2024);
    assert.equal((await api("DELETE", `/api/tax-years/${y2024.id}`)).status, 204);
  });

  test("año con justificantes: no se puede cambiar el número", async () => {
    const y2026 = (await api("GET", "/api/tax-years")).body.find((y) => y.year === 2026);
    const r = await api("PATCH", `/api/tax-years/${y2026.id}`, { year: 2024 });
    assert.equal(r.status, 400);
    assert.match(r.body.errors.year, /kann nicht mehr geändert werden/);
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
});
