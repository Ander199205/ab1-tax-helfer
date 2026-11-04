import { Badge } from "@/components/ui/badge";
import { YEAR_STATUS_LABELS, type YearStatus } from "@/lib/types";

const STATUS_BADGE: Record<YearStatus, string> = {
  offen: "border-sky-300 bg-sky-50 text-sky-900",
  uebergeben: "border-amber-300 bg-amber-50 text-amber-900",
  abgeschlossen: "border-emerald-300 bg-emerald-50 text-emerald-900",
};

/** Estado de un año fiscal con color propio (texto oscuro sobre fondo claro: contraste ≥ 7:1). */
export function StatusBadge({ status }: { status: YearStatus }) {
  return (
    <Badge variant="outline" className={STATUS_BADGE[status]}>
      {YEAR_STATUS_LABELS[status]}
    </Badge>
  );
}

