import { AppSidebar } from "@/components/layout/app-sidebar";
import { requireUser } from "@/lib/auth/current-user";

// Todo lo de este grupo necesita sesión (fase 4a). La pantalla «Anmelden» está fuera del grupo.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <>
      <AppSidebar user={{ name: user.name, email: user.email, isAdmin: user.role === "admin" }} />
      <main className="min-h-screen px-4 py-6 md:ml-60 md:px-8 md:py-8">{children}</main>
    </>
  );
}
