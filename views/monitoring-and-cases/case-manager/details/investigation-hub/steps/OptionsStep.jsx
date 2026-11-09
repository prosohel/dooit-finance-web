"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconPlus } from "@tabler/icons-react";
import OptionRow from "../shared/OptionRow";
import DecisionCard from "../shared/DecisionCard";
import { TYPOLOGY_GROUPS } from "../data/investigationHubData";

/**
 * Renders a "kind: options" step — a plain single-select/multi-select list,
 * or (for the Typologies step) a set of labelled groups laid out as a dense
 * checklist grid with a free-text "add your own" row.
 */
export default function OptionsStep({ step, activeStep, wizard }) {
  const { sel, setRadio, toggleMulti, typoDraft, setTypoDraft, addTypology, customTypologies } =
    wizard;
  const selVal = sel[activeStep];

  if (step.optionDetails && !step.multi) {
    return (
      <DecisionGroup step={step} value={selVal} onSelect={(opt) => setRadio(activeStep, opt)} />
    );
  }

  const isGrouped = step.grouped || Array.isArray(step.groups);
  const groups = step.grouped
    ? [
        ...TYPOLOGY_GROUPS,
        ...(customTypologies.length
          ? [{ label: "Custom typologies", options: customTypologies }]
          : []),
      ]
    : step.groups || [{ label: "", options: step.options || [] }];

  return (
    <div className="max-w-[660px] space-y-6">
      {groups.map((group) => (
        <div key={group.label || "default"}>
          {group.label && (
            <div className="mb-2 mt-6 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground first:mt-0">
              {group.label}
            </div>
          )}
          <div className={isGrouped ? "grid gap-x-5 gap-y-2 sm:grid-cols-2" : ""}>
            {group.options.map((opt) => {
              const selected = step.multi
                ? Array.isArray(selVal) && selVal.includes(opt)
                : selVal === opt;
              const onClick = step.multi
                ? () => toggleMulti(activeStep, opt)
                : () => setRadio(activeStep, opt);
              return (
                <OptionRow
                  key={opt}
                  label={opt}
                  selected={selected}
                  multi={step.multi}
                  onClick={onClick}
                  dense={isGrouped}
                />
              );
            })}
          </div>
        </div>
      ))}

      {step.canAdd && (
        <div className="mt-4 flex gap-2.5">
          <Input
            value={typoDraft}
            onChange={(e) => setTypoDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTypology()}
            placeholder="Add another typology…"
            className="flex-1 text-sm"
          />
          <Button onClick={addTypology} className="gap-1.5 shrink-0">
            <IconPlus className="size-3.5" />
            Add
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Single-choice options rendered as decision cards. Behaves like a native
 * radio group: one tab stop, arrow keys move (and select) between choices.
 */
function DecisionGroup({ step, value, onSelect }) {
  const options = step.options || [];
  const focusIndex = Math.max(0, options.indexOf(value));

  const onKeyDown = (e, i) => {
    const delta = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    if (!delta) return;
    e.preventDefault();
    const next = (i + delta + options.length) % options.length;
    onSelect(options[next]);
    e.currentTarget.parentElement?.children[next]?.focus();
  };

  return (
    <div role="radiogroup" aria-label={step.title} className="flex max-w-[620px] flex-col gap-2">
      {options.map((opt, i) => {
        const detail = step.optionDetails[opt] || {};
        return (
          <DecisionCard
            key={opt}
            label={opt}
            description={detail.description}
            icon={detail.icon}
            tone={detail.tone}
            selected={value === opt}
            onSelect={() => onSelect(opt)}
            tabIndex={i === focusIndex ? 0 : -1}
            onKeyDown={(e) => onKeyDown(e, i)}
          />
        );
      })}
    </div>
  );
}
