"use client";

import { Textarea } from "@/components/ui/textarea";
import { FieldLabel, ListTextarea, SuggestionCard } from "./SmrBits";

export default function SmrPartB({ draft }) {
  const { values, change } = draft;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <FieldLabel
          label="3. Grounds for suspicion — nature and circumstances surrounding the matter"
          path="partB.groundsForSuspicion"
          draft={draft}
          htmlFor="smr-partB.groundsForSuspicion"
        />
        <div className="text-xs italic text-muted-foreground">
          Note: Do not provide account or transaction details here — these are captured in Parts C–F.
        </div>
        <Textarea
          id="smr-partB.groundsForSuspicion"
          value={values["partB.groundsForSuspicion"] || ""}
          onChange={(e) => change("partB.groundsForSuspicion", e.target.value)}
          placeholder="Describe the nature and circumstances of the suspicious matter…"
          className="min-h-[220px] resize-y text-[13.5px] leading-relaxed"
        />
        <SuggestionCard path="partB.groundsForSuspicion" draft={draft} />
      </div>

      <div className="flex flex-col gap-1.5">
        <FieldLabel
          label="Grounds as discrete points (for the filing's bullet list)"
          path="partB.groundsList"
          draft={draft}
          htmlFor="smr-partB.groundsList"
        />
        <ListTextarea path="partB.groundsList" draft={draft} placeholder="One ground per line" />
        <SuggestionCard path="partB.groundsList" draft={draft} />
      </div>

      <div className="flex flex-col gap-1.5">
        <FieldLabel
          label="Investigation notes (working notes — not part of the filing)"
          path="partB.investigationNotes"
          draft={draft}
          htmlFor="smr-partB.investigationNotes"
        />
        <Textarea
          id="smr-partB.investigationNotes"
          value={values["partB.investigationNotes"] || ""}
          onChange={(e) => change("partB.investigationNotes", e.target.value)}
          placeholder="Working notes for the investigation…"
          className="min-h-24 resize-y text-sm"
        />
        <SuggestionCard path="partB.investigationNotes" draft={draft} />
      </div>
    </div>
  );
}
