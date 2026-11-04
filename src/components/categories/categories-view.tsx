"use client";

import { Check, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";
import { ConfirmDelete } from "@/components/layout/confirm-delete";
import { EmptyState } from "@/components/layout/empty-state";
import { FieldWarning } from "@/components/layout/field-warning";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { categoriesApi } from "@/lib/api/clients";
import { validateCategory } from "@/lib/categories/rules";
import { useCrud } from "@/lib/hooks/use-crud";
import type { Category } from "@/lib/types";

interface CategoriesViewProps {
  initialCategories: Category[];
  /** Número de justificantes por categoría (id → número). */
  usage: Record<string, number>;
}

const byName = (a: Category, b: Category) => a.name.localeCompare(b.name, "de");

export function CategoriesView({ initialCategories, usage }: CategoriesViewProps) {
  const { items, create, update, remove } = useCrud(initialCategories, categoriesApi, {
    created: "Kategorie angelegt.",
    updated: "Kategorie umbenannt.",
    removed: "Kategorie gelöscht.",
  });
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editError, setEditError] = useState<string>();

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    const local = validateCategory({ name }, items).name;
    if (local) return setError(local);
    const result = await create({ name: name.trim() });
    if (result) return setError(result.name);
    setName("");
    setError(undefined);
  }

  async function handleRename(category: Category) {
    const local = validateCategory({ name: editName }, items, category.id).name;
    if (local) return setEditError(local);
    const result = await update(category.id, { name: editName.trim() });
    if (result) return setEditError(result.name);
    setEditing(null);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreate} noValidate className="flex max-w-xl flex-wrap items-end gap-2">
        <div className="min-w-56 flex-1 space-y-1.5">
          <Label htmlFor="category-name">Neue Kategorie</Label>
          <Input
            id="category-name"
            value={name}
            placeholder="z. B. Werkzeug"
            onChange={(e) => {
              setName(e.target.value);
              setError(undefined);
            }}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "category-name-error" : undefined}
          />
        </div>
        <Button type="submit">Anlegen</Button>
        {error && (
          <div className="basis-full">
            <FieldWarning id="category-name-error">{error}</FieldWarning>
          </div>
        )}
      </form>

      {items.length === 0 ? (
        <EmptyState>Noch keine Kategorien. Leg oben die erste an.</EmptyState>
      ) : (
        <Card className="max-w-xl py-0">
          <CardContent className="px-0">
            <ul className="divide-y" aria-label="Kategorien">
              {[...items].sort(byName).map((category) => {
                const count = usage[category.id] ?? 0;
                const isEditing = editing === category.id;
                return (
                  <li key={category.id} className="flex flex-wrap items-center gap-2 px-4 py-3">
                    {isEditing ? (
                      <form
                        className="flex flex-1 flex-wrap items-center gap-2"
                        noValidate
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleRename(category);
                        }}
                      >
                        <Label htmlFor={`rename-${category.id}`} className="sr-only">
                          Neuer Name für {category.name}
                        </Label>
                        <Input
                          id={`rename-${category.id}`}
                          value={editName}
                          autoFocus
                          className="min-w-40 flex-1"
                          onChange={(e) => {
                            setEditName(e.target.value);
                            setEditError(undefined);
                          }}
                          onKeyDown={(e) => e.key === "Escape" && setEditing(null)}
                          aria-invalid={Boolean(editError)}
                        />
                        <Button type="submit" size="icon" aria-label="Namen speichern">
                          <Check />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          aria-label="Umbenennen abbrechen"
                          onClick={() => setEditing(null)}
                        >
                          <X />
                        </Button>
                        {editError && (
                          <div className="basis-full">
                            <FieldWarning>{editError}</FieldWarning>
                          </div>
                        )}
                      </form>
                    ) : (
                      <>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{category.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {count === 0 ? "Keine Belege" : count === 1 ? "1 Beleg" : `${count} Belege`}
                          </p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`„${category.name}“ umbenennen`}
                          onClick={() => {
                            setEditing(category.id);
                            setEditName(category.name);
                            setEditError(undefined);
                          }}
                        >
                          <Pencil />
                        </Button>
                        {count > 0 ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled
                            aria-label={`„${category.name}“ kann nicht gelöscht werden, weil noch Belege dazugehören`}
                            title="Gehören noch Belege dazu, lässt sich die Kategorie nicht löschen."
                          >
                            <Trash2 />
                          </Button>
                        ) : (
                          <ConfirmDelete
                            title={`„${category.name}“ löschen?`}
                            description="Die Kategorie wird endgültig gelöscht."
                            onConfirm={() => remove(category)}
                          >
                            <Button size="icon" variant="ghost" aria-label={`„${category.name}“ löschen`}>
                              <Trash2 />
                            </Button>
                          </ConfirmDelete>
                        )}
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
