"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { SLOT_LABELS } from "@/lib/constants";
import type { FavoriteRecipe, MealSlot } from "@/lib/types";
import { CloseIcon } from "@/components/planner/Icons";

type Props = {
  slot: MealSlot;
  favorites: FavoriteRecipe[];
  onClose: () => void;
  onPick: (recipeId: string) => void;
  onManual: (name: string) => void;
};

export function FavoritesPicker({
  slot,
  favorites,
  onClose,
  onPick,
  onManual,
}: Props) {
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const preferred = favorites.filter((item) => item.slot === slot);
  const rest = favorites.filter((item) => item.slot !== slot);
  const groups = [
    { label: `${SLOT_LABELS[slot]} favorites`, items: preferred },
    { label: "Other favorites", items: rest },
  ].filter((group) => group.items.length > 0);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function submitManual(event: FormEvent) {
    event.preventDefault();
    const next = name.trim();
    if (!next) return;
    onManual(next);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="favorites-title"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-md overflow-auto rounded-3xl bg-card p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="favorites-title" className="text-base font-semibold">
              Add to {SLOT_LABELS[slot].toLowerCase()}
            </h2>
            <p className="text-xs text-muted">
              Type a dish name, or pick a saved favorite.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-muted hover:text-foreground"
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={submitManual} className="mt-4 flex gap-2">
          <input
            ref={inputRef}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Syrniki"
            className="min-w-0 flex-1 rounded-xl border border-line bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={!name.trim()}
            className="rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            Add
          </button>
        </form>

        {groups.length === 0 ? (
          <p className="mt-6 text-sm text-muted">
            No favorites yet. You can still add a name above; empty slots will
            be generated.
          </p>
        ) : (
          <div className="mt-5 space-y-4">
            {groups.map((group) => (
              <div key={group.label}>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted">
                  {group.label}
                </p>
                <ul className="space-y-2">
                  {group.items.map((item) => (
                    <li key={item.recipeId}>
                      <button
                        type="button"
                        onClick={() => onPick(item.recipeId)}
                        className="w-full rounded-2xl border border-line px-3 py-3 text-left hover:border-accent"
                      >
                        <span className="block text-sm font-medium">
                          {item.name}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted">
                          {item.description}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
