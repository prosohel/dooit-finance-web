"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { IconX } from "@tabler/icons-react";
import OptionRow from "../../shared/OptionRow";
import { SMR_SERVICE_OPTIONS, SMR_REASON_OPTIONS } from "../../data/investigationHubData";
import { FieldLabel, Fact, ApiOwnedNote } from "./SmrBits";

// Labels for the model's `partA.serviceStatus` enum.
const SERVICE_STATUS_OPTIONS = [
  { value: "provided", label: "Provided" },
  { value: "requested", label: "Requested" },
  { value: "enquired", label: "Enquired about" },
];

export default function SmrPartA({ draft }) {
  const { report, values, change, toggleInList } = draft;
  const [reasonDraft, setReasonDraft] = useState("");

  const services = values["partA.designatedServices"] || [];
  const reasons = values["partA.suspicionReasons"] || [];
  const otherReasons = values["partA.otherReasons"] || [];
  const serviceStatus = values["partA.serviceStatus"] || "";
  const indicators = report?.partA?.suspiciousIndicators;

  // The facts' reason mapping (alert risk flags → AUSTRAC reasons) can name a
  // reason outside the catalogue — show it so it can be deselected.
  const reasonOptions = [...SMR_REASON_OPTIONS, ...reasons.filter((r) => !SMR_REASON_OPTIONS.includes(r))];

  const addOtherReason = () => {
    const v = reasonDraft.trim();
    if (!v || otherReasons.includes(v)) return;
    change("partA.otherReasons", [...otherReasons, v]);
    setReasonDraft("");
  };

  return (
    <div>
      <div className="mb-5 grid gap-4 sm:grid-cols-2">
        <Fact label="Alert / case number" value={report?.caseNumber} />
        <Fact label="Reporting entity" value={report?.partH?.reportingEntity?.name} />
      </div>

      <div className="mb-3">
        <FieldLabel
          label="1. Designated service(s) to which the suspicious matter relates"
          path="partA.designatedServices"
          draft={draft}
        />
      </div>
      <div className="mb-5 grid gap-x-5 gap-y-2 rounded-xl border border-border p-4 sm:grid-cols-2">
        {SMR_SERVICE_OPTIONS.map((o) => (
          <OptionRow
            key={o}
            label={o}
            selected={services.includes(o)}
            multi
            dense
            onClick={() => toggleInList("partA.designatedServices", o)}
          />
        ))}
      </div>

      <div className="mb-2.5">
        <FieldLabel label="Was the designated service(s):" path="partA.serviceStatus" draft={draft} />
      </div>
      <div className="mb-5 flex gap-2.5">
        {SERVICE_STATUS_OPTIONS.map((o) => (
          <OptionRow
            key={o.value}
            label={o.label}
            selected={serviceStatus === o.value}
            onClick={() => change("partA.serviceStatus", o.value)}
          />
        ))}
      </div>

      <div className="mb-3">
        <FieldLabel label="2. Reason(s) for the suspicion" path="partA.suspicionReasons" draft={draft} />
      </div>
      <div className="grid gap-x-5 gap-y-2 rounded-xl border border-border p-4 sm:grid-cols-2">
        {reasonOptions.map((o) => (
          <OptionRow
            key={o}
            label={o}
            selected={reasons.includes(o)}
            multi
            dense
            onClick={() => toggleInList("partA.suspicionReasons", o)}
          />
        ))}
      </div>

      <div className="mb-2 mt-4">
        <FieldLabel label="Other, please specify:" path="partA.otherReasons" draft={draft} htmlFor="smr-other-reason" />
      </div>
      {otherReasons.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {otherReasons.map((r) => (
            <span
              key={r}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
            >
              {r}
              <button
                type="button"
                aria-label={`Remove ${r}`}
                onClick={() => change("partA.otherReasons", otherReasons.filter((x) => x !== r))}
              >
                <IconX className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="mb-5 flex gap-2.5">
        <Input
          id="smr-other-reason"
          value={reasonDraft}
          onChange={(e) => setReasonDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addOtherReason()}
          placeholder="Add another reason for suspicion…"
          className="flex-1 text-sm"
        />
        <Button variant="outline" onClick={addOtherReason} className="shrink-0">
          + Add
        </Button>
      </div>

      {indicators && (
        <div className="rounded-xl border border-border p-4">
          <div className="mb-3 text-[13px] font-bold text-heading">Suspicious indicators (from the case analysis)</div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Fact label="PEP" value={indicators.pep ? "Yes" : "No"} />
            <Fact label="Sanctions" value={indicators.sanctions ? "Yes" : "No"} />
            <Fact label="Adverse media" value={indicators.adverseMedia ? "Yes" : "No"} />
            <Fact label="Structuring candidates" value={String(indicators.structuringCandidates ?? 0)} />
            <Fact label="Related-party txns" value={String(indicators.relatedPartyTransactions ?? 0)} />
            <Fact label="High-risk jurisdictions" value={(indicators.highRiskJurisdictions || []).join(", ")} />
          </div>
          {(indicators.rulesTriggered || []).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {indicators.rulesTriggered.map((r) => (
                <span key={r} className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-heading">
                  {r}
                </span>
              ))}
            </div>
          )}
          <div className="mt-3">
            <ApiOwnedNote>
              Computed from the case&apos;s alerts and transactions — &ldquo;Refresh from case&rdquo; updates it.
            </ApiOwnedNote>
          </div>
        </div>
      )}
    </div>
  );
}
