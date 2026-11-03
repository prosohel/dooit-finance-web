"use client";

import { Button } from "@/components/ui/button";
import { IconArrowLeft, IconArrowRight, IconCheck, IconDeviceFloppy } from "@tabler/icons-react";

export default function StepFooter({ onBack, onNext, onSave, isFirst, isLast }) {
  return (
    <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-white px-6 py-3">
      <Button
        variant="outline"
        size="icon"
        className="size-9 rounded-full"
        onClick={onBack}
        disabled={isFirst}
        aria-label="Previous step"
        title="Previous step"
      >
        <IconArrowLeft className="size-4" />
      </Button>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={onSave}>
          <IconDeviceFloppy className="size-3.5" />
          Save draft
        </Button>
        <Button size="sm" className="gap-1.5 px-4" onClick={onNext}>
          {isLast ? "Confirm" : "Next task"}
          {isLast ? <IconCheck className="size-3.5" /> : <IconArrowRight className="size-3.5" />}
        </Button>
      </div>
    </footer>
  );
}
