"use client";

import { useEffect, useRef, useState } from "react";
import type { MenuMeal, MenuStatus } from "@/lib/types";
import { CloseIcon, HeartIcon, PlusIcon } from "@/components/planner/Icons";

type Props = {
  meal: MenuMeal;
  selectable: boolean;
  selected: boolean;
  readOnly?: boolean;
  onPlus: () => void;
  onSelect: (selected: boolean) => void;
  onRename: (name: string) => void;
  onClear: () => void;
  onFavorite: () => void;
};

export function MealSlotCard({
  meal,
  selectable,
  selected,
  readOnly = false,
  onPlus,
  onSelect,
  onRename,
  onClear,
  onFavorite,
}: Props) {
  const empty = meal.source === "empty" || meal.status === "empty";
  const regenerating = meal.status === "regenerating";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const name = draft ?? meal.displayName ?? "";

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  if (empty) {
    if (readOnly) {
      return (
        <div className="flex min-h-24 items-center justify-center rounded-2xl border border-dashed border-line bg-background/60 text-xs text-muted">
          Empty
        </div>
      );
    }
    return (
      <button
        type="button"
        onClick={onPlus}
        aria-label="Add a meal"
        className="flex min-h-24 items-center justify-center rounded-2xl border border-dashed border-line bg-background/60 text-muted transition hover:border-accent hover:text-accent"
      >
        <PlusIcon className="h-7 w-7" />
      </button>
    );
  }

  return (
    <article
      className={`relative min-h-24 rounded-2xl border bg-card p-3 shadow-sm transition ${
        selected ? "border-accent ring-2 ring-accent/20" : "border-line"
      } ${regenerating ? "animate-pulse" : ""}`}
    >
      <div className="flex items-start gap-2">
        {selectable ? (
          <input
            type="checkbox"
            checked={selected}
            onChange={(event) => onSelect(event.target.checked)}
            aria-label={`Select ${meal.displayName ?? "meal"}`}
            className="mt-1 h-4 w-4 accent-[var(--accent)]"
          />
        ) : null}
        {editing && !readOnly ? (
          <input
            ref={inputRef}
            value={name}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => {
              setEditing(false);
              const next = (draft ?? meal.displayName ?? "").trim();
              setDraft(null);
              if (next && next !== meal.displayName) onRename(next);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
            className="w-full rounded-lg border border-line bg-background px-2 py-1 text-sm outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              if (readOnly) return;
              setDraft(meal.displayName ?? "");
              setEditing(true);
            }}
            className="flex-1 pr-10 text-left text-sm font-medium leading-5"
          >
            {meal.displayName}
            <span className="mt-1 block text-[11px] font-normal capitalize text-muted">
              {regenerating ? "Finding a replacement…" : meal.source}
            </span>
          </button>
        )}
      </div>
      <div className="absolute right-2 top-2 flex gap-1">
        <button
          type="button"
          onClick={onFavorite}
          aria-label={meal.isFavorite ? "Remove from favorites" : "Save to favorites"}
          className={`rounded-full p-1 ${meal.isFavorite ? "text-danger" : "text-muted hover:text-danger"}`}
        >
          <HeartIcon filled={meal.isFavorite} />
        </button>
        {readOnly ? null : (
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear meal"
            className="rounded-full p-1 text-muted hover:text-foreground"
          >
            <CloseIcon />
          </button>
        )}
      </div>
    </article>
  );
}

export function statusAllowsSelect(status: MenuStatus) {
  return status === "review" || status === "generating";
}
