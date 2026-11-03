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
          className="group relative flex size-11 shrink-0 self-start items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/40 ring-4 ring-sky-100 transition-all duration-200 hover:scale-110 hover:shadow-xl hover:shadow-sky-500/50 focus-visible:outline-none focus-visible:ring-sky-300 active:scale-95"
        >
          {/* <span className="absolute inset-0 rounded-full bg-sky-400 opacity-60 animate-ping [animation-duration:2.5s] group-hover:hidden" /> */}
          <Radar className="relative size-5 transition-transform duration-500 group-hover:rotate-180" />
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
