"use client";

// Customer & CRA: identity, employment/funds, documents, screening, the CRA
// virtuals (riskScore / riskLabel / riskAssessment) and the relationship —
// all read from the populated customer on the alert.

import { useRouter } from "next/navigation";
import { IconArrowRight, IconBriefcase, IconFileText, IconLink, IconShieldCheck, IconUser } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/StatusPill";
import CollapsibleSection from "@/views/monitoring-and-cases/case-manager/details/components/CollapsibleSection";
import RiskScoreGauge from "@/views/monitoring-and-cases/case-manager/details/components/RiskScoreGauge";
import { KYC_STATUS, AML_STATUS, humanize } from "../alertAdapter";
import { Field, FieldGrid, EmptyState, SimpleTable, labelOf, variantOf } from "../components";

const fmtDay = (d) => (d ? new Date(d).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" }) : null);

export default function CustomerTab({ alert }) {
  const router = useRouter();
  const c = alert.customer;
  if (!c) return <EmptyState>This alert has no customer attached.</EmptyState>;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <div className="flex flex-col gap-4 xl:col-span-2">
        <CollapsibleSection
          id="identity"
          title="Identity & contact"
          icon={IconUser}
          actions={
            <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/client/onboarding/customer-queue/details?id=${c.id}`)}>
              Open customer <IconArrowRight className="size-4" />
            </Button>
          }
        >
          <FieldGrid cols={2}>
            <Field label="Full name" value={c.name} />
            <Field label="Date of birth" value={c.dob ? `${fmtDay(c.dob)}${c.age !== null ? ` (${c.age})` : ""}` : null} />
            <Field label="Country" value={c.country} />
            <Field label="Identification no." value={c.identificationNo} mono />
            <Field label="Email" value={c.email} />
            <Field label="Phone" value={c.phone} />
            <Field label="Residential address" value={c.residentialAddress} className="col-span-2" />
            <Field label="Mailing address" value={c.mailingAddress} className="col-span-2" />
          </FieldGrid>
        </CollapsibleSection>

        <CollapsibleSection id="employment" title="Employment & funds" icon={IconBriefcase}>
          <FieldGrid cols={2}>
            <Field label="Occupation" value={c.occupation} />
            <Field label="Industry" value={c.industry} />
            <Field label="Employer" value={c.employer} />
            <Field label="Sole trader" value={c.soleTrader || "No"} />
            <Field label="Source of funds" value={c.sourceOfFunds} />
            <Field label="Source of wealth" value={c.sourceOfWealth} />
            <Field label="Account purpose" value={c.accountPurpose} />
            <Field label="Est. trading volume" value={c.tradingVolume} />
          </FieldGrid>
        </CollapsibleSection>

        <CollapsibleSection id="documents" title="Documents" icon={IconFileText} badge={c.documents.length}>
          <SimpleTable
            emptyText="No documents uploaded for this customer."
            columns={[
              { key: "name", header: "Document", width: "1.6fr" },
              { key: "type", header: "Type", width: "1fr", render: (d) => humanize(d.type) },
              { key: "uploadedAt", header: "Uploaded", width: "1fr", render: (d) => fmtDay(d.uploadedAt) || "—" },
              { key: "url", header: "", width: "90px", render: (d) => d.url ? <a href={d.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">View</a> : "—" },
            ]}
            rows={c.documents}
            rowKey={(d, i) => `${d.name}-${i}`}
          />
        </CollapsibleSection>
      </div>

      <div className="flex flex-col gap-4">
        <CollapsibleSection id="screening" title="Screening" icon={IconShieldCheck}>
          <div className="flex flex-col gap-3">
            <FieldGrid cols={2}>
              <Field label="KYC" value={c.kycStatus ? <StatusPill variant={variantOf(KYC_STATUS, c.kycStatus, "muted")}>{labelOf(KYC_STATUS, c.kycStatus)}</StatusPill> : null} />
              <Field label="Verified on" value={fmtDay(c.kycVerifiedAt)} />
              <Field label="PEP" value={<StatusPill variant={c.isPep ? "danger" : "muted"}>{c.isPep ? "Yes" : "No"}</StatusPill>} />
              <Field label="Sanctions" value={<StatusPill variant={c.sanction ? "danger" : "muted"}>{c.sanction ? "Match" : "Clear"}</StatusPill>} />
              <Field label="AML status" value={c.amlStatus ? <StatusPill variant={variantOf(AML_STATUS, c.amlStatus, "muted")}>{labelOf(AML_STATUS, c.amlStatus)}</StatusPill> : null} />
              <Field label="Checked" value={[fmtDay(c.amlCheckedAt), c.amlVendor].filter(Boolean).join(" · ") || null} />
            </FieldGrid>
            {c.amlLabels.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-xs text-muted-foreground">AML labels</span>
                {c.amlLabels.map((l) => <StatusPill key={l} variant="danger">{l}</StatusPill>)}
              </div>
            )}
            {c.amlHits > 0 && <p className="text-xs text-muted-foreground">{c.amlHits} AML match{c.amlHits > 1 ? "es" : ""} on record.</p>}
            {c.kycRejectReason && <p className="text-xs text-danger">KYC rejected: {c.kycRejectReason}</p>}
          </div>
        </CollapsibleSection>

        <CollapsibleSection id="cra" title="Customer risk assessment" icon={IconShieldCheck}>
          {c.riskScore === null && c.riskFactors.length === 0 ? (
            <EmptyState>No risk assessment has been computed for this customer.</EmptyState>
          ) : (
            <div className="flex flex-col gap-3.5">
              <div className="flex items-center justify-between">
                <RiskScoreGauge score={c.riskScore ?? 0} label={`Overall · ${c.riskLabel || "—"}`} />
                <span className="text-xs text-muted-foreground">Factor scores from the CRA configuration</span>
              </div>
              {c.riskFactors.length > 0 && (
                <div className="flex flex-col gap-2.5">
                  {[...c.riskFactors].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).map((f) => (
                    <div key={f.key} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-foreground">{f.label}{f.value ? <span className="text-muted-foreground"> · {f.value}</span> : null}</span>
                        <span className="font-semibold text-heading">{f.score ?? "—"}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-1.5 rounded-full ${(f.score ?? 0) >= 80 ? "bg-danger" : (f.score ?? 0) >= 50 ? "bg-warning" : "bg-success"}`}
                          style={{ width: `${Math.max(0, Math.min(100, f.score ?? 0))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CollapsibleSection>

        <CollapsibleSection id="relationship" title="Relationship" icon={IconLink}>
          <FieldGrid cols={2}>
            <Field label="Customer since" value={fmtDay(c.since)} />
            <Field label="Relationship type" value={humanize(c.relation?.type)} />
            <Field label="Onboarding channel" value={humanize(c.relation?.channel)} />
            <Field label="Status" value={c.status || c.isActive !== null ? <StatusPill variant={c.status === "Offboarded" ? "muted" : c.isActive === false ? "warning" : "success"}>{c.status || (c.isActive ? "Active" : "Inactive")}</StatusPill> : null} />
          </FieldGrid>
        </CollapsibleSection>
      </div>
    </div>
  );
}
