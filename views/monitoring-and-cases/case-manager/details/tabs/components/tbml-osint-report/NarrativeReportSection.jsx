"use client";

import { toast } from "sonner";
import NarrativeReportTab from "./NarrativeReportTab";

/**
 * Card wrapper around the parsed narrative-report markdown.
 *
 * The export downloads the engine's markdown as written, rather than the
 * rendered page — it is the form an analyst can paste into an ECDD or SMR
 * draft, and it keeps the wording the engine is accountable for intact.
 */
export default function NarrativeReportSection({ run }) {
  const handleExport = () => {
    const url = URL.createObjectURL(
      new Blob([run.narrative], { type: "text/markdown;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `${run.id}-narrative.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Narrative for ${run.id} downloaded`);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wide text-heading uppercase">
          Narrative report
        </span>
        <button
          type="button"
          onClick={handleExport}
          disabled={!run.narrative}
          className="text-xs font-semibold text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
        >
          Download narrative
        </button>
      </div>
      <NarrativeReportTab markdown={run.narrative} />
    </div>
  );
}
