"use client";

// Click-to-edit SLA deadline for the alert header. Demo only: the chosen
// deadline lives in the parent's local state and is never sent to the API.

import { useState } from "react";
import { IconClockEdit, IconPencil } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import SlaCountdown from "@/views/monitoring-and-cases/case-manager/details/components/SlaCountdown";
import { cn } from "@/lib/utils";

const HOUR = 60 * 60 * 1000;
const PRESETS = [
  { label: "Overdue 4h", offset: -4 * HOUR },
  { label: "In 1h", offset: 1 * HOUR },
  { label: "In 24h", offset: 24 * HOUR },
  { label: "In 3d", offset: 72 * HOUR },
];

const PRESS =
  "transition-[transform,background-color,color] duration-150 ease-snappy active:scale-[0.97]";

// <input type="datetime-local"> speaks local wall-clock time, not ISO/UTC.
function toLocalInput(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function preview(draft) {
  const t = new Date(draft).getTime();
  if (!draft || Number.isNaN(t)) return null;
  const diff = t - Date.now();
  const abs = Math.abs(diff);
  const h = Math.floor(abs / HOUR);
  const m = Math.floor((abs % HOUR) / 60000);
  return { overdue: diff < 0, text: diff < 0 ? `Overdue by ${h}h ${m}m` : `${h}h ${m}m remaining` };
}

export default function SlaEditor({ deadline, originalDeadline, onChange, className }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");

  const handleOpenChange = (next) => {
    if (next) setDraft(toLocalInput(deadline));
    setOpen(next);
  };

  const save = (e) => {
    e.preventDefault();
    const d = new Date(draft);
    if (!draft || Number.isNaN(d.getTime())) return;
    onChange(d.toISOString());
    setOpen(false);
  };

  const reset = () => {
    onChange(null);
    setOpen(false);
  };

  const p = preview(draft);
  const isOverridden = !!deadline && deadline !== originalDeadline;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Edit SLA deadline"
          className={cn(
            "group -mx-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 outline-none hover:bg-neutral-100 focus-visible:ring-1 focus-visible:ring-primary/50 data-[state=open]:bg-neutral-100",
            PRESS,
            className,
          )}
        >
          {deadline ? (
            // key: recompute against a fresh "now" the moment the deadline changes
            <SlaCountdown key={deadline} deadline={deadline} className="text-sm" />
          ) : (
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
              <IconClockEdit className="size-3.5" />
              Set SLA
            </span>
          )}
          <IconPencil className="size-3 text-muted-foreground opacity-50 transition-opacity duration-150 group-hover:opacity-100 group-data-[state=open]:opacity-100" />
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-72 p-3">
        <form onSubmit={save} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="sla-deadline" className="text-xs font-medium text-heading">
              SLA deadline
            </label>
            <Input
              id="sla-deadline"
              type="datetime-local"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <p
              className={cn(
                "h-4 text-xs tabular-nums",
                p?.overdue ? "text-danger" : "text-muted-foreground",
              )}
            >
              {p ? p.text : "Pick a date and time"}
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setDraft(toLocalInput(Date.now() + preset.offset))}
                className={cn(
                  "rounded-md border border-border bg-white px-2 py-1 text-xs text-neutral-700 outline-none hover:bg-neutral-100 focus-visible:ring-1 focus-visible:ring-primary/50",
                  PRESS,
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
            {isOverridden ? (
              <Button type="button" size="sm" variant="ghost" onClick={reset}>
                Reset
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" size="sm" disabled={!p}>
              Save
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
