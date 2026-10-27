"use client";
import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getSMRById } from "../../actions";
import UILoader from "@/components/UILoader";
import { cn } from "@/lib/utils";
import { downloadReportPdf } from "@/lib/downloadReportPdf";
import {
  DESIGNATED_SERVICES,
  SUSPICION_REASONS,
  SERVICE_STATUSES,
  splitAgainstOptions,
} from "@/components/smr-parts/options";

/* ────────────────────────────────────────────────────────────────────────────
 * SMR Details
 *
 * An AUSTRAC suspicious matter report is a statutory form: parts A–H in a fixed
 * order, each either present or explicitly empty. The screen mirrors that
 * structure rather than reflowing it into dashboard cards, so an officer
 * reading this page and an officer reading the lodged form are looking at the
 * same document in the same sequence.
 * ──────────────────────────────────────────────────────────────────────────── */

/** Field label — repeated above every value on the page. */
const Label = ({ children, className }) => (
  <div
    className={cn("text-[10.5px] font-bold tracking-[0.09em] text-[#8b909a] uppercase", className)}
  >
    {children}
  </div>
);

/**
 * Lettered part container. The letter is the statutory part reference (A–H),
 * so it is the primary wayfinding element rather than decoration.
 */
const Part = ({ letter, title, subtitle, count, tone = "teal", children }) => (
  <section className="overflow-hidden rounded-[14px] border border-[#e4e6ea] bg-white">
    <header className="flex items-start gap-3.5 border-b border-[#eef0f2] px-6 py-5">
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-[9px] text-base font-bold",
          tone === "green" ? "bg-[#e6f6ec] text-[#1f7a4d]" : "bg-[#e3eef0] text-[#005964]",
        )}
      >
        {letter}
      </div>
      <div className="flex-1">
        <h2 className="m-0 text-base font-bold tracking-[-0.01em] text-[#14161a]">{title}</h2>
        {subtitle ? <div className="mt-[3px] text-[13px] text-[#8b909a]">{subtitle}</div> : null}
      </div>
      {count ? (
        <span className="shrink-0 rounded-full border border-[#e4e6ea] bg-[#f1f3f6] px-2.5 py-1 text-xs font-semibold text-[#71767f]">
          {count}
        </span>
      ) : null}
    </header>
    <div className="px-6 py-[22px]">{children}</div>
  </section>
);

/** Bordered sub-card for accounts, wallets, parties and evidence items. */
const Tile = ({ label, children, className, muted = false }) => (
  <div
    className={cn(
      "rounded-[10px] border border-[#eceef1] px-4 py-3.5",
      muted ? "bg-[#f8f9fb]" : "bg-white",
      className,
    )}
  >
    {label ? (
      <div className="text-[10px] font-bold tracking-[0.08em] text-[#9aa0aa] uppercase">
        {label}
      </div>
    ) : null}
    {children}
  </div>
);

const TONES = {
  green: "text-[#1f7a4d] bg-[#e6f6ec] border-[#c3e8d1]",
  amber: "text-[#9a6b00] bg-[#fff3d6] border-[#f2dfa6]",
  pink: "text-[#ca2f7f] bg-[#fbe8f1] border-[#f0cfe0]",
  tan: "text-[#8a5a2b] bg-[#fbf0e2] border-[#eed9be]",
  grey: "text-[#71767f] bg-[#f1f3f6] border-[#e4e6ea]",
};

const Pill = ({ tone = "grey", dot = false, className, children }) => (
  <span
    className={cn(
      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12.5px] font-semibold",
      TONES[tone] || TONES.grey,
      className,
    )}
  >
    {dot ? (
      <span
        className={cn(
          "size-1.5 rounded-full",
          tone === "green" ? "bg-[#25a05f]" : tone === "amber" ? "bg-[#d99a00]" : "bg-current",
        )}
      />
    ) : null}
    {children}
  </span>
);

/**
 * The generated grounds narrative is markdown — offences, amounts and outcomes
 * are emphasised as **…**. Split into React nodes rather than injecting HTML:
 * the text is model-generated and must never be able to carry markup.
 */
const emphasise = (text) =>
  String(text)
    .split(/\*\*(.+?)\*\*/g)
    .map((part, i) =>
      i % 2 === 1 ? (
        <strong key={i} className="font-semibold text-[#14161a]">
          {part}
        </strong>
      ) : (
        part
      ),
    );

const Empty = ({ children }) => (
  <div className="text-[12.5px] text-[#9aa0aa] italic">{children}</div>
);

