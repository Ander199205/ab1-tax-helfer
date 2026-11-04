// Lógica común de los route handlers REST: validar y delegar en el repositorio.
import { NextResponse } from "next/server";
import type { BaseEntity, Repository } from "@/lib/data/repository";
import type { FieldErrors } from "./http";

interface CrudConfig<T extends BaseEntity, I> {
  repo: Repository<T, I>;
  /** Convierte el cuerpo de la petición en una entrada, o null si no encaja. */
  parse: (body: unknown) => I | null;
  /** Reglas de negocio; devuelve un objeto vacío si todo es correcto. */
  validate: (input: I) => FieldErrors;
  notFound: string;
  /** Reglas que necesitan otras colecciones (unicidad, referencias). `current` es null al crear. */
  check?: (input: I, current: T | null) => Promise<FieldErrors>;
  /** Bloqueos (409): devuelve un mensaje si no se puede crear o editar (p. ej. año cerrado). */
  guard?: (input: I, current: T | null) => Promise<string | null>;
  /** Devuelve un mensaje si no se puede borrar (409). */
  beforeRemove?: (current: T) => Promise<string | null>;
  /** Limpieza tras borrar (p. ej. los archivos de un Beleg). */
  afterRemove?: (removed: T) => Promise<void>;
}

const hasErrors = (errors: FieldErrors) => Object.values(errors).some(Boolean);

// Una sola sección crítica para todas las escrituras: las comprobaciones (duplicados, año cerrado,
// referencias) y la escritura van juntas, así dos peticiones simultáneas no se saltan las reglas.
// Basta para el prototipo con JSON; en la fase 4 lo sustituyen las restricciones de la base de datos.
let writeChain: Promise<unknown> = Promise.resolve();
export function exclusive<R>(task: () => Promise<R>): Promise<R> {
  const run = writeChain.catch(() => undefined).then(task);
  writeChain = run;
  return run;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

/** Solo JSON: un POST «text/plain» desde otra web no llega a la lógica (CSRF). */
const notJson = (request: Request) =>
  (request.headers.get("content-type") ?? "").split(";")[0].trim() !== "application/json"
    ? NextResponse.json({ error: "Nur JSON wird angenommen." }, { status: 415 })
    : null;

const conflict = (message: string) => NextResponse.json({ error: message }, { status: 409 });

const invalid = (errors?: FieldErrors) =>
  errors
    ? NextResponse.json({ error: "Bitte prüf die markierten Felder.", errors }, { status: 400 })
    : NextResponse.json({ error: "Ungültige Daten." }, { status: 400 });

export function createCrudHandlers<T extends BaseEntity, I extends object>(config: CrudConfig<T, I>) {
  const { repo, parse, validate, notFound, check, guard, beforeRemove, afterRemove } = config;

  /** Validación propia + reglas entre colecciones + bloqueos. Devuelve una respuesta de error o null. */
  async function reject(input: I, current: T | null) {
    const errors = validate(input);
    if (hasErrors(errors)) return invalid(errors);
    const blocked = guard ? await guard(input, current) : null;
    if (blocked) return conflict(blocked);
    const related = check ? await check(input, current) : {};
    if (hasErrors(related)) return invalid(related);
    return null;
  }

  return {
    async list() {
      return NextResponse.json(await repo.list());
    },

    async create(request: Request) {
      const wrongType = notJson(request);
      if (wrongType) return wrongType;
      const input = parse(await request.json().catch(() => null));
      if (!input) return invalid();
      return exclusive(async () => {
        const error = await reject(input, null);
        if (error) return error;
        return NextResponse.json(await repo.create(input), { status: 201 });
      });
    },

    async update(request: Request, id: string) {
      const wrongType = notJson(request);
      if (wrongType) return wrongType;
      const body: unknown = await request.json().catch(() => null);
      if (!isPlainObject(body)) return invalid();
      return exclusive(async () => {
        const current = await repo.get(id);
        if (!current) return NextResponse.json({ error: notFound }, { status: 404 });
        // Se mezcla con lo que ya hay para validar la entidad completa.
        const merged = parse({ ...current, ...body });
        if (!merged) return invalid();
        const error = await reject(merged, current);
        if (error) return error;
        return NextResponse.json(await repo.update(id, merged));
      });
    },

    async remove(id: string) {
      return exclusive(async () => {
        const current = await repo.get(id);
        if (!current) return NextResponse.json({ error: notFound }, { status: 404 });
        const blocked = beforeRemove ? await beforeRemove(current) : null;
        if (blocked) return conflict(blocked);
        await repo.remove(id);
        if (afterRemove) await afterRemove(current);
        return new NextResponse(null, { status: 204 });
      });
    },
  };
}
