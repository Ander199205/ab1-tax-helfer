"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/navigation";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/**
 * Navegación principal. En escritorio es una barra lateral fija a la izquierda;
 * en móvil se convierte en una barra superior desplazable.
 */
export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 z-30 border-b border-sidebar-border bg-sidebar md:fixed md:inset-y-0 md:left-0 md:w-60 md:border-r md:border-b-0">
      <div className="flex items-center gap-2 px-4 py-3 md:px-5 md:py-6">
        <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground">
          ab1
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold">Tax Helfer</p>
          <p className="text-xs text-muted-foreground">Belege ordnen</p>
        </div>
      </div>

      <nav aria-label="Bereiche" className="overflow-x-auto px-2 pb-2 md:px-3">
        <ul className="flex gap-1 md:flex-col">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 whitespace-nowrap rounded-md px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    active && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
                  )}
                >
                  <Icon className={cn("size-4", active && "text-sidebar-primary")} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
