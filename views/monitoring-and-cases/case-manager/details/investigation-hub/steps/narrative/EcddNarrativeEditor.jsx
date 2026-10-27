"use client";

import ReportNarrativeEditor from "./ReportNarrativeEditor";
import { ECDD_SECTIONS } from "./ecddFields";

const ECDD_FORM_PATH = "/dashboard/client/report-compliance/ecdd/form";

/**
 * The case's ECDD, edited in the Investigation Hub — the same EcddReport the
 * standalone ECDD form opens, not a copy (docs/74 phase C7).
 */
export default function EcddNarrativeEditor({ caseId, onOpenPois }) {
  return (
    <ReportNarrativeEditor
      caseId={caseId}
      type="ecdd"
      label="ECDD"
      sections={ECDD_SECTIONS}
      formPath={ECDD_FORM_PATH}
      onOpenPois={onOpenPois}
    />
  );
}
