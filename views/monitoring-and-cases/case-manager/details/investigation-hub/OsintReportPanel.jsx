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
          className="group fixed right-0 top-1/2 z-40 flex -translate-y-1/2 translate-x-1.5 flex-col items-center gap-2 rounded-l-2xl border border-r-0 border-sky-200/70 bg-white/95 py-3 pl-2 pr-3.5 shadow-[0_8px_24px_-6px_rgba(2,132,199,0.35)] backdrop-blur transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] [@media(hover:hover)]:hover:translate-x-0 active:scale-[0.96] focus-visible:translate-x-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
        >
          {/* Life-orb: breathing glow, expanding pulse ring, radar sweep */}
          <span className="relative flex size-9 items-center justify-center">
            <span className="osint-orb-ring absolute inset-0 rounded-full border-2 border-sky-400" />
            <span className="osint-orb relative flex size-9 items-center justify-center overflow-hidden rounded-full">
              <span className="osint-orb-sweep absolute inset-0 rounded-full" />
              <Radar className="relative size-4.5 text-white drop-shadow-[0_1px_1px_rgba(7,89,133,0.6)]" />
            </span>
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-700 [writing-mode:vertical-rl]">
            OSINT
          </span>
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="w-[420px] gap-0 sm:max-w-[420px]">
        <SheetHeader className="shrink-0 px-5 pb-2 pt-5">
          <SheetTitle className="flex items-center gap-2 text-[15px] font-semibold text-heading">
            <span className="flex size-6 items-center justify-center rounded-md bg-sky-50 text-sky-600">
              <Radar className="size-3.5" />
            </span>
            OSINT report
          </SheetTitle>
          <SheetDescription className="sr-only">
            Open-source intelligence findings for this case.
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <OsiintData caseData={caseData} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
