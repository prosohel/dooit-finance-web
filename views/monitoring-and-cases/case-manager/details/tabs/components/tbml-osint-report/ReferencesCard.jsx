"use client";

import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { chipClass, referenceRoleKind } from "./reportHelpers";

// One CSV cell — quotes doubled, whole value wrapped, so a relevance reason
// containing a comma or a quote cannot shift the columns.
const csvCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

/**
 * The document that was screened, plus every source URL the OSINT pass actually
 * consulted — tagged PRICED (contributed to a reference range), SCREENED
 * (sanctions/watchlist check) or CONTEXT (read but not relied on).
 */
export default function ReferencesCard({ run }) {
  const handleExport = () => {
    const rows = [
      ["#", "Role", "Used for", "Domain", "Title", "URL", "Relevance", "Reason", "Retrieved"],
      ...run.references.map((ref, i) => [
        i + 1,
        ref.role,
        ref.usedFor,
        ref.domain,
        ref.title,
        ref.url,
        ref.relevance || "",
        ref.note,
        ref.retrieved,
      ]),
    ];

    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${run.id}-references.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${run.references.length} references exported`);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
        <span className="text-xs font-semibold tracking-wide text-heading uppercase">
          References — document screened and sources used
        </span>
        <span className="text-[11px] text-muted-foreground">{run.references.length} sources</span>
      </div>

      <div className="flex items-center justify-between gap-3 border-b border-primary/15 bg-primary/5 px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="rounded border border-primary/20 bg-card px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-primary">
            {run.sourceDocument.type}
          </span>
          <div>
            <p className="text-xs font-semibold text-heading">{run.sourceDocument.file}</p>
            <p className="font-mono text-[11px] text-muted-foreground">{run.sourceDocument.meta}</p>
          </div>
        </div>
        {/* Streamed through the API, which holds the engine's key. Without a
            stored file there is nothing to open, so the link is not offered. */}
        {run.sourceDocument.url ? (
          <a
            href={run.sourceDocument.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-xs font-semibold text-primary hover:underline"
          >
            View document
          </a>
        ) : (
          <span className="shrink-0 text-xs text-muted-foreground">file not available</span>
        )}
      </div>

      <div className="divide-y divide-border/60">
        {run.references.length === 0 && (
          <p className="px-5 py-6 text-center text-xs text-muted-foreground">
            The research pass recorded no sources for this run.
          </p>
        )}

        {run.references.map((ref, i) => (
          <div
            key={ref.url || `${ref.domain}-${i}`}
            className="grid grid-cols-[26px_1fr_110px_120px] items-start gap-3.5 px-5 py-3"
          >
            <span className="pt-0.5 font-mono text-[11px] text-muted-foreground/70">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0">
              <a
                href={ref.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block truncate text-xs font-semibold text-heading hover:text-primary hover:underline"
              >
                {ref.title}
                <ExternalLink className="ml-1 inline size-2.5 align-baseline" />
              </a>
              <p className="font-mono text-[11px] text-primary">{ref.domain}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{ref.note}</p>
            </div>
            <span className="text-[11px] text-muted-foreground">{ref.usedFor}</span>
            <div className="flex flex-col items-end gap-1">
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold",
                  chipClass(referenceRoleKind(ref.role)),
                )}
              >
                {ref.role}
              </span>
              {/* The engine's own verdict on the page: MATCH, COMPARABLE,
                  DIFFERENT, UNRELATED. */}
              {ref.relevance && (
                <span className="font-mono text-[10px] text-muted-foreground/70">
                  {ref.relevance}
                </span>
              )}
              <span className="font-mono text-[11px] text-muted-foreground">{ref.retrieved}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 bg-muted/30 px-5 py-3">
        <p className="text-[11px] leading-relaxed text-muted-foreground">{run.referencesFooter}</p>
        <button
          type="button"
          onClick={handleExport}
          disabled={!run.references.length}
          className="shrink-0 text-xs font-semibold text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
        >
          Export reference list
        </button>
      </div>
    </div>
  );
}
