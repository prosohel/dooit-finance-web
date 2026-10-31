"use client";

// Escalate dialog: "attach to the customer's open case" vs "create a new case".
//
// On open it asks GET /alert/:id/attachable-cases. When the customer already
// has an open case the first one is pre-selected, so a second rule hit on the
// same person lands on the existing investigation instead of minting another
// single-alert case (docs/74 §6.1). Confirm calls onEscalate({ caseId }) or
// onEscalate({}) — the parent owns the API call, toast and navigation.

import { useEffect, useState } from "react";
import { IconArrowRight, IconFolderPlus, IconLink, IconLoader2 } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/StatusPill";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getAttachableCases } from "@/app/dashboard/client/monitoring-and-cases/case-manager/actions";
import { IdChip } from "./components";

const NEW_CASE = "__new__";

const humanize = (s) => String(s || "").replace(/_/g, " ");

/**
 * @param {Object}   alert       needs `id` — the alert being escalated
 * @param {boolean}  busy        disables the default trigger while a call runs
 * @param {Function} onEscalate  receives {} (create) or { caseId } (attach)
 * @param {ReactNode} [trigger]  a caller's own button; the default suits a
 *                               detail page, a list row wants something smaller
 */
export default function EscalateDialog({ alert, busy, onEscalate, trigger }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [choice, setChoice] = useState(NEW_CASE);

  // Load the customer's open cases every time the dialog opens.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    getAttachableCases(alert.id)
      .then((res) => {
        if (cancelled) return;
        const list = res?.succeed ? res.data || [] : [];
        setCandidates(list);
        setChoice(list[0]?._id || NEW_CASE);
      })
      .catch(() => !cancelled && setCandidates([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, alert.id]);

  const confirm = () => {
    onEscalate(choice === NEW_CASE ? {} : { caseId: choice });
    setOpen(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="outline" disabled={busy}>
            {busy ? <IconLoader2 className="size-4 animate-spin" /> : <IconArrowRight className="size-4" />}
            Escalate to case
          </Button>
        )}
      </AlertDialogTrigger>

      {/* Wider than the default max-w-lg: a case reference plus its status pill
          does not fit 464px of usable width on one line. */}
      <AlertDialogContent className="sm:max-w-xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Escalate to a case</AlertDialogTitle>
          <AlertDialogDescription>
            Links this alert, its transaction and the transaction parties to the case and moves the
            alert to Escalated. The case risk is re-derived from all of its alerts.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {loading ? (
          <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
            <IconLoader2 className="size-4 animate-spin" /> Checking for open cases…
          </div>
        ) : (
          <RadioGroup value={choice} onValueChange={setChoice} className="gap-2">
            {candidates.map((c) => (
              <Label
                key={c._id}
                htmlFor={`attach-${c._id}`}
                // `min-w-0` matters: RadioGroup is a grid and this label is a
                // flex item, so its default `min-width: auto` let a long case
                // reference push the row past the dialog instead of wrapping —
                // which also stopped the meta line below from truncating.
                className="flex min-w-0 cursor-pointer items-start gap-3 rounded-md border border-border p-3 text-sm font-normal has-[[data-state=checked]]:border-primary"
              >
                <RadioGroupItem id={`attach-${c._id}`} value={c._id} className="mt-0.5 shrink-0" />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <IconLink className="size-4 shrink-0 text-muted-foreground" />
                    <span className="font-medium">Attach to</span>
                    {/* A uid is one unbreakable token; let it break rather than
                        set the row's minimum width. */}
                    <IdChip className="break-all">{c.uid || c._id}</IdChip>
                    <StatusPill variant="outline">{humanize(c.status)}</StatusPill>
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {c.title} · {c.alertCount} alert{c.alertCount === 1 ? "" : "s"} · {c.poiCount} POI
                    {c.poiCount === 1 ? "" : "s"}
                    {c.riskLabel ? ` · ${c.riskLabel} risk` : ""}
                  </span>
                </span>
              </Label>
            ))}

            <Label
              htmlFor="attach-new"
              className="flex min-w-0 cursor-pointer items-start gap-3 rounded-md border border-border p-3 text-sm font-normal has-[[data-state=checked]]:border-primary"
            >
              <RadioGroupItem id="attach-new" value={NEW_CASE} className="mt-0.5 shrink-0" />
              <span className="flex min-w-0 flex-col gap-1">
                <span className="flex items-center gap-2 font-medium">
                  <IconFolderPlus className="size-4 text-muted-foreground" /> Create a new case
                </span>
                <span className="text-xs text-muted-foreground">
                  {candidates.length
                    ? "Start a separate investigation for this alert."
                    : "This customer has no open case — a new investigation will be created."}
                </span>
              </span>
            </Label>
          </RadioGroup>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={confirm} disabled={loading}>
            {choice === NEW_CASE ? "Create case" : "Attach to case"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
