"use client";

import type { MenuHistoryItem } from "@/lib/types";

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Warsaw",
  }).format(new Date(iso));
}

function optionLabel(item: MenuHistoryItem) {
  const when = formatWhen(item.approvedAt ?? item.createdAt);
  const preview =
    item.mealNames.length > 0 ? item.mealNames[0] : "Empty board";
  const status = item.status.charAt(0).toUpperCase() + item.status.slice(1);
  return `${status} · ${when} · ${preview}`;
}

type Props = {
  items: MenuHistoryItem[];
  currentId: string;
  onSelect: (menuId: string) => void;
};

export function HistoryPanel({ items, currentId, onSelect }: Props) {
  return (
    <section className="rounded-3xl border border-line bg-card p-4 shadow-sm">
      <label className="block text-xs font-medium text-muted">
        History
        {items.length === 0 ? (
          <p className="mt-1.5 text-sm font-normal text-muted">No menus yet.</p>
        ) : (
          <select
            value={currentId}
            onChange={(event) => onSelect(event.target.value)}
            className="mt-1.5 w-full rounded-xl border border-line bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
          >
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {optionLabel(item)}
              </option>
            ))}
          </select>
        )}
      </label>
    </section>
  );
}
