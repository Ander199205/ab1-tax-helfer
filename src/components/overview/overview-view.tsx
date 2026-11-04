"use client";

import Link from "next/link";
import { EmptyState } from "@/components/layout/empty-state";
import { StatusBadge } from "@/components/tax-years/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatAmount } from "@/lib/money";
import type { ReceiptTotals } from "@/lib/receipts/rules";
import { openItems } from "@/lib/tax-years/rules";
import type { TaxYear } from "@/lib/types";

export interface YearSummary {
  year: TaxYear;
  sum: ReceiptTotals;
}

/** Resumen por año: número de justificantes, sumas por tipo y puntos pendientes. */
export function OverviewView({ summaries }: { summaries: YearSummary[] }) {
  const sorted = summaries.map((s) => s.year);
  return (
    <>
      {sorted.length === 0 ? (
        <EmptyState
          action={
            <Link href="/steuerjahre" className={buttonVariants()}>
              Steuerjahr anlegen
            </Link>
          }
        >
          Noch keine Steuerjahre. Leg zuerst eins an, dann kannst du Belege sammeln.
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sorted.map((year) => {
            const sum = summaries.find((s) => s.year.id === year.id)!.sum;
            const open = openItems(year);
            return (
              <Card key={year.id}>
                <CardHeader className="gap-2">
                  <CardTitle className="text-lg">Steuerjahr {year.year}</CardTitle>
                  <div>
                    <StatusBadge status={year.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <dt className="text-muted-foreground">Belege</dt>
                    <dd className="text-right tabular-nums">{sum.count}</dd>
                    <dt className="text-muted-foreground">Summe Ausgaben</dt>
                    <dd className="text-right tabular-nums">{formatAmount(sum.expenses)}</dd>
                    <dt className="text-muted-foreground">Summe Einnahmen</dt>
                    <dd className="text-right tabular-nums">{formatAmount(sum.income)}</dd>
                    <dt className="text-muted-foreground">Was fehlt noch?</dt>
                    <dd className="text-right">{open === 0 ? "Alles da" : `${open} von ${year.checklist.length} offen`}</dd>
                  </dl>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/belege?jahr=${year.year}`} className={buttonVariants({ size: "sm" })}>
                      Belege ansehen
                    </Link>
                    <Link href="/steuerjahre" className={buttonVariants({ size: "sm", variant: "outline" })}>
                      Liste öffnen
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
