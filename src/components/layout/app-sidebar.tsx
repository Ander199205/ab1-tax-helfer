"use client";

import { LogOut, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NAV_ITEMS, type NavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

interface SidebarUser {
  name: string;
  email: string;
  isAdmin: boolean;
}

const ACCOUNT_ITEMS = (isAdmin: boolean): NavItem[] => [
  { href: "/konto", label: "Konto", icon: UserRound, description: "Passwort ändern." },
  ...(isAdmin ? [{ href: "/verwaltung", label: "Kundenkonten", icon: ShieldCheck, description: "Kundenkonten anlegen und verwalten." }] : []),
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/**
 * Navegación principal. En escritorio es una barra lateral fija a la izquierda;
 * en móvil se convierte en una barra superior desplazable.
 */
export function AppSidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  async function logout() {
    if (leaving) return;
    setLeaving(true);
    const res = await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    if (!res?.ok) {
      setLeaving(false);
      return toast.error("Abmelden hat nicht geklappt. Versuch es noch einmal.");
    }
    router.replace("/anmelden");
    router.refresh();
  }

  const items = [...NAV_ITEMS, ...ACCOUNT_ITEMS(user.isAdmin)];

  return (
    // Escritorio: columna fija con la navegación (desplazable si la ventana es baja) y el pie de cuenta
    // en flujo normal, para que nunca tape un enlace. Móvil: barra superior compacta; en horizontal no
    // se queda fija, porque ocuparía casi media pantalla (WCAG 2.4.11).
    <aside className="sticky top-0 z-30 border-b border-sidebar-border bg-sidebar max-md:landscape:static md:fixed md:inset-y-0 md:left-0 md:flex md:w-60 md:flex-col md:border-r md:border-b-0">
      <div className="flex items-center gap-2 px-4 py-3 md:px-5 md:py-6">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground">
          ab1
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-sm font-semibold">Tax Helfer</p>
          <p className="text-xs text-muted-foreground">Belege ordnen</p>
        </div>
        {/* Móvil: cerrar sesión en la fila del logo (no añade otra franja) */}
        <Button
          variant="outline"
          size="icon"
          className="md:hidden"
          onClick={logout}
          aria-disabled={leaving}
          aria-label={`Abmelden (angemeldet als ${user.name})`}
          title={`Angemeldet als ${user.name}`}
        >
          <LogOut />
        </Button>
      </div>

      <nav
        aria-label="Bereiche"
        // En móvil la lista se desplaza en horizontal: el degradado del borde avisa de que hay más.
        className="overflow-x-auto px-2 pb-2 max-md:[mask-image:linear-gradient(to_right,black_85%,transparent)] md:min-h-0 md:flex-1 md:overflow-y-auto md:px-3"
      >
        <ul className="flex gap-1 max-md:pr-8 md:flex-col">
          {items.map(({ href, label, icon: Icon }) => {
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

      {/* Escritorio: pie de cuenta; el nombre completo, con saltos de línea si hace falta. */}
      <div className="hidden space-y-2 border-t border-sidebar-border bg-sidebar px-5 py-4 md:block">
        <p className="text-xs break-words text-muted-foreground">
          Angemeldet als <span className="font-medium text-sidebar-foreground">{user.name}</span>
          <span className="sr-only"> ({user.email})</span>
        </p>
        <Button variant="outline" size="sm" className="w-full" onClick={logout} aria-disabled={leaving}>
          <LogOut /> {leaving ? "Wird abgemeldet …" : "Abmelden"}
        </Button>
      </div>
    </aside>
  );
}
