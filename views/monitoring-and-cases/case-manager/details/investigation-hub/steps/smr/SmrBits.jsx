"use client";

import { useEffect, useState } from "react";
import { IconSparkles } from "@tabler/icons-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Field label with the draft's Edited / AI-draft provenance badge. */
export function FieldLabel({ label, path, draft, htmlFor }) {
  const badge = draft.edited.includes(path) ? "edited" : draft.aiUsed.has(path) ? "ai" : null;
  return (
    <label htmlFor={htmlFor} className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
      {label}
      {badge === "ai" && (
        <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">AI draft</span>
      )}
      {badge === "edited" && (
        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">Edited</span>
      )}
    </label>
  );
}

/**
 * Textarea over a string-array path: one entry per line. The text is local
 * state so blank lines survive while typing; the array the API stores is the
 * trimmed, non-empty lines.
 */
export function ListTextarea({ path, draft, placeholder, minHeightClass = "min-h-24" }) {
  const stored = draft.values[path];
  const [text, setText] = useState(() => (Array.isArray(stored) ? stored.join("\n") : ""));

  // A reload / refresh / taken suggestion replaces the array; re-derive the
  // text unless it already says the same thing.
  useEffect(() => {
    const lines = text.split("\n").map((t) => t.trim()).filter(Boolean);
    if (JSON.stringify(lines) !== JSON.stringify(Array.isArray(stored) ? stored : [])) {
      setText(Array.isArray(stored) ? stored.join("\n") : "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stored]);

  return (
    <Textarea
      id={`smr-${path}`}
      value={text}
      placeholder={placeholder || "One per line"}
      className={cn("resize-y text-sm", minHeightClass)}
      onChange={(e) => {
        setText(e.target.value);
        draft.change(path, e.target.value.split("\n").map((t) => t.trim()).filter(Boolean));
      }}
    />
  );
}

/** The violet "Suggested" card under a Part B field. */
export function SuggestionCard({ path, draft }) {
  const suggestion = draft.suggestions[path];
  if (suggestion == null) return null;
  const text = Array.isArray(suggestion) ? suggestion.map((s) => `• ${s}`).join("\n") : suggestion;
  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-900">
      <div className="mb-1 flex items-center gap-1 font-semibold">
        <IconSparkles className="size-3" /> Suggested
      </div>
      <p className="whitespace-pre-wrap">{text}</p>
      <div className="mt-2 flex gap-2">
        <Button size="sm" className="h-6 px-2 text-xs" onClick={() => draft.takeSuggestion(path)}>
          Use this
        </Button>
        <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={() => draft.dismissSuggestion(path)}>
          Dismiss
        </Button>
      </div>
    </div>
  );
}

/** Label/value pair in the read-only fact parts. */
export function Fact({ label, value }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="truncate text-[13px] text-heading">{value || "—"}</div>
    </div>
  );
}

export function ApiOwnedNote({ children }) {
  return <p className="rounded-lg bg-muted/50 px-3 py-2 text-[11.5px] text-muted-foreground">{children}</p>;
}

export const fmtDate = (v) => (v ? String(v).slice(0, 10) : "—");

export const fmtAddress = (a) =>
  [a?.street, a?.city, a?.state, a?.postcode, a?.country].filter(Boolean).join(", ");
