"use client";

import { useMemo, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn, getInitials } from "@/lib/utils";
import AnalystHistorySection, {
  buildHistory,
  getContributors,
} from "../sections/AnalystHistorySection";

// Four faces is enough to read "a team is on this"; the rest collapse into +N.
const MAX_VISIBLE = 4;

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * Header avatar stack of everyone who has worked the case. Clicking it opens
 * the full Analyst History in a dialog: who did what, and when.
 */
export default function EngagedAnalysts({
  auditLog,
  notes,
  rfis,
  assignment,
  assignedAnalyst,
  labelClassName,
}) {
  const [open, setOpen] = useState(false);

  const history = useMemo(
    () => buildHistory({ auditLog, notes, rfis, assignment }),
    [auditLog, notes, rfis, assignment],
  );
  const contributors = useMemo(
    () => getContributors(history, assignedAnalyst),
    [history, assignedAnalyst],
  );

  if (contributors.length === 0) return null;

  const shown = contributors.slice(0, MAX_VISIBLE);
  const overflow = contributors.length - shown.length;
  const summary = `${plural(contributors.length, "person")} · ${plural(history.length, "action")}`;

  return (
    <>
      <div className="flex flex-col gap-1 leading-tight pr-2">
        <span className={labelClassName}>Engaged</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={open}
              aria-label={`${summary}: ${contributors.map((c) => c.name).join(", ")}. View analyst history`}
              className="eg-trigger -m-1 flex items-center rounded-full p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex -space-x-2">
                {shown.map((c, i) => (
                  <Avatar
                    key={c.name}
                    style={{ "--i": i }}
                    className="eg-face size-7 ring-2 ring-background"
                  >
                    <AvatarFallback
                      className={cn(
                        "text-[0.6rem] font-semibold",
                        c.name === assignedAnalyst
                          ? "bg-primary text-primary-foreground"
                          : "bg-primary/10 text-primary",
                      )}
                    >
                      {getInitials(c.name)}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {overflow > 0 && (
                  <span
                    style={{ "--i": shown.length }}
                    className="eg-face flex size-7 items-center justify-center rounded-full bg-muted text-[0.6rem] font-semibold tabular-nums text-muted-foreground ring-2 ring-background"
                  >
                    +{overflow}
                  </span>
                )}
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[240px]">
            <p className="font-medium">{summary}</p>
            <p className="opacity-80">
              {contributors
                .slice(0, 6)
                .map((c) => c.name)
                .join(", ")}
              {contributors.length > 6 && ` and ${contributors.length - 6} more`}
            </p>
          </TooltipContent>
        </Tooltip>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[880px]">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle className="text-base">Analyst History</DialogTitle>
            <DialogDescription>
              {summary} on this case. Pick a person to see only their actions.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <AnalystHistorySection
              embedded
              auditLog={auditLog}
              notes={notes}
              rfis={rfis}
              assignment={assignment}
              assignedAnalyst={assignedAnalyst}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
