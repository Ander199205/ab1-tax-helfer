/** Mientras el servidor lee los datos de la sección. */
export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="space-y-4">
      <span className="sr-only">Wird geladen …</span>
      <div className="h-7 w-48 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
      <div className="h-4 w-full max-w-lg animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-40 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
        <div className="h-40 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
      </div>
    </div>
  );
}
