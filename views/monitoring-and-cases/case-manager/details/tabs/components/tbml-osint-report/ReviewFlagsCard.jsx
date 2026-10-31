"use client";

import { AlertTriangle, ShieldAlert } from "lucide-react";

/**
 * The engine's caveats about its own output.
 *
 * `requires_analyst_review` and `review_reasons` are the reason a screening run
 * cannot be read as a clean bill of health: a conclusion it withdrew, a price
 * it could not test, a stage environment that makes the whole report a test
 * artefact. They are shown verbatim and above the detail, because an analyst
 * who reads the findings without them has been misled by omission.
 */
export default function ReviewFlagsCard({ run }) {
  const reasons = run?.reviewReasons || [];
  if (!run?.requiresReview && !reasons.length) return null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-warning/30 border-l-[3px] border-l-warning bg-warning/5 p-5">
      <div className="flex items-center gap-2">
        <ShieldAlert className="size-4 text-warning" />
        <span className="text-xs font-bold tracking-wide text-yellow-700 uppercase">
          {run.requiresReview ? "Analyst confirmation required" : "Caveats on this assessment"}
        </span>
      </div>

      {reasons.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {reasons.map((reason, i) => (
            <li key={i} className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
              <AlertTriangle className="mt-0.5 size-3 shrink-0 text-warning" />
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs leading-relaxed text-muted-foreground">
          The engine flagged this run for confirmation but gave no reason.
        </p>
      )}
    </div>
  );
}
