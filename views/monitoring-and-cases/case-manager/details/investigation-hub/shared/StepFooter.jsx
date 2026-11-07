"use client";

import { Button } from "@/components/ui/button";
import { IconArrowLeft, IconArrowRight, IconCheck, IconDeviceFloppy } from "@tabler/icons-react";

// Press feedback for every footer action — the hub's most-clicked controls.
const PRESS = "active:scale-[0.97]";

export default function StepFooter({ onBack, onNext, onSave, isFirst, isLast, nextName }) {
  return (
    <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-dashed border-black/[0.09] bg-white px-8 py-3">
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
        <Button
          size="sm"
          className={`group h-9 min-w-0 gap-2 rounded-[10px] pl-4 pr-3.5 transition-[transform,background-color] duration-150 ease-out ${PRESS}`}
          onClick={onNext}
        >
          {isLast ? (
            "Confirm"
          ) : (
            <span className="flex min-w-0 items-baseline gap-1.5">
              Next
              {nextName && (
                <>
                  <span aria-hidden className="opacity-40">·</span>
                  <span className="max-w-[200px] truncate font-normal opacity-75">{nextName}</span>
                </>
              )}
            </span>
          )}
          {isLast ? (
            <IconCheck className="size-3.5" />
          ) : (
            <IconArrowRight className="size-3.5 transition-transform duration-200 ease-out [@media(hover:hover)]:group-hover:translate-x-0.5" />
          )}
        </Button>
      </div>
    </footer>
  );
}
