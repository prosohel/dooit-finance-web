"use client";

import { useRef, useState } from "react";
import { IconHistory } from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FALSE_POSITIVE_REASONS } from "../data/investigationHubData";

/**
 * Confirms a "Dismiss as false positive" decision and documents it: a required
 * reason and optional comments, both written to the audit trail. The form
 * lives inside DialogContent so it resets only after the exit animation, never
 * visibly while the dialog fades out.
 */
export default function DismissFalsePositiveDialog({ open, onOpenChange, onConfirm, alertCount }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 sm:max-w-[460px]">
        <DismissForm
          alertCount={alertCount}
          onCancel={() => onOpenChange(false)}
          onConfirm={(values) => {
            onConfirm(values);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function DismissForm({ alertCount, onCancel, onConfirm }) {
  const [reason, setReason] = useState("");
  const [comments, setComments] = useState("");
  const commentsRef = useRef(null);
  const isOther = reason === "Other";

  const pickReason = (value) => {
    setReason(value);
    // "Other" says nothing on its own — hand the analyst straight to the box
    // where they can explain. Deferred so the Select can return focus first.
    if (value === "Other") requestAnimationFrame(() => commentsRef.current?.focus());
  };

  const submit = (e) => {
    e.preventDefault();
    if (!reason) return;
    onConfirm({ reason, comments: comments.trim() });
  };

  return (
    <form onSubmit={submit} className="contents">
      <DialogHeader>
        <DialogTitle className="text-base font-semibold tracking-[-0.01em] text-heading">
          Dismiss alert as false positive?
        </DialogTitle>
        <DialogDescription className="text-[13px] leading-relaxed">
          You&apos;re about to close this alert by marking the detected activity as legitimate.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <FieldLabel htmlFor="fp-reason" hint="Required">
            Reason for dismissal
          </FieldLabel>
          <Select value={reason} onValueChange={pickReason}>
            <SelectTrigger id="fp-reason" className="h-9 text-[13px]" aria-required="true">
              <SelectValue placeholder="Select a reason" />
            </SelectTrigger>
            <SelectContent>
              {FALSE_POSITIVE_REASONS.map((r) => (
                <SelectItem key={r} value={r} className="text-[13px]">
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <FieldLabel htmlFor="fp-comments" hint="Optional">
            Additional comments
          </FieldLabel>
          <Textarea
            id="fp-comments"
            ref={commentsRef}
            rows={3}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder={
              isOther
                ? "Describe why this activity is legitimate…"
                : "Add context for reviewers, e.g. supporting evidence checked…"
            }
            className="min-h-20 resize-none text-[13px]"
          />
        </div>

        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <IconHistory className="size-3.5 shrink-0" />
          {alertCount > 1 ? `Closes ${alertCount} open alerts. ` : ""}
          Your name, the time, reason and comments are recorded in the audit trail.
        </p>
      </div>

      <DialogFooter className="gap-2 border-t border-dashed border-black/[0.09] pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        {/* Dark neutral rather than red: this closes the alert, it does not
            delete anything — but it must still read as the weighty action. */}
        <Button
          type="submit"
          disabled={!reason}
          className="bg-heading text-white hover:bg-heading/90"
        >
          Confirm dismissal
        </Button>
      </DialogFooter>
    </form>
  );
}

function FieldLabel({ htmlFor, hint, children }) {
  return (
    <Label htmlFor={htmlFor} className="flex items-baseline gap-1.5 text-xs font-medium text-heading">
      {children}
      <span className="font-normal text-muted-foreground">({hint})</span>
    </Label>
  );
}
