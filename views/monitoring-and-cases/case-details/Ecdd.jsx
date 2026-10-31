"use client";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import useAlertStore from "@/app/store/alerts";
import { getEcddByCaseNumber, getEcddById } from "@/app/dashboard/client/report-compliance/ecdd/actions";

import UILoader from "@/components/UILoader";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadReportPdf } from "@/lib/downloadReportPdf";
import useBreadcrumbLabel from "@/hooks/useBreadcrumbLabel";

/* ────────────────────────────────────────────────────────────────────────────
 * Design primitives
 *
 * The ECDD screen is a filing, not a dashboard: dense key/value blocks and long
 * analyst prose. The shared Card/Badge components are tuned for looser dashboard
 * cards, so the shapes this screen repeats are defined here instead — one place
 * to change, and the section rhythm stays identical down the page.
 *
 * Colours come from the app theme where it defines them (primary #005964,
 * accent #00d87e, success #199335). The neutral tints below have no token yet
 * and are the only literals.
 * ──────────────────────────────────────────────────────────────────────────── */

const TONES = {
  neutral: "bg-[#f0f4f4] text-primary border-[#dfe7e7]",
  danger: "bg-[#fdf1f7] text-[#ca2f7f] border-[#f6dbe8]",
  warning: "bg-[#fff6de] text-[#8a6400] border-[#f6e0a8]",
  success: "bg-[#f0fbf5] text-success border-[#cceedd]",
  plain: "bg-white text-[#4a4a4d] border-[#e0e5e5]",
};

/** Small pill. `mono` for identifiers, plain for status words. */
const Chip = ({ tone = "neutral", mono = false, className, children }) => (
  <span
    className={cn(
      "inline-flex items-center rounded-md border px-2.5 py-1 text-[11px] font-medium whitespace-nowrap",
      mono && "font-mono",
      TONES[tone] || TONES.neutral,
      className,
    )}
  >
    {children}
  </span>
);

/** Uppercase status pill closing a status row. */
const StatusPill = ({ tone = "success", children }) => (
  <span
    className={cn(
      "shrink-0 rounded-full border px-2.5 py-[3px] text-[11px] font-semibold",
      TONES[tone] || TONES.success,
    )}
  >
    {children}
  </span>
);

/**
 * Section card. The leading dot is the only colour signal in the header —
 * `accent` for factual blocks, `danger` for anything the analyst must act on.
 */
const Section = ({ title, tone = "accent", right, className, children }) => (
  <section
    className={cn("rounded-[10px] border border-[#e8ebeb] bg-white px-[18px] py-4", className)}
  >
    <header className="mb-3.5 flex items-center gap-2 border-b border-[#f0f2f2] pb-3">
      <span
        className={cn(
          "inline-block size-1.5 rounded-full",
          tone === "danger" ? "bg-[#ca2f7f]" : tone === "warning" ? "bg-[#8a6400]" : "bg-accent",
        )}
      />
      <h2 className="m-0 text-xs font-semibold tracking-[0.07em] text-[#313132] uppercase">
        {title}
      </h2>
      {right ? <div className="ml-auto flex items-center gap-2">{right}</div> : null}
    </header>
    {children}
  </section>
);

/** Label above value. `span` runs a field the full width of the grid. */
const Field = ({ label, children, mono = false, span = false }) => (
  <div className={cn(span && "col-span-full")}>
    <div className="mb-1 text-[10.5px] tracking-[0.06em] text-[#ababab] uppercase">{label}</div>
    <div
      className={cn(
        "text-[12.5px] leading-snug text-[#313132]",
        mono && "font-mono text-[11.5px] break-all",
      )}
    >
      {children ?? <span className="text-[#ababab]">Not stated</span>}
    </div>
  </div>
);

const Grid = ({ className, children }) => (
  <div className={cn("grid gap-x-[18px] gap-y-3.5 sm:grid-cols-2", className)}>{children}</div>
);

