"use client";

import { useRef } from "react";
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
  onConfirm: () => void;
  /** El botón que abre la confirmación. */
  children: React.ReactNode;
}

const FOCUSABLE = "button:not([disabled]), a[href], input:not([disabled]), select";

/**
 * Confirmación antes de borrar. Si lo borrado desaparece, el foco va a la fila siguiente
 * (o a la anterior, o al título de la página); las filas llevan `data-row` (WCAG 2.4.3).
 */
export function ConfirmDelete({ title, description, onConfirm, children }: ConfirmDeleteProps) {
  const trigger = useRef<HTMLElement | null>(null);
  const neighbours = useRef<Element[]>([]);

  function remember(open: boolean) {
    if (!open) return;
    trigger.current = document.activeElement as HTMLElement | null;
    const row = trigger.current?.closest("[data-row]");
    neighbours.current = [row?.nextElementSibling, row?.previousElementSibling].filter((e): e is Element => Boolean(e));
  }

  function restoreFocus(event: Event) {
    if (trigger.current?.isConnected) return; // se canceló: Radix devuelve el foco al botón
    event.preventDefault();
    // Se espera a que React quite la fila borrada.
    requestAnimationFrame(() => {
      for (const row of neighbours.current) {
        const target = row.isConnected ? row.querySelector<HTMLElement>(FOCUSABLE) : null;
        if (target && target.offsetParent !== null) return target.focus();
      }
      document.getElementById("page-title")?.focus();
    });
  }

  return (
    <AlertDialog onOpenChange={remember}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent onCloseAutoFocus={restoreFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} variant="destructive">
            Löschen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
