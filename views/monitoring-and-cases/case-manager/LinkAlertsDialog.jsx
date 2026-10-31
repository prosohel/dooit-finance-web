"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/StatusPill";
import {
  IconSearch,
  IconCheck,
  IconLoader2,
  IconBell,
  IconAlertTriangle,
} from "@tabler/icons-react";
import { cn, dateShowFormat } from "@/lib/utils";
import { getAlerts } from "@/app/dashboard/client/monitoring-and-cases/case-manager/actions";

const STATUS_VARIANT = {
  new: "info",
  under_review: "warning",
  escalated_to_case: "success",
  dismissed: "outline",
  false_positive: "muted",
};

const STATUS_LABEL = {
  new: "New",
  under_review: "Under Review",
  escalated_to_case: "Escalated",
  dismissed: "Dismissed",
  false_positive: "False Positive",
};

const RISK_VARIANT = {
  critical: "dark",
  high: "danger",
  medium: "warning",
  low: "info",
};

/**
 * Multi-select dialog for picking alerts to link.
 *
 * @param {boolean} open
 * @param {(open: boolean) => void} onOpenChange
 * @param {(alertIds: string[]) => Promise<void>} onConfirm  Called with selected IDs; should resolve when API call succeeds.
 * @param {string[]} excludeIds                              Alert IDs already linked (won't be shown / selectable)
 * @param {string} title
 * @param {string} confirmLabel
 */
export default function LinkAlertsDialog({
  open,
  onOpenChange,
  onConfirm,
  excludeIds = [],
  title = "Link Alerts to Case",
  confirmLabel = "Link Selected",
}) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [submitting, setSubmitting] = useState(false);

  // Load unlinked alerts when dialog opens
  useEffect(() => {
    if (!open) return;
    setSelected(new Set());
    setSearch("");

    const load = async () => {
      setLoading(true);
      try {
        // Pull alerts that haven't been linked yet (status: new | under_review)
        const res = await getAlerts({ limit: 100, sort: "-createdAt" });
        if (res?.data) {
          // The alerts API may return either { data: [...] } or paginated shape.
          const list = Array.isArray(res.data) ? res.data : res.data?.docs || [];
          // Only show alerts not already linked to a case (or to this case, hence excludeIds)
          const filtered = list.filter(
            (a) =>
              !a.linkedCase &&
              !excludeIds.includes(a._id) &&
              !["dismissed", "false_positive"].includes(a.status)
          );
          setAlerts(filtered);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open, excludeIds]);

  const visibleAlerts = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return alerts;
    return alerts.filter(
      (a) =>
        a.uid?.toLowerCase().includes(q) ||
        a.caseType?.toLowerCase().includes(q) ||
        a.riskLabel?.toLowerCase().includes(q) ||
        a.customer?.name?.toLowerCase().includes(q)
    );
  }, [alerts, search]);

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = async () => {
    if (selected.size === 0 || submitting) return;
    setSubmitting(true);
    try {
      await onConfirm(Array.from(selected));
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <IconBell className="size-4" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Select alerts to associate with this case. Only alerts that aren&apos;t already linked are shown.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            className="pl-8 h-9 text-sm"
            placeholder="Search by alert ID, type, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Alert list */}
        <div className="max-h-[420px] overflow-y-auto -mx-6 px-6 border-y py-3">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : visibleAlerts.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
              <IconAlertTriangle className="size-8 opacity-30" />
              <p className="text-sm">
                {alerts.length === 0
                  ? "No unlinked alerts available."
                  : "No alerts match your search."}
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {visibleAlerts.map((alert) => {
                const isSelected = selected.has(alert._id);
                return (
                  <button
                    key={alert._id}
                    type="button"
                    onClick={() => toggle(alert._id)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    <div
                      className={cn(
                        "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/30 bg-background"
                      )}
                    >
                      {isSelected && <IconCheck className="size-3" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-heading">
                          {alert.uid}
                        </span>
                        <StatusPill variant={STATUS_VARIANT[alert.status] || "outline"}>
                          {STATUS_LABEL[alert.status] || alert.status}
                        </StatusPill>
                        {alert.riskLabel && (
                          <Badge
                            variant="outline"
                            className="text-xs capitalize gap-1"
                          >
                            <span
                              className={cn(
                                "size-1.5 rounded-full",
                                RISK_VARIANT[alert.riskLabel?.toLowerCase()] === "danger" && "bg-red-500",
                                RISK_VARIANT[alert.riskLabel?.toLowerCase()] === "warning" && "bg-yellow-500",
                                RISK_VARIANT[alert.riskLabel?.toLowerCase()] === "info" && "bg-blue-500",
                                RISK_VARIANT[alert.riskLabel?.toLowerCase()] === "dark" && "bg-gray-800"
                              )}
                            />
                            {alert.riskLabel}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {alert.caseType && <span>{alert.caseType}</span>}
                        {alert.riskScore != null && <span>Score: {alert.riskScore}</span>}
                        {alert.customer?.name && <span>Customer: {alert.customer.name}</span>}
                        <span>{dateShowFormat(alert.createdAt)}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <span className="text-xs text-muted-foreground">
            {selected.size} selected
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              disabled={selected.size === 0 || submitting}
              onClick={handleConfirm}
            >
              {submitting && <IconLoader2 className="size-3.5 animate-spin" />}
              {confirmLabel}
              {selected.size > 0 && ` (${selected.size})`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