/** Headline number tile in the row under the page header. */
const StatTile = ({ label, value, sub, accent = false }) => (
  <div className="rounded-[10px] border border-[#e8ebeb] bg-white px-4 py-3.5">
    <div className="mb-[7px] text-[10.5px] tracking-[0.07em] text-[#ababab] uppercase">{label}</div>
    <div className={cn("text-[15px] font-semibold", accent ? "text-primary" : "text-[#313132]")}>
      {value}
    </div>
    {sub ? <div className="mt-[3px] text-[11.5px] text-[#696969]">{sub}</div> : null}
  </div>
);

/** One line of the compliance panel: what was checked, and the outcome. */
const StatusRow = ({ title, sub, pill, tone = "success" }) => (
  <div
    className={cn(
      "flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5",
      tone === "danger" ? "border-[#f6dbe8] bg-[#fdf8fa]" : "border-[#eef1f1] bg-[#fcfdfd]",
    )}
  >
    <div className="min-w-0">
      <div className="text-[12.5px] font-medium text-[#313132]">{title}</div>
      {sub ? <div className="truncate text-[11px] text-[#ababab]">{sub}</div> : null}
    </div>
    <StatusPill tone={tone}>{pill}</StatusPill>
  </div>
);

/**
 * Analyst prose. Long-form, so it gets its own measure and leading.
 *
 * The generated narratives are markdown — names and figures are emphasised as
 * **…**. Rendered verbatim they show literal asterisks, so the emphasis is
 * promoted to real bold. Split into React nodes rather than injecting HTML:
 * the text is model-generated and must never be able to carry markup.
 */
const emphasise = (text) =>
  String(text)
    .split(/\*\*(.+?)\*\*/g)
    .map((part, i) =>
      i % 2 === 1 ? (
        <strong key={i} className="font-semibold text-[#313132]">
          {part}
        </strong>
      ) : (
        part
      ),
    );

const Narrative = ({ children }) =>
  children ? (
    <p className="m-0 text-[12.5px] leading-[1.62] whitespace-pre-line text-[#4a4a4d]">
      {emphasise(children)}
    </p>
  ) : (
    <p className="m-0 text-[12.5px] text-[#ababab] italic">Not generated for this report.</p>
  );

const STATUS_TONE = {
  Pending: "warning",
  Active: "success",
  Inactive: "plain",
  Blocked: "danger",
};

/* ────────────────────────────────────────────────────────────────────────── */

