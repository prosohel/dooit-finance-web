"use client";

import { Radar } from "lucide-react";
import OsiintData from "../OsiintData";

/**
 * Inline OSINT report column. Sits to the right of the steps list so the
 * analyst can read open-source findings alongside the step they are working
 * on, without leaving the grid.
 */
export default function OsintReportPanel({ caseData }) {
  return (
    <div className="flex w-[340px] shrink-0 min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-white">
      <div className="flex shrink-0 items-center gap-2.5 border-b-2 border-sky-600 bg-sky-50 px-4 py-2.5">
        <Radar className="size-3.5 text-sky-700" />
        <span className="text-[12.5px] font-bold text-sky-700">OSINT REPORT</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <OsiintData caseData={caseData} />
      </div>
    </div>
  );
}
