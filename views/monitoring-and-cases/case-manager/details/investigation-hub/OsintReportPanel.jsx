"use client";

import { Radar } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import OsiintData from "../OsiintData";

/**
 * OSINT report, collapsed to a slim icon tab at the right of the grid so the
 * step workspace gets the room. Clicking the tab slides the full report in as
 * a drawer, letting the analyst read open-source findings without leaving
 * the step they are working on.
 */
export default function OsintReportPanel({ caseData }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          title="Open OSINT report"
          aria-label="Open OSINT report"
          className="group inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 text-xs font-semibold text-sky-700 transition-colors hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
        >
          <Radar className="size-3.5 transition-transform duration-500 group-hover:rotate-180" />
          OSINT
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="w-[420px] gap-0 sm:max-w-[420px]">
        <SheetHeader className="shrink-0 px-4 py-3">
          <SheetTitle className="flex items-center gap-2.5 text-[12.5px] font-bold text-sky-700">
            <Radar className="size-3.5" />
            OSINT REPORT
          </SheetTitle>
          <SheetDescription className="sr-only">
            Open-source intelligence findings for this case.
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <OsiintData caseData={caseData} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
