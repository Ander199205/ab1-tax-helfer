import { AccountsView } from "@/components/auth/accounts-view";
import { PageHeader } from "@/components/layout/page-header";
import { requireAdmin } from "@/lib/auth/current-user";
import { listUsers } from "@/lib/auth/users";

export const metadata = { title: "Verwaltung · ab1 Tax Helfer" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await requireAdmin();
  return (
    <>
      <PageHeader
        title="Verwaltung"
        description="Konten der Kunden: anlegen, deaktivieren, Passwort zurücksetzen. Jedes Konto sieht nur seine eigenen Belege."
      />
      <AccountsView initialAccounts={listUsers()} selfId={admin.id} />
    </>
  );
}
