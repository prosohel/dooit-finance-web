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
          className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-black/[0.08] bg-white pl-2 pr-2.5 text-xs font-medium text-heading transition-[background-color,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] [@media(hover:hover)]:hover:bg-black/[0.025] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
        >
          <Radar className="size-3.5 text-sky-600" />
          OSINT
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
