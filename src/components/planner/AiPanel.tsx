"use client";

import type { DietTag, MealsPerSlot } from "@/lib/types";
import { SLOT_LABELS, MEAL_SLOTS } from "@/lib/constants";
import { SparkIcon } from "@/components/planner/Icons";

type Props = {
  portions: number;
  mealsPerSlot: MealsPerSlot;
  dietTags: string[];
  availableTags: DietTag[];
  busy: boolean;
  locked?: boolean;
  onPortions: (value: number) => void;
  onCount: (slot: keyof MealsPerSlot, value: number) => void;
  onToggleTag: (slug: string) => void;
  onGenerate: () => void;
};

export function AiPanel({
  portions,
  mealsPerSlot,
  dietTags,
  availableTags,
  busy,
  locked = false,
  onPortions,
  onCount,
  onToggleTag,
  onGenerate,
}: Props) {
  const total =
    mealsPerSlot.breakfast + mealsPerSlot.dinner + mealsPerSlot.supper;
  const disabled = busy || locked;

  return (
    <aside className="rounded-3xl border border-line bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-accent">
          <SparkIcon />
        </span>
        <div>
          <h2 className="text-sm font-semibold tracking-tight">AI planner</h2>
          <p className="text-xs text-muted">
            {total} meals · {portions} portions each
          </p>
        </div>
      </div>

      <label className="mt-5 block text-xs font-medium text-muted">
        Portions per meal
        <input
          type="number"
          min={1}
          max={12}
          value={portions}
          disabled={disabled}
          onChange={(event) => onPortions(Number(event.target.value))}
          className="mt-1.5 w-full rounded-xl border border-line bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
        />
      </label>

      <div className="mt-4 space-y-3">
        <p className="text-xs font-medium text-muted">Meals per part of day</p>
        {MEAL_SLOTS.map((slot) => (
          <label key={slot} className="flex items-center justify-between gap-3">
            <span className="text-sm">{SLOT_LABELS[slot]}</span>
            <input
              type="number"
              min={1}
              max={6}
              value={mealsPerSlot[slot]}
              disabled={disabled}
              onChange={(event) => onCount(slot, Number(event.target.value))}
              className="w-16 rounded-xl border border-line bg-background px-2 py-1.5 text-center text-sm outline-none focus:border-accent"
            />
          </label>
        ))}
      </div>

      <fieldset className="mt-5">
        <legend className="text-xs font-medium text-muted">
          Diet / preferences
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {availableTags.map((tag) => {
            const selected = dietTags.includes(tag.slug);
            return (
              <button
                key={tag.slug}
                type="button"
                disabled={disabled}
                onClick={() => onToggleTag(tag.slug)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  selected
                    ? "bg-accent text-white"
                    : "bg-background text-foreground ring-1 ring-line"
                }`}
              >
                {tag.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <button
        type="button"
        disabled={disabled}
        onClick={onGenerate}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
      >
        <SparkIcon />
        {locked
          ? "Menu already approved"
          : busy
            ? "Working…"
            : "Generate empty slots"}
      </button>
      <p className="mt-2 text-[11px] leading-4 text-muted">
        {locked
          ? "This menu is closed. Start a new menu to plan another day."
          : "Filled favorites stay. Only empty plus slots are sent to n8n."}
      </p>
    </aside>
  );
}
