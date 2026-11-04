import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "ab1 Tax Helfer",
  description: "Belege pro Steuerjahr sammeln, ordnen und an die Steuerberatung übergeben.",
  // Uso interno: que ningún buscador indexe la app.
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="antialiased">
        {children}
        {/* Arriba: abajo tapaba los botones de la última fila en móvil (fase 2). */}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
