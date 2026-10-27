"use client";

// Customer profile — who this person is, their screening posture, and the
// declared financial profile the case's activity is read against.
//
// Every row here is backed by a field GET /cases/:id actually returns
// (see caseAdapter.adaptCustomer). Encrypted KYC contact fields never render:
// a lean read returns ciphertext, so email comes from the linked user record
// and phone is not shown at all.

import CollapsibleSection from "../components/CollapsibleSection";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusPill } from "@/components/ui/StatusPill";
import {
  IconUser,
  IconMail,
  IconBuildingStore,
  IconScale,
  IconActivity,
} from "@tabler/icons-react";
import { cn, dateShowFormat, formatAUD, getInitials } from "@/lib/utils";

/** Label/value row that renders nothing when the field has no data. */
function Row({ label, value }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex items-start justify-between gap-3 border-b py-2 last:border-0">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium text-heading">{value}</span>
    </div>
  );
}

function ColumnHeading({ children }) {
  return <p className="mb-1 text-xs font-semibold text-heading">{children}</p>;
}

// ── Screening strip ──────────────────────────────────────────────────────────
// Clean results are stated, not hidden: "No match" on sanctions is a finding
// the analyst needs to see, the same as a hit.

const KYC_VARIANTS = {
  Verified: "success",
  Pending: "warning",
  "Pending Review": "warning",
  Rejected: "danger",
};

const RISK_VARIANTS = { Critical: "danger", High: "danger", Medium: "warning", Low: "success" };

function ScreeningTile({ label, value, variant }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border px-3 py-2.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <StatusPill variant={variant}>{value || "Not screened"}</StatusPill>
    </div>
  );
}

function ScreeningStrip({ caseData }) {
  const tiles = [
    {
      label: "KYC",
      value: caseData.kycStatus,
      variant: KYC_VARIANTS[caseData.kycStatus] || "muted",
    },
    {
      label: "PEP screening",
      value: caseData.pepStatus,
      variant: caseData.pepStatus === "PEP" ? "warning" : caseData.pepStatus ? "success" : "muted",
    },
    {
      label: "Sanctions",
      value: caseData.sanctionsStatus,
      variant:
        caseData.sanctionsStatus === "Confirmed Match"
          ? "danger"
          : caseData.sanctionsStatus
            ? "success"
            : "muted",
    },
    {
      label: "Risk rating",
      value: caseData.riskTag,
      variant: RISK_VARIANTS[caseData.riskTag] || "muted",
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {tiles.map((t) => (
        <ScreeningTile key={t.label} {...t} />
      ))}
    </div>
  );
}

// ── Declared profile vs observed activity ────────────────────────────────────

function DeclaredProfilePanel({ declared }) {
  const hasAny =
    declared &&
    (declared.sourceOfFunds ||
      declared.sourceOfWealth ||
      declared.accountPurpose ||
      declared.estimatedTradingVolume);
  return (
    <div className="rounded-lg border border-border p-4">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-heading">
        <IconScale className="size-3.5" />
        Declared at onboarding
      </p>
      {!hasAny ? (
        <p className="text-sm text-muted-foreground">
          No financial profile was declared at onboarding.
        </p>
      ) : (
        <div>
          <Row label="Source of funds" value={declared.sourceOfFunds} />
          <Row label="Source of wealth" value={declared.sourceOfWealth} />
          <Row label="Account purpose" value={declared.accountPurpose} />
          <Row label="Expected volume" value={declared.estimatedTradingVolume} />
        </div>
      )}
    </div>
  );
}

function ActivityStat({ label, value, colorClass }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={cn("text-lg font-bold", colorClass)}>{value}</p>
    </div>
  );
}

