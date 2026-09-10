"use client";

import { useMemo, useState } from "react";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/constants";
import { formatUsedFor } from "@/lib/menu-utils";
import type { ShoppingList } from "@/lib/types";

type Props = {
  list: ShoppingList;
  onAdd: (name: string, quantity: number, unit: string) => void;
  onRename: (itemId: string, name: string) => void;
  onQuantity: (itemId: string, quantity: number) => void;
};

export function ShoppingPanel({ list, onAdd, onRename, onQuantity }: Props) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [copied, setCopied] = useState(false);

  const grouped = useMemo(() => {
    return CATEGORY_ORDER.map((category) => ({
      category,
      items: list.items.filter((item) => item.category === category),
    })).filter((group) => group.items.length > 0);
  }, [list.items]);

  const plainText = grouped
    .map((group) => {
      const lines = group.items
        .map(
          (item) =>
            `- ${item.name}${formatUsedFor(item.usedFor)}: ${item.quantity} ${item.unit}`,
        )
        .join("\n");
      return `${CATEGORY_LABELS[group.category]}\n${lines}`;
    })
    .join("\n\n");

  async function copy() {
    await navigator.clipboard.writeText(plainText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <section className="rounded-3xl border border-line bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Shopping list</h2>
          <p className="text-xs text-muted">
            {list.status === "generating"
              ? "Summarizing ingredients…"
              : "Sorted by category. Add extras, then copy."}
          </p>
        </div>
        <button
          type="button"
          onClick={copy}
          disabled={list.status !== "ready"}
          className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
        >
          {copied ? "Copied" : "Copy list"}
        </button>
      </div>

      {list.status === "generating" ? (
        <div className="mt-4 h-24 animate-pulse rounded-2xl bg-background" />
      ) : (
        <div className="mt-4 space-y-5">
          {grouped.map((group) => (
            <div key={group.category}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                {CATEGORY_LABELS[group.category]}
              </h3>
              <ul className="space-y-2">
                {group.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-2 rounded-xl bg-background px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <input
                        defaultValue={item.name}
                        onBlur={(event) => {
                          if (event.target.value.trim() !== item.name) {
                            onRename(item.id, event.target.value);
                          }
                        }}
                        className="w-full bg-transparent text-sm outline-none"
                      />
                      {item.usedFor.length > 0 ? (
                        <p className="text-[11px] leading-4 text-muted">
                          ({item.usedFor.join(", ")})
                        </p>
                      ) : null}
                    </div>
                    {item.isManual ? (
                      <span className="text-[10px] uppercase text-muted">extra</span>
                    ) : null}
                    <input
                      type="number"
                      min={0}
                      step="any"
                      defaultValue={item.quantity}
                      onBlur={(event) => {
                        const next = Number(event.target.value);
                        if (next !== item.quantity) onQuantity(item.id, next);
                      }}
                      className="w-16 rounded-lg border border-line bg-card px-2 py-1 text-right text-sm"
                    />
                    <span className="w-8 text-xs text-muted">{item.unit}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <form
        className="mt-5 flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim()) return;
          onAdd(name, quantity, "pcs");
          setName("");
          setQuantity(1);
        }}
      >
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Add something else (toothpaste, bags…)"
          className="flex-1 rounded-xl border border-line bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={(event) => setQuantity(Number(event.target.value))}
          className="w-20 rounded-xl border border-line bg-background px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-xl border border-line px-4 py-2 text-sm font-medium"
        >
          Add
        </button>
      </form>
    </section>
  );
}
