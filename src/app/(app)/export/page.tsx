import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { NAV_ITEMS } from "@/lib/navigation";

const item = NAV_ITEMS.find((i) => i.href === "/export")!;

export default function Page() {
  return <PlaceholderPage title="Export" description={item.description} />;
}
