"use client";

import { useMemo } from "react";
import { IconAlertTriangle, IconWand } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dateShowFormat } from "@/lib/utils";

// The four dates the step captures, in the order they are shown. `key` matches
// the field names persisted in CaseInvestigation.dateRange.
const FIELDS = [
  { key: "start", label: "Activity period — start" },
  { key: "end", label: "Activity period — end" },
  { key: "reviewFrom", label: "Review window — from" },
  { key: "reviewTo", label: "Review window — to" },
];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// "yyyy-mm-dd" from an <input type="date">, parsed as UTC midnight so that a
// day count is never off by one for an analyst working east or west of GMT.
function parseInputDate(value) {
  if (!value) return null;
  const ms = Date.parse(`${value}T00:00:00Z`);
  return Number.isNaN(ms) ? null : ms;
}

// Inclusive day count: a start and end on the same day is one day, not zero.
function daysBetween(startMs, endMs) {
  return Math.round((endMs - startMs) / MS_PER_DAY) + 1;
}

/**
 * Renders the "kind: dateRange" step. Every field is controlled by the wizard
 * so the analyst's dates autosave with the rest of their progress and come
 * back when the case is reopened. The summary underneath is computed from the
 * dates actually entered and the case's own flagged transactions — it used to
 * be a hardcoded sentence claiming a 46-day window on every case.
 */
export default function DateRangeStep({ caseData, wizard }) {
  const { dateRange, applyDateRange } = wizard;

  const start = parseInputDate(dateRange.start);
  const end = parseInputDate(dateRange.end);
  const reviewFrom = parseInputDate(dateRange.reviewFrom);
  const reviewTo = parseInputDate(dateRange.reviewTo);

  // The span of the case's own flagged transactions, used both for the
  // coverage check and for the "match flagged activity" shortcut.
  const flagged = useMemo(() => {
    const days = (caseData?.transactions || [])
      .filter((t) => t.status === "flagged" && t.date)
      .map((t) => Date.parse(t.date))
      .filter((ms) => !Number.isNaN(ms))
      .sort((a, b) => a - b);
    if (!days.length) return null;
    return { count: days.length, first: days[0], last: days[days.length - 1] };
  }, [caseData]);

  // How many of those transactions the entered activity period actually covers.
  const outsideRange =
    flagged && start && end
      ? (caseData.transactions || []).filter((t) => {
          if (t.status !== "flagged" || !t.date) return false;
          const ms = Date.parse(t.date);
          // The end date is inclusive: a transaction on the closing day is in.
          return !Number.isNaN(ms) && (ms < start || ms >= end + MS_PER_DAY);
        }).length
      : 0;

  const activityBackwards = start && end && end < start;
  const reviewBackwards = reviewFrom && reviewTo && reviewTo < reviewFrom;

  // The review window is what the analyst examined, so it should contain the
  // activity it explains. Only worth saying once both pairs are filled in.
  const reviewTooNarrow =
    start && end && reviewFrom && reviewTo && !reviewBackwards && (reviewFrom > start || reviewTo < end);

  const matchFlagged = () =>
    applyDateRange({
      start: new Date(flagged.first).toISOString().slice(0, 10),
      end: new Date(flagged.last).toISOString().slice(0, 10),
    });

  return (
    <div className="max-w-[560px]">
      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <div key={field.key}>
            <div className="mb-1.5 text-xs font-semibold text-muted-foreground">{field.label}</div>
            <Input
              type="date"
              className="text-sm"
              value={dateRange[field.key] || ""}
              onChange={(e) => applyDateRange({ [field.key]: e.target.value })}
            />
          </div>
        ))}
      </div>

      {flagged && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
          <span>
            Flagged activity on this case runs {dateShowFormat(flagged.first)} –{" "}
            {dateShowFormat(flagged.last)}.
          </span>
          <Button variant="outline" size="sm" className="h-7 gap-1.5 px-2 text-xs" onClick={matchFlagged}>
            <IconWand className="size-3.5" />
            Match activity period
          </Button>
        </div>
      )}

      <div className="mt-4 space-y-2">
        <Summary
          start={start}
          end={end}
          backwards={activityBackwards}
          flagged={flagged}
          outsideRange={outsideRange}
        />
        {reviewBackwards && <Warning>Review window ends before it begins.</Warning>}
        {reviewTooNarrow && (
          <Warning>
            The review window does not cover the whole activity period — widen it, or narrow the
            activity dates to what was actually examined.
          </Warning>
        )}
      </div>
    </div>
  );
}

/** The activity-period readout: span in days plus how it sits against the case. */
function Summary({ start, end, backwards, flagged, outsideRange }) {
  if (backwards) return <Warning>Activity period ends before it begins.</Warning>;

  if (!start || !end) {
    return (
      <Note>
        Set both activity dates to see the span of the period covered by this review.
      </Note>
    );
  }

  const days = daysBetween(start, end);

  return (
    <Note>
      Selected activity window spans{" "}
      <strong className="text-heading">
        {days} day{days === 1 ? "" : "s"}
      </strong>
      .{" "}
      {!flagged
        ? "No flagged transactions are linked to this case yet."
        : outsideRange === 0
          ? "All flagged transactions fall inside this range."
          : `${outsideRange} of ${flagged.count} flagged transaction${
              flagged.count === 1 ? "" : "s"
            } fall outside this range.`}
    </Note>
  );
}

function Note({ children }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-3.5 py-3 text-[13px] text-muted-foreground">
      {children}
    </div>
  );
}

function Warning({ children }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3.5 py-3 text-[13px] text-danger">
      <IconAlertTriangle className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
