"use client";
import { useState } from "react";

import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  User,
  AlertTriangle,
  CheckCircle2,
  GitPullRequest,
  Building2,
  ImageIcon,
  Rocket,
  X,
  Timer,
  Wallet,
  ScanFace,
  FileText,
  Database,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import { cn, dateShowFormat, dateShowFormatWithTime, fmt, KYC_HISTORY_STATUS } from "@/lib/utils";
import { resolveCountry } from "@/lib/country";
import { getCustomerIdentity } from "@/views/onboarding/customer-queue/customerIdentity";
import { RelatedPartyDrawer } from "./RelatedPartyDrawer";
import { AmlMatchesTable } from "./AmlMatchesTable";
import RiskScoreCard from "@/components/RiskScoreCard";
import { SmoothZoomImageWrapper } from "@/components/CustomZoomImage";
import StepReviewButtons from "@/components/StepReviewButtons";
import Image from "next/image";

// Journey steps that expose manual Approve/Reject reviewer buttons.
const REVIEWABLE_STEPS = new Set(["id_document", "selfie"]);

// ─── Formatting helpers ──────────────────────────────────────────────────────

const formatLabel = (str) => {
  if (!str) return "—";
  return str?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

// Customer avatar prefers the live selfie captured during onboarding (latest
// journey's selfie step, else a selfie-typed customer document) over the
// portal user's photoUrl, so reviewers see the verified face.
const SELFIE_DOC_TYPES = new Set(["selfie", "face", "live_photo"]);

const resolveSelfieUrl = (details) => {
  for (const journey of details?.journeys || []) {
    const step = (journey?.steps || []).find((s) => s.type === "selfie");
    const url = (step?.documents || []).find((d) => d?.url)?.url;
    if (url) return url;
  }
  return (
    (details?.documents || []).find(
      (d) => d?.url && SELFIE_DOC_TYPES.has(String(d.docType || d.type).toLowerCase()),
    )?.url ?? null
  );
};

const getRiskLabelColor = (label) => {
  switch (label?.toLowerCase()) {
    case "low":
      return "text-success";
    case "medium":
      return "text-warning-foreground";
    case "high":
    case "very high":
      return "text-danger";
    default:
      return "text-muted-foreground";
  }
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const SectionLabel = ({ children }) => (
  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
    {children}
  </p>
);

const StatRow = ({ label, value, positive, negative }) => {
  const dotColor = negative ? "bg-danger" : positive ? "bg-success" : "bg-muted-foreground";
  const textColor = negative ? "text-danger" : positive ? "text-success" : "text-foreground";
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={cn("text-[11px] font-medium flex items-center gap-1.5", textColor)}>
        <span className={cn("size-1.5 rounded-full flex-shrink-0", dotColor)} />
        {value}
      </span>
    </div>
  );
};

const KycField = ({ label, value, encrypted }) => (
  <div className="bg-muted/40 rounded-lg px-3 py-2.5">
    <p className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wide">{label}</p>
    <p className={cn("text-xs font-medium", encrypted && "text-muted-foreground italic")}>
      {encrypted ? "Encrypted" : value || "—"}
    </p>
  </div>
);

// ─── Journey step helpers ────────────────────────────────────────────────────

const STEP_STATUS_CONFIG = {
  approved: {
    label: "Approved",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  in_progress: {
    label: "In Progress",
    cls: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  rejected: {
    label: "Rejected",
    cls: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-500",
  },
  pending: {
    label: "Pending",
    cls: "bg-slate-50 text-slate-600 border-slate-200",
    dot: "bg-slate-400",
  },
  not_started: {
    label: "Not Started",
    cls: "bg-slate-50 text-slate-600 border-slate-200",
    dot: "bg-slate-400",
  },
};

const JOURNEY_STATUS_CONFIG = {
  not_started: STEP_STATUS_CONFIG.not_started,
  in_progress: STEP_STATUS_CONFIG.in_progress,
  completed: STEP_STATUS_CONFIG.approved,
  approved: STEP_STATUS_CONFIG.approved,
  rejected: STEP_STATUS_CONFIG.rejected,
  pending: STEP_STATUS_CONFIG.pending,
};

const STEP_TYPE_LABELS = {
  journey_start: "Journey Start",
  personal_form: "Personal Form",
  id_document: "ID Document",
  selfie: "Selfie",
  liveness: "Liveness Check",
  proof_of_address: "Proof of Address",
  questionnaire: "Questionnaire",
  funds_wealth: "Funds & Wealth",
  declaration: "Declaration",
  authorization: "Authorization",
  consent: "Consent",
  review: "Review",
};

const getStepLabel = (step) => step.label || STEP_TYPE_LABELS[step.type] || formatLabel(step.type);

const getJourneyDisplayStatus = (journey) => {
  const steps = journey?.steps || [];
  const anyRejected = steps.some((s) => s.status === "rejected");
  // Trust the persisted status, except a stale "rejected" left on a journey
  // whose steps are no longer rejected (e.g. a reviewer approved the rejected
  // step) — recompute from the steps in that case instead of showing "rejected".
  const stale = journey?.status === "rejected" && !anyRejected;
  if (journey?.status && JOURNEY_STATUS_CONFIG[journey.status] && !stale) return journey.status;
  if (anyRejected) return "rejected";
  if (steps.length > 0 && steps.every((s) => s.status === "approved")) return "completed";
  if (steps.some((s) => ["in_progress", "submitted", "approved"].includes(s.status)))
    return "in_progress";
  return "not_started";
};

// Combined status for the merged "ID Document & Selfie" section — a rejection
// on either step rejects the pair, approval requires both, otherwise show the
// least-progressed of the two.
const combineStepStatus = (a, b) => {
  if (!b) return a;
  if (a === b) return a;
  const set = new Set([a, b]);
  if (set.has("rejected")) return "rejected";
  for (const s of ["pending", "not_started", "in_progress", "submitted"]) {
    if (set.has(s)) return s;
  }
  return a;
};

const formatFieldLabel = (key) =>
  key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const formatFieldValue = (value) => {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const RESERVED_DATA_KEYS = new Set([
  "warnings",
  "faceSimilarity",
  "ocrResult",
  "result",
  "poses",
  "fields",
  "cascaded",
  "cascadeSource",
  "sumsubStatuses",
  "lastChecked",
  "submittedAt",
  "invite_method",
  "applicant_created",
  "startedAt",
  "completedAt",
]);

const StepBadge = ({ status }) => {
  const cfg = STEP_STATUS_CONFIG[status] ?? STEP_STATUS_CONFIG.pending;
  return (
    <Badge variant="outline" className={cn("text-[10px] px-2 py-0.5 font-medium gap-1", cfg.cls)}>
      <span className={cn("size-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </Badge>
  );
};

const StepIcon = ({ status, type }) => {
  const cfg = STEP_STATUS_CONFIG[status] ?? STEP_STATUS_CONFIG.pending;
  const ring = "ring-4 ring-white";

  if (type === "journey_start") {
    return (
      <div
        className={cn(
          "size-8 rounded-full flex-shrink-0 flex items-center justify-center",
          cfg.dot,
          ring,
        )}
      >
        <Rocket className="size-3.5 text-white" />
      </div>
    );
  }
  if (type === "funds_wealth") {
    return (
      <div
        className={cn(
          "size-8 rounded-full flex-shrink-0 flex items-center justify-center",
          cfg.dot,
          ring,
        )}
      >
        <Wallet className="size-3.5 text-white" />
      </div>
    );
  }
  if (status === "rejected") {
    return (
      <div
        className={cn(
          "size-8 rounded-full flex-shrink-0 flex items-center justify-center",
          cfg.dot,
          ring,
        )}
      >
        <X className="size-3.5 text-white stroke-[2.5]" />
      </div>
    );
  }
  if (status === "approved") {
    return (
      <div
        className={cn(
          "size-8 rounded-full flex-shrink-0 flex items-center justify-center",
          cfg.dot,
          ring,
        )}
      >
        <CheckCircle2 className="size-4 text-white" />
      </div>
    );
  }
  return (
    <div
      className={cn(
        "size-8 rounded-full flex-shrink-0 flex items-center justify-center",
        cfg.dot,
        ring,
      )}
    >
      <Timer className="size-3.5 text-white" />
    </div>
  );
};

const DocField = ({ label, value, fullWidth }) => (
  <div
    className={cn(
      "rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5",
      fullWidth && "col-span-2",
    )}
  >
    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-1">{label}</p>
    <p className="text-xs font-semibold text-slate-800 break-words">{value || "—"}</p>
  </div>
);

const DocImage = ({ label, url, doc }) => {
  const imageUrl = url ?? doc?.url;
  const imageLabel = label ?? doc?.docType ?? doc?.name ?? "Document";
  const isVerificationDocument = doc?.docType?.includes("id");

  return (
    <div className="flex flex-col items-start gap-1.5">
      {imageUrl ? (
        <div
          className={cn(
            "rounded-lg border overflow-hidden border-slate-200 object-cover bg-white shadow-sm max-w-full",
            {
              "w-[400px] aspect-video": isVerificationDocument,
              "h-52 aspect-auto": !isVerificationDocument,
            },
          )}
        >
          <SmoothZoomImageWrapper
            zoomScale={1.2}
            duration={600}
            easing="cubic-bezier(0.22, 1, 0.36, 1)"
            enableParallax={true}
            hoverOnly={true}
          // style={{ maxWidth: 400, aspectRatio: "16/9" }}
          >
            <img src={imageUrl} alt={imageLabel} className="w-full h-full object-cover" />
          </SmoothZoomImageWrapper>
        </div>
      ) : (
        <div className="h-20 w-28 rounded-lg border border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-1">
          <ImageIcon className="size-4 text-slate-300" />
          <span className="text-[9px] text-slate-400">No image</span>
        </div>
      )}
      <span className="text-[10px] font-medium text-slate-500">{formatLabel(imageLabel)}</span>
    </div>
  );
};

const DocumentsGallery = ({ documents, className = "" }) =>
  documents?.length > 0 ? (
    <div className={cn("flex gap-4 flex-wrap pt-1", className)}>
      {documents.map((doc, i) => (
        <DocImage key={`${doc.docType ?? doc.name}-${i}`} doc={doc} />
      ))}
    </div>
  ) : null;

// Document photos for the ID Document step — sized to fill the panel column
// (two+ docs side-by-side, a single doc as one wide card) instead of the small
// fixed thumbnails of the generic gallery. object-contain keeps the whole
// document (incl. MRZ lines) visible without cropping.
const IdDocumentsGallery = ({ documents }) => {
  const docs = (documents || []).filter((d) => d?.url);
  if (!docs.length) return null;

  return (
    <div
      className={cn(
        "grid gap-4",
        docs.length > 1 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 max-w-[560px]",
      )}
    >
      {docs.map((doc, i) => {
        const side = doc.type && !["both", ""].includes(String(doc.type).toLowerCase());
        const label = side
          ? `${formatLabel(doc.docType || "Document")} — ${formatLabel(doc.type)}`
          : formatLabel(doc.docType || doc.name || "Document");
        return (
          <figure
            key={`${doc.url}-${i}`}
            className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden"
          >
            <div className=" bg-slate-50">
              <SmoothZoomImageWrapper
                zoomScale={1.35}
                duration={600}
                easing="cubic-bezier(0.22, 1, 0.36, 1)"
                hoverOnly={true}
              >
                <Image
                  height={200}
                  width={500}
                  src={doc.url}
                  alt={label}
                  className="w-full h-full "
                />
              </SmoothZoomImageWrapper>
            </div>
            <figcaption className="flex items-center justify-between gap-2 px-3 py-2 border-t border-slate-100 bg-slate-50/60">
              <span className="text-[11px] font-medium text-slate-700">{label}</span>
              {doc.name && (
                <span className="text-[10px] text-slate-400 truncate max-w-[50%]">{doc.name}</span>
              )}
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
};

const DataFieldsGrid = ({ data, excludeKeys = [] }) => {
  const entries = Object.entries(data || {}).filter(
    ([key, val]) =>
      !RESERVED_DATA_KEYS.has(key) && !excludeKeys.includes(key) && val != null && val !== "",
  );
  if (entries.length === 0) return null;

  const addressKey = entries.find(([key]) => key.toLowerCase() === "address")?.[0];
  const gridEntries = entries.filter(([key]) => key !== addressKey);

  return (
    <div className="grid grid-cols-2 gap-2.5">
      {gridEntries.map(([key, val]) => (
        <DocField key={key} label={formatFieldLabel(key)} value={formatFieldValue(val)} />
      ))}
      {addressKey && (
        <DocField label="Address" value={formatFieldValue(data[addressKey])} fullWidth />
      )}
    </div>
  );
};

const EmptyStepState = ({ step }) => (
  <p className="text-xs text-slate-400 italic">
    {step.required ? "Awaiting submission" : "No data submitted yet"}
  </p>
);

const WarnBox = ({ warnings }) =>
  warnings?.length > 0 ? (
    <div className="space-y-2">
      {warnings.map((w, i) => (
        <div
          key={i}
          className="flex gap-2.5 items-start rounded-lg bg-red-50 border border-red-100 px-3 py-2.5"
        >
          <AlertTriangle className="size-3.5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-700 leading-relaxed">{w}</p>
        </div>
      ))}
    </div>
  ) : null;

// ── Per-step content ──

const JourneyStartContent = ({ step, journey }) => {
  const data = step.data || {};
  const meta = journey?.metadata || {};

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
      {(data.invite_method ?? meta.invite_method) && (
        <span>
          invite_method:{" "}
          <span className="font-medium text-slate-700">
            {data.invite_method ?? meta.invite_method}
          </span>
        </span>
      )}
      {(data.applicant_created ?? meta.applicant_created) !== undefined && (
        <span>
          applicant_created:{" "}
          <span className="font-medium text-slate-700">
            {String(data.applicant_created ?? meta.applicant_created)}
          </span>
        </span>
      )}
      {(data.startedAt ?? meta.startedAt ?? journey?.createdAt) && (
        <span className="font-mono text-slate-600">
          {data.startedAt
            ? data.startedAt
            : journey?.createdAt
              ? dateShowFormat(journey.createdAt)
              : meta.startedAt}
          {(data.completedAt ?? meta.completedAt)
            ? ` → ${data.completedAt ?? meta.completedAt}`
            : ""}
        </span>
      )}
      {journey?.provider && (
        <span>
          provider:{" "}
          <span className="font-medium text-slate-700">{formatLabel(journey.provider)}</span>
        </span>
      )}
    </div>
  );
};

const LivenessContent = ({ step }) => {
  const data = step.data || {};

  return (
    <div className="space-y-4">
      {(data.result || data.poses?.length > 0) && (
        <div className="grid grid-cols-3 gap-2.5">
          {/* {data.result && (
            <DocField
              label="Verdict"
              value={data.result.detected ? "Liveness Detected" : "Not Detected"}
            />
          )} */}
          {/* {data.poses?.map((pose) => (
            <DocField
              key={pose.index ?? pose.name}
              label={`Pose ${pose.index ?? ""}`.trim()}
              value={pose.name}
            />
          ))} */}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.5rem" }}>
        <div className="full-span-subgrid">
          Result:{" "}
          <span className="font-bold text-slate-700">{data?.providerResponse?.verdict}</span>
        </div>
        <div className="full-span-subgrid">
          timestamp: <span className="font-bold text-slate-700">{data?.checkedAt}</span>
        </div>
      </div>
      <DocumentsGallery documents={step.documents} />
      {!data.result && !data.poses?.length && !step.documents?.length && (
        <EmptyStepState step={step} />
      )}
    </div>
  );
};

// Compact side-by-side thumbnail used by the Face Verification card.
const FaceThumb = ({ url, label }) => (
  <div className="flex flex-col items-center gap-1.5">
    {url ? (
      <div className="size-28 rounded-lg overflow-hidden border border-slate-200 bg-white shadow-sm">
        <SmoothZoomImageWrapper
          zoomScale={1.4}
          duration={600}
          easing="cubic-bezier(0.22, 1, 0.36, 1)"
          hoverOnly={true}
        >
          <img src={url} alt={label} className="w-full h-full object-cover" />
        </SmoothZoomImageWrapper>
      </div>
    ) : (
      <div className="size-28 rounded-lg border border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-1">
        <ImageIcon className="size-4 text-slate-300" />
        <span className="text-[9px] text-slate-400">No image</span>
      </div>
    )}
    <span className="text-[10px] font-medium text-slate-500">{label}</span>
  </div>
);

// Matched / No-Match pill for the face verification result.
const FaceMatchBadge = ({ matched }) => (
  <Badge
    variant="outline"
    className={cn(
      "text-[10px] font-semibold gap-1",
      matched
        ? "text-emerald-700 border-emerald-200 bg-emerald-50"
        : "text-red-700 border-red-200 bg-red-50",
    )}
  >
    <span className={cn("size-1.5 rounded-full", matched ? "bg-emerald-500" : "bg-red-500")} />
    {matched ? "Face Matched" : "No Match"}
  </Badge>
);

// Similarity percentage + progress bar.
const SimilarityBar = ({ similarity, matched }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-slate-500">Similarity</span>
      <span className="font-semibold text-slate-800">{similarity.toFixed(1)}%</span>
    </div>
    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
      <div
        className={cn("h-full rounded-full", matched ? "bg-emerald-500" : "bg-red-400")}
        style={{ width: `${Math.min(Math.max(similarity, 0), 100)}%` }}
      />
    </div>
  </div>
);

const FaceMetaRow = ({ data }) => (
  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
    {data.model && (
      <span>
        model: <span className="font-mono text-slate-700">{data.model}</span>
      </span>
    )}
    {data.checkedAt && (
      <span>
        checked: <span className="text-slate-700">{dateShowFormat(data.checkedAt)}</span>
      </span>
    )}
  </div>
);

// Face match result (from the doc_face_verified event) — document photo vs
// selfie similarity. Rendered inside the combined "ID Document & Selfie"
// section (and on a standalone Selfie step only when a journey has no ID
// document). Manual Approve/Reject lives in the step header (StepReviewButtons).
const FaceMatchResult = ({ data, docUrl, selfieUrl }) => {
  const matched = data.verificationStatus === 1;
  const similarity = Number(data.similarity);
  const hasSimilarity = Number.isFinite(similarity);
  const errors = Array.isArray(data.apiErrors) ? data.apiErrors : null;

  console.log({ matched })
  console.log({ data })
  console.log(data.verificationStatus)

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <ScanFace className="size-4 text-slate-500" />
          <span className="text-xs font-semibold text-slate-800">Face Verification</span>
          <span className="text-[10px] text-slate-400">document photo vs selfie</span>
        </div>
        <FaceMatchBadge matched={matched} />
      </div>

      {(docUrl || selfieUrl) && (
        <div className="flex items-center gap-4">
          <FaceThumb url={docUrl} label="Document photo" />
          <span className="text-slate-300 text-lg">↔</span>
          <FaceThumb url={selfieUrl} label="Selfie" />
        </div>
      )}

      {hasSimilarity && <SimilarityBar similarity={similarity} matched={matched} />}

      <FaceMetaRow data={data} />

      {errors?.length > 0 && <WarnBox warnings={errors} />}
    </div>
  );
};

// Standalone Selfie step — only rendered when a journey has a selfie step but
// no id_document step; otherwise VerificationJourneyPanel merges the selfie
// into the combined "ID Document & Selfie" section.
const SelfieContent = ({ step, journey }) => {
  const hasVerdict = (d) => d?.verificationStatus !== undefined || d?.similarity !== undefined;

  // The face verdict is written to both the selfie and id_document steps; fall
  // back to the ID document step for older records where it only landed there.
  const idDocStep = (journey?.steps || []).find((s) => s.type === "id_document");
  const ownData = step.data || {};
  const data = hasVerdict(ownData) ? ownData : hasVerdict(idDocStep?.data) ? idDocStep.data : ownData;
  const hasFaceMatch = hasVerdict(data);

  const selfieUrl = (step.documents || []).find((d) => d?.url)?.url ?? null;
  const docUrl =
    (idDocStep?.documents || []).find((d) => String(d?.type).toLowerCase() === "front")?.url ??
    (idDocStep?.documents || []).find((d) => d?.url)?.url ??
    null;

  if (hasFaceMatch) {
    return <FaceMatchResult data={data} docUrl={docUrl} selfieUrl={selfieUrl} />;
  }
  if (selfieUrl) {
    return (
      <div className="flex flex-wrap items-start gap-4">
        <FaceThumb url={selfieUrl} label="Selfie" />
        <p className="text-xs text-slate-400 pt-2">Face verification has not run yet.</p>
      </div>
    );
  }
  return <EmptyStepState step={step} />;
};

// Combined "ID Document & Selfie" section — document images, the data
// extracted off the document (OCR) and the face verification card (document
// photo vs selfie) in one place. The selfie step is merged into this section
// by VerificationJourneyPanel; Approve/Reject cascades to both steps.
const IdDocumentContent = ({ step, journey }) => {
  const data = step.data || {};
  const legacyFields = data.ocrResult?.fields || data.fields || {};
  const warnings = data.warnings;

  console.log('step data', step)

  // Face verdict — written to both steps; read ours, fall back to the selfie
  // step (older records). Journey-step documents carry no front/back `type`
  // (sanitizeDocuments drops it), so the first ID doc is the front side.
  const selfieStep = (journey?.steps || []).find((s) => s.type === "selfie");

  const hasVerdict = (d) => d?.verificationStatus !== undefined || d?.similarity !== undefined;


  const faceData = hasVerdict(data) ? data : hasVerdict(selfieStep?.data) ? selfieStep.data : null;
  const faceDocUrl =
    (step.documents || []).find((d) => String(d?.type).toLowerCase() === "front")?.url ??
    (step.documents || []).find((d) => d?.url)?.url ??
    null;
  const faceSelfieUrl = (selfieStep?.documents || []).find((d) => d?.url)?.url ?? null;

  const ocrEntries = Object.entries(data.ocr?.fields || {}).filter(
    ([, value]) => value && typeof value !== "object",
  );
  const addressBreakdown = Object.entries(data.ocr?.fields?.address_breakdown || {}).filter(
    ([, value]) => value,
  );
  const hasOcr = ocrEntries.length > 0 || addressBreakdown.length > 0;
  const documentLabel = data.ocr?.cardType || data.ocr?.detectedType || null;

  return (
    <div className="space-y-4">
      {(data.sumsubStatuses?.length > 0 || data.lastChecked) && (
        <div className="flex items-center gap-3 flex-wrap text-xs">
          {data.sumsubStatuses?.length > 0 && (
            <span className="font-mono text-slate-500">
              Verification: {data.sumsubStatuses.join(" → ")}
            </span>
          )}
          {data.lastChecked && (
            <span className="ml-auto text-slate-500">
              Last checked: <span className="font-mono text-slate-700">{data.lastChecked}</span>
            </span>
          )}
        </div>
      )}

      <WarnBox warnings={warnings} />

      {!data.ocr && Object.keys(legacyFields).length > 0 && <DataFieldsGrid data={legacyFields} />}

      {hasOcr ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-6 xl:col-span-5">
            <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/60">
                <div className="flex items-center gap-2">
                  <FileText className="size-4 text-slate-500" />
                  <span className="text-xs font-semibold text-slate-800">
                    Extracted Document Data
                  </span>
                </div>
                {documentLabel && (
                  <Badge
                    variant="outline"
                    className="text-[10px] font-medium text-slate-600 border-slate-200 bg-white"
                  >
                    {documentLabel}
                  </Badge>
                )}
              </div>

              <div className="px-4 divide-y divide-slate-100">
                {ocrEntries.map(([key, value]) => (
                  <div key={key} className="flex items-start justify-between gap-3 py-2">
                    <span className="text-[11px] text-slate-500 whitespace-nowrap">
                      {formatFieldLabel(key)}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-800 text-right break-words min-w-0">
                      {String(value)}
                    </span>
                  </div>
                ))}
              </div>

              {addressBreakdown.length > 0 && (
                <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/40">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    Address Breakdown
                  </p>
                  <div className="space-y-1">
                    {addressBreakdown.map(([key, value]) => (
                      <div key={key} className="flex items-start justify-between gap-3">
                        <span className="text-[11px] text-slate-500 whitespace-nowrap">
                          {formatFieldLabel(key)}
                        </span>
                        <span className="text-[11px] font-medium text-slate-700 text-right break-words min-w-0">
                          {String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="lg:col-span-6 xl:col-span-7">
            <IdDocumentsGallery documents={step.documents} />
          </div>
        </div>
      ) : (
        step.documents?.length > 0 && <IdDocumentsGallery documents={step.documents} />
      )}

      {faceData && (
        <FaceMatchResult data={faceData} docUrl={faceDocUrl} selfieUrl={faceSelfieUrl} />
      )}

      {!warnings?.length &&
        !faceData &&
        !hasOcr &&
        !Object.keys(legacyFields).length &&
        !step.documents?.length && <EmptyStepState step={step} />}
    </div>
  );
};

const FundsWealthContent = ({ step }) => {
  const data = step.data || {};
  const fields = data.fields || data;

  return (
    <div className="space-y-3">
      {data.submittedAt && (
        <p className="text-xs text-slate-500">
          Submitted: <span className="font-mono text-slate-700">{data.submittedAt}</span>
        </p>
      )}
      {/* <DataFieldsGrid data={fields} /> */}
      <div className="flex items-center gap-2">
        <span className="text-xs uppercase text-slate-500">Estimated Trading Volume:</span>
        <span className="font-semibold text-slate-700">
          {data?.estimated_trading_volume?.label ?? "N/A"}
        </span>
      </div>
      {!data.submittedAt && !Object.keys(fields).length && !step.documents?.length && (
        <EmptyStepState step={step} />
      )}
    </div>
  );
};

const GenericStepContent = ({ step }) => {
  const data = step.data || {};

  return (
    <div className="space-y-3">
      <WarnBox warnings={data.warnings} />
      <DataFieldsGrid data={data} />
      <DocumentsGallery documents={step.documents} />
      {!data.warnings?.length && !Object.keys(data).length && !step.documents?.length && (
        <EmptyStepState step={step} />
      )}
    </div>
  );
};

const STEP_CONTENT_MAP = {
  journey_start: JourneyStartContent,
  personal_form: GenericStepContent,
  liveness: LivenessContent,
  id_document: IdDocumentContent,
  selfie: SelfieContent,
  proof_of_address: GenericStepContent,
  questionnaire: GenericStepContent,
  funds_wealth: FundsWealthContent,
  declaration: GenericStepContent,
  authorization: GenericStepContent,
  consent: GenericStepContent,
  review: GenericStepContent,
};

const stepHasContent = (step) => {
  const data = step.data || {};
  return (
    step.type === "journey_start" || step.documents?.length > 0 || Object.keys(data).length > 0
  );
};

const TimelineStep = ({ step, journey, isLast, customerId, onUpdated }) => {
  const StepContent = STEP_CONTENT_MAP[step.type] ?? GenericStepContent;
  const isCompact = step.type === "journey_start";
  const label = getStepLabel(step);
  const data = step.data || {};

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <StepIcon status={step.status} type={step.type} />
        {!isLast && <div className="w-px flex-1 bg-slate-200 min-h-6 mt-2" />}
      </div>

      <div className={cn("flex-1 min-w-0", isLast ? "pb-0" : "pb-8")}>
        <div className="flex flex-wrap items-center gap-2 mb-2.5">
          <h4 className="text-sm font-semibold text-slate-900">{label}</h4>
          <StepBadge status={step.status} />
          {step.attempts > 0 && (
            <span className="text-xs text-slate-500">
              {step.attempts} attempt{step.attempts !== 1 ? "s" : ""}
            </span>
          )}
          {data.time && step.type !== "journey_start" && (
            <span className="text-xs font-mono text-slate-500">{data.time}</span>
          )}
          {data.model && step.type === "liveness" && (
            <span className="text-xs text-slate-500">
              model: <span className="font-mono">{data.model}</span>
            </span>
          )}
          {!step.required && (
            <span className="text-[10px] text-slate-400 uppercase tracking-wide">Optional</span>
          )}
          {REVIEWABLE_STEPS.has(step.type) && customerId && journey?._id && (
            <div className="ml-auto">
              <StepReviewButtons
                customerId={customerId}
                journeyId={journey._id}
                stepType={step.type}
                stepLabel={label}
                currentStatus={step.status}
                onUpdated={onUpdated}
                cascadeStepTypes={step._cascadeStepTypes || []}
              />
            </div>
          )}
        </div>

        {step.status === "rejected" && step.rejectionReason && (
          <div className="mb-2.5 flex gap-2.5 items-start rounded-lg bg-red-50 border border-red-200 px-3 py-2.5">
            <AlertTriangle className="size-3.5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-red-700 uppercase tracking-wide">
                Rejection Reason
              </p>
              <p className="text-xs text-red-700 whitespace-pre-line break-words">
                {step.rejectionReason}
              </p>
            </div>
          </div>
        )}

        {isCompact ? (
          <StepContent step={step} journey={journey} />
        ) : stepHasContent(step) ? (
          <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
            <StepContent step={step} journey={journey} />
          </div>
        ) : (
          <EmptyStepState step={step} />
        )}
      </div>
    </div>
  );
};

const VerificationJourneyPanel = ({ journey, journeyIndex, clientLabel, customerId, onUpdated }) => {
  const rawSteps = [...(journey?.steps || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  // Present ID Document + Selfie as ONE reviewable section: the face-match
  // verdict applies to the pair, so a single Approve/Reject cascades to both
  // steps (StepReviewButtons → cascadeSteps). Selfie stays standalone only
  // when the journey has no id_document step.
  const idDocStep = rawSteps.find((s) => s.type === "id_document");
  const selfieStep = rawSteps.find((s) => s.type === "selfie");
  const steps =
    idDocStep && selfieStep
      ? rawSteps
        .filter((s) => s.type !== "selfie")
        .map((s) =>
          s.type === "id_document"
            ? {
              ...s,
              label: "ID Document & Selfie",
              status: combineStepStatus(s.status, selfieStep.status),
              rejectionReason:
                [
                  ...new Set(
                    [s.rejectionReason, selfieStep.rejectionReason].filter(Boolean),
                  ),
                ].join("\n") || undefined,
              _cascadeStepTypes: ["selfie"],
            }
            : s,
        )
      : rawSteps;
  const displayStatus = getJourneyDisplayStatus(journey);
  const statusCfg = JOURNEY_STATUS_CONFIG[displayStatus] ?? STEP_STATUS_CONFIG.pending;
  const meta = journey?.metadata || {};
  const [openEventLog, setOpenEventLog] = useState(false);
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden">
      <div className="bg-white px-5 py-4 border-b border-slate-100">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-900 truncate">
              {clientLabel || `Journey ${journeyIndex + 1}`}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              {journey.createdAt && (
                <>
                  Started:{" "}
                  <span className="text-slate-700">{dateShowFormat(journey.createdAt)}</span>
                </>
              )}
              {journey.onboardingChannel && (
                <>
                  <span className="mx-1.5 text-slate-300">•</span>
                  Channel:{" "}
                  <span className="text-slate-700 capitalize">
                    {formatLabel(journey.onboardingChannel)}
                  </span>
                </>
              )}
              {(meta.source ?? journey.provider) && (
                <>
                  <span className="mx-1.5 text-slate-300">•</span>
                  Source:{" "}
                  <span className="text-slate-700 capitalize">
                    {formatLabel(meta.source ?? journey.provider)}
                  </span>
                </>
              )}
            </p>
          </div>
          {/* <Badge
            variant="outline"
            className={cn("text-xs px-2.5 py-1 shrink-0 gap-1.5", statusCfg.cls)}
          >
            <span className={cn("size-1.5 rounded-full", statusCfg.dot)} />
            {statusCfg.label}
          </Badge> */}
        </div>
      </div>

      <div className="px-5 py-5">
        {steps.length > 0 ? (
          steps.map((step, stepIdx) => (
            <TimelineStep
              key={`${step.type}-${step.order ?? stepIdx}`}
              step={step}
              journey={journey}
              isLast={stepIdx === steps.length - 1}
              customerId={customerId}
              onUpdated={onUpdated}
            />
          ))
        ) : (
          <div className="text-center py-8 text-sm text-slate-400">
            No steps defined for this journey.
          </div>
        )}
      </div>

      {journey.events?.length > 0 && (
        <div className="border-t border-slate-100 bg-white px-5 py-4">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">
            Event Log
          </p>
          <div className="divide-y divide-slate-100">
            {journey.events.slice(0, openEventLog ? journey.events.length : 3).map((event, i) => (
              <div
                key={event._id ?? i}
                className="grid items-start gap-3 py-2.5 text-xs"
                style={{ gridTemplateColumns: "5rem 1fr auto" }}
              >
                <span className="font-mono text-slate-400 tabular-nums">
                  {event.timestamp
                    ? typeof event.timestamp === "string" && event.timestamp.length <= 8
                      ? event.timestamp
                      : dateShowFormat(event.timestamp)
                    : "—"}
                </span>
                <div className="min-w-0">
                  <span className="font-medium text-slate-800">
                    {event.category ?? event.type ?? "Event"}
                  </span>
                  {event.action && <span className="text-slate-500"> / {event.action}</span>}
                  {event.description && (
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      {event.description}
                    </p>
                  )}
                </div>
                {event.status && <StepBadge status={event.status} />}
              </div>
            ))}
            <div className="flex justify-end">
              {journey.events.length > 3 && (
                <Button variant="link" className="" onClick={() => setOpenEventLog(!openEventLog)}>
                  <span className="font-mono  tabular-nums">
                    Show {openEventLog ? "less" : "more"} events
                  </span>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const resolveJourneyClientLabel = (journey, relations) => {
  const relation = relations.find(
    (r) =>
      r.client === journey.client ||
      r.relationIndex === journey.relationIndex ||
      r._id === journey.relation,
  );
  return (
    relation?.clientName ||
    relation?.clientLabel ||
    journey.metadata?.clientName ||
    (relation?.client ? formatLabel(relation.client?.name) : null) ||
    (journey.client ? formatLabel(journey.client?.name) : null)
  );
};

// ─── Identity Check (Sumsub DVS / PERSON check) ──────────────────────────────
// Renders customer.checks (persisted from the Sumsub webhook) as a DVS-style
// "Identity check" card: Input data (what we sent) + Retrieved data (verdict).

const ID_DOC_TYPE_LABELS = {
  DRIVERS: "Driver's Licence",
  PASSPORT: "Passport",
  ID_CARD: "ID Card",
  RESIDENCE_PERMIT: "Residence Permit",
  UTILITY_BILL: "Utility Bill",
};

// Country resolution (alpha-2/alpha-3 → name + flag) lives in @/lib/country,
// backed by countries-alpha3.json.

const isGreen = (answer) => String(answer ?? "").toUpperCase() === "GREEN";

// One label/value row inside the Input data / Retrieved data lists.
const CheckDataRow = ({ label, children }) => (
  <div className="flex items-start justify-between gap-3 py-2">
    <span className="text-[11px] text-slate-500 whitespace-nowrap">{label}</span>
    <span className="text-[11px] font-semibold text-slate-800 text-right break-words min-w-0">
      {children}
    </span>
  </div>
);

const IdentityCheckCard = ({ check }) => {
  const input = check?.inputDoc || {};
  const bg = check?.personBackgroundInfo || {};
  const country = resolveCountry(input.country);
  const docLabel =
    ID_DOC_TYPE_LABELS[input.idDocType] || formatLabel(input.idDocType || "Document");

  const answerGreen = isGreen(check?.answer);
  const idValid = isGreen(bg.identityAnswer ?? check?.answer);

  // Retrieved-data descriptors. Prefer explicit fields from the payload; fall
  // back to DVS defaults for Australian checks (DVS is the AU govt ID source).
  const isDvs = country.name === "Australia";
  const productName =
    bg.productName ??
    (isDvs ? `Document Verification Service (DVS) Validation in ${country.name}` : null);
  const dataSources = bg.dataSources ?? (isDvs ? "Document Verification Service (DVS)" : null);

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/60">
        {answerGreen ? (
          <CheckCircle2 className="size-4 text-emerald-500" />
        ) : (
          <AlertTriangle className="size-4 text-red-500" />
        )}
        <span className="text-sm font-semibold text-slate-800">Identity check</span>
        {check?.createdAt && (
          <>
            <span className="text-slate-300">|</span>
            <span className="text-xs text-slate-500">
              {dateShowFormatWithTime(check.createdAt)}
            </span>
          </>
        )}
        <Badge
          variant="outline"
          className={cn(
            "ml-auto text-[10px] font-semibold gap-1",
            answerGreen
              ? "text-emerald-700 border-emerald-200 bg-emerald-50"
              : "text-red-700 border-red-200 bg-red-50",
          )}
        >
          <span className={cn("size-1.5 rounded-full", answerGreen ? "bg-emerald-500" : "bg-red-500")} />
          {check?.answer || (answerGreen ? "GREEN" : "RED")}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
        {/* Input data */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <User className="size-3.5 text-slate-500" />
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
              Input data
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            <CheckDataRow label="Country">
              {country.flag ? `${country.flag} ` : ""}
              {country.name}
            </CheckDataRow>
            <CheckDataRow label="First name">{input.firstName || "—"}</CheckDataRow>
            <CheckDataRow label="Last name">{input.lastName || "—"}</CheckDataRow>
            <CheckDataRow label={docLabel}>{input.number || "—"}</CheckDataRow>
            {input.additionalNumber && (
              <CheckDataRow label="Additional number">{input.additionalNumber}</CheckDataRow>
            )}
            <CheckDataRow label="Date of birth">{input.dob || "—"}</CheckDataRow>
          </div>
        </div>

        {/* Retrieved data */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <Database className="size-3.5 text-slate-500" />
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
              Retrieved data
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {productName && <CheckDataRow label="Product name">{productName}</CheckDataRow>}
            {dataSources && <CheckDataRow label="Data sources">{dataSources}</CheckDataRow>}
            <CheckDataRow label="Identity document validation">
              <span
                className={cn(
                  "inline-flex items-center gap-1",
                  idValid ? "text-emerald-600" : "text-red-600",
                )}
              >
                {idValid ? (
                  <CheckCircle2 className="size-3.5" />
                ) : (
                  <AlertTriangle className="size-3.5" />
                )}
                {idValid ? "Identity document is valid" : "Identity document is not valid"}
              </span>
            </CheckDataRow>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Collapsible section wrapper ─────────────────────────────────────────────
// Uniform card with a clickable header (chevron + title + optional right slot).
// Default open — collapsing is an option, nothing is hidden on load.
const CollapsibleSection = ({
  title,
  icon: Icon,
  right,
  defaultOpen = true,
  children,
  className,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white overflow-hidden", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-slate-50/70"
      >
        <ChevronDown
          className={cn("size-4 text-slate-400 transition-transform", !open && "-rotate-90")}
        />
        {Icon && <Icon className="size-4 text-slate-500" />}
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">{title}</span>
        {right && <span className="ml-auto flex items-center gap-2">{right}</span>}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
};

const IdentityChecksSection = ({ checks }) => {
  const list = Array.isArray(checks) ? checks.filter(Boolean) : [];
  if (list.length === 0) return null;

  return (
    <CollapsibleSection title="Identity Checks" icon={ShieldCheck}>
      <div className="space-y-3">
        {list.map((check, i) => (
          <IdentityCheckCard key={check?.id ?? i} check={check} />
        ))}
      </div>
    </CollapsibleSection>
  );
};

// ─── Main component ──────────────────────────────────────────────────────────

export const DetailViewModal = ({ details, fetching, onUpdated }) => {
  const [openRelatedParties, setOpenRelatedParties] = useState(false);
  const [selectedJourneyIndex, setSelectedJourneyIndex] = useState(0);


  const riskAssessment = details?.riskAssessment || {};
  const kyc = details?.personalKyc || {};
  const customerDetails = kyc?.personal_form?.customer_details || {};
  const employment = kyc?.personal_form?.employment_details || {};
  const residentialAddress = kyc?.personal_form?.residential_address || {};
  const fundsWealth = kyc?.funds_wealth || {};
  const soleTrader = kyc?.sole_trader || {};

  const riskScore = details?.riskScore ?? 0;
  const riskLabel = details?.riskLabel ?? "";

  const rejectionReason = details?.kycRejectReason;
  const kycHistory = details?.kycHistory || [];
  const relations = details?.relations || [];
  const journeys = details?.journeys || [];
  // console.log("details", details);

  console.log({ details })

  // Parse kycRejectReason into segments for display
  const parsedRejection = rejectionReason
    ? rejectionReason.split("\n").reduce((acc, line) => {
      if (!line.trim()) return acc;
      if (line.startsWith("- ")) {
        acc.push({ type: "bullet", text: line.slice(2) });
      } else {
        acc.push({ type: "line", text: line });
      }
      return acc;
    }, [])
    : [];

  return (
    <div>
      {parsedRejection.length > 0 && (
        <Card className="border-0 border-l-4 border-l-warning overflow-hidden bg-warning/5 py-3.5">
          <div className="px-4 ">
            <SectionLabel>KYC Rejection Reason</SectionLabel>
            <div className="space-y-1 flex gap-2">
              {parsedRejection.map((seg, i) => {
                if (seg.type === "bullet") {
                  return (
                    <div key={i} className="flex gap-2 items-start pl-2">
                      <span className="text-warning-foreground mt-0.5 text-xs">–</span>
                      <p className="text-xs text-warning-foreground/90">{seg.text}</p>
                    </div>
                  );
                }
                return (
                  <p
                    key={i}
                    className={cn(
                      "text-xs",
                      i === 0 ? "font-semibold text-warning-foreground" : "text-muted-foreground",
                    )}
                  >
                    {seg.text}
                  </p>
                );
              })}
            </div>
          </div>
        </Card>
      )}
      <div className="grid grid-cols-12 gap-5 lg:gap-8">
        {/* Related parties trigger */}
        {/* <div className="fixed top-1/2 right-0 transform -translate-y-1/2 z-10">
          <Button variant="outline" size="icon" onClick={() => setOpenRelatedParties(true)}>
            <GitPullRequest className="size-4" />
          </Button>
        </div> */}

        {/* ── LEFT SIDEBAR ─────────────────────────────────────────────────────── */}
        <div className="col-span-12 lg:col-span-3">
          {/* Customer Profile */}
          <CollapsibleSection title="Customer Profile" icon={User} className="mb-5">
            <div className="flex gap-4 items-center ">
              <Avatar className="size-14 rounded-lg mb-2 border">
                <AvatarImage
                  src={resolveSelfieUrl(details) || details?.user?.photoUrl}
                  className="object-cover"
                />
                <AvatarFallback className="bg-primary/10 text-primary rounded-lg">
                  <User className="size-7" />
                </AvatarFallback>
              </Avatar>
              <div>
                {/* user is null for TM demo / manually imported customers — fall back to KYC */}
                <h4 className="font-semibold text-sm leading-tight">
                  {getCustomerIdentity(details).name || "—"}
                </h4>
                <p className="text-[11px] text-muted-foreground ">
                  {getCustomerIdentity(details).email}
                </p>
              </div>
            </div>

            <div>
              <StatRow label="UID" value={details?.uid ?? "—"} positive />
              <StatRow label="Country" value={details?.country ?? "—"} positive />
              <StatRow label="Phone" value={getCustomerIdentity(details).phone || "—"} positive />
              <StatRow
                label="Active"
                value={details?.isActive ? "Active" : "Inactive"}
                positive={details?.isActive}
                negative={!details?.isActive}
              />
              <StatRow
                label="PEP"
                value={details?.isPep ? "Yes" : "No"}
                positive={!details?.isPep}
                negative={details?.isPep}
              />
              <StatRow
                label="Sanction"
                value={details?.sanction ? "Yes" : "No"}
                positive={!details?.sanction}
                negative={details?.sanction}
              />
              <StatRow
                label="AML Status"
                value={formatLabel(details?.amlStatus) || "—"}
                positive={details?.amlStatus === "clear"}
                negative={details?.amlStatus === "flagged"}
              />
              <StatRow
                label="Consent Screen"
                value={details?.consentToScreen ? "Yes" : "No"}
                positive={details?.consentToScreen}
                negative={!details?.consentToScreen}
              />
              <StatRow label="Sequence" value={`#${details?.sequence ?? "—"}`} positive />
              <StatRow
                label="Created"
                value={details?.createdAt ? dateShowFormat(details.createdAt) : "—"}
                positive
              />
            </div>
          </CollapsibleSection>

          {/* Risk Score */}
          <Card className="border-0 ">
            {/* <SectionLabel>Risk Score</SectionLabel>
            <div className="text-center mb-4">
              <div
                className={cn("text-5xl font-bold tracking-tight", getRiskLabelColor(riskLabel))}
              >
                {riskScore}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Risk Label:{" "}
                <span className={cn("font-semibold", getRiskLabelColor(riskLabel))}>
                  {riskLabel || "—"}
                </span>
              </p>
            </div> */}
            {/* <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  getRiskProgressColor(riskLabel),
                )}
                style={{ width: `${riskPercent}%` }}
              />
            </div> */}
            <CollapsibleSection
              title="Risk Assessment Breakdown"
              right={
                <span className={cn("text-sm font-bold", getRiskLabelColor(riskLabel))}>
                  {riskScore}
                  <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                    • {riskLabel}
                  </span>
                </span>
              }
            >
              <div className="grid grid-cols-1 gap-3">
                <RiskScoreCard name="Customer Type" item={riskAssessment?.customerType} />
                <RiskScoreCard name="Jurisdiction" item={riskAssessment?.jurisdiction} />
                <RiskScoreCard name="Customer Retention" item={riskAssessment?.customerRetention} />
                <RiskScoreCard name="Channel" item={riskAssessment?.channel} />
                <RiskScoreCard name="Occupation" item={riskAssessment?.occupation} />
                <RiskScoreCard name="Product / Industry" item={riskAssessment?.product} />
              </div>
            </CollapsibleSection>
          </Card>
        </div>

        {/* ── RIGHT MAIN CONTENT ────────────────────────────────────────────────── */}
        <div className="col-span-12 lg:col-span-9 space-y-5">
          {/* KYC Rejection Reason */}
          {/* Personal KYC Data */}
          <CollapsibleSection title="Personal KYC Data" icon={User}>
            <div className="grid lg:grid-cols-5 grid-cols-2 md:grid-cols-3 gap-2.5">
              <KycField
                label="Given Name"
                value={customerDetails.given_name}
                encrypted={customerDetails.given_name === "***"}
              />
              <KycField label="Middle Name" value={customerDetails.middle_name} />
              <KycField
                label="Surname"
                value={customerDetails.surname}
                encrypted={customerDetails.surname === "***"}
              />
              <KycField
                label="Date of Birth"
                value={
                  customerDetails.date_of_birth
                    ? dateShowFormat(customerDetails.date_of_birth)
                    : null
                }
              />
              <KycField label="Occupation" value={employment.occupation} />
              <KycField label="Industry" value={employment.industry || "—"} />
              <KycField label="Employer" value={employment.employer_name || "—"} />
              <KycField label="Country" value={formatLabel(residentialAddress.country)} />
              <KycField label="Address" value={residentialAddress.address || "—"} />
              <KycField
                label="State / Postcode"
                value={
                  [residentialAddress.state, residentialAddress.postcode]
                    .filter(Boolean)
                    .join(", ") || "—"
                }
              />
              <KycField label="Source of Funds" value={formatLabel(fundsWealth.source_of_funds)} />
              <KycField
                label="Source of Wealth"
                value={formatLabel(fundsWealth.source_of_wealth)}
              />
              <KycField label="Account Purpose" value={formatLabel(fundsWealth.account_purpose)} />
              <KycField
                label="Estimated Trading Volume"
                value={formatLabel(fundsWealth.estimated_trading_volume)}
              />
              <KycField label="Sole Trader" value={soleTrader.is_sole_trader ? "Yes" : "No"} />
            </div>

            {/* <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-border">
              {[
                {
                  label: "Declarations Accepted",
                  value: details?.declaration?.declarations_accepted,
                },
                {
                  label: "Documents Attested",
                  value: details?.authorized?.documents_attested,
                },
                {
                  label: "Data Encrypted",
                  value: details?.isDataEncrypted,
                },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground">{label}:</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] px-1.5 py-0",
                      value
                        ? "bg-success/10 text-success border-success/20"
                        : "bg-danger/10 text-danger border-danger/20",
                    )}
                  >
                    {value ? "Yes" : "No"}
                  </Badge>
                </div>
              ))}
            </div> */}
          </CollapsibleSection>
          {/* AML Screening — per-match compliance review */}
          {details?._id && (details?.amlHits?.length > 0 || details?.amlStatus || details?.amlCheckedAt) && (
            <AmlMatchesTable customerId={details._id} />
          )}
          {/* Identity Checks (Sumsub DVS) — before verification journeys */}
          <IdentityChecksSection checks={details?.checks} />
          {/* Verification Journey */}
          <CollapsibleSection title="Verification Journeys" icon={Building2}>
            {fetching ? (
              <div className="space-y-6 py-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-4">
                    <div className="size-8 rounded-full bg-slate-200 animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-40 bg-slate-200 rounded animate-pulse" />
                      <div className="h-20 bg-slate-200 rounded-xl animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : journeys.length === 0 ? (
              <div className="text-center py-10 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                <Building2 className="size-8 mx-auto mb-2 text-slate-300" />
                <p className="text-sm text-slate-500">No verification journeys found.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {journeys.length > 1 && (
                  <div className="flex flex-wrap gap-2">
                    {journeys.map((journey, idx) => {
                      const tabLabel = resolveJourneyClientLabel(journey, relations);
                      return (
                        <button
                          key={journey._id ?? `${journey.client}-${idx}`}
                          type="button"
                          onClick={() => setSelectedJourneyIndex(idx)}
                          className={cn(
                            "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                            selectedJourneyIndex === idx
                              ? "border-slate-300 bg-white text-slate-900 shadow-sm"
                              : "border-transparent bg-slate-100 text-slate-600 hover:bg-slate-200/70",
                          )}
                        >
                          <Building2 className="size-3.5" />
                          Journey {idx + 1}
                          {tabLabel && (
                            <span className="text-slate-400 font-normal truncate max-w-[140px]">
                              — {tabLabel}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {journeys.map((journey, idx) =>
                  idx === selectedJourneyIndex ? (
                    <VerificationJourneyPanel
                      key={journey._id ?? `${journey.client}-${idx}`}
                      journey={journey}
                      journeyIndex={idx}
                      clientLabel={resolveJourneyClientLabel(journey, relations)}
                      customerId={details?._id}
                      onUpdated={onUpdated}
                    />
                  ) : null,
                )}
              </div>
            )}
          </CollapsibleSection>
          {kycHistory.length > 0 && (
            <CollapsibleSection title="KYC History">
              <div className="space-y-0">
                {kycHistory.map((entry, i) => {
              const s = KYC_HISTORY_STATUS[entry.status] ?? {
                badge: "bg-slate-50 text-slate-600 border-slate-200",
                dot: "bg-slate-400",
              };
              return (
                <div
                  key={entry._id ?? i}
                  className="flex items-start gap-3 py-2.5 border-b border-dashed border-gray-200 last:border-none"
                >
                  <span
                    className={cn(
                      "mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold border flex-shrink-0 flex items-center gap-1",
                      s.badge,
                    )}
                  >
                    <span className={cn("size-1.5 rounded-full", s.dot)} />
                    {fmt(entry.status)}
                  </span>
                  <p className="flex-1 text-xs text-gray-600 leading-relaxed">
                    {entry.note || "—"}
                  </p>
                  <span className="text-[10px] font-mono text-gray-400 flex-shrink-0">
                    {entry.changedAt ? dateShowFormat(entry.changedAt) : "—"}
                  </span>
                </div>
              );
                })}
              </div>
            </CollapsibleSection>
          )}
          {/* Risk Assessment Breakdown */}
        </div>

        {openRelatedParties && (
          <RelatedPartyDrawer open={openRelatedParties} setOpen={setOpenRelatedParties} />
        )}
      </div>
    </div>
  );
};
