"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  IconAlertTriangle,
  IconCheck,
  IconFlag,
  IconLoader2,
  IconSearch,
  IconUserPlus,
} from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  addCasePoi,
  getPoiCandidates,
  linkCustomers,
} from "@/app/dashboard/client/monitoring-and-cases/case-manager/actions";
import { formatAUD } from "@/lib/utils";
import PoiForm from "./PoiForm";
import { ScreeningPills } from "./PoiCard";

const SEARCH_DEBOUNCE_MS = 300;

const SLOT_LABELS = {
  alert_subject: "Alert subject",
  sender: "Sender",
  receiver: "Receiver",
  beneficiary: "Beneficiary",
  intermediary: "Intermediary",
};

// Party identifiers that came off the transaction — shown read-only so the
// POI keeps matching the record it was taken from.
const ALERT_LOCKED_FIELDS = ["account", "institution", "institutionCountry", "bic"];

/**
 * "Add person of interest": three ways in.
 *   Existing customer — search the tenant's customers; links via linkedCustomers.
 *   From alerts       — every party on the case's linked alerts. Customers are
 *                       linked directly; external parties open the manual form
 *                       prefilled, so the analyst can add what the payment
 *                       message did not carry (DOB, ID, role…).
 *   Manual entry      — anyone else, with as much detail as is known.
 */
