"use client";

import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  dismissAlert,
  getCaseById,
} from "@/app/dashboard/client/monitoring-and-cases/case-manager/actions";

// How long the analyst can take the dismissal back. The toast's own timer
// drives this, so hovering the toast (which pauses it) also holds the commit.
const UNDO_WINDOW_MS = 6000;

// Alerts that are already closed this way are left alone.
const ALREADY_DISMISSED = ["dismissed", "false_positive"];

const openAlertIdsOf = (caseData) =>
  (caseData?.alerts || []).filter((a) => !ALREADY_DISMISSED.includes(a.status)).map((a) => a.id);

// The note stored on each alert. The API stamps who and when from the session;
// the note carries the why, so the audit row reads on its own.
const auditNote = ({ reason, comments }) =>
  ["False positive", reason, comments].filter(Boolean).join(" — ");

/**
 * Triage's "Dismiss as false positive" decision, written as a deferred commit:
 * confirming selects the option and shows an Undo toast straight away, and the
 * case's open alerts are only dismissed once that toast closes. Undo inside
 * the window puts the step back exactly as it was and nothing reaches the API.
 *
 * Leaving the hub mid-window commits immediately. If the tab is closed
 * instead, nothing is sent — the alerts stay open, which is the safe side.
 */
export function useFalsePositiveDismissal({ caseData, caseId, onCaseChange, wizard }) {
  const pending = useRef(null);

  // Read at commit time, not at confirm time: the toast can outlive renders.
  const live = useRef({});
  live.current = { caseData, caseId, onCaseChange, wizard };

  const commit = useCallback(async () => {
    const p = pending.current;
    if (!p) return;
    pending.current = null;

    const { record } = p;
    const results = await Promise.allSettled(
      record.alertIds.map((id) =>
        dismissAlert(id, {
          reason: "false_positive",
          note: auditNote(record),
          dismissalReason: record.reason,
          comments: record.comments || undefined,
        }),
      ),
    );

    const failedIds = record.alertIds.filter((_, i) => {
      const r = results[i];
      return r.status === "rejected" || !r.value?.succeed;
    });

    const { caseId, onCaseChange, wizard } = live.current;
    // Kept with the investigation so the step can show what was decided.
    wizard?.setSelections({
      triageDismissal: { ...record, failedAlertIds: failedIds, committedAt: new Date().toISOString() },
    });

    if (failedIds.length) {
      const firstError = results.find((r) => r.status === "fulfilled" && !r.value?.succeed)?.value;
      toast.error(
        failedIds.length === record.alertIds.length
          ? "Could not dismiss the alert — it is still open."
          : `${failedIds.length} of ${record.alertIds.length} alerts could not be dismissed and are still open.`,
        { description: firstError?.error || firstError?.message },
      );
    }

    // Pull the case so alert statuses and the server's audit rows show.
    if (caseId) {
      const res = await getCaseById(caseId).catch(() => null);
      if (res?.succeed) onCaseChange?.(res.data);
    }
  }, []);

  // Leaving the hub must not silently drop a confirmed dismissal.
  useEffect(() => () => void commit(), [commit]);

  const dismiss = useCallback(
    ({ stepIndex, option, reason, comments }) => {
      const { caseData, wizard } = live.current;
      // A second dismissal while one is waiting: settle the first.
      if (pending.current) commit();

      const previous = {
        value: wizard.sel[stepIndex],
        done: !!wizard.steps[stepIndex]?.done,
        record: wizard.sel.triageDismissal ?? null,
      };
      const record = {
        decision: option,
        reason,
        comments: comments?.trim() || "",
        alertIds: openAlertIdsOf(caseData),
        dismissedAt: new Date().toISOString(),
      };

      wizard.setRadio(stepIndex, option);
      pending.current = { record };

      const undo = () => {
        if (!pending.current) return; // already committed
        pending.current = null;
        const w = live.current.wizard;
        w.setSelections({ [stepIndex]: previous.value, triageDismissal: previous.record });
        w.setStepDone(stepIndex, previous.done);
        toast("Dismissal undone — the alert remains open.");
      };

      toast.success("Alert dismissed as false positive.", {
        description: reason,
        duration: UNDO_WINDOW_MS,
        action: { label: "Undo", onClick: undo },
        onAutoClose: commit,
        onDismiss: commit,
      });
    },
    [commit],
  );

  return { dismiss, openAlertCount: openAlertIdsOf(caseData).length };
}
