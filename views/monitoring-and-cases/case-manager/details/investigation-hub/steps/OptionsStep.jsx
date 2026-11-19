"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { IconHistory, IconPlus } from "@tabler/icons-react";
import { cn, dateShowFormatWithTime } from "@/lib/utils";
import OptionRow from "../shared/OptionRow";
import DecisionCard from "../shared/DecisionCard";
import DismissFalsePositiveDialog from "../shared/DismissFalsePositiveDialog";
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
    return <DecisionStep step={step} activeStep={activeStep} wizard={wizard} />;
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
    <div className="max-w-[660px] space-y-6 ">
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

      {step.followUp &&
        selVal === step.followUp.when &&
        (step.followUp.type === "text" ? (
          <FollowUpText
            followUp={step.followUp}
            value={sel[step.followUp.key]}
            onChange={(text) => setRadio(step.followUp.key, text)}
          />
        ) : (
          <FollowUpChoice
            followUp={step.followUp}
            value={sel[step.followUp.key]}
            onSelect={(opt) => setRadio(step.followUp.key, opt)}
          />
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
 * A free-text field revealed by one of the step's options (e.g. the reason
 * for dismissing a case). Stored in selections[followUp.key].
 */
function FollowUpText({ followUp, value, onChange }) {
  const id = `follow-up-${followUp.key}`;
  return (
    <div className="ml-4 border-l-2 border-primary/20 pl-5 animate-in fade-in slide-in-from-top-1 duration-200">
      <label
        htmlFor={id}
        className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground"
      >
        {followUp.label}
      </label>
      <Textarea
        id={id}
        autoFocus
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={followUp.placeholder}
        className="min-h-24 resize-y text-sm"
      />
    </div>
  );
}

/**
 * A secondary single choice revealed by one of the step's options (e.g. the
 * monitoring period once "flag for ongoing monitoring" is picked). Rendered
 * as a compact segmented row of chips that behaves like a radio group.
 */
function FollowUpChoice({ followUp, value, onSelect }) {
  const { options, label } = followUp;
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
    <div className="ml-4 border-l-2 border-primary/20 pl-5 animate-in fade-in slide-in-from-top-1 duration-200">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground ">
        {label}
      </div>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {options.map((opt, i) => {
          const selected = value === opt;
          return (
            <button
              key={opt}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={i === focusIndex ? 0 : -1}
              onClick={() => onSelect(opt)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                "transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.97]",
                selected
                  ? "border-primary bg-primary font-medium text-white"
                  : "border-black/[0.12] bg-white text-heading [@media(hover:hover)]:hover:border-primary/40",
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * A decision step. Options flagged `confirm` (dismissing as a false positive)
 * do not select on click: they open a dialog that documents the decision, and
 * only a confirmed dismissal selects the card.
 */
function DecisionStep({ step, activeStep, wizard }) {
  const { sel, setRadio, dismissal } = wizard;
  const value = sel[activeStep];
  const record = sel.triageDismissal;
  const [confirming, setConfirming] = useState(null); // the option awaiting confirmation

  const select = (opt) => {
    const gated = step.optionDetails[opt]?.confirm === "dismissFalsePositive" && dismissal;
    // Already dismissed and on record: re-clicking the card changes nothing.
    if (gated && !(value === opt && record?.decision === opt)) setConfirming(opt);
    else if (!gated) setRadio(activeStep, opt);
  };

  return (
    <div className="max-w-[620px]">
      <DecisionGroup step={step} value={value} onSelect={select} />

      {record && value === record.decision && <DismissalRecord record={record} />}

      {dismissal && (
        <DismissFalsePositiveDialog
          open={!!confirming}
          onOpenChange={(open) => !open && setConfirming(null)}
          alertCount={dismissal.openAlertCount}
          onConfirm={({ reason, comments }) =>
            dismissal.dismiss({ stepIndex: activeStep, option: confirming, reason, comments })
          }
        />
      )}
    </div>
  );
}

/** What was decided and why, under the cards, once the dismissal is written. */
function DismissalRecord({ record }) {
  const failed = record.failedAlertIds?.length > 0;
  return (
    <p
      className={cn(
        "mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-xs leading-relaxed animate-in fade-in duration-200",
        failed ? "bg-danger/[0.06] text-danger" : "bg-black/[0.025] text-muted-foreground",
      )}
    >
      <IconHistory className="mt-0.5 size-3.5 shrink-0" />
      <span className="min-w-0">
        {failed ? (
          `${record.failedAlertIds.length} alert${record.failedAlertIds.length > 1 ? "s" : ""} could not be dismissed and remain open. `
        ) : (
          <span className="font-medium text-heading">Dismissed as false positive · </span>
        )}
        {record.reason}
        {record.comments && <span className="text-muted-foreground"> — {record.comments}</span>}
        <span className="tabular-nums"> · {dateShowFormatWithTime(record.dismissedAt)}</span>
      </span>
    </p>
  );
}

/**
 * Single-choice options rendered as decision cards. Behaves like a native
 * radio group: one tab stop, arrow keys move (and select) between choices —
 * except onto a choice that needs confirming, which arrows only focus, so a
 * stray keypress never opens a dialog.
 */
function DecisionGroup({ step, value, onSelect }) {
  const options = step.options || [];
  const focusIndex = Math.max(0, options.indexOf(value));

  const onKeyDown = (e, i) => {
    const delta = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    if (!delta) return;
    e.preventDefault();
    const next = (i + delta + options.length) % options.length;
    if (!step.optionDetails[options[next]]?.confirm) onSelect(options[next]);
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
