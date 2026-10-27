"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import useBreadcrumbLabel from "@/hooks/useBreadcrumbLabel";
import { getTrustById, createTrust, updateTrust } from "@/app/dashboard/client/companies/actions";
import { C } from "@/views/kyb/form-kit";
import {
  TrustFields,
  emptyTrust,
  buildTrustPayload,
  trustKycToWizardState,
  validateTrust,
  TRUST_SECTION_KEYS,
} from "@/views/kyb/trust-form";

/**
 * Trust verification intake (docs/65 Step 64).
 *
 * Deliberately the same shape as the company Business-verification intake
 * (`views/companies/add`): breadcrumb + title + live completion figure, a
 * sticky step rail on the left, one step of the form in the middle, and a
 * sticky footer carrying Back / step position / Save draft / Continue.
 *
 * The FIELDS are not re-implemented — this renders the shared `TrustFields`
 * (extracted in Step 62 and also used by the company wizard's beneficial-trust
 * modal), passing a `sections` subset per step. So the two surfaces can never
 * drift: adding a field to the trust schema surfaces in both automatically,
 * and validation is the same `validateTrust` in both places.
 */

const STEPS = [
  {
    title: "Trust details",
    hint: "Name, jurisdiction and how the trust is identified.",
    sections: ["identity", "identification", "trust_type"],
  },
  {
    title: "Addresses & contact",
    hint: "Where the trust is based and how to reach it.",
    sections: ["principal_address", "postal_address", "contact"],
  },
  {
    title: "Settlor & trustees",
    hint: "Who settled the trust and who administers it.",
    sections: ["settlor", "company_trustees", "trustees"],
  },
  {
    title: "Control & beneficiaries",
    hint: "Who controls the trust and who benefits from it.",
    sections: ["control", "reps", "beneficiaries"],
  },
  {
    title: "Purpose & funds",
    hint: "What the account is for and where the money comes from.",
    sections: ["account_purpose", "funds"],
  },
  { title: "Documents", hint: "Trust deed and supporting evidence.", sections: ["documents"] },
  { title: "Review & submit", hint: "Check everything before saving.", sections: [] },
];

const DRAFT_KEY = "trust-intake-draft";

// Which step a given error key belongs to, so "3 to fix" on the review step
// can send the user to the right place. Derived from the same section-key map
// the error badges use, rather than a second hand-maintained list.
const stepOfErrorKey = (key) => {
  for (let i = 0; i < STEPS.length; i += 1) {
    for (const group of STEPS[i].sections) {
      const prefixes = TRUST_SECTION_KEYS[group] || [];
      if (prefixes.some((p) => key === p || key.startsWith(`${p}.`))) return i;
    }
  }
  return 0;
};

