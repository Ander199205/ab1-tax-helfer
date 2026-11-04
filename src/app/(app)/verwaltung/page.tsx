import { AccountsView } from "@/components/auth/accounts-view";
import { PageHeader } from "@/components/layout/page-header";
import { requireAdmin } from "@/lib/auth/current-user";
import { listUsers } from "@/lib/auth/users";

export const metadata = { title: "Kundenkonten · ab1 Tax Helfer" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await requireAdmin();
  return (
    <>
      <PageHeader
        title="Kundenkonten"
        description="Kundenkonten anlegen, deaktivieren, Passwort zurücksetzen. Jeder Kunde sieht nur seine eigenen Daten."
      />
      <AccountsView initialAccounts={listUsers()} selfId={admin.id} />
    </>
  );
}
