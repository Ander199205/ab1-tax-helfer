interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

/** Cabecera común de cada página: título, descripción y acciones opcionales. */
export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {/* id + tabIndex: destino del foco cuando desaparece el elemento que lo tenía (p. ej. tras borrar). */}
        <h1 id="page-title" tabIndex={-1} className="text-2xl font-semibold tracking-tight outline-none">
          {title}
        </h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </header>
  );
}
