"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { FileText, Loader2, RotateCw, X } from "lucide-react";
import { cn, dateShowFormat } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import CustomDropZone from "@/components/ui/DropZone";
import { getCaseDocuments } from "@/app/dashboard/client/monitoring-and-cases/case-manager/actions";
import {
  screenNewDocument,
  screenStoredDocument,
} from "@/app/dashboard/client/monitoring-and-cases/case-manager/tbml-actions";

// What the OSINT engine accepts: a single trade document as an image or a
// multi-page PDF.
const FILE_TYPES = ["PDF", "JPG", "JPEG", "PNG", "TIFF", "WEBP"];
const MAX_BYTES = 25 * 1024 * 1024;

const DOC_TYPES = [
  { value: "trade_document", label: "Trade document", hint: "Invoice, proforma invoice, packing list" },
  { value: "letter_of_credit", label: "Letter of credit", hint: "LC or amendment" },
  { value: "other", label: "Other", hint: "Anything else attached as evidence" },
];

const kb = (bytes) => (bytes ? `${Math.round(bytes / 1024).toLocaleString()} KB` : null);

/**
 * Starts a TBML screening run.
 *
 * Two ways in, because an analyst should never have to find the same file
 * twice: a new document, or one already attached to the case. Either way the
 * API stores the file in FileVault, attaches it to the case and hands the same
 * bytes to the engine in one step — a stored document and its screening run
 * cannot drift apart.
 *
 * The dialog closes as soon as the engine accepts the document. The analysis
 * runs on the server and the tab picks it up; nobody waits here.
 */
export default function NewScreeningDialog({ open, onOpenChange, caseId, caseUid, onSubmitted }) {
  const [file, setFile] = useState(null);
  const [name, setName] = useState("");
  const [docType, setDocType] = useState("trade_document");
  const [submitting, setSubmitting] = useState(false);

  // Documents already on the case, so a stored one can be re-screened without
  // another upload.
  const [stored, setStored] = useState([]);
  const [loadingStored, setLoadingStored] = useState(false);

  const reset = useCallback(() => {
    setFile(null);
    setName("");
    setDocType("trade_document");
  }, []);

  useEffect(() => {
    if (!open || !caseId) return;
    setLoadingStored(true);
    getCaseDocuments(caseId)
      .then((res) => setStored(res?.succeed ? res.data || [] : []))
      .catch(() => setStored([]))
      .finally(() => setLoadingStored(false));
  }, [open, caseId]);

  const handleFileChange = (picked) => {
    if (picked && picked.size > MAX_BYTES) {
      toast.error(`${picked.name} is larger than 25 MB.`);
      return;
    }
    setFile(picked);
    if (picked && !name) setName(picked.name);
  };

  const finish = (payload, message) => {
    toast.success(message);
    onSubmitted?.(payload);
    onOpenChange(false);
    reset();
  };

  const handleStart = async () => {
    if (!file || submitting) return;
    setSubmitting(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name.trim() || file.name);
    formData.append("type", docType);

    const res = await screenNewDocument(caseId, formData);
    setSubmitting(false);

    if (!res?.succeed) {
      toast.error(res?.message || "Could not start the screening run.");
      return;
    }
    finish(
      res.data?.report,
      `Screening queued — typically ${res.data?.estimatedCompletionMinutes || 5} minutes. It runs in the background.`,
    );
  };

  const handleRescreen = async (document) => {
    if (submitting) return;
    setSubmitting(true);

    const res = await screenStoredDocument(caseId, document._id);
    setSubmitting(false);

    if (!res?.succeed) {
      toast.error(res?.message || "Could not start the screening run.");
      return;
    }
    finish(res.data?.report, `"${document.name}" sent for screening. It runs in the background.`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 p-0">
        <DialogHeader className="gap-1 border-b border-border px-6 py-4">
          <DialogTitle className="text-base">Run new TBML screening</DialogTitle>
          <DialogDescription className="text-xs">
            Case {caseUid || caseId} · the document is stored with the case, then extracted,
            price-tested against OSINT market data and scored
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto px-6 py-5">
          <CustomDropZone
            fileTypes={FILE_TYPES}
            handleChange={handleFileChange}
            file={file}
            setFile={setFile}
            loading={submitting}
            disabled={submitting}
          />

          {file && (
            <>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-heading">{file.name}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {kb(file.size)} · {file.type || "unknown type"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  disabled={submitting}
                  className="shrink-0 text-muted-foreground hover:text-danger"
                >
                  <X className="size-3.5" />
                </button>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Document name</Label>
                <Input
                  className="h-9 text-sm"
                  placeholder="Commercial invoice INV-2026-0006"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold">Document type</Label>
                <div className="flex flex-wrap gap-1.5">
                  {DOC_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setDocType(t.value)}
                      disabled={submitting}
                      title={t.hint}
                      className={cn(
                        "rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors",
                        docType === t.value
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground hover:bg-muted/50",
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Screening a document already on the case: no second upload. */}
          {(loadingStored || stored.length > 0) && (
            <div className="flex flex-col gap-1.5 border-t border-border pt-4">
              <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                Or screen a document already on this case
              </p>

              {loadingStored ? (
                <p className="flex items-center gap-1.5 py-2 text-[11px] text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" />
                  Loading case documents…
                </p>
              ) : (
                stored.map((document) => (
                  <div
                    key={document._id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-heading">{document.name}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">
                          {[kb(document.sizeBytes), dateShowFormat(document.uploadedAt)]
                            .filter(Boolean)
                            .join(" · ")}
                          {/* Say it has already been screened rather than
                              letting someone pay for the same run twice. */}
                          {document.tbml?.reportId ? ` · screened ${document.tbml.reportId}` : ""}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 shrink-0 gap-1 px-2 text-[11px]"
                      disabled={submitting}
                      onClick={() => handleRescreen(document)}
                    >
                      <RotateCw className="size-3" />
                      {document.tbml?.reportId ? "Re-screen" : "Screen"}
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-row items-center justify-between border-t border-border bg-muted/20 px-6 py-3.5 sm:justify-between">
          <p className="text-[11px] text-muted-foreground">
            Typical run time 3–5 minutes · continues in the background
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={submitting}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="button" size="sm" disabled={!file || submitting} onClick={handleStart}>
              {submitting && <Loader2 className="size-3.5 animate-spin" />}
              Start screening
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
