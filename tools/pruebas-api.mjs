#!/usr/bin/env node
// Pruebas de la API y de parseAmount (fase 2). Sin dependencias: `node --test`.
// Uso, con la app en marcha:  BASE=http://localhost:3000 node --test tools/pruebas-api.mjs
// OJO: antes y después ejecuta `node tools/admin.mjs demo` (borra la base de datos local y data/uploads/
// y carga las cuentas de demostración). Solo datos ficticios.
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { after, before, describe, test } from "node:test";
import { parseAmount, formatAmount } from "../src/lib/money.ts";

const BASE = process.env.BASE ?? "http://localhost:3000";
const resetData = () => {
  execFileSync(process.execPath, ["--no-warnings", "tools/admin.mjs", "demo"], {
    stdio: "ignore",
    env: { ...process.env, TAX_HELFER_DEMO: "1" },
  });
  jar.clear();
};

// Sesiones de prueba: una cookie por cuenta; `api()` usa la de `as` (por defecto, Muster Design).
const jar = new Map();
const CREDENTIALS = {
  muster: ["muster@beispiel.de", "Demo-Muster-2026!"],
  studio: ["studio@beispiel.de", "Demo-Studio-2026!"],
  admin: ["admin@beispiel.de", "Demo-Admin-2026!"],
};
async function login(who, password = CREDENTIALS[who][1], remember = false) {
  const res = await fetch(BASE + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: CREDENTIALS[who]?.[0] ?? who, password, remember }),
  });
  const cookie = res.headers.get("set-cookie");
  if (res.ok) jar.set(who, cookie.split(";")[0]);
  return { status: res.status, body: await res.json().catch(() => null), cookie };
}
let as = "muster";
async function cookieFor(who) {
  if (who === null) return undefined;
  if (!jar.has(who)) await login(who);
  return jar.get(who);
}