export default function AddPoiDialog({
  open,
  onOpenChange,
  caseId,
  onCaseChange,
  initialTab = "customer",
  // Values for the manual form when it is not reviewing an alert party
  // (e.g. a name carried over from the old hub's local POI list).
  manualInitial,
}) {
  const [tab, setTab] = useState(initialTab);
  const [query, setQuery] = useState("");
  const [customers, setCustomers] = useState([]);
  const [alertGroups, setAlertGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [busyKey, setBusyKey] = useState(null);
  // A picked alert party being reviewed in the form: { alertId, slot, party }.
  const [draftParty, setDraftParty] = useState(null);
  const searchSeq = useRef(0);

  // Load alert parties once per open; reset everything on close.
  useEffect(() => {
    if (!open) {
      setQuery("");
      setCustomers([]);
      setDraftParty(null);
      setBusyKey(null);
      return;
    }
    setTab(initialTab);
    let cancelled = false;
    setLoading(true);
    getPoiCandidates(caseId)
      .then((res) => {
        if (!cancelled && res?.succeed) setAlertGroups(res.data.alerts || []);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, caseId, initialTab]);

  // Debounced customer search, latest request wins.
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setCustomers([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const seq = ++searchSeq.current;
    const timer = setTimeout(async () => {
      try {
        const res = await getPoiCandidates(caseId, q);
        if (seq !== searchSeq.current) return;
        setCustomers(res?.succeed ? res.data.customers || [] : []);
      } catch {
        if (seq === searchSeq.current) setCustomers([]);
      } finally {
        if (seq === searchSeq.current) setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, open, caseId]);

  const linkCustomer = async (customerId, name) => {
    setBusyKey(`c:${customerId}`);
    try {
      const res = await linkCustomers(caseId, [customerId]);
      if (!res?.succeed) throw new Error(res?.message || "Could not link customer");
      onCaseChange?.(res.data, { refreshAnalysis: true });
      toast.success(`${name || "Customer"} added as a person of interest`);
      // Reflect it in the open lists without a reload.
      const mark = (list) => list.map((c) => (String(c.id) === String(customerId) ? { ...c, alreadyPoi: true } : c));
      setCustomers(mark);
      setAlertGroups((groups) =>
        groups.map((g) => ({
          ...g,
          parties: g.parties.map((p) =>
            p.customer && String(p.customer.id) === String(customerId) ? { ...p, alreadyPoi: true } : p
          ),
        }))
      );
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusyKey(null);
    }
  };

  const addExternal = async (payload) => {
    setBusyKey("form");
    try {
      const body = draftParty ? { ...payload, fromAlert: { alertId: draftParty.alertId, slot: draftParty.slot } } : payload;
      const res = await addCasePoi(caseId, body);
      if (!res?.succeed) throw new Error(res?.message || "Could not add person of interest");
      onCaseChange?.(res.data);
      toast.success(`${payload.name} added as a person of interest`);
      onOpenChange(false);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusyKey(null);
    }
  };

  const reviewParty = (group, party) => {
    setDraftParty({ alertId: group.alertId, alertUid: group.alertUid, slot: party.slot, party });
    setTab("manual");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add person of interest</DialogTitle>
          <DialogDescription>
            Link an existing customer, pick a party from this case&apos;s alerts, or record someone who is not a customer.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="customer">Existing customer</TabsTrigger>
            <TabsTrigger value="alerts">From alerts</TabsTrigger>
            <TabsTrigger value="manual">Manual entry</TabsTrigger>
          </TabsList>

          {/* ── Existing customer ─────────────────────────────────────── */}
          <TabsContent value="customer" className="mt-3">
            <div className="relative">
              <IconSearch className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, email or customer ID"
                className="pl-8"
              />
            </div>
            <div className="mt-3 flex min-h-[180px] flex-col gap-1.5">
              {searching && <Muted icon={IconLoader2} spin text="Searching…" />}
              {!searching && query.trim().length < 2 && <Muted text="Type at least two characters to search your customers." />}
              {!searching && query.trim().length >= 2 && customers.length === 0 && (
                <Muted text="No customers match. Use Manual entry for someone who is not a customer." />
              )}
              {!searching &&
                customers.map((c) => (
                  <Row
                    key={c.id}
                    title={c.name}
                    meta={[c.uid, c.type, c.country, c.email].filter(Boolean).join(" · ")}
                    extra={<ScreeningPills kycStatus={c.kycStatus} isPep={c.isPep} sanction={c.sanction} />}
                    done={c.alreadyPoi}
                    busy={busyKey === `c:${c.id}`}
                    actionLabel="Add"
                    onAction={() => linkCustomer(c.id, c.name)}
                  />
                ))}
            </div>
          </TabsContent>

          {/* ── From alerts ───────────────────────────────────────────── */}
          <TabsContent value="alerts" className="mt-3">
            <div className="flex min-h-[180px] flex-col gap-3">
              {loading && <Muted icon={IconLoader2} spin text="Loading alert parties…" />}
              {!loading && alertGroups.length === 0 && <Muted text="No alerts are linked to this case yet." />}
              {!loading &&
                alertGroups.map((g) => (
                  <div key={g.alertId} className="overflow-hidden rounded-lg border border-border">
                    <div className="flex flex-wrap items-center gap-2 border-b border-border bg-amber-50 px-3 py-2 text-xs">
                      <IconFlag className="size-3.5 text-amber-700" />
                      <span className="font-mono font-semibold text-amber-800">{g.alertUid || g.alertId}</span>
                      {g.rule && <span className="text-heading/80">{g.rule}</span>}
                      {g.transaction && (
                        <span className="ml-auto text-muted-foreground">
                          {g.transaction.uid ? `${g.transaction.uid} · ` : ""}
                          {g.transaction.amount != null ? formatAUD(g.transaction.amount, g.transaction.currency || "AUD") : ""}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col divide-y divide-border/70">
                      {g.parties.length === 0 && <p className="px-3 py-2.5 text-xs text-muted-foreground">No parties recorded.</p>}
                      {g.parties.map((p) => {
                        const isCustomer = !!p.customer;
                        return (
                          <Row
                            key={p.slot}
                            flush
                            badge={SLOT_LABELS[p.slot] || p.slot}
                            title={p.name || "Unnamed party"}
                            meta={
                              isCustomer
                                ? [p.customer.uid, "Customer"].filter(Boolean).join(" · ")
                                : [p.account, p.institution, p.institutionCountry].filter(Boolean).join(" · ") || "External party"
                            }
                            extra={
                              isCustomer ? (
                                <ScreeningPills kycStatus={p.customer.kycStatus} isPep={p.customer.isPep} sanction={p.customer.sanction} />
                              ) : null
                            }
                            done={p.alreadyPoi}
                            busy={busyKey === `c:${p.customer?.id}`}
                            actionLabel={isCustomer ? "Add" : "Review & add"}
                            onAction={() => (isCustomer ? linkCustomer(p.customer.id, p.name) : reviewParty(g, p))}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
            </div>
          </TabsContent>

          {/* ── Manual entry (also the review step for an alert party) ── */}
          <TabsContent value="manual" className="mt-3">
            {draftParty && (
              <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                <IconAlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                <div className="flex-1">
                  From alert <span className="font-mono font-semibold">{draftParty.alertUid || draftParty.alertId}</span> ·{" "}
                  {SLOT_LABELS[draftParty.slot]}. Account details come from the transaction and are locked; add anything else you know.
                </div>
                <button type="button" className="font-semibold underline" onClick={() => setDraftParty(null)}>
                  Clear
                </button>
              </div>
            )}
            <PoiForm
              // Remount when switching between a picked party and a blank form.
              key={draftParty ? `${draftParty.alertId}:${draftParty.slot}` : manualInitial?.name || "blank"}
              initial={
                draftParty
                  ? {
                      name: draftParty.party.name,
                      account: draftParty.party.account,
                      institution: draftParty.party.institution,
                      institutionCountry: draftParty.party.institutionCountry,
                      bic: draftParty.party.bic,
                      address: draftParty.party.address,
                      role: draftParty.slot === "beneficiary" ? "beneficiary" : "counterparty",
                    }
                  : manualInitial
              }
              lockedFields={draftParty ? ALERT_LOCKED_FIELDS : []}
              submitting={busyKey === "form"}
              onSubmit={addExternal}
              onCancel={() => onOpenChange(false)}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function Row({ title, meta, badge, extra, done, busy, actionLabel, onAction, flush }) {
  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 ${flush ? "" : "rounded-lg border border-border"}`}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {badge && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">{badge}</span>
          )}
          <span className="truncate text-sm font-semibold text-heading">{title}</span>
          {extra}
        </div>
        {meta && <div className="truncate text-xs text-muted-foreground">{meta}</div>}
      </div>
      {done ? (
        <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-success">
          <IconCheck className="size-3.5" /> On case
        </span>
      ) : (
        <Button size="sm" variant="outline" className="shrink-0" disabled={busy} onClick={onAction}>
          {busy ? <IconLoader2 className="size-3.5 animate-spin" /> : <IconUserPlus className="size-3.5" />}
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

function Muted({ icon: Icon, spin, text }) {
  return (
    <p className="flex items-center justify-center gap-1.5 py-8 text-center text-xs text-muted-foreground">
      {Icon && <Icon className={`size-3.5 ${spin ? "animate-spin" : ""}`} />}
      {text}
    </p>
  );
}
