"use client";

import { cn } from "@/lib/utils";
import { INVESTIGATION_STEPS } from "../data/investigationHubData";
import EcddNarrativeEditor from "./narrative/EcddNarrativeEditor";
import GfsNarrativeEditor from "./narrative/GfsNarrativeEditor";

// Looked up by kind so reordering the steps cannot point this elsewhere.
const POI_STEP = INVESTIGATION_STEPS.findIndex((s) => s.kind === "poi");

export default function NarrativeStep({ wizard, caseId }) {
  const { narrativeTpl, setNarrativeTpl, goToStep } = wizard;

  return (
    <div>
      <div className="mb-5 inline-flex gap-1 rounded-lg bg-muted/60 p-1">
        {[
          { key: "ecdd", label: "ECDD narrative" },
          { key: "gfs", label: "GFS narrative" },
        ].map((tpl) => (
          <button
            key={tpl.key}
            type="button"
            onClick={() => setNarrativeTpl(tpl.key)}
            className={cn(
              "rounded-md px-4 py-1.5 text-[12.5px] font-semibold transition-colors",
              narrativeTpl === tpl.key
                ? "bg-white text-primary shadow-sm"
                : "text-muted-foreground hover:text-heading",
            )}
          >
            {tpl.label}
          </button>
        ))}
      </div>

      {!caseId ? (
        <p className="text-sm text-muted-foreground">
          Open this workspace from a case to edit its {narrativeTpl === "ecdd" ? "ECDD" : "GFS"}.
        </p>
      ) : narrativeTpl === "ecdd" ? (
        // The case's real ECDD, drafted from the case and autosaved.
        <EcddNarrativeEditor
          caseId={caseId}
          onOpenPois={POI_STEP >= 0 ? () => goToStep(POI_STEP) : undefined}
        />
      ) : (
        // The case's real GFS, drafted from the case and autosaved.
        <GfsNarrativeEditor caseId={caseId} />
      )}
    </div>
  );
}