async function api(method, url, body, { raw, type = "application/json", who = as } = {}) {
  const cookie = await cookieFor(who);
  const headers = {};
  if (body !== undefined || raw !== undefined) headers["Content-Type"] = type;
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(BASE + url, {
    method,
    headers,
    body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined),
    redirect: "manual",
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
    const res = await authed(`${BASE}/api/receipts/${receiptId}/files`, { method: "POST", body: form });
    return { status: res.status, body: await res.json() };
  }
  const authed = async (url, init = {}) => fetch(url, { ...init, headers: { ...(init.headers ?? {}), Cookie: await cookieFor(as) } });
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
    const res = await authed(`${BASE}/api/receipts/${r.id}/files/${up.body.files[0].id}`);
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
    assert.equal(sixth.body.error, "Höchstens 5 Dateien pro Beleg. Es sind schon 5 angehängt.");
    const before = uploadsOnDisk().length;
    const target = await fresh();
    const mixed = await upload(target.id, [["ok.pdf", PDF, "application/pdf"], ["boese.pdf", new TextEncoder().encode("MZ"), "application/pdf"]]);
    assert.equal(mixed.status, 400);
    assert.equal(uploadsOnDisk().length, before, "si uno falla no se guarda ninguno en disco");
    assert.deepEqual((await api("GET", "/api/receipts")).body.find((x) => x.id === target.id).files, []);
    const json = await api("POST", `/api/receipts/${r.id}/files`, { files: [] });
    assert.equal(json.status, 415);
  });

  test("archivos: JPG y WebP se reconocen por sus bytes", async () => {
    const JPG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46]);
    const WEBP = new TextEncoder().encode("RIFF\x10\x00\x00\x00WEBPVP8 ");
    const up = await upload((await fresh()).id, [["a.jpeg", JPG, "image/jpeg"], ["b.webp", WEBP, "image/webp"], ["c.bin", PNG, "application/octet-stream"]]);
    assert.equal(up.status, 201);
    assert.deepEqual(up.body.files.map((f) => f.type), ["image/jpeg", "image/webp", "image/png"], "manda el contenido, no el tipo declarado");
  });

  test("archivos: cuerpo demasiado grande → 413 sin leerlo", async () => {
    const huge = new Uint8Array(52 * 1024 * 1024);
    huge.set(PDF);
    const res = await upload((await fresh()).id, [["riesig.pdf", huge, "application/pdf"]]);
    assert.equal(res.status, 413);
    assert.match(res.body.error, /Zu große Datenmenge/);
  });

  test("archivos: 404 con ids inventados o de otro Beleg", async () => {
    assert.equal((await authed(`${BASE}/api/receipts/beleg-02/files/8f1c2a10-1111-4a1a-9a01-000000000001`)).status, 404);
    assert.equal((await authed(`${BASE}/api/receipts/beleg-01/files/..%2F..%2Fpackage.json`)).status, 404);
    assert.equal((await authed(`${BASE}/api/receipts/no-existe/files/x`)).status, 404);
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
    assert.equal((await authed(`${BASE}/api/receipts/beleg-01/files/8f1c2a10-1111-4a1a-9a01-000000000001`)).status, 200);
    await api("PATCH", `/api/tax-years/${y2025.id}`, { status: "offen" });
    // quitar un archivo de ejemplo no borra el original de data/seed/uploads
    assert.equal((await api("DELETE", "/api/receipts/beleg-01/files/8f1c2a10-1111-4a1a-9a01-000000000001")).status, 200);
    assert.ok(fs.existsSync("data/seed/uploads/8f1c2a10-1111-4a1a-9a01-000000000001.pdf"));
  });

  // ── Cuentas y aislamiento (fase 4a) ──
  const ROUTES_GET = ["/api/receipts", "/api/tax-years", "/api/categories", "/api/admin/users"];
  test("sin sesión: API 401, páginas a «Anmelden»", async () => {
    for (const url of ROUTES_GET) assert.equal((await api("GET", url, undefined, { who: null })).status, 401, url);
    assert.equal((await api("POST", "/api/receipts", receipt(), { who: null })).status, 401);
    assert.equal((await api("PATCH", "/api/receipts/beleg-01", { note: "x" }, { who: null })).status, 401);
    assert.equal((await api("DELETE", "/api/receipts/beleg-01", undefined, { who: null })).status, 401);
    assert.equal((await fetch(`${BASE}/api/receipts/beleg-01/files/8f1c2a10-1111-4a1a-9a01-000000000001`)).status, 401);
    for (const page of ["/", "/belege", "/steuerjahre", "/kategorien", "/export", "/konto", "/verwaltung"]) {
      const res = await fetch(BASE + page, { redirect: "manual" });
      assert.equal(res.status, 307, page);
      assert.match(res.headers.get("location"), /\/anmelden$/, page);
    }
    assert.equal((await fetch(BASE + "/anmelden")).status, 200);
  });

  test("inicio de sesión: mismo mensaje con correo desconocido o contraseña falsa; cookie segura", async () => {
    const wrong = await login("muster", "falsch-falsch");
    const unknown = await login("nadie@beispiel.de", "Demo-Muster-2026!");
    assert.equal(wrong.status, 401);
    assert.equal(unknown.status, 401);
    assert.equal(wrong.body.error, unknown.body.error);
    const ok = await login("muster");
    assert.equal(ok.status, 200);
    assert.match(ok.cookie, /HttpOnly/i);
    assert.match(ok.cookie, /Secure/i);
    assert.match(ok.cookie, /SameSite=lax/i);
    assert.doesNotMatch(ok.cookie, /Expires|Max-Age/i, "sin «angemeldet bleiben», cookie de sesión del navegador");
    const remember = await login("muster", undefined, true);
    assert.match(remember.cookie, /Expires=/i);
    const nojson = await fetch(BASE + "/api/auth/login", { method: "POST", headers: { "Content-Type": "text/plain" }, body: "{}" });
    assert.equal(nojson.status, 415);
  });

  test("contraseñas: solo hash scrypt en la base de datos", async () => {
    const { DatabaseSync } = process.getBuiltinModule("node:sqlite");
    const db = new DatabaseSync("data/app.db", { readOnly: true });
    const rows = db.prepare("SELECT password_hash FROM users").all();
    db.close();
    assert.ok(rows.length >= 3);
    for (const r of rows) {
      assert.match(r.password_hash, /^scrypt\$131072\$8\$1\$/);
      assert.ok(!r.password_hash.includes("Demo-"));
    }
  });

  test("aislamiento: Beispiel Studio no ve ni cambia nada de Muster Design (y al revés)", async () => {
    const mine = (await api("GET", "/api/receipts", undefined, { who: "studio" })).body;
    assert.deepEqual(mine.map((r) => r.id), ["studio-beleg-1"]);
    assert.deepEqual((await api("GET", "/api/tax-years", undefined, { who: "studio" })).body.map((y) => y.id), ["studio-jahr-2026"]);
    assert.deepEqual((await api("GET", "/api/categories", undefined, { who: "studio" })).body.map((c) => c.id), ["studio-kat-1"]);
    const foreign = [["receipts", "beleg-01"], ["tax-years", "jahr-2025"], ["categories", "kat-buero"]];
    for (const [col, id] of foreign) {
      assert.equal((await api("PATCH", `/api/${col}/${id}`, { note: "x", name: "x" }, { who: "studio" })).status, 404, `PATCH ${col}`);
      assert.equal((await api("DELETE", `/api/${col}/${id}`, undefined, { who: "studio" })).status, 404, `DELETE ${col}`);
    }
    const studioCookie = await cookieFor("studio");
    const fileUrl = `${BASE}/api/receipts/beleg-01/files/8f1c2a10-1111-4a1a-9a01-000000000001`;
    assert.equal((await fetch(fileUrl, { headers: { Cookie: studioCookie } })).status, 404, "archivo de otra cuenta");
    assert.equal((await fetch(fileUrl, { method: "DELETE", headers: { Cookie: studioCookie } })).status, 404);
    const form = new FormData();
    form.append("files", new Blob([PDF], { type: "application/pdf" }), "x.pdf");
    assert.equal((await fetch(`${BASE}/api/receipts/beleg-01/files`, { method: "POST", body: form, headers: { Cookie: studioCookie } })).status, 404);
    // referencias cruzadas: la categoría de otra cuenta «no existe»
    const cross = await api("POST", "/api/receipts", receipt({ categoryId: "kat-buero" }), { who: "studio" });
    assert.equal(cross.status, 400);
    assert.match(cross.body.errors.categoryId, /gibt es nicht mehr/);
    // y Muster sigue igual
    assert.ok((await api("GET", "/api/receipts", undefined, { who: "muster" })).body.some((r) => r.id === "beleg-01"));
    assert.ok(!(await api("GET", "/api/receipts", undefined, { who: "muster" })).body.some((r) => r.id === "studio-beleg-1"));
    // el mismo año puede existir en las dos cuentas
    assert.equal((await api("POST", "/api/tax-years", { year: 2025 }, { who: "studio" })).status, 201);
  });

  test("administración: solo el administrador; crear, desactivar, reactivar, restablecer", async () => {
    assert.equal((await api("GET", "/api/admin/users", undefined, { who: "muster" })).status, 403);
    assert.equal((await api("POST", "/api/admin/users", { name: "X", email: "x@beispiel.de" }, { who: "muster" })).status, 403);
    const list = await api("GET", "/api/admin/users", undefined, { who: "admin" });
    assert.equal(list.status, 200);
    assert.ok(!JSON.stringify(list.body).includes("password_hash") && !JSON.stringify(list.body).includes("scrypt"));
    const dup = await api("POST", "/api/admin/users", { name: "Doppelt", email: "MUSTER@beispiel.de" }, { who: "admin" });
    assert.match(dup.body.errors.email, /gibt es schon/);
    assert.equal((await api("POST", "/api/admin/users", { name: "", email: "kein-mail" }, { who: "admin" })).status, 400);
    const created = await api("POST", "/api/admin/users", { name: "Neuer Kunde", email: "neu@beispiel.de" }, { who: "admin" });
    assert.equal(created.status, 201);
    assert.match(created.body.password, /^[A-Za-z2-9]{4}(-[A-Za-z2-9]{4}){3}$/);
    const neu = await login("neu@beispiel.de", created.body.password);
    assert.equal(neu.status, 200);
    assert.deepEqual((await api("GET", "/api/receipts", undefined, { who: "neu@beispiel.de" })).body, [], "cuenta nueva vacía");
    // desactivar: la sesión abierta deja de valer y no puede volver a entrar
    const id = created.body.user.id;
    assert.equal((await api("PATCH", `/api/admin/users/${id}`, { active: false }, { who: "admin" })).status, 200);
    assert.equal((await api("GET", "/api/receipts", undefined, { who: "neu@beispiel.de" })).status, 401);
    assert.equal((await login("neu@beispiel.de", created.body.password)).status, 403);
    await api("PATCH", `/api/admin/users/${id}`, { active: true }, { who: "admin" });
    // restablecer: la antigua deja de valer
    const reset = await api("PATCH", `/api/admin/users/${id}`, { resetPassword: true }, { who: "admin" });
    assert.ok(reset.body.password && reset.body.password !== created.body.password);
    assert.equal((await login("neu@beispiel.de", created.body.password)).status, 401);
    assert.equal((await login("neu@beispiel.de", reset.body.password)).status, 200);
    // el administrador no se desactiva a sí mismo
    assert.equal((await api("PATCH", "/api/admin/users/demo-admin", { active: false }, { who: "admin" })).status, 409);
  });

  test("contraseña propia y cierre de sesión", async () => {
    const old = await cookieFor("studio");
    const wrong = await api("POST", "/api/auth/password", { current: "falsch", next: "Blauer-Elefant-tanzt-7" }, { who: "studio" });
    assert.equal(wrong.status, 400);
    assert.ok(wrong.body.errors.current);
    const short = await api("POST", "/api/auth/password", { current: CREDENTIALS.studio[1], next: "kurz" }, { who: "studio" });
    assert.ok(short.body.errors.next);
    const res = await fetch(BASE + "/api/auth/password", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: old },
      body: JSON.stringify({ current: CREDENTIALS.studio[1], next: "Blauer-Elefant-tanzt-7" }),
    });
    assert.equal(res.status, 204);
    const fresh = res.headers.get("set-cookie").split(";")[0];
    assert.equal((await fetch(BASE + "/api/receipts", { headers: { Cookie: old } })).status, 401, "la sesión anterior ya no vale");
    assert.equal((await fetch(BASE + "/api/receipts", { headers: { Cookie: fresh } })).status, 200);
    assert.equal((await login("studio", "Blauer-Elefant-tanzt-7")).status, 200);
    // cerrar sesión la invalida en el servidor
    assert.equal((await fetch(BASE + "/api/auth/logout", { method: "POST", headers: { Cookie: fresh } })).status, 204);
    assert.equal((await fetch(BASE + "/api/receipts", { headers: { Cookie: fresh } })).status, 401);
  });

  // ── Revisión D/E de la 4a ──
  // Todas las rutas de la API, sacadas de los archivos route.ts, con ids de la otra cuenta y en las dos direcciones.
  function apiRoutes(dir = "src/app/api", prefix = "/api") {
    const out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = `${dir}/${entry.name}`;
      if (entry.isDirectory()) out.push(...apiRoutes(full, `${prefix}/${entry.name}`));
      else if (entry.name === "route.ts") {
        const src = fs.readFileSync(full, "utf8");
        const methods = [...src.matchAll(/export async function (GET|POST|PATCH|DELETE)/g)].map((m) => m[1]);
        out.push({ path: prefix, methods });
      }
    }
    return out;
  }
  const OWN = {
    muster: { receipts: "beleg-01", "tax-years": "jahr-2025", categories: "kat-buero", file: "8f1c2a10-1111-4a1a-9a01-000000000001" },
    studio: { receipts: "studio-beleg-1", "tax-years": "studio-jahr-2026", categories: "studio-kat-1", file: "00000000-0000-4000-8000-000000000000" },
  };
  test("aislamiento en todas las rutas de la API (las dos direcciones)", async () => {
    const routes = apiRoutes();
    assert.ok(routes.length >= 10, "se encontraron las rutas");
    for (const [me, other] of [["studio", "muster"], ["muster", "studio"]]) {
      for (const { path: route, methods } of routes) {
        if (route.startsWith("/api/auth")) continue;
        const col = route.split("/")[2];
        const url = route.replace("[id]", OWN[other][col] ?? "x").replace("[fileId]", OWN[other].file);
        for (const method of methods) {
          const isList = !route.includes("[");
          if (isList && method === "POST") continue; // crear en la propia cuenta no toca a la otra
          let res;
          if (route.endsWith("/files") && method === "POST") {
            const form = new FormData();
            form.append("files", new Blob([PDF], { type: "application/pdf" }), "x.pdf");
            res = await fetch(BASE + url, { method, body: form, headers: { Cookie: await cookieFor(me) } });
          } else res = await fetch(BASE + url, { method, headers: { Cookie: await cookieFor(me), "Content-Type": "application/json" }, body: method === "GET" || method === "DELETE" ? undefined : JSON.stringify({ note: "x", name: "x", active: false }) });
          const label = `${me} ${method} ${url}`;
          if (route.startsWith("/api/admin")) assert.equal(res.status, 403, label);
          else if (isList) {
            assert.equal(res.status, 200, label);
            const text = await res.text();
            for (const id of Object.values(OWN[other])) assert.ok(!text.includes(id), `${label} filtra ${id}`);
          } else assert.equal(res.status, 404, label);
        }
      }
    }
    // PATCH de un Beleg propio con la categoría de la otra cuenta
    const r = await api("PATCH", "/api/receipts/studio-beleg-1", { categoryId: "kat-buero" }, { who: "studio" });
    assert.equal(r.status, 400);
  });

  test("límite de intentos: 5 fallos → 429 aunque después la contraseña sea buena", async () => {
    const email = `bloqueo-${Date.now()}@beispiel.de`;
    const created = await api("POST", "/api/admin/users", { name: "Bloqueo", email }, { who: "admin" });
    for (let i = 0; i < 5; i++) assert.equal((await login(email, "falsch-falsch")).status, 401);
    const blocked = await login(email, created.body.password);
    assert.equal(blocked.status, 429);
    assert.match(blocked.body.error, /Zu viele Fehlversuche/);
  });

  test("peticiones desde otra web: rechazadas (también subidas y borrado de archivos); API sin caché", async () => {
    const studio = await cookieFor("studio");
    const form = new FormData();
    form.append("files", new Blob([PDF], { type: "application/pdf" }), "x.pdf");
    const up = await fetch(`${BASE}/api/receipts/studio-beleg-1/files`, { method: "POST", body: form, headers: { Cookie: studio, Origin: "https://boese.example" } });
    assert.equal(up.status, 403);
    const cookie = await cookieFor("muster");
    const evil = await fetch(BASE + "/api/auth/logout", { method: "POST", headers: { Cookie: cookie, Origin: "https://boese.example" } });
    assert.equal(evil.status, 403);
    const sibling = await fetch(BASE + "/api/categories", { method: "POST", headers: { Cookie: cookie, "Content-Type": "application/json", "Sec-Fetch-Site": "same-site" }, body: '{"name":"X"}' });
    assert.equal(sibling.status, 403);
    assert.equal((await fetch(BASE + "/api/receipts", { headers: { Cookie: cookie } })).status, 200, "sigue con sesión");
    assert.equal((await fetch(BASE + "/api/receipts", { headers: { Cookie: cookie } })).headers.get("cache-control"), "no-store");
  });

  test("sesiones: volver a entrar invalida la anterior; caducidad por inactividad y absoluta", async () => {
    const { createHash } = await import("node:crypto");
    const { getDb } = await import("../src/lib/db/database.ts");
    const db = getDb();
    const tokenOf = (cookie) => cookie.split("=").slice(1).join("=");
    const idOf = (cookie) => createHash("sha256").update(tokenOf(cookie)).digest("hex");
    // volver a entrar en el mismo navegador
    const first = (await login("muster")).cookie.split(";")[0];
    const again = await fetch(BASE + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: first },
      body: JSON.stringify({ email: CREDENTIALS.muster[0], password: CREDENTIALS.muster[1] }),
    });
    assert.equal(again.status, 200);
    assert.equal((await fetch(BASE + "/api/receipts", { headers: { Cookie: first } })).status, 401);
    // en la tabla solo hay hashes, nunca el token
    assert.ok(!db.prepare("SELECT 1 FROM sessions WHERE id = ?").get(tokenOf(first)));
    // 9 h sin actividad → caducada
    const idle = (await login("muster")).cookie.split(";")[0];
    db.prepare("UPDATE sessions SET last_seen_at = ? WHERE id = ?").run(new Date(Date.now() - 9 * 3600e3).toISOString(), idOf(idle));
    assert.equal((await fetch(BASE + "/api/receipts", { headers: { Cookie: idle } })).status, 401);
    // «angemeldet bleiben» con más de 30 días → caducada
    const longer = (await login("muster", undefined, true)).cookie.split(";")[0];
    db.prepare("UPDATE sessions SET expires_at = ? WHERE id = ?").run(new Date(Date.now() - 1000).toISOString(), idOf(longer));
    assert.equal((await fetch(BASE + "/api/receipts", { headers: { Cookie: longer } })).status, 401);
    // sin «angemeldet bleiben», al alargarse nunca pasa de 30 días desde que se abrió
    const capped = (await login("muster")).cookie.split(";")[0];
    const opened = new Date(Date.now() - 30 * 24 * 3600e3 + 3600e3).toISOString(); // abierta hace 30 días menos 1 h
    db.prepare("UPDATE sessions SET created_at = ?, last_seen_at = ? WHERE id = ?").run(opened, new Date(Date.now() - 10 * 60e3).toISOString(), idOf(capped));
    assert.equal((await fetch(BASE + "/api/receipts", { headers: { Cookie: capped } })).status, 200);
    const exp = Date.parse(db.prepare("SELECT expires_at FROM sessions WHERE id = ?").get(idOf(capped)).expires_at);
    assert.ok(exp <= Date.parse(opened) + 30 * 24 * 3600e3 + 1000, "el alargue respeta el máximo de 30 días");
    jar.delete("muster"); // las sesiones de esta prueba ya no valen
  });

  test("contraseñas débiles rechazadas", async () => {
    for (const weak of ["aaaaaaaaaaaa", "Passwort-2026!", "x".repeat(300)]) {
      const r = await api("POST", "/api/auth/password", { current: CREDENTIALS.muster[1], next: weak }, { who: "muster" });
      assert.equal(r.status, 400, weak.slice(0, 20));
      assert.ok(r.body.errors.next);
    }
  });
});
