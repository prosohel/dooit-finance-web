"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { IconLoader2, IconPlayerPlay } from "@tabler/icons-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAiRun, startMonitoringRun } from "@/app/dashboard/client/monitoring-and-cases/alerts/ai-actions";

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 10 * 60 * 1000;

/** Now, in the "YYYY-MM-DDTHH:mm" local format a datetime-local input expects. */
const nowForInput = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
};

const defaultForm = () => ({ windowEnd: nowForInput(), lookbackHours: "24", dryRun: true });

const validateForm = ({ windowEnd, lookbackHours }) => {
  if (!windowEnd || Number.isNaN(new Date(windowEnd).getTime())) return "Choose when the window ends.";
  const hours = Number(lookbackHours);
  if (!Number.isInteger(hours) || hours < 1) return "Lookback must be a whole number of hours, 1 or more.";
  return null;
};

/**
 * Starts a monitoring run and follows it via GET /runs/{runId} until the run
 * record has a `finishedAt`, then calls `onFinished` so the tab can refresh.
 */
export default function RunMonitoringButton({ onFinished }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [runId, setRunId] = useState(null);
  const [starting, setStarting] = useState(false);
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;

  const formError = validateForm(form);
  const set = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  const openDialog = () => {
    setForm(defaultForm());
    setOpen(true);
  };

  const handleStart = async () => {
    setStarting(true);
    const res = await startMonitoringRun({
      windowEnd: new Date(form.windowEnd).toISOString(),
      lookbackHours: Number(form.lookbackHours),
      dryRun: form.dryRun,
    });
    setStarting(false);

    if (!res.ok || !res.data?.runId) {
      toast.error(res.detail || "Could not start the monitoring run");
      return;
    }
    toast.success(`Monitoring run started (${res.data.runId})`);
    setRunId(res.data.runId);
  };

  useEffect(() => {
    if (!runId) return;
    const startedAt = Date.now();
    let timer;

    const poll = async () => {
      const res = await getAiRun(runId);
      const run = res.ok ? res.data : null;

      if (run?.finishedAt) {
        if (run.status === "succeeded") {
          toast.success(`Run finished — ${run.counts?.risky ?? 0} risky of ${run.counts?.transactions ?? 0} transactions`);
        } else {
          toast.error(`Run ended with status "${run.status}"`);
        }
        setRunId(null);
        onFinishedRef.current?.();
        return;
      }
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        toast.warning(`Run ${runId} is still in progress — check back later`);
        setRunId(null);
        return;
      }
      // The run record may not be readable the instant it is accepted, so a
      // failed read just waits for the next tick.
      timer = setTimeout(poll, POLL_INTERVAL_MS);
    };

    timer = setTimeout(poll, POLL_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [runId]);

  const busy = starting || Boolean(runId);

  return (
    <>
      <Button size="sm" variant="outline" disabled={busy} onClick={openDialog}>
        {busy ? <IconLoader2 className="animate-spin" /> : <IconPlayerPlay />}
        {runId ? "Run in progress" : "Run monitoring"}
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start a monitoring run?</AlertDialogTitle>
            <AlertDialogDescription>
              The service scans recent transactions with the rule, ML and DL detectors. Each risky
              transaction in a run creates an alert and is linked to a case.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="tm-window-end" className="text-[11px] text-muted-foreground">
                Window ends
              </Label>
              <Input
                id="tm-window-end"
                type="datetime-local"
                className="h-9 text-sm"
                value={form.windowEnd}
                onChange={(e) => set("windowEnd")(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tm-lookback" className="text-[11px] text-muted-foreground">
                Lookback (hours)
              </Label>
              <Input
                id="tm-lookback"
                type="number"
                min={1}
                step={1}
                className="h-9 text-sm"
                value={form.lookbackHours}
                onChange={(e) => set("lookbackHours")(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="tm-dry-run"
              checked={form.dryRun}
              onCheckedChange={(v) => set("dryRun")(v === true)}
            />
            <Label htmlFor="tm-dry-run" className="text-sm font-normal">
              Dry run
            </Label>
          </div>
          {formError && <p className="text-xs text-danger">{formError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={Boolean(formError)} onClick={handleStart}>
              Start run
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
