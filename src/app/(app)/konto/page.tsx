import { PasswordForm } from "@/components/auth/password-form";
import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/lib/auth/current-user";

export const metadata = { title: "Konto · ab1 Tax Helfer" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <>
      <PageHeader title="Konto" description={`${user.name} · ${user.email}`} />
      <h2 className="mb-3 text-lg font-semibold">Passwort ändern</h2>
      <PasswordForm />
    </>
  );
}
