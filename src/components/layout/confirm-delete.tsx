"use client";

import { useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ConfirmDeleteProps {
  title: string;
  description: string;
  /** Se espera a que termine antes de cerrar, para saber si la fila desapareció. */
  onConfirm: () => unknown | Promise<unknown>;
  /** Texto del botón de confirmar (por defecto «Löschen»). */
  confirmLabel?: string;
  /** El botón que abre la confirmación. */
  children: React.ReactNode;
}

const FOCUSABLE = "button:not([disabled]):not([aria-disabled=true]), a[href], input:not([disabled]):not(.sr-only), select";
const visible = (el: HTMLElement | null | undefined): el is HTMLElement => Boolean(el && el.offsetParent !== null);

/**
 * Confirmación antes de borrar. Si lo borrado desaparece, el foco va a la fila siguiente (o a la
 * anterior); si no queda ninguna, a lo primero enfocable del diálogo que lo contenía, y si no hay
 * diálogo, al título de la página. Las filas llevan `data-row` (WCAG 2.4.3).
 */
export function ConfirmDelete({ title, description, onConfirm, confirmLabel = "Löschen", children }: ConfirmDeleteProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const trigger = useRef<HTMLElement | null>(null);
  const neighbours = useRef<Element[]>([]);
  const container = useRef<Element | null>(null);

  function changeOpen(next: boolean) {
    if (next) {
      trigger.current = document.activeElement as HTMLElement | null;
      const row = trigger.current?.closest("[data-row]");
      neighbours.current = [row?.nextElementSibling, row?.previousElementSibling].filter((e): e is Element => Boolean(e));
      container.current = trigger.current?.closest("[role=dialog]") ?? null;
    }
    setOpen(next);
  }

  async function confirm(event: React.MouseEvent) {
    event.preventDefault(); // se cierra a mano cuando termina el borrado
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }

  function restoreFocus(event: Event) {
    if (trigger.current?.isConnected) return; // cancelado o fallido: Radix devuelve el foco al botón
    event.preventDefault();
    requestAnimationFrame(() => {
      for (const row of neighbours.current) {
        const target = row.isConnected ? row.querySelector<HTMLElement>(FOCUSABLE) : null;
        if (visible(target)) return target.focus();
      }
      if (container.current?.isConnected) {
        const inside = Array.from(container.current.querySelectorAll<HTMLElement>(FOCUSABLE)).find(visible);
        if (inside) return inside.focus();
      }
      document.getElementById("page-title")?.focus();
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={changeOpen}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent onCloseAutoFocus={restoreFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Abbrechen</AlertDialogCancel>
          <AlertDialogAction onClick={confirm} variant="destructive" disabled={busy}>
            {busy ? "Wird gelöscht …" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
