"use client";

import { Button } from "@/components/ui/button";
import { IconArrowLeft, IconArrowRight, IconCheck, IconDeviceFloppy } from "@tabler/icons-react";

export default function StepFooter({ onBack, onNext, isFirst, isLast }) {
  return (
    <div className="mt-6 flex items-center justify-between  pt-4">
      <Button variant="outline" size="sm" className="gap-1.5" onClick={onBack} disabled={isFirst}>
        <IconArrowLeft className="size-3.5" />
        Back
      </Button>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="gap-1.5">
          <IconDeviceFloppy className="size-3.5" />
          Save draft
        </Button>
        <Button size="sm" className="gap-1.5" onClick={onNext}>
          {isLast ? "Confirm" : "Next task"}
          {isLast ? <IconCheck className="size-3.5" /> : <IconArrowRight className="size-3.5" />}
        </Button>
      </div>
    </div>
  );
}
