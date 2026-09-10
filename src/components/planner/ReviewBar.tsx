"use client";

import { RefreshIcon } from "@/components/planner/Icons";

type Props = {
  selectedCount: number;
  note: string;
  busy: boolean;
  onNote: (value: string) => void;
  onRegenerate: () => void;
  onApprove: () => void;
};

export function ReviewBar({
  selectedCount,
  note,
  busy,
  onNote,
  onRegenerate,
  onApprove,
}: Props) {
  return (
    <div className="sticky bottom-4 z-20 rounded-3xl border border-line bg-card/95 p-4 shadow-lg backdrop-blur">
      <p className="text-sm font-medium">Review your menu</p>
      <p className="text-xs text-muted">
        Select meals to replace, add a note, or approve and build the shopping
        list.
      </p>
      <label className="mt-3 block text-xs text-muted">
        What should change?
        <input
          value={note}
          onChange={(event) => onNote(event.target.value)}
          placeholder="e.g. no broccoli, more protein, use rice"
          disabled={busy}
          className="mt-1 w-full rounded-xl border border-line bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
        />
      </label>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={busy || selectedCount === 0}
          onClick={onRegenerate}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-line px-4 py-2.5 text-sm font-medium disabled:opacity-40"
        >
          <RefreshIcon />
          Regenerate {selectedCount || ""} selected
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onApprove}
          className="flex-1 rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          Approve & shopping list
        </button>
      </div>
    </div>
  );
}
