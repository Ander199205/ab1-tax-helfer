import type { Metadata } from "next";
import { AppSidebar } from "@/components/layout/app-sidebar";
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
        <AppSidebar />
        <main className="min-h-screen px-4 py-6 md:ml-60 md:px-8 md:py-8">{children}</main>
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