/**
 * Read-only checkbox, mirroring the form's ticked/unticked state.
 *
 * The statutory form is a checklist, so the detail view shows the whole list
 * with the selections ticked rather than only the selected items — an officer
 * comparing this screen against the lodged form sees the same boxes in the same
 * order, and can see what was *not* selected, which a bare list cannot convey.
 */
const CheckItem = ({ checked, extra = false, children }) => (
  <div className="flex items-start gap-2.5">
    <span
      className={cn(
        "mt-px flex size-[15px] shrink-0 items-center justify-center rounded-[4px] border",
        checked
          ? extra
            ? "border-[#8a5a2b] bg-[#8a5a2b] text-white"
            : "border-[#005964] bg-[#005964] text-white"
          : "border-[#d3d6dc] bg-white",
      )}
      aria-hidden="true"
    >
      {checked ? (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : null}
    </span>
    <span
      className={cn(
        "text-[13px] leading-tight",
        checked ? "font-medium text-[#20232a]" : "text-[#9aa0aa]",
      )}
    >
      {children}
    </span>
  </div>
);

/**
 * The full option list with the recorded selections ticked, plus any stored
 * value that is not on the list.
 *
 * Records written by the rule engine carry values like "Item 1 - account and
 * deposit taking" that predate the current labels. Showing only the canonical
 * list would render those unticked and drop them from the report entirely, so
 * they are appended as ticked extras and flagged.
 */
const OptionChecklist = ({ options, values }) => {
  const { selected, extras } = splitAgainstOptions(options, values);
  return (
    <>
      <div className="grid gap-x-6 gap-y-2.5 rounded-[10px] border border-[#eceef1] bg-[#f8f9fb] px-4 py-3.5 sm:grid-cols-2">
        {options.map((option) => (
          <CheckItem key={option} checked={selected.has(option)}>
            {option}
          </CheckItem>
        ))}
      </div>
      {extras.length ? (
        <div className="mt-2.5">
          <div className="mb-1.5 text-[11px] text-[#8a5a2b]">
            Recorded on this report but not on the current standard list:
          </div>
          <div className="flex flex-col gap-2">
            {extras.map((value) => (
              <CheckItem key={value} checked extra>
                {value}
              </CheckItem>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
};

/* ── formatters ────────────────────────────────────────────────────────────
 * A statutory form must never show "undefined" or "Invalid Date". Anything
 * absent renders as an explicit dash, so a reader can tell "not provided"
 * apart from "failed to render". */
const dash = "—";

const fmtDate = (value) => {
  if (!value) return dash;
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? dash
    : d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
};

const fmtDateTime = (value) => {
  if (!value) return dash;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return dash;
  const day = d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
  return `${day} · ${d.toISOString().slice(11, 16)} UTC`;
};

const fmtMoney = (money) => {
  if (!money || !Number.isFinite(Number(money.amount))) return dash;
  const amount = Number(money.amount).toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${money.currencyCode || ""} ${amount}`.trim();
};

const fmtAddress = (a) =>
  a
    ? [a.street, [a.city, a.state, a.postcode].filter(Boolean).join(" "), a.country]
        .filter(Boolean)
        .join(", ")
    : "";

const initials = (name) =>
  String(name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

export default function ReportDetailView() {
  const [data, setData] = useState(null);
  const [isFetching, setIsFetching] = useState(true);
  const [exporting, setExporting] = useState(false);
  const id = useSearchParams().get("id");

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      await downloadReportPdf({ kind: "smr", id: data?._id, label: data?.uid });
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    if (!id) {
      setIsFetching(false);
      return;
    }

    let cancelled = false;
    const fetchData = async () => {
      setIsFetching(true);
      try {
        const response = await getSMRById(id);
        if (!cancelled) setData(response?.data ?? null);
      } catch (error) {
        if (!cancelled) console.error("Failed to load SMR", error);
      } finally {
        if (!cancelled) setIsFetching(false);
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!isFetching && !data) {
    return (
      <div className="rounded-[14px] border border-[#e4e6ea] bg-white px-6 py-10 text-center">
        <h2 className="text-lg font-bold text-[#14161a]">Report not found</h2>
        <p className="mt-1 text-[13px] text-[#8b909a]">
          No suspicious matter report matches {id ? `id ${id}` : "the requested reference"}.
        </p>
      </div>
    );
  }

  const partA = data?.partA || {};
  const partB = data?.partB || {};
  const person = data?.partC?.personOrganisation || {};
  const otherParties = data?.partD?.otherParties || [];
  const unidentified = data?.partE?.unidentifiedPersons || [];
  const transactions = data?.partF?.transactions || [];
  const partG = data?.partG || {};
  const entity = data?.partH?.reportingEntity || {};
  const meta = data?.metadata || {};
  const history = meta.workflowHistory || [];

  const statusTone = { draft: "amber", review: "grey", approved: "green" };

  return (
    <UILoader loading={isFetching} type="page">
      <div className="bg-[#eef0f3]">
        {/* ── Sticky header ─────────────────────────────────────────────── */}
        <header className="sticky top-0 z-20 border-b border-[#dfe1e6] bg-white/90 backdrop-blur-md backdrop-saturate-150">
          <div className="mx-auto flex max-w-[1080px] flex-wrap items-center gap-5 px-7 py-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <h1 className="m-0 text-[19px] font-bold tracking-[-0.01em] text-[#14161a]">
                  SMR Details
                </h1>
                <Pill tone={statusTone[data?.status] || "grey"} dot>
                  <span className="text-[11px] font-bold tracking-[0.06em] uppercase">
                    {data?.status || "Draft"}
                  </span>
                </Pill>
              </div>
              <div className="mt-[5px] truncate font-mono text-xs text-[#71767f]">{data?.uid}</div>
            </div>
            <div className="flex shrink-0 items-center gap-2.5">
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={exporting || !data?._id}
                className="rounded-lg border border-[#d3d6dc] bg-white px-[15px] py-[9px] text-[13px] font-semibold text-[#3d4048] transition-colors hover:bg-[#f5f6f8] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {exporting ? "Preparing PDF…" : "Export PDF"}
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1080px] px-7 pt-6 pb-20">
          {/* ── Summary strip ───────────────────────────────────────────── */}
          <section className="mb-[26px] grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-[#e4e6ea] bg-white px-[18px] py-4">
              <Label>Report ID</Label>
              <div className="mt-2 font-mono text-[13px] break-all text-[#20232a]">
                {data?.uid || dash}
              </div>
              <div className="mt-1.5 text-xs text-[#8b909a]">Case {data?.caseNumber || dash}</div>
            </div>
            <div className="rounded-xl border border-[#e4e6ea] bg-white px-[18px] py-4">
              <Label>Created</Label>
              <div className="mt-2 text-[15px] font-semibold text-[#20232a]">
                {fmtDate(data?.createdAt)}
              </div>
              <div className="mt-1.5 text-xs text-[#8b909a]">
                Submission date {fmtDate(meta.submissionDate)}
              </div>
            </div>
            <div className="rounded-xl border border-[#e4e6ea] bg-white px-[18px] py-4">
              <Label>Sequence</Label>
              <div className="mt-2 text-[15px] font-semibold text-[#20232a]">
                {data?.sequence != null ? `#${data.sequence}` : dash}
              </div>
              <div className="mt-1.5 text-xs text-[#8b909a]">Form version {meta.version || dash}</div>
            </div>
            <div className="rounded-xl border border-[#e4e6ea] bg-white px-[18px] py-4">
              <Label>Likely offence</Label>
              <div className="mt-2 text-[15px] font-semibold text-[#ca2f7f]">
                {partG.likelyOffence?.length ? partG.likelyOffence.join(", ") : dash}
              </div>
              <div className="mt-1.5 text-xs text-[#8b909a]">
                Reported under s41, AML/CTF Act 2006
              </div>
            </div>
          </section>

          <div className="flex flex-col gap-[18px]">
            {/* ── A ─────────────────────────────────────────────────────── */}
            <Part
              letter="A"
              title="Designated Services"
              subtitle="Services and reasons for suspicion"
            >
              <div className="flex flex-col gap-6">
                <div>
                  <Label>
                    1. Designated service(s) to which the suspicious matter relates
                  </Label>
                  <div className="mt-2.5">
                    <OptionChecklist
                      options={DESIGNATED_SERVICES}
                      values={partA.designatedServices}
                    />
                  </div>
                </div>

                <div>
                  <Label>Was the designated service(s)</Label>
                  <div className="mt-2.5 flex flex-wrap gap-5">
                    {SERVICE_STATUSES.map((status) => {
                      const on = partA.serviceStatus === status.value;
                      return (
                        <div key={status.value} className="flex items-center gap-2">
                          {/* Radio, not a checkbox — the form allows exactly one. */}
                          <span
                            className={cn(
                              "flex size-[15px] shrink-0 items-center justify-center rounded-full border",
                              on ? "border-[#005964]" : "border-[#d3d6dc] bg-white",
                            )}
                            aria-hidden="true"
                          >
                            {on ? <span className="size-[7px] rounded-full bg-[#005964]" /> : null}
                          </span>
                          <span
                            className={cn(
                              "text-[13px]",
                              on ? "font-medium text-[#20232a]" : "text-[#9aa0aa]",
                            )}
                          >
                            {status.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-[#eef0f2] pt-5">
                  <Label>2. Reason(s) for the suspicion</Label>
                  <div className="mt-2.5">
                    <OptionChecklist
                      options={SUSPICION_REASONS}
                      values={partA.suspicionReasons}
                    />
                  </div>
                </div>

                <div>
                  <Label>Other reasons specified</Label>
                  <div className="mt-2.5 flex flex-col gap-[9px]">
                    {partA.otherReasons?.length ? (
                      partA.otherReasons.map((r, i) => (
                        <div
                          key={i}
                          className="flex gap-[9px] text-[13.5px] leading-normal text-[#3d4048]"
                        >
                          <span className="text-[#b8bcc4]">—</span>
                          <span>{r}</span>
                        </div>
                      ))
                    ) : (
                      <Empty>None recorded</Empty>
                    )}
                  </div>
                </div>
              </div>
            </Part>

            {/* ── B ─────────────────────────────────────────────────────── */}
            <Part
              letter="B"
              title="Grounds for Suspicion"
              subtitle="Statement supporting the s41 report"
            >
              <Label className="mb-3">Suspicion held on reasonable grounds</Label>
              {partB.groundsForSuspicion ? (
                <div className="border-l-[3px] border-[#005964] pl-[18px] text-[14.5px] leading-[1.72] text-[#2b2e35]">
                  {emphasise(partB.groundsForSuspicion)}
                </div>
              ) : (
                <Empty>No grounds statement recorded.</Empty>
              )}
            </Part>

            {/* ── C ─────────────────────────────────────────────────────── */}
            <Part
              letter="C"
              title="Person or Organisation"
              subtitle="Subject of the suspicious matter report"
            >
              <div className="flex items-center gap-3.5 border-b border-[#eef0f2] pb-5">
                <div className="flex size-[46px] shrink-0 items-center justify-center rounded-full bg-[#005964] text-lg font-bold text-white">
                  {initials(person.name)}
                </div>
                <div>
                  <div className="text-[17px] font-bold text-[#14161a]">{person.name || dash}</div>
                  <div className="mt-[3px] text-[13px] text-[#71767f]">
                    <span
                      className={cn(
                        "font-semibold",
                        person.isCustomer ? "text-[#1f7a4d]" : "text-[#8a5a2b]",
                      )}
                    >
                      {person.isCustomer ? "Customer" : "Not a customer"}
                    </span>
                    {" · "}
                    {person.isAuthorisedAgent ? "Authorised agent" : "Not an authorised agent"}
                    {person.otherNames?.length
                      ? ` · also known as ${person.otherNames.join(", ")}`
                      : ""}
                  </div>
                </div>
              </div>

              <div className="grid gap-x-10 gap-y-[26px] pt-5 sm:grid-cols-2">
                <div>
                  <Label>Contact details</Label>
                  <div className="mt-2.5 flex flex-col gap-1.5 text-sm text-[#20232a]">
                    {person.emails?.map((e) => (
                      <div key={e}>{e}</div>
                    ))}
                    {person.phoneNumbers?.map((p) => (
                      <div key={p}>{p}</div>
                    ))}
                    {fmtAddress(person.businessAddress) ? (
                      <div className="text-[#3d4048]">{fmtAddress(person.businessAddress)}</div>
                    ) : null}
                    {!person.emails?.length &&
                    !person.phoneNumbers?.length &&
                    !fmtAddress(person.businessAddress) ? (
                      <Empty>None recorded</Empty>
                    ) : null}
                  </div>
                </div>
                <div>
                  <Label>Person details</Label>
                  <div className="mt-2.5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                    <span className="text-[#8b909a]">Date of birth</span>
                    <span className="text-[#20232a]">
                      {fmtDate(person.personDetails?.dateOfBirth)}
                    </span>
                    <span className="text-[#8b909a]">Nationality</span>
                    <span className="text-[#20232a]">
                      {person.personDetails?.nationality || dash}
                    </span>
                    <span className="text-[#8b909a]">Occupation</span>
                    <span className="text-[#20232a]">{person.occupation || dash}</span>
                    <span className="text-[#8b909a]">Documentation</span>
                    <span className="text-[#20232a]">{person.documentation || dash}</span>
                  </div>
                </div>
              </div>

              {person.accounts?.length ||
              person.digitalWallets?.length ||
              person.beneficialOwners?.length ||
              person.officeHolders?.length ? (
                <div className="mt-[22px] grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                  {person.accounts?.map((a, i) => (
                    <Tile key={`acc-${i}`} muted label={`Account ${i + 1}`}>
                      <div className="mt-2 text-xs text-[#71767f]">{a.type}</div>
                      <div className="mt-[3px] font-mono text-[12.5px] break-all text-[#20232a]">
                        {a.number}
                      </div>
                      <div className="mt-1 text-[12.5px] text-[#3d4048]">{a.institution}</div>
                    </Tile>
                  ))}
                  {person.digitalWallets?.map((w, i) => (
                    <Tile key={`wal-${i}`} muted label={`Digital wallet ${i + 1}`}>
                      <div className="mt-2 text-xs text-[#71767f]">{w.type}</div>
                      <div className="mt-[3px] font-mono text-[11.5px] break-all text-[#20232a]">
                        {w.identifier}
                      </div>
                    </Tile>
                  ))}
                  {person.beneficialOwners?.map((b, i) => (
                    <Tile key={`bo-${i}`} muted label={`Beneficial owner ${i + 1}`}>
                      <div className="mt-2 text-[13px] font-semibold text-[#20232a]">{b.name}</div>
                      <div className="mt-1 text-xs leading-snug text-[#71767f]">
                        {fmtAddress(b.address)}
                      </div>
                    </Tile>
                  ))}
                  {person.officeHolders?.map((o, i) => (
                    <Tile key={`oh-${i}`} muted label={`Office holder ${i + 1}`}>
                      <div className="mt-2 text-[13px] font-semibold text-[#20232a]">{o.name}</div>
                      <div className="mt-1 text-[12.5px] text-[#71767f]">{o.position}</div>
                    </Tile>
                  ))}
                </div>
              ) : null}

              {person.identityVerification ? (
                <div className="mt-[22px]">
                  <Label>Identity verification</Label>
                  <div className="mt-2.5 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                    {person.identityVerification.documents?.map((d, i) => (
                      <Tile key={`doc-${i}`}>
                        <div className="text-[11px] font-semibold text-[#8b909a]">Document</div>
                        <div className="mt-1.5 text-[13.5px] font-semibold text-[#20232a]">
                          {[d.type, d.number].filter(Boolean).join(" ")}
                        </div>
                        <div className="mt-[3px] text-xs text-[#71767f]">
                          {[d.country, d.expiry ? `expires ${fmtDate(d.expiry)}` : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                      </Tile>
                    ))}
                    {person.identityVerification.electronicSources?.map((s, i) => (
                      <Tile key={`src-${i}`}>
                        <div className="text-[11px] font-semibold text-[#8b909a]">
                          Electronic source
                        </div>
                        <div className="mt-1.5 text-[13.5px] font-semibold text-[#20232a]">
                          {s.type}
                        </div>
                        <div className="mt-[3px] font-mono text-xs break-all text-[#71767f]">
                          {s.identifier}
                        </div>
                      </Tile>
                    ))}
                    {person.identityVerification.deviceIdentifiers?.map((d, i) => (
                      <Tile key={`dev-${i}`}>
                        <div className="text-[11px] font-semibold text-[#8b909a]">Device</div>
                        <div className="mt-1.5 text-[13.5px] font-semibold text-[#20232a]">
                          {d.type}
                        </div>
                        <div className="mt-[3px] font-mono text-xs break-all text-[#71767f]">
                          {d.identifier}
                        </div>
                      </Tile>
                    ))}
                  </div>
                </div>
              ) : null}
            </Part>

            {/* ── D ─────────────────────────────────────────────────────── */}
            <Part
              letter="D"
              title="Other Parties"
              subtitle="Additional parties involved in the matter"
              count={
                otherParties.length
                  ? `${otherParties.length} ${otherParties.length === 1 ? "party" : "parties"}`
                  : null
              }
            >
              {otherParties.length ? (
                <div className="flex flex-col gap-5">
                  {otherParties.map((p, i) => {
                    const hasDetail =
                      p.accounts?.length ||
                      p.digitalWallets?.length ||
                      p.phoneNumbers?.length ||
                      p.emails?.length;
                    return (
                      <div key={i}>
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="text-[15px] font-semibold text-[#14161a]">{p.name}</span>
                          <Pill tone={p.isCustomer ? "green" : "tan"}>
                            <span className="text-[11.5px]">
                              {p.isCustomer ? "Customer" : "Not a customer"}
                            </span>
                          </Pill>
                        </div>
                        {p.otherNames?.length ? (
                          <div className="mt-1 text-[12.5px] text-[#6b6f78]">Also known as {p.otherNames.join(", ")}</div>
                        ) : null}
                        {/* Role, relationship and provenance, as recorded on the case. */}
                        {p.documentation ? (
                          <div className="mt-1.5 text-[13px] text-[#3d4048]">{p.documentation}</div>
                        ) : null}
                        {p.personDetails?.dateOfBirth || p.personDetails?.nationality ? (
                          <div className="mt-1.5 text-[13px] text-[#3d4048]">
                            {[
                              p.personDetails.dateOfBirth && `Born ${fmtDate(p.personDetails.dateOfBirth)}`,
                              p.personDetails.nationality && `Citizen of ${p.personDetails.nationality}`,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </div>
                        ) : null}
                        {p.identityVerification?.documents?.length ? (
                          <div className="mt-1.5 flex flex-col gap-0.5 text-[13px] text-[#3d4048]">
                            {p.identityVerification.documents.map((d, di) => (
                              <div key={di}>
                                {[d.type, d.number, d.country].filter(Boolean).join(" · ")}
                              </div>
                            ))}
                          </div>
                        ) : null}
                        {fmtAddress(p.businessAddress) ? (
                          <div className="mt-2 text-[13.5px] text-[#3d4048]">
                            {fmtAddress(p.businessAddress)}
                          </div>
                        ) : null}
                        {hasDetail ? (
                          <div className="mt-2.5 flex flex-col gap-1 text-[13px] text-[#3d4048]">
                            {p.emails?.map((e) => (
                              <div key={e}>{e}</div>
                            ))}
                            {p.phoneNumbers?.map((n) => (
                              <div key={n}>{n}</div>
                            ))}
                            {p.accounts?.map((a, ai) => (
                              <div key={ai} className="font-mono text-xs break-all">
                                {[a.number, a.institution].filter(Boolean).join(" · ")}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-2.5">
                            <Empty>No accounts, wallets, phone numbers or emails recorded.</Empty>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Empty>No other parties recorded.</Empty>
              )}
            </Part>

            {/* ── E ─────────────────────────────────────────────────────── */}
            <Part
              letter="E"
              title="Unidentified Persons"
              subtitle="Individuals whose identity could not be established"
              count={
                unidentified.length
                  ? `${unidentified.length} ${unidentified.length === 1 ? "person" : "people"}`
                  : null
              }
            >
              {unidentified.length ? (
                <div className="flex flex-col gap-4">
                  {unidentified.map((u, i) => (
                    <div key={i}>
                      <div className="text-[14.5px] text-[#20232a]">{u.description}</div>
                      {u.documentation ? (
                        <div className="mt-[9px] text-[13px] text-[#71767f]">
                          Documentation held:{" "}
                          <span className="font-medium text-[#3d4048]">{u.documentation}</span>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <Empty>No unidentified persons recorded.</Empty>
              )}
            </Part>

            {/* ── F ─────────────────────────────────────────────────────── */}
            <Part
              letter="F"
              title="Transaction Details"
              subtitle="Transactions under investigation"
              count={
                transactions.length
                  ? `${transactions.length} ${
                      transactions.length === 1 ? "transaction" : "transactions"
                    }`
                  : null
              }
            >
              {transactions.length ? (
                <div className="flex flex-col gap-4">
                  {transactions.map((t, i) => (
                    <div key={i} className="rounded-xl border border-[#eceef1] px-5 py-[18px]">
                      <div className="mb-4 flex items-center gap-2">
                        <span className="inline-flex size-6 items-center justify-center rounded-[7px] bg-[#e3eef0] text-[11px] font-bold text-[#005964]">
                          {i + 1}
                        </span>
                        <span className="text-xs font-semibold text-[#8b909a]">
                          Transaction {i + 1} of {transactions.length}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[10px] border border-[#f0e6dc] bg-[#faf7f4] px-[18px] py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs font-bold tracking-[0.06em] text-[#5b4b8a] uppercase">
                            {t.type}
                          </span>
                          <span
                            className={cn(
                              "rounded-md border px-2.5 py-[3px] text-[11px] font-bold tracking-[0.05em] uppercase",
                              t.completed
                                ? "border-[#c3e8d1] bg-[#e6f6ec] text-[#1f7a4d]"
                                : "border-[#f0cfe0] bg-[#fbe8f1] text-[#ca2f7f]",
                            )}
                          >
                            {t.completed ? "Completed" : "Not completed"}
                          </span>
                        </div>
                        <div className="text-lg font-bold text-[#14161a]">
                          {fmtMoney(t.totalAmount)}
                        </div>
                      </div>

                      <div className="mt-[22px] grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <Label>Date</Label>
                          <div className="mt-[7px] text-[13.5px] text-[#20232a]">
                            {fmtDateTime(t.date)}
                          </div>
                        </div>
                        <div>
                          <Label>Reference number</Label>
                          <div className="mt-[7px] font-mono text-[12.5px] break-all text-[#20232a]">
                            {t.referenceNumber || dash}
                          </div>
                        </div>
                        <div>
                          <Label>Cash amount</Label>
                          <div className="mt-[7px] text-[13.5px] text-[#20232a]">
                            {fmtMoney(t.cashAmount)}
                          </div>
                        </div>
                        <div>
                          <Label>Foreign currency</Label>
                          <div className="mt-[7px] text-[13.5px] text-[#20232a]">
                            {t.foreignCurrencies?.length
                              ? t.foreignCurrencies.map((f) => fmtMoney(f)).join(", ")
                              : dash}
                          </div>
                        </div>
                        {t.digitalCurrencies?.length ? (
                          <div className="lg:col-span-4">
                            <Label>Digital currency</Label>
                            <div className="mt-[7px] text-[13.5px] text-[#20232a]">
                              {t.digitalCurrencies.map((d, di) => (
                                <span key={di} className="mr-3 inline-block">
                                  {d.type} {d.amount}
                                  {d.walletAddress ? (
                                    <span className="ml-1.5 font-mono text-xs break-all text-[#8b909a]">
                                      · {d.walletAddress}
                                    </span>
                                  ) : null}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-[22px] grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                        {[
                          ["Sender", t.sender],
                          ["Payee", t.payee],
                          ["Beneficiary", t.beneficiary],
                        ]
                          .filter(([, party]) => party?.name)
                          .map(([role, party]) => (
                            <Tile key={role}>
                              <Label>{role}</Label>
                              <div className="mt-[9px] text-sm font-semibold text-[#14161a]">
                                {party.name}
                              </div>
                              {party.institutions?.map((inst, ii) => (
                                <React.Fragment key={ii}>
                                  <div className="mt-[3px] text-[12.5px] text-[#3d4048]">
                                    {inst.name}
                                  </div>
                                  {fmtAddress(inst.address) ? (
                                    <div className="mt-1 text-xs leading-snug text-[#8b909a]">
                                      {fmtAddress(inst.address)}
                                    </div>
                                  ) : null}
                                </React.Fragment>
                              ))}
                            </Tile>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty>No transactions recorded.</Empty>
              )}
            </Part>

            {/* ── G ─────────────────────────────────────────────────────── */}
            <Part
              letter="G"
              title="Additional Information"
              subtitle="Prior reports, referrals and attachments"
            >
              <div className="grid gap-[18px] sm:grid-cols-2">
                {partG.previousReports?.map((r, i) => (
                  <Tile key={`prev-${i}`}>
                    <Label>Previous report</Label>
                    <div className="mt-2 font-mono text-[13px] break-all text-[#20232a]">
                      {r.referenceNumber}
                    </div>
                    <div className="mt-1 text-[12.5px] text-[#71767f]">Lodged {fmtDate(r.date)}</div>
                  </Tile>
                ))}
                {partG.attachments?.map((a, i) => (
                  <Tile key={`att-${i}`}>
                    <Label>Attachment</Label>
                    <div className="mt-2 flex items-center gap-2 text-[13.5px] break-all text-[#005964]">
                      <span className="inline-flex size-[22px] shrink-0 items-center justify-center rounded-[5px] bg-[#e3eef0] text-[10px] font-bold text-[#005964]">
                        PDF
                      </span>
                      {a}
                    </div>
                  </Tile>
                ))}
                {partG.otherGovernmentBodies?.map((g, i) => (
                  <Tile key={`gov-${i}`}>
                    <Label>Government body</Label>
                    <div className="mt-2 text-sm font-semibold text-[#14161a]">{g.name}</div>
                    <div className="mt-1 text-[12.5px] leading-normal text-[#3d4048]">
                      Reported {fmtDate(g.dateReported)}
                      {g.informationProvided ? ` · ${g.informationProvided}` : ""}
                    </div>
                    {fmtAddress(g.address) ? (
                      <div className="mt-1 text-xs text-[#8b909a]">{fmtAddress(g.address)}</div>
                    ) : null}
                  </Tile>
                ))}
                {!partG.previousReports?.length &&
                !partG.attachments?.length &&
                !partG.otherGovernmentBodies?.length ? (
                  <Empty>No additional information recorded.</Empty>
                ) : null}
              </div>
            </Part>

            {/* ── H ─────────────────────────────────────────────────────── */}
            <Part letter="H" title="Reporting Entity" subtitle="Organisation submitting this report">
              <div className="flex flex-wrap items-start justify-between gap-6 border-b border-[#eef0f2] pb-5">
                <div>
                  <div className="text-base font-bold text-[#14161a]">{entity.name || dash}</div>
                  <div className="mt-[5px] text-[13.5px] text-[#3d4048]">
                    {fmtAddress(entity.address)}
                  </div>
                </div>
                <div className="flex flex-wrap gap-8">
                  <div>
                    <Label>Branch</Label>
                    <div className="mt-1.5 text-[13.5px] text-[#20232a]">
                      {entity.branchName || dash}
                    </div>
                  </div>
                  <div>
                    <Label>Internal reference</Label>
                    <div className="mt-1.5 font-mono text-[12.5px] break-all text-[#20232a]">
                      {entity.internalReference || dash}
                    </div>
                  </div>
                </div>
              </div>
              <div className="pt-5">
                <Label>Completed by</Label>
                <div className="mt-2.5 flex items-center gap-3.5">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#f0edf9] text-sm font-bold text-[#5b4b8a]">
                    {initials(entity.completedBy?.name)}
                  </div>
                  <div>
                    <div className="text-[14.5px] font-semibold text-[#14161a]">
                      {entity.completedBy?.name || dash}
                    </div>
                    <div className="mt-0.5 text-[12.5px] text-[#71767f]">
                      {[
                        entity.completedBy?.jobTitle,
                        entity.completedBy?.phone,
                        entity.completedBy?.email,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                </div>
              </div>
            </Part>

            {/* ── Activity timeline ─────────────────────────────────────── */}
            <Part
              letter="✓"
              tone="green"
              title="Activity Timeline"
              subtitle="Workflow history and status changes"
            >
              {history.length ? (
                <div className="flex flex-col">
                  {history.map((h, i) => (
                    <div key={i} className="flex gap-3.5">
                      <div className="flex shrink-0 flex-col items-center">
                        <div className="size-[11px] rounded-full border-2 border-[#bcd6da] bg-[#005964]" />
                        {i < history.length - 1 ? (
                          <div className="mt-1 w-0.5 flex-1 bg-[#eceef1]" />
                        ) : null}
                      </div>
                      <div className="flex-1 pb-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[13.5px] font-semibold text-[#14161a] capitalize">
                            {h.action || "Updated"}
                          </span>
                          {h.toStatus ? (
                            <>
                              <span className="text-xs text-[#b8bcc4]">→</span>
                              <span className="rounded-[5px] border border-[#f2dfa6] bg-[#fff3d6] px-2 py-0.5 text-[11.5px] font-semibold text-[#9a6b00]">
                                {h.toStatus}
                              </span>
                            </>
                          ) : null}
                          <span className="text-xs text-[#8b909a]">{fmtDateTime(h.timestamp)}</span>
                        </div>
                        {h.notes ? (
                          <div className="mt-2.5 rounded-[10px] border border-[#eef0f2] bg-[#f8f9fb] px-4 py-3.5 text-[13.5px] leading-[1.65] text-[#3d4048]">
                            {emphasise(h.notes)}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty>No workflow history recorded.</Empty>
              )}

              <div className="mt-[22px] border-t border-[#eef0f2] pt-5">
                <Label>Reference information</Label>
                <div className="mt-3.5 grid gap-x-10 gap-y-2.5 sm:grid-cols-2">
                  {[
                    ["SMR UID", data?.uid],
                    ["Case number", data?.caseNumber],
                    ["Internal reference", entity.internalReference],
                    ["AUSTRAC reference", meta.austracReference],
                    ["Previous report", partG.previousReports?.[0]?.referenceNumber],
                    ["Customer", data?.customer],
                  ]
                    .filter(([, value]) => value)
                    .map(([label, value]) => (
                      <div
                        key={label}
                        className="flex justify-between gap-4 border-b border-[#f2f3f5] pb-2 text-[12.5px]"
                      >
                        <span className="shrink-0 text-[#8b909a]">{label}</span>
                        <span className="truncate font-mono text-[#20232a]">{String(value)}</span>
                      </div>
                    ))}
                </div>
                <div className="mt-4 text-xs text-[#9aa0aa]">
                  Created {fmtDate(data?.createdAt)} · last updated {fmtDate(data?.updatedAt)} · form
                  version {meta.version || dash}
                </div>
              </div>
            </Part>
          </div>
        </main>
      </div>
    </UILoader>
  );
}