export default function TrustForm() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id");

  const [trust, setTrust] = useState(emptyTrust());
  useBreadcrumbLabel(id ? String(trust.full_trust_name || "").trim() || "Edit trust" : "New trust");
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    if (!id) {
      // Restore an unsent draft, same affordance as the company intake.
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) setTrust({ ...emptyTrust(), ...JSON.parse(raw) });
      } catch {
        /* a corrupt draft must never block the form */
      }
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await getTrustById(id);
        if (cancelled) return;
        if (res?.success && res.data) setTrust(trustKycToWizardState(res.data));
        else toast.error(res?.message || "Could not load this trust");
      } catch (err) {
        if (!cancelled) toast.error(err.message || "Could not load this trust");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const errors = useMemo(() => validateTrust(trust), [trust]);
  const errorCount = Object.keys(errors).length;

  // Share of the required intake facts captured — mirrors the company
  // wizard's completion figure.
  const completion = useMemo(() => {
    const checks = [
      trust.full_trust_name.trim(),
      trust.country,
      trust.trust_type,
      trust.principal_address.address.trim(),
      trust.contact_email.trim() || trust.contact_phone.trim(),
      trust.settlor_name.trim(),
      trust.trustees.some((x) => x.full_name.trim()) || trust.company_trustees.some((c) => c.company_name.trim()),
      trust.beneficiaries.length > 0,
      trust.source_of_funds.trim(),
      trust.documents.some((d) => d.url),
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [trust]);

  const goStep = (i) => {
    setStep(i);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveDraft = () => {
    try {
      // Documents carry a File handle and upload state that can't be
      // serialised, so they're excluded — same rule as the company draft.
      const { documents, ...rest } = trust;
      localStorage.setItem(DRAFT_KEY, JSON.stringify(rest));
      toast.success("Draft saved on this device.");
    } catch (err) {
      toast.error("Could not save the draft.");
    }
  };

  const submit = async () => {
    if (errorCount) {
      setShowErrors(true);
      // Jump to the step holding the first problem.
      goStep(stepOfErrorKey(Object.keys(errors)[0]));
      toast.error(`${errorCount} field${errorCount === 1 ? "" : "s"} need attention before saving.`);
      return;
    }
    if (trust.documents.some((d) => d.status === "uploading")) {
      toast.error("A document is still uploading — wait for it to finish before saving.");
      return;
    }
    setSaving(true);
    try {
      const payload = buildTrustPayload(trust);
      const existingId = id || trust.id;
      delete payload.id; // the id travels in the URL on update, not the body
      const res = existingId ? await updateTrust(existingId, payload) : await createTrust(payload);
      if (!res?.success || !res?.data) {
        toast.error(res?.message || "Could not save this trust");
        return;
      }
      if (!id) localStorage.removeItem(DRAFT_KEY);
      toast.success(existingId ? "Trust updated." : "Trust created.");
      router.push("/dashboard/client/trusts");
    } catch (err) {
      toast.error(err.message || "Could not save this trust");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ height: 260, borderRadius: 14, background: "#eef0ec" }} />;

  const last = STEPS.length - 1;
  const current = STEPS[step];



  const reviewRows = [
    ["Trust name", trust.full_trust_name || "—"],
    ["Country of establishment", trust.country || "—"],
    ["Trust type", trust.trust_type || "—"],
    ["ABN / registration", trust.abn || trust.registration_number || "—"],
    ["Settlor", trust.settlor_name || "—"],
    [
      "Trustee(s)",
      [...trust.trustees.map((x) => x.full_name), ...trust.company_trustees.map((c) => c.company_name)]
        .filter(Boolean)
        .join(", ") || "—",
    ],
    ["Beneficiaries", trust.beneficiaries.map((b) => b.named_beneficiaries).filter(Boolean).join(", ") || "—"],
    ["Source of funds", trust.source_of_funds || "—"],
    ["Documents", trust.documents.filter((d) => d.url).length || 0],
  ];

  return (
    <div style={{ background: C.bg, borderRadius: 14 }}>
      <style>{`
        @media (max-width: 900px) {
          .trust-wizard-head, .trust-wizard-body, .trust-wizard-footer { padding-left: 18px !important; padding-right: 18px !important; }
          .trust-wizard-body { flex-direction: column !important; gap: 18px !important; }
          .trust-wizard-stepper { width: 100% !important; position: static !important; }
        }
      `}</style>

      {/* page head */}
      <div
        className="trust-wizard-head"
        style={{ background: "#fff", borderBottom: `1px solid ${C.line}`, padding: "22px 40px", borderRadius: "14px 14px 0 0" }}
      >
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: "-.01em" }}>
                {id ? "Edit trust verification intake" : "Trust verification intake"}
              </h1>
              <p style={{ margin: "6px 0 0", fontSize: 13.5, color: C.sub }}>
                Capture the trust, its parties and its purpose for KYB review. Fields marked{" "}
                <span style={{ color: C.red }}>*</span> are required to submit.
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, letterSpacing: ".05em", textTransform: "uppercase", color: C.subtle, fontWeight: 600 }}>
                Completion
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>{completion}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* body */}
      <div
        className="trust-wizard-body"
        style={{ maxWidth: 1180, margin: "0 auto", padding: "26px 40px 0", display: "flex", gap: 34, alignItems: "flex-start" }}
      >
        {/* step rail */}
        <div className="trust-wizard-stepper" style={{ width: 212, flexShrink: 0, position: "sticky", top: 80 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {STEPS.map((s, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <button
                  key={s.title}
                  type="button"
                  onClick={() => goStep(i)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 11,
                    padding: "11px 12px",
                    border: "none",
                    background: active ? C.greenBg : "transparent",
                    borderRadius: 10,
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "inherit",
                    width: "100%",
                  }}
                >
                  <span
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: done || active ? C.green : "#e6ebe9",
                      color: done || active ? "#fff" : C.mid,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    {done ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </span>
                  <span style={{ fontSize: 13.5, fontWeight: active ? 600 : 400, color: active ? C.greenDark : done ? C.ink : C.body }}>
                    {s.title}
                  </span>
                </button>
              );
            })}
          </div>

          {showErrors && errorCount > 0 && (
            <div style={{ marginTop: 16, padding: "13px 14px", background: C.redSoft, border: `1px solid ${C.redLine}`, borderRadius: 11 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.redDeep }}>
                {errorCount} field{errorCount === 1 ? "" : "s"} to fix
              </div>
              <div style={{ fontSize: 11.5, color: "#835048", marginTop: 5, lineHeight: 1.45 }}>
                Each is flagged on its step, and the step badge shows how many.
              </div>
            </div>
          )}
        </div>

        {/* form column */}
        <div style={{ flex: 1, minWidth: 0, paddingBottom: 24 }}>
          <div style={{ marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>{current.title}</h2>
            <p style={{ margin: "4px 0 0", fontSize: 12.5, color: C.sub }}>{current.hint}</p>
          </div>

          {step === last ? (
            <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, background: "#fff", padding: 18 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 1, background: "#eef0ec", border: "1px solid #eef0ec", borderRadius: 10, overflow: "hidden" }}>
                {reviewRows.map(([k, v]) => (
                  <div key={k} style={{ background: "#fff", padding: "11px 13px", display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <span style={{ fontSize: 12, color: C.subtle, flexShrink: 0 }}>{k}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 500, textAlign: "right", wordBreak: "break-word" }}>{v}</span>
                  </div>
                ))}
              </div>
              <p style={{ margin: "14px 0 0", fontSize: 12.5, color: C.sub, lineHeight: 1.5 }}>
                {errorCount
                  ? `${errorCount} field${errorCount === 1 ? "" : "s"} still need attention — pressing ${id ? "Save changes" : "Create trust"} will take you to the first one.`
                  : "Everything required has been captured. This trust can be linked from a company's ownership once saved."}
              </p>
            </div>
          ) : (
            <TrustFields
              value={trust}
              onChange={setTrust}
              showErrors={showErrors}
              sections={current.sections}
              // This page creates THIS trust and has its own footer action —
              // the modal-only "connect an existing trust" picker and inline
              // save bar would both be wrong here (docs/65 Step 66).
              showConnect={false}
              showSaveBar={false}
            />
          )}
        </div>
      </div>

      {/* sticky footer */}
      <div
        className="trust-wizard-footer"
        style={{
          position: "sticky",
          bottom: 0,
          height: 64,
          background: "#fff",
          borderTop: `1px solid ${C.line}`,
          display: "flex",
          alignItems: "center",
          padding: "0 40px",
          zIndex: 30,
          borderRadius: "0 0 14px 14px",
        }}
      >
        <div style={{ maxWidth: 1180, margin: "0 auto", width: "100%", display: "flex", alignItems: "center", gap: 16 }}>
          <button
            type="button"
            onClick={() => goStep(Math.max(step - 1, 0))}
            style={{
              background: "#fff",
              color: C.mid,
              border: "1px solid #d9ddd6",
              borderRadius: 9,
              padding: "10px 18px",
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "inherit",
              cursor: "pointer",
              opacity: step === 0 ? 0.4 : 1,
              pointerEvents: step === 0 ? "none" : "auto",
            }}
          >
            Back
          </button>
          <span style={{ fontSize: 12.5, color: C.sub }}>
            Step {step + 1} of {STEPS.length} · {current.title}
          </span>
          <div style={{ flex: 1 }} />
          {!id && (
            <button
              type="button"
              onClick={saveDraft}
              style={{ background: "#fff", color: C.mid, border: "1px solid #d9ddd6", borderRadius: 9, padding: "10px 18px", fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}
            >
              Save draft
            </button>
          )}
          <button
            type="button"
            disabled={saving}
            onClick={() => (step === last ? submit() : goStep(Math.min(step + 1, last)))}
            style={{
              background: C.green,
              color: "#fff",
              border: "none",
              borderRadius: 9,
              padding: "10px 22px",
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "inherit",
              cursor: saving ? "wait" : "pointer",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {step === last ? (saving ? "Saving…" : id ? "Save changes" : "Create trust") : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
