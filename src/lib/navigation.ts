import { CalendarRange, FileDown, House, ReceiptEuro, Tags, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Texto corto que se muestra en la página de inicio. */
  description: string;
}

/** Secciones de la app, en el orden de la barra lateral. Textos de interfaz en alemán. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Übersicht", icon: House, description: "Stand aller Steuerjahre auf einen Blick." },
  {
    href: "/steuerjahre",
    label: "Steuerjahre",
    icon: CalendarRange,
    description: "Ein Ordner pro Jahr: offen, an die Steuerberatung übergeben oder abgeschlossen.",
  },
  {
    href: "/belege",
    label: "Belege",
    icon: ReceiptEuro,
    description: "Rechnungen, Quittungen und Nachweise mit Datum, Betrag und Kategorie.",
  },
  {
    href: "/kategorien",
    label: "Kategorien",
    icon: Tags,
    description: "Eigene Kategorien, um Belege übersichtlich zu ordnen.",
  },
  {
    href: "/export",
    label: "Export",
    icon: FileDown,
    description: "Alle Belege eines Jahres als Paket für die Steuerberatung.",
  },
];