function CaseActivityPanel({ caseData }) {
  const transactions = caseData.transactions || [];
  const flaggedCount = transactions.filter((t) => t.status === "flagged").length;
  return (
    <div className="rounded-lg border border-border p-4">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-heading">
        <IconActivity className="size-3.5" />
        Observed on this case
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <ActivityStat
          label="Net activity"
          value={formatAUD(caseData.totalExposure || 0)}
          colorClass="text-primary"
        />
        <ActivityStat
          label="Flagged transactions"
          value={`${flaggedCount} of ${transactions.length}`}
          colorClass={flaggedCount > 0 ? "text-danger" : "text-heading"}
        />
        <ActivityStat label="Linked alerts" value={caseData.relatedAlertsCount ?? 0} colorClass="text-warning" />
        <ActivityStat
          label="Related cases"
          value={caseData.previousInvestigationsCount ?? 0}
          colorClass="text-heading"
        />
      </div>
      {caseData.detectionRule && (
        <p className="mt-3 border-t pt-2 text-xs text-muted-foreground">{caseData.detectionRule}</p>
      )}
    </div>
  );
}

// ── Section ──────────────────────────────────────────────────────────────────

export default function CustomerProfileSection({ caseData, sectionRef, collapsible = true }) {
  const c = caseData?.customer;
  if (!c) return null;

  const dob = c.dateOfBirth
    ? `${dateShowFormat(c.dateOfBirth)}${c.age ? ` · ${c.age} years` : ""}`
    : null;

  return (
    <CollapsibleSection
      id="customer-profile"
      title="Customer Profile"
      icon={IconUser}
      sectionRef={sectionRef}
      collapsible={collapsible}
    >
      {/* Identity band */}
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="size-14">
            <AvatarFallback className="bg-primary/10 text-base font-semibold text-primary">
              {getInitials(c.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-base font-semibold text-heading">{c.name}</p>
            <p className="text-xs text-muted-foreground">
              {[caseData.uid, caseData.customerType].filter(Boolean).join(" · ")}
            </p>
            {c.email && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <IconMail className="size-3" />
                {c.email}
              </p>
            )}
          </div>
        </div>
        <ScreeningStrip caseData={caseData} />
      </div>

      {/* Declared profile against what the case actually saw */}
      <div className="mb-5 grid gap-3 md:grid-cols-2">
        <DeclaredProfilePanel declared={c.declaredProfile} />
        <CaseActivityPanel caseData={caseData} />
      </div>

      {/* Detail columns */}
      <div className="grid gap-x-6 gap-y-4 md:grid-cols-3">
        <div>
          <ColumnHeading>Identity</ColumnHeading>
          <Row label="Date of birth" value={dob} />
          <Row label="Other names" value={c.otherNames} />
          <Row label="Nationality" value={c.nationality} />
          <Row label="Residential address" value={c.address} />
          <Row label="Mailing address" value={c.mailingAddress} />
        </div>
        <div>
          <ColumnHeading>Employment</ColumnHeading>
          <Row label="Occupation" value={c.occupation} />
          <Row label="Industry" value={c.industry} />
          <Row label="Employer" value={c.employerName} />
          {!c.occupation && !c.industry && !c.employerName && (
            <p className="text-sm text-muted-foreground">No employment details on file.</p>
          )}
        </div>
        <div>
          <ColumnHeading>Relationship</ColumnHeading>
          <Row
            label="Customer since"
            value={c.accountOpeningDate ? dateShowFormat(c.accountOpeningDate) : null}
          />
          <Row label="Onboarding channel" value={c.onboardingChannel} />
          <Row label="Customer type" value={caseData.customerType} />
        </div>
      </div>

      {/* Sole-trader business, only when declared */}
      {c.soleTrader && (
        <div className="mt-5 rounded-lg border border-border p-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-heading">
            <IconBuildingStore className="size-3.5" />
            Trades as sole trader
          </p>
          <div className="grid gap-x-6 md:grid-cols-3">
            <Row label="Business name" value={c.soleTrader.businessName} />
            <Row label="ABN" value={c.soleTrader.abn} />
            <Row label="Business address" value={c.soleTrader.address} />
          </div>
        </div>
      )}
    </CollapsibleSection>
  );
}
