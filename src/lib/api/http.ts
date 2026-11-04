// Cliente HTTP genérico para los componentes del navegador.

export type FieldErrors = Record<string, string | undefined>;

export class ApiError extends Error {
  constructor(
    message: string,
    public errors?: FieldErrors,
  ) {
    super(message);
  }
}

export async function handle<T>(response: Response): Promise<T> {
  if (response.ok) {
    return (response.status === 204 ? undefined : await response.json()) as T;
  }
  const body = await response.json().catch(() => ({}));
  throw new ApiError(body.error ?? "Es ist ein Fehler aufgetreten.", body.errors);
}

const JSON_HEADERS = { "Content-Type": "application/json" };

export interface CrudClient<T, I> {
  create(input: I): Promise<T>;
  update(id: string, patch: Partial<I>): Promise<T>;
  remove(id: string): Promise<void>;
}

/** Cliente CRUD para un recurso REST (`base`, por ejemplo "/api/belege"). */
export function createCrudClient<T, I>(base: string): CrudClient<T, I> {
  return {
    create: (input: I) =>
      fetch(base, { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(input) }).then((r) =>
        handle<T>(r),
      ),
    update: (id: string, patch: Partial<I>) =>
      fetch(`${base}/${id}`, { method: "PATCH", headers: JSON_HEADERS, body: JSON.stringify(patch) }).then(
        (r) => handle<T>(r),
      ),
    remove: (id: string) => fetch(`${base}/${id}`, { method: "DELETE" }).then((r) => handle<void>(r)),
  };
}
