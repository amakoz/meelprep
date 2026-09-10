"use client";

import { ListIcon } from "@/components/planner/Icons";
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

function shoppingLabel(item: MenuHistoryItem) {
  if (!item.shoppingStatus) return "No shopping list";
  if (item.shoppingStatus === "generating") return "Shopping list in progress";
  return `${item.shoppingItemCount} shopping item${item.shoppingItemCount === 1 ? "" : "s"}`;
}

type Props = {
  items: MenuHistoryItem[];
  currentId: string;
  onSelect: (menuId: string) => void;
};

export function HistoryPanel({ items, currentId, onSelect }: Props) {
  return (
    <section className="rounded-3xl border border-line bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-accent">
          <ListIcon />
        </span>
        <div>
          <h2 className="text-sm font-semibold tracking-tight">History</h2>
          <p className="text-xs text-muted">Past menus and shopping lists</p>
        </div>
      </div>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No menus yet.</p>
      ) : (
        <ul className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1">
          {items.map((item) => {
            const active = item.id === currentId;
            const preview =
              item.mealNames.length > 0
                ? item.mealNames.slice(0, 3).join(" · ")
                : "Empty board";
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelect(item.id)}
                  className={`w-full rounded-2xl px-3 py-2.5 text-left transition ${
                    active
                      ? "bg-accent-soft ring-1 ring-accent/30"
                      : "bg-background hover:ring-1 hover:ring-line"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium capitalize text-accent">
                      {item.status}
                    </span>
                    <span className="text-[11px] text-muted">
                      {formatWhen(item.approvedAt ?? item.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm leading-5">{preview}</p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {shoppingLabel(item)}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
