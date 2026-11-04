"use client";

import { Camera, FileText, Paperclip, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ConfirmDelete } from "@/components/layout/confirm-delete";
import { FieldWarning } from "@/components/layout/field-warning";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { receiptFilesApi } from "@/lib/api/clients";
import { ACCEPT, checkFiles, formatSize, isImage, MAX_FILES } from "@/lib/files/rules";
import type { Receipt, ReceiptFile } from "@/lib/types";

interface ReceiptFilesProps {
  /** null = Beleg todavía sin guardar: los archivos quedan pendientes y se suben al guardarlo. */
  receiptId: string | null;
  files: ReceiptFile[];
  pending?: File[];
  onPendingChange?: (files: File[]) => void;
  /** Año cerrado: solo ver. */
  readOnly?: boolean;
  /** Tras subir o quitar en un Beleg guardado. */
  onChange?: (receipt: Receipt) => void;
}

/** Archivos de un Beleg: ver, subir (elegir, arrastrar o foto) y quitar. */
export function ReceiptFiles({ receiptId, files, pending = [], onPendingChange, readOnly, onChange }: ReceiptFilesProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<ReceiptFile | null>(null);
  // Cambia en cada error para que el aviso se vuelva a anunciar aunque el texto sea el mismo.
  const [errorKey, setErrorKey] = useState(0);
  const previewOpener = useRef<HTMLElement | null>(null);
  const pickButton = useRef<HTMLButtonElement>(null);
  const openPreview = (file: ReceiptFile, opener: HTMLElement) => {
    previewOpener.current = opener;
    setPreview(file);
  };
  const showError = (message: string) => {
    setError(message);
    setErrorKey((k) => k + 1);
  };
  const total = files.length + pending.length;
  const errorId = `files-error-${receiptId ?? "neu"}`;

  async function add(list: File[]) {
    if (busy) return;
    setError(undefined);
    const problem = checkFiles(list, total);
    if (problem) return showError(problem);
    if (!receiptId) return onPendingChange?.([...pending, ...list]);
    setBusy(true);
    try {
      const updated = await receiptFilesApi.upload(receiptId, list);
      onChange?.(updated);
      toast.success(list.length === 1 ? "Datei hochgeladen." : `${list.length} Dateien hochgeladen.`);
    } catch (e) {
      showError(e instanceof Error ? e.message : "Die Datei ließ sich nicht hochladen.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(file: ReceiptFile) {
    if (!receiptId) return;
    try {
      onChange?.(await receiptFilesApi.remove(receiptId, file.id));
      toast.success("Datei entfernt.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Die Datei ließ sich nicht entfernen.");
    }
  }

  const onPicked = (event: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (list.length) add(list);
  };

  const canAdd = !readOnly && total < MAX_FILES;

  return (
    // min-w-0: un fieldset no se encoge por debajo de su contenido; sin esto, un nombre largo lo ensanchaba (revisión A).
    <fieldset className="w-full min-w-0 space-y-2">
      <legend className="text-sm font-medium">
        Angehängte Dateien <span className="font-normal text-muted-foreground">({total} von {MAX_FILES})</span>
      </legend>

      {total === 0 && readOnly && <p className="text-sm text-muted-foreground">Keine Datei angehängt.</p>}

      {(files.length > 0 || pending.length > 0) && (
        <ul className="space-y-2" aria-label="Angehängte Dateien">
          {files.map((file) => {
            const url = receiptId ? receiptFilesApi.url(receiptId, file.id) : "";
            return (
              <li key={file.id} data-row className="flex items-center gap-3 rounded-md border p-2">
                {isImage(file.type) ? (
                  <button
                    type="button"
                    onClick={(e) => openPreview(file, e.currentTarget)}
                    className="shrink-0 rounded focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                    aria-label={`Vorschau von „${file.name}“ öffnen`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- archivo propio servido por la API */}
                    <img src={url} alt="" width={48} height={48} className="size-12 rounded object-cover" />
                  </button>
                ) : (
                  <FileText className="size-12 shrink-0 p-2 text-muted-foreground" aria-hidden />
                )}
                <div className="min-w-0 flex-1">
                  {isImage(file.type) ? (
                    <button type="button" onClick={(e) => openPreview(file, e.currentTarget)} className="block max-w-full truncate text-left text-sm font-medium underline-offset-4 hover:underline">
                      {file.name}
                    </button>
                  ) : (
                    <a href={url} target="_blank" rel="noopener" className="block truncate text-sm font-medium underline-offset-4 hover:underline">
                      {file.name}
                      <span className="sr-only"> (öffnet in neuem Tab)</span>
                    </a>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {file.type === "application/pdf" ? "PDF" : "Bild"} · {formatSize(file.size)}
                  </p>
                </div>
                {!readOnly && (
                  <ConfirmDelete
                    title="Datei entfernen?"
                    description={`„${file.name}“ wird vom Beleg entfernt und gelöscht.`}
                    confirmLabel="Entfernen"
                    onConfirm={() => remove(file)}
                  >
                    <Button type="button" size="icon" variant="ghost" aria-label={`Datei „${file.name}“ entfernen`}>
                      <X />
                    </Button>
                  </ConfirmDelete>
                )}
              </li>
            );
          })}
          {pending.map((file, i) => (
            <li key={`${file.name}-${i}`} data-row className="flex items-center gap-3 rounded-md border border-dashed p-2">
              <Paperclip className="size-12 shrink-0 p-3 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatSize(file.size)} · wird beim Speichern hochgeladen</p>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={`„${file.name}“ aus der Auswahl entfernen`}
                onClick={() => {
                  onPendingChange?.(pending.filter((_, n) => n !== i));
                  // La fila desaparece: el foco va al botón de elegir archivos.
                  requestAnimationFrame(() => pickButton.current?.focus());
                }}
              >
                <X />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {canAdd && (
        <div
          data-testid="dropzone"
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (!busy) add(Array.from(e.dataTransfer.files));
          }}
          className={`flex flex-wrap items-center gap-3 rounded-md border border-dashed p-3 text-sm ${dragging ? "border-foreground bg-muted" : "border-input"}`}
        >
          <input ref={fileInput} id={`files-${receiptId ?? "neu"}`} type="file" multiple accept={ACCEPT} className="sr-only" tabIndex={-1} aria-hidden onChange={onPicked} />
          <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-hidden onChange={onPicked} />
          {/* aria-disabled (no disabled) mientras sube: así el botón no pierde el foco (revisión B). */}
          <Button
            ref={pickButton}
            type="button"
            variant="outline"
            aria-disabled={busy}
            aria-describedby={error ? errorId : undefined}
            className={busy ? "cursor-progress opacity-60" : undefined}
            onClick={() => !busy && fileInput.current?.click()}
          >
            <Upload /> {busy ? "Wird hochgeladen …" : "Dateien auswählen"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className={`md:hidden ${busy ? "cursor-progress opacity-60" : ""}`}
            aria-disabled={busy}
            aria-describedby={error ? errorId : undefined}
            onClick={() => !busy && cameraInput.current?.click()}
          >
            <Camera /> Foto aufnehmen
          </Button>
          <p className="text-xs text-muted-foreground">
            <span className="hidden md:inline">oder hierher ziehen · </span>PDF, JPG, PNG oder WebP, bis 10 MB
          </p>
        </div>
      )}
      <p role="status" className="sr-only">
        {busy ? "Wird hochgeladen …" : ""}
      </p>
      {error && (
        <FieldWarning key={errorKey} id={errorId}>
          {error}
        </FieldWarning>
      )}

      <Dialog open={preview !== null} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent
          className="max-h-[90vh] grid-rows-[auto_minmax(0,1fr)] overflow-hidden sm:max-w-2xl"
          onCloseAutoFocus={(e) => {
            if (previewOpener.current?.isConnected) {
              e.preventDefault();
              previewOpener.current.focus();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle className="pr-8 text-base [overflow-wrap:anywhere]">{preview?.name}</DialogTitle>
            <DialogDescription>
              {preview && formatSize(preview.size)}
              {preview && receiptId && (
                <>
                  {" · "}
                  <a href={receiptFilesApi.url(receiptId, preview.id)} target="_blank" rel="noopener" className="underline underline-offset-4">
                    In neuem Tab öffnen
                  </a>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {preview && receiptId && (
            <div className="min-h-0 overflow-auto">
              {/* eslint-disable-next-line @next/next/no-img-element -- archivo propio servido por la API */}
              <img src={receiptFilesApi.url(receiptId, preview.id)} alt={`Beleg-Datei ${preview.name}`} className="mx-auto max-h-[70vh] w-auto max-w-full object-contain" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </fieldset>
  );
}

