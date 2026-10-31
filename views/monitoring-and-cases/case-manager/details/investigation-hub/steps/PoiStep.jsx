"use client";

import { useState } from "react";
import { toast } from "sonner";
import { IconFlag, IconHistory, IconPlus } from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  removeCasePoi,
  unlinkCustomer,
  updateCasePoi,
} from "@/app/dashboard/client/monitoring-and-cases/case-manager/actions";
import { CustomerPoiCard, ExternalPoiCard } from "./poi/PoiCard";
import AddPoiDialog from "./poi/AddPoiDialog";
import PoiForm from "./poi/PoiForm";

/**
 * Persons of interest — read from and written to the CASE, not the wizard's
 * saved state, so the customer profile tab, the transaction analysis and
 * report drafts all see the same people.
 *   customers     caseData.pois          (Case.customer + linkedCustomers)
 *   non-customers caseData.externalPois  (Case.externalPois)
 */
export default function PoiStep({ caseData, caseId, onCaseChange, wizard }) {
  const { caseAlerts, legacyPois = [] } = wizard;
  const customerPois = caseData?.pois || [];
  const externalPois = caseData?.externalPois || [];
  const total = customerPois.length + externalPois.length;

  const [addOpen, setAddOpen] = useState(false);
  const [addTab, setAddTab] = useState("customer");
  const [manualInitial, setManualInitial] = useState(undefined);
  const [editing, setEditing] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const openAdd = (tab = "customer", initial) => {
    setAddTab(tab);
    setManualInitial(initial);
    setAddOpen(true);
  };

  // The API returns the updated case; hand it up so every tab re-renders.
  const run = async (id, fn, successMessage, opts) => {
    setBusyId(id);
    try {
      const res = await fn();
      if (!res?.succeed) throw new Error(res?.message || "Something went wrong");
      onCaseChange?.(res.data, opts);
      if (successMessage) toast.success(successMessage);
      return true;
    } catch (e) {
      toast.error(e.message);
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const removeCustomer = (poi) => {
    if (!window.confirm(`Remove ${poi.name || poi.uid} from this case's persons of interest?`)) return;
    run(poi.id, () => unlinkCustomer(caseId, poi.id), "Customer removed from case", { refreshAnalysis: true });
  };

  const removeExternal = (poi) => {
    if (!window.confirm(`Remove ${poi.name} from this case's persons of interest?`)) return;
    run(poi.id, () => removeCasePoi(caseId, poi.id), "Person of interest removed");
  };

  const saveEdit = async (payload) => {
    const ok = await run("edit", () => updateCasePoi(caseId, editing.id, payload), "Details saved");
    if (ok) setEditing(null);
  };

  // Legacy names not yet on the case (matched by name, case-insensitively).
  const known = new Set([...customerPois, ...externalPois].map((p) => String(p.name || "").trim().toLowerCase()));
  const pendingLegacy = legacyPois.filter((p) => !known.has(String(p.name).trim().toLowerCase()));

  return (
    <div className="max-w-[760px]">
      {caseAlerts.length > 0 && (
        <div className="mb-4.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="mb-2.5 flex items-center gap-2 text-[13px] font-bold text-amber-800">
            <IconFlag className="size-3.5" />
            {caseAlerts.length} alert{caseAlerts.length === 1 ? "" : "s"} combined in this case
            <button
              type="button"
              onClick={() => openAdd("alerts")}
              className="ml-auto text-xs font-semibold text-amber-900 underline"
            >
              Pick POIs from alert parties
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            {caseAlerts.map((al) => (
              <div key={al.id} className="flex items-center gap-2.5 text-xs">
                <span className="rounded border border-amber-300 bg-white px-1.5 py-0.5 font-mono text-[11px] text-amber-800">
                  {al.uid}
                </span>
                <span className="flex-1 text-heading/80">{al.title}</span>
                <span className="text-muted-foreground">{al.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {pendingLegacy.length > 0 && (
        <div className="mb-4 rounded-xl border border-border bg-muted/40 px-4 py-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold text-heading">
            <IconHistory className="size-3.5" />
            Names recorded in an earlier version of this workspace
          </div>
          <p className="mb-2 text-xs text-muted-foreground">
            These were only saved to the investigation notes, not the case. Add them to include them in reports.
          </p>
          <div className="flex flex-wrap gap-2">
            {pendingLegacy.map((p) => (
              <Button key={p.id || p.name} size="sm" variant="outline" onClick={() => openAdd("manual", { name: p.name })}>
                <IconPlus className="size-3.5" />
                {p.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {total} person{total === 1 ? "" : "s"} of interest
      </div>

      <div className="flex flex-col gap-3">
        {total === 0 && (
          <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            No persons of interest yet. Add the customer under investigation, parties from the alerts, or anyone else involved.
          </p>
        )}
        {customerPois.map((poi) => (
          <CustomerPoiCard key={`c:${poi.id}`} poi={poi} onRemove={removeCustomer} busy={busyId === poi.id} />
        ))}
        {externalPois.map((poi) => (
          <ExternalPoiCard
            key={`x:${poi.id}`}
            poi={poi}
            onEdit={setEditing}
            onRemove={removeExternal}
            busy={busyId === poi.id}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => openAdd("customer")}
        disabled={!caseId}
        className="mt-3.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 disabled:opacity-50"
      >
        <IconPlus className="size-3.5" />
        Add person of interest
      </button>

      {caseId && (
        <AddPoiDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          caseId={caseId}
          onCaseChange={onCaseChange}
          initialTab={addTab}
          manualInitial={manualInitial}
        />
      )}

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit person of interest</DialogTitle>
            <DialogDescription>
              {editing?.source === "alert"
                ? `Taken from ${editing.sourceLabel}. Account details stay as recorded on the transaction.`
                : "Changes are recorded in the case audit trail."}
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <PoiForm
              key={editing.id}
              initial={editing}
              lockedFields={editing.source === "alert" ? ["account", "institution", "institutionCountry", "bic"] : []}
              submitLabel="Save changes"
              submitting={busyId === "edit"}
              onSubmit={saveEdit}
              onCancel={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
