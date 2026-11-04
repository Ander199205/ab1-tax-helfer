"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ApiError, type CrudClient, type FieldErrors } from "@/lib/api/http";

interface Messages {
  created: string;
  updated: string;
  removed: string;
}

/** Estado de una lista en el navegador y acciones que la guardan en el servidor, con avisos. */
export function useCrud<T extends { id: string }, I>(initial: T[], api: CrudClient<T, I>, messages: Messages) {
  const [items, setItems] = useState(initial);

  const replace = (updated: T) => setItems((list) => list.map((i) => (i.id === updated.id ? updated : i)));

  /** Ejecuta una llamada y convierte los errores en avisos. Devuelve los errores de campo o null. */
  async function run<R>(
    action: () => Promise<R>,
    success: string | null,
    onDone: (value: R) => void,
  ): Promise<FieldErrors | null> {
    try {
      const value = await action();
      onDone(value);
      if (success) toast.success(success);
      return null;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Es ist ein Fehler aufgetreten.");
      return error instanceof ApiError ? (error.errors ?? {}) : {};
    }
  }

  return {
    items,
    replace,
    /** `onCreated` recibe lo creado (p. ej. para subir después sus archivos). */
    create: (input: I, onCreated?: (item: T) => void) =>
      run(() => api.create(input), messages.created, (item) => {
        setItems((l) => [...l, item]);
        onCreated?.(item);
      }),
    /** `success` a null evita el aviso (por ejemplo, al mover tarjetas). */
    update: (id: string, patch: Partial<I>, success: string | null = messages.updated) =>
      run(() => api.update(id, patch), success, replace),
    remove: (item: T) =>
      run(() => api.remove(item.id), messages.removed, () => setItems((l) => l.filter((i) => i.id !== item.id))),
  };
}
