#!/usr/bin/env node
// Administración local de ab1 Tax Helfer (fase 4a). Necesita Node ≥ 22.18 (importa .ts directamente).
//   node tools/admin.mjs crear-admin <email> "<Nombre>"   → crea un administrador y muestra su contraseña
//   node tools/admin.mjs restablecer <email>             → nueva contraseña (cierra sus sesiones)
//   node tools/admin.mjs demo                            → BORRA todo y carga las cuentas de demostración
// La base de datos es data/app.db (o TAX_HELFER_DB). Nunca guarda contraseñas en claro.
import fs from "node:fs";
import path from "node:path";
import { getDb, transaction } from "../src/lib/db/database.ts";
import { generatePassword } from "../src/lib/auth/password.ts";
import { createUser, listUsers, setPassword } from "../src/lib/auth/users.ts";
import { insertDocuments } from "../src/lib/data/repository.ts";

// Cuentas inventadas, SOLO para probar en local. `demo` se niega si hay alguna cuenta que no sea @beispiel.de.
export const DEMO = [
  { id: "demo-admin", email: "admin@beispiel.de", name: "ab1 Verwaltung (Demo)", password: "Demo-Admin-2026!", role: "admin" },
  { id: "demo-muster", email: "muster@beispiel.de", name: "Muster Design (Demo)", password: "Demo-Muster-2026!", role: "client" },
  { id: "demo-studio", email: "studio@beispiel.de", name: "Beispiel Studio (Demo)", password: "Demo-Studio-2026!", role: "client" },
];

const seed = (name) => JSON.parse(fs.readFileSync(path.join("data", "seed", `${name}.json`), "utf8"));

function demo() {
  // Protección: solo se borra si todas las cuentas son de prueba (@beispiel.de, las de demo o las que crean las pruebas).
  const others = listUsers().filter((u) => !u.email.endsWith("@beispiel.de"));
  if (others.length > 0) {
    console.error(`Hay ${others.length} cuenta(s) reales (no @beispiel.de): no se borra nada.`);
    process.exit(1);
  }
  transaction((db) => {
    db.exec("DELETE FROM documents; DELETE FROM sessions; DELETE FROM users;");
    for (const d of DEMO) createUser(d);
    // Muster Design: los datos de ejemplo de las fases 2 y 3.
    insertDocuments("categories", "demo-muster", seed("categories"));
    insertDocuments("tax-years", "demo-muster", seed("tax-years"));
    insertDocuments("receipts", "demo-muster", seed("receipts"));
    // Beispiel Studio: pocos datos propios, con ids distintos, para probar el aislamiento.
    const ts = "2026-11-01T09:00:00.000Z";
    insertDocuments("categories", "demo-studio", [{ id: "studio-kat-1", name: "Fotoausrüstung", createdAt: ts, updatedAt: ts }]);
    insertDocuments("tax-years", "demo-studio", [
      { id: "studio-jahr-2026", year: 2026, status: "offen", note: "", checklist: [{ id: "studio-cl-1", title: "Kontoauszüge", done: false }], createdAt: ts, updatedAt: ts },
    ]);
    insertDocuments("receipts", "demo-studio", [
      { id: "studio-beleg-1", date: "2026-03-02", amountCents: 89900, kind: "ausgabe", party: "Kamerahaus Beispiel", description: "Objektiv", categoryId: "studio-kat-1", year: 2026, note: "", files: [], createdAt: ts, updatedAt: ts },
    ]);
  });
  fs.rmSync(path.join("data", "uploads"), { recursive: true, force: true });
  console.log("Datos de demostración cargados:");
  for (const d of DEMO) console.log(`  ${d.email}  ${d.password}  (${d.role})`);
}

const [cmd, ...args] = process.argv.slice(2);
getDb();
if (cmd === "demo") demo();
else if (cmd === "crear-admin" && args[0] && args[1]) {
  const password = generatePassword();
  createUser({ email: args[0], name: args[1], password, role: "admin" });
  console.log(`Administrador creado: ${args[0]}\nContraseña (solo se muestra ahora): ${password}`);
} else if (cmd === "restablecer" && args[0]) {
  const user = listUsers().find((u) => u.email === args[0].toLowerCase());
  if (!user) {
    console.error("No hay ninguna cuenta con ese correo.");
    process.exit(1);
  }
  const password = generatePassword();
  setPassword(user.id, password);
  console.log(`Nueva contraseña para ${user.email} (solo se muestra ahora): ${password}`);
} else {
  console.log('Uso: node tools/admin.mjs demo | crear-admin <email> "<Nombre>" | restablecer <email>');
  process.exit(cmd ? 1 : 0);
}
