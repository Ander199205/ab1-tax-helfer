import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";

export default function NotFound() {
  return (
    <>
      <PageHeader title="Seite nicht gefunden" description="Diese Seite gibt es nicht (mehr)." />
      <Link href="/" className="underline underline-offset-4">
        Zur Übersicht
      </Link>
    </>
  );
}
