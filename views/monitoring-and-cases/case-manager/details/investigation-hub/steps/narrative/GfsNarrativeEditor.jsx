"use client";

import ReportNarrativeEditor from "./ReportNarrativeEditor";
import { GFS_SECTIONS } from "./gfsFields";

const GFS_FORM_PATH = "/dashboard/client/report-compliance/smr-filing/gfs/form";

/**
 * The case's GFS, edited in the Investigation Hub — the same GFS record the
 * standalone GFS form opens, not a copy (docs/74 phase C8).
 */
export default function GfsNarrativeEditor({ caseId }) {
  return <ReportNarrativeEditor caseId={caseId} type="gfs" label="GFS" sections={GFS_SECTIONS} formPath={GFS_FORM_PATH} />;
}