// Rendered two ways: as the alert's "ECDD Review" tab (report looked up by the
// alert uid from the store), or standalone at /report-compliance/ecdd/[id]
// where `ecddId` names the report directly.
const Ecdd = ({ ecddId } = {}) => {
  const [caseData, setCaseData] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [exporting, setExporting] = useState(false);
  const { details } = useAlertStore();
  const router = useRouter();

  const lookupKey = ecddId || details?.uid;

  useEffect(() => {
    if (!lookupKey) return;

    let cancelled = false;
    const fetchEcddData = async () => {
      setFetching(true);
      try {
        const response = ecddId
          ? await getEcddById(ecddId)
          : await getEcddByCaseNumber(details.uid);
        if (cancelled) return;
        if (response?.data) setCaseData(response.data);
        else toast.error("No data found");
      } catch (error) {
        if (!cancelled) console.error("Failed to get data", error);
      } finally {
        if (!cancelled) setFetching(false);
      }
    };

    fetchEcddData();
    return () => {
      cancelled = true;
    };
  }, [lookupKey]);

  const handleGenerateEcdd = () => {
    if (ecddId) {
      router.push("/dashboard/client/report-compliance/ecdd/form");
      return;
    }
    router.push(`/dashboard/client/report-compliance/ecdd/form?caseNumber=${details?.uid}`);
  };

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      await downloadReportPdf({ kind: "ecdd", id: caseData?._id, label: caseData?.uid });
    } finally {
      setExporting(false);
    }
  };

  /* ── formatters ──────────────────────────────────────────────────────────
   * Every value here is read by a compliance officer, so a missing field
   * renders as an explicit dash rather than "$NaN" or "Invalid Date". */
  const money = (amount) =>
    Number.isFinite(Number(amount))
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        }).format(Number(amount))
      : "—";

  // Crypto is a quantity, not a currency — 4.25 ETH is not $4.25.
  const qty = (amount, ticker) =>
    Number.isFinite(Number(amount)) ? `${Number(amount).toLocaleString()} ${ticker}` : "—";

  const formatDate = (value) => {
    if (!value) return "—";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? "—"
      : parsed.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  // The report's own columns are authoritative; the AI bundle on metadata fills
  // the gaps the EcddReport model has no column for.
  const ai = useMemo(() => caseData?.metadata?.ecddReport || {}, [caseData]);
  const txn = useMemo(() => caseData?.transaction || {}, [caseData]);

  // Only the standalone page names its crumb; as an alert tab the alert owns it.
  useBreadcrumbLabel(ecddId && caseData?.uid && `ECDD #${caseData.uid}`);

  const isPep = String(caseData?.isPEP || "No") === "Yes";
  const isSanctioned = String(caseData?.isSanctioned || "No") === "Yes";

  if (!fetching && !caseData) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[10px] border border-[#e8ebeb] bg-white px-[18px] py-6">
        <div>
          <h4 className="text-lg font-semibold text-[#313132]">No ECDD report for this case</h4>
          <p className="mt-1 text-[12.5px] text-[#696969]">
            {ecddId
              ? "This ECDD report could not be found. It may have been deleted."
              : `Nothing has been filed against ${details?.uid || "this alert"} yet.`}
          </p>
        </div>
        <Button onClick={handleGenerateEcdd}>Generate ECDD</Button>
      </div>
    );
  }

  return (
    <UILoader loading={fetching} type="page">
      <div className="mx-auto max-w-[1240px] pb-6">
        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="mb-[22px] flex flex-wrap items-start gap-5">
          <div className="min-w-[320px] flex-1">
            <div className="flex items-center gap-2.5">
              <span className="inline-block size-[22px] rounded-md border border-primary/20 bg-accent/15" />
              <h1 className="m-0 text-[21px] font-semibold tracking-[-0.02em] text-[#313132]">
                ECDD Review
              </h1>
              <Chip tone={STATUS_TONE[caseData?.status] || "warning"}>
                {caseData?.status || "Pending"}
              </Chip>
            </div>
            <p className="mt-2 ml-8 max-w-[62ch] text-[12.5px] text-[#696969]">
              Enhanced customer due diligence report generated from platform data for the period{" "}
              {formatDate(caseData?.accountCreationDate)} to {formatDate(caseData?.analysisEndDate)}.
              Figures have not been independently verified against external records.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2.5">
            <div className="flex flex-wrap items-center justify-end gap-2">
              {caseData?.caseNumber ? <Chip mono>{caseData.caseNumber}</Chip> : null}
              {Number.isFinite(Number(txn?.riskScore)) ? (
                <Chip mono tone={Number(txn.riskScore) >= 60 ? "danger" : "neutral"}>
                  RISK {txn.riskScore}
                </Chip>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => toast.success("Review approved")}
                className="rounded-lg border border-primary bg-primary px-3.5 py-[7px] text-xs font-medium text-white transition-colors hover:border-primary-light hover:bg-primary-light"
              >
                Approve review
              </button>
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={exporting}
                className="rounded-lg border border-[#e0e5e5] bg-white px-3.5 py-[7px] text-xs font-medium text-[#313132] transition-colors hover:bg-[#f5f7f7] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {exporting ? "Preparing PDF…" : "Export PDF"}
              </button>
            </div>
          </div>
        </div>

        {/* ── Stat row ──────────────────────────────────────────────────── */}
        <div className="mb-3.5 grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
          <StatTile
            accent
            label="Analyst"
            value={caseData?.analystName || "—"}
            sub={caseData?.position || "Compliance Officer"}
          />
          <StatTile
            label="Analysis date"
            value={formatDate(caseData?.date)}
            sub={`Review window from ${formatDate(caseData?.accountCreationDate)}`}
          />
          <StatTile
            label="Expected volume"
            value={money(caseData?.expectedVolume)}
            sub={ai?.Expected_Trading_Volume ? `Declared band: ${ai.Expected_Trading_Volume}` : null}
          />
          <StatTile
            label="Annual income"
            value={money(caseData?.annualIncome)}
            sub={caseData?.accountPurpose ? `Purpose: ${caseData.accountPurpose}` : null}
          />
        </div>

        {/* ── Body ──────────────────────────────────────────────────────── */}
        <div className="grid items-start gap-3.5 lg:grid-cols-2">
          {/* Left column */}
          <div className="flex flex-col gap-3.5">
            <Section title="Customer information">
              <Grid>
                <Field label="Full name">{caseData?.fullName || caseData?.customerName}</Field>
                {/* customerName is a separate stored column; only show it when
                    it actually differs from fullName, rather than repeating. */}
                {caseData?.customerName && caseData.customerName !== caseData.fullName ? (
                  <Field label="Customer name on record">{caseData.customerName}</Field>
                ) : null}
                <Field label="Account purpose">{caseData?.accountPurpose}</Field>
                <Field label="Onboarding date">{formatDate(caseData?.onboardingDate)}</Field>
                <Field label="Account created">{formatDate(caseData?.accountCreationDate)}</Field>
                <Field label="Registered address" span>
                  {caseData?.registeredAddress}
                </Field>
                <Field label="Contact">{ai?.email}</Field>
                <Field label="IP locations">
                  {caseData?.ipLocations != null ? `${caseData.ipLocations} distinct` : null}
                </Field>
              </Grid>
            </Section>

            <Section title="Business information">
              <Grid>
                <Field label="Beneficial owner">{caseData?.beneficialOwner}</Field>
                <Field label="Directors">{caseData?.directors}</Field>
                <Field label="Company name">{ai?.company_name}</Field>
                <Field label="ABN">{caseData?.abn}</Field>
                <Field label="Related party" span>
                  {caseData?.relatedParty}
                </Field>
              </Grid>
            </Section>

            <Section title="Profile summary">
              <Narrative>{caseData?.profileSummary || ai?.profile_summary}</Narrative>
            </Section>

            <Section title="Behavioural analysis">
              <Narrative>{caseData?.behavioralAnalysis || ai?.behavioral_analysis}</Narrative>
            </Section>

            <Section title="Compliance status" tone={isPep || isSanctioned ? "danger" : "accent"}>
              <div className="flex flex-col gap-2.5">
                <StatusRow
                  title="Politically exposed person"
                  sub={isPep ? "Match recorded — EDD required" : "No match recorded"}
                  pill={isPep ? "Yes" : "No"}
                  tone={isPep ? "danger" : "success"}
                />
                <StatusRow
                  title="Sanctions screening"
                  sub="Powered by ComplyAdvantage CSOM"
                  pill={isSanctioned ? "Yes" : "No"}
                  tone={isSanctioned ? "danger" : "success"}
                />
                {txn?.forensic?.walletCluster ? (
                  <StatusRow
                    title="Forensic wallet screening"
                    sub={`${txn.forensic.walletCluster}${
                      txn.forensic.notes ? ` · ${txn.forensic.notes}` : ""
                    }`}
                    pill={
                      Number.isFinite(Number(txn.forensic.chainalysisScore))
                        ? `Score ${txn.forensic.chainalysisScore}`
                        : "Reviewed"
                    }
                    tone={Number(txn.forensic.chainalysisScore) >= 60 ? "danger" : "success"}
                  />
                ) : null}
              </div>
              <div className="mt-3 text-[11.5px] text-[#696969]">
                Analysis period: {formatDate(caseData?.accountCreationDate)} to{" "}
                {formatDate(caseData?.analysisEndDate)}
              </div>
            </Section>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-3.5">
            {txn?.uid ? (
              <>
                <Section
                  title="Transaction information"
                  right={
                    txn?.status ? (
                      <Chip tone={txn.status === "completed" ? "success" : "warning"}>
                        {String(txn.status).toUpperCase()}
                      </Chip>
                    ) : null
                  }
                >
                  <Grid>
                    <Field label="Amount">
                      <span className="text-base font-semibold">
                        {txn.currency} {Number(txn.amount || 0).toLocaleString()}
                      </span>
                    </Field>
                    <Field label="Type">
                      {[txn.type, txn.subtype].filter(Boolean).join(" · ")}
                    </Field>
                    <Field label="Reference" mono>
                      {txn.reference}
                    </Field>
                    <Field label="Transaction date">{formatDate(txn.timestamp)}</Field>
                    <Field label="Purpose">{txn.purpose}</Field>
                    <Field label="Channel">{txn.channel}</Field>
                    {txn.riskFlags?.length ? (
                      <Field label="Risk flags" span>
                        <div className="flex flex-wrap gap-1.5">
                          {txn.riskFlags.map((flagLabel) => (
                            <Chip key={flagLabel} tone="danger">
                              {flagLabel}
                            </Chip>
                          ))}
                        </div>
                      </Field>
                    ) : null}
                    <Field label="Narrative" span>
                      {txn.narrative}
                    </Field>
                  </Grid>

                  {txn.crypto?.walletAddress || txn.travelRule?.originatorVaspName ? (
                    <div className="mt-3.5 border-t border-[#f0f2f2] pt-3.5">
                      <Grid>
                        <Field label="Network">{txn.crypto?.network}</Field>
                        <Field label="Protocol">{txn.travelRule?.protocol}</Field>
                        <Field label="Wallet" mono span>
                          {txn.crypto?.walletAddress}
                        </Field>
                        <Field label="Originator VASP">
                          {txn.travelRule?.originatorVaspName}
                        </Field>
                        <Field label="Beneficiary VASP">
                          {txn.travelRule?.beneficiaryVaspName}
                        </Field>
                      </Grid>
                    </div>
                  ) : null}
                </Section>

                <Section title="Parties">
                  <div className="flex flex-col gap-2.5">
                    {[
                      ["Sender", txn.sender],
                      ["Receiver", txn.receiver],
                      ["Beneficiary", txn.beneficiary],
                      ["Intermediary", txn.intermediary],
                    ]
                      .filter(([, party]) => party?.name)
                      .map(([role, party]) => (
                        <div
                          key={role}
                          className="rounded-lg border border-[#eef1f1] bg-[#fcfdfd] px-3 py-2.5"
                        >
                          <div className="mb-1 text-[10.5px] tracking-[0.06em] text-[#ababab] uppercase">
                            {role}
                          </div>
                          <div className="text-[12.5px] font-medium text-[#313132]">
                            {party.name}
                          </div>
                          <div className="mt-0.5 text-[11px] text-[#696969]">
                            {[party.institution, party.institutionCountry]
                              .filter(Boolean)
                              .join(" · ")}
                          </div>
                          {party.account ? (
                            <div className="mt-1 font-mono text-[11px] break-all text-[#696969]">
                              {party.account}
                            </div>
                          ) : null}
                        </div>
                      ))}
                  </div>
                </Section>
              </>
            ) : null}

            <Section title="Financial activity">
              <div className="mb-3.5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[12.5px] text-[#696969]">Total deposits (AUD)</span>
                  <span className="text-base font-semibold text-[#313132]">
                    {money(caseData?.totalDepositsAUD)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[#f0f2f2]">
                  <div className="h-full w-4/5 rounded-full bg-accent" />
                </div>
              </div>

              <div className="border-t border-[#f0f2f2] pt-3.5">
                <p className="mb-2.5 text-[10.5px] tracking-[0.06em] text-[#ababab] uppercase">
                  Withdrawals by currency
                </p>
                <div className="flex flex-col gap-2">
                  {[
                    ["USDT", caseData?.totalWithdrawalsUSDT],
                    ["ETH", caseData?.totalWithdrawalsETH],
                    ["BTC", caseData?.totalWithdrawalsBTC],
                  ].map(([ticker, amount]) => (
                    <div key={ticker} className="flex items-center justify-between">
                      <span className="text-[12.5px] text-[#696969]">{ticker}</span>
                      <span className="text-[12.5px] font-medium text-[#313132]">
                        {qty(amount, ticker)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {caseData?.depositDetails || caseData?.withdrawalDetails ? (
                <div className="mt-3.5 flex flex-col gap-3 border-t border-[#f0f2f2] pt-3.5">
                  {caseData?.depositDetails ? (
                    <Field label="Deposit details" span>
                      <span className="whitespace-pre-line">{caseData.depositDetails}</span>
                    </Field>
                  ) : null}
                  {caseData?.withdrawalDetails ? (
                    <Field label="Withdrawal details" span>
                      <span className="whitespace-pre-line">{caseData.withdrawalDetails}</span>
                    </Field>
                  ) : null}
                </div>
              ) : null}
            </Section>

            <Section title="Transaction analysis">
              <Narrative>{caseData?.transactionAnalysis || ai?.transaction_analysis}</Narrative>
            </Section>
          </div>
        </div>

        <Section
          className="mt-3.5"
          title="Recommendation"
          tone="danger"
          right={ai?.recommendation_type ? <Chip tone="danger">{ai.recommendation_type}</Chip> : null}
        >
          <Narrative>{caseData?.recommendation || ai?.recommendation}</Narrative>
          {caseData?.additionalInfo ? (
            <div className="mt-3 border-t border-[#f0f2f2] pt-3">
              <Narrative>{caseData.additionalInfo}</Narrative>
            </div>
          ) : null}
        </Section>

        <Section className="mt-3.5" title="Reference information">
          <div className="grid gap-x-[18px] gap-y-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Report UID" mono>
              {caseData?.uid}
            </Field>
            <Field label="Case number" mono>
              {caseData?.caseNumber}
            </Field>
            <Field label="Customer UID" mono>
              {caseData?.customer?.uid}
            </Field>
            <Field label="Transaction UID" mono>
              {txn?.uid}
            </Field>
            <Field label="Analyst" mono>
              {caseData?.analyst?.uid || caseData?.analystName}
            </Field>
            <Field label="Generated by" mono>
              {caseData?.generatedBy?.name || caseData?.generatedBy?.uid}
            </Field>
            {/* Stored linkage the screen previously never surfaced — without it
                an analyst cannot trace the filing back to its case, its
                originating alert, or the CRA that required it. */}
            <Field label="User ID" mono>
              {caseData?.userId}
            </Field>
            <Field label="Case ID" mono>
              {caseData?.caseId?.uid || caseData?.caseId}
            </Field>
            <Field label="Originating alert" mono>
              {caseData?.alert?.uid || caseData?.alert}
            </Field>
            <Field label="Risk assessment" mono>
              {caseData?.riskAssessment?.uid || caseData?.riskAssessment}
            </Field>
            <Field label="Created">{formatDate(caseData?.createdAt)}</Field>
            <Field label="Last updated">{formatDate(caseData?.updatedAt)}</Field>
          </div>
        </Section>
      </div>
    </UILoader>
  );
};

export default Ecdd;
