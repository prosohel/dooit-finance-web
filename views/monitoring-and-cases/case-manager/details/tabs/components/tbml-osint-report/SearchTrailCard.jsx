"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTbmlTrail } from "@/app/dashboard/client/monitoring-and-cases/case-manager/tbml-actions";

/**
 * Every search result the run saw, opened or not.
 *
 * The references list answers "what did this conclusion rest on"; this answers
 * the harder audit question — "what else was in front of it, and why was that
 * one passed over?". It is a large payload and most runs are never audited this
 * closely, so it is fetched on first expand (the API fetches it from the engine
 * once, then caches it).
 */
export default function SearchTrailCard({ reportId }) {
  const [open, setOpen] = useState(false);
  const [trail, setTrail] = useState(null);
  const [state, setState] = useState({ loading: false, error: null });

  const handleToggle = async () => {
    const next = !open;
    setOpen(next);
    if (!next || trail || state.loading) return;

    setState({ loading: true, error: null });
    const res = await getTbmlTrail(reportId);
    if (!res?.succeed) {
      setState({ loading: false, error: res?.message || "Could not load the search trail." });
      return;
    }
    setTrail(res.data);
    setState({ loading: false, error: null });
  };

  const results = trail?.results || [];

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <button
        type="button"
        onClick={handleToggle}
        className="flex items-center justify-between gap-2.5"
      >
        <span className="text-xs font-semibold tracking-wide text-heading uppercase">
          Search trail
        </span>
        <span className="flex items-center gap-1 text-[11px] font-medium text-primary">
          {trail ? `${trail.opened} of ${trail.total} opened` : open ? "Loading" : "Show"}
          {open ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
        </span>
      </button>

      {!open && (
        <span className="text-[11px] leading-relaxed text-muted-foreground">
          Every result the research pass saw, including the ones it chose not to read.
        </span>
      )}

      {open && state.loading && (
        <p className="flex items-center gap-1.5 py-2 text-[11px] text-muted-foreground">
          <Loader2 className="size-3 animate-spin" />
          Loading the search trail…
        </p>
      )}

      {open && state.error && <p className="py-2 text-[11px] text-danger">{state.error}</p>}

      {open && trail && (
        <div className="flex flex-col gap-2">
          {results.length === 0 && (
            <p className="text-[11px] text-muted-foreground">
              The engine recorded no search trail for this run.
            </p>
          )}

          {results.map((result, i) => (
            <div
              key={`${result.url}-${i}`}
              className="flex flex-col gap-0.5 border-b border-border/60 pb-2 last:border-b-0 last:pb-0"
            >
              <div className="flex items-start justify-between gap-2">
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="line-clamp-2 flex-1 text-[11.5px] font-medium text-heading hover:text-primary hover:underline"
                >
                  {result.title || result.url}
                  <ExternalLink className="ml-1 inline size-2.5" />
                </a>
                <span
                  className={cn(
                    "shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold",
                    result.selected
                      ? "border border-primary/20 bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {result.selected ? "READ" : "SKIPPED"}
                </span>
              </div>
              <span className="font-mono text-[10.5px] text-muted-foreground">
                #{result.rank} · {result.query_text}
              </span>
              {/* Why the engine passed over a result is the part an auditor
                  actually wants; it is only ever set on a skipped row. */}
              {result.skipped_reason && (
                <span className="text-[10.5px] leading-relaxed text-muted-foreground">
                  {result.skipped_reason}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
