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
}

const hasErrors = (errors: FieldErrors) => Object.values(errors).some(Boolean);

const invalid = (errors?: FieldErrors) =>
  errors
    ? NextResponse.json({ error: "Bitte die markierten Felder prüfen.", errors }, { status: 400 })
    : NextResponse.json({ error: "Ungültige Daten." }, { status: 400 });

export function createCrudHandlers<T extends BaseEntity, I extends object>(config: CrudConfig<T, I>) {
  const { repo, parse, validate, notFound } = config;

  return {
    async list() {
      return NextResponse.json(await repo.list());
    },

    async create(request: Request) {
      const input = parse(await request.json().catch(() => null));
      if (!input) return invalid();
      const errors = validate(input);
      if (hasErrors(errors)) return invalid(errors);
      return NextResponse.json(await repo.create(input), { status: 201 });
    },

    async update(request: Request, id: string) {
      const current = await repo.get(id);
      if (!current) return NextResponse.json({ error: notFound }, { status: 404 });

      // Se mezcla con lo que ya hay para validar la entidad completa.
      const body: unknown = await request.json().catch(() => null);
      const patch = body && typeof body === "object" ? body : {};
      const merged = parse({ ...current, ...patch });
      if (!merged) return invalid();
      const errors = validate(merged);
      if (hasErrors(errors)) return invalid(errors);
      return NextResponse.json(await repo.update(id, merged));
    },

    async remove(id: string) {
      const removed = await repo.remove(id);
      if (!removed) return NextResponse.json({ error: notFound }, { status: 404 });
      return new NextResponse(null, { status: 204 });
    },
  };
}
