"use client";

import { Button } from "@/components/ui/button";
import { IconArrowLeft, IconArrowRight, IconCheck, IconDeviceFloppy } from "@tabler/icons-react";

// Press feedback for every footer action — the hub's most-clicked controls.
const PRESS = "active:scale-[0.97]";

export default function StepFooter({ onBack, onNext, onSave, isFirst, isLast, nextName }) {
  return (
    <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border/70 bg-white px-8 py-3.5">
      <Button
        variant="ghost"
        size="sm"
        className={`gap-1.5 text-muted-foreground hover:text-heading ${PRESS}`}
        onClick={onBack}
        disabled={isFirst}
        title="Previous step"
      >
        <IconArrowLeft className="size-3.5" />
        Back
      </Button>

      <div className="flex min-w-0 items-center gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          className={`gap-1.5 text-muted-foreground hover:text-heading ${PRESS}`}
          onClick={onSave}
        >
          <IconDeviceFloppy className="size-3.5" />
          Save draft
        </Button>
        <Button size="sm" className={`h-9 min-w-0 gap-2 pl-4 pr-3.5 ${PRESS}`} onClick={onNext}>
          {isLast ? (
            "Confirm"
          ) : (
            <span className="flex min-w-0 items-baseline gap-1.5">
              Next
              {nextName && <span className="max-w-[200px] truncate font-normal opacity-75">{nextName}</span>}
            </span>
          )}
          {isLast ? <IconCheck className="size-3.5" /> : <IconArrowRight className="size-3.5" />}
        </Button>
      </div>
    </footer>
  );
}
