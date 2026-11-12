"use client";
// "Upload Document" button + modal for the reviewer-side SOF panel.
//
// Lets staff upload a Source of Funds document on the customer's behalf (e.g.
// one the customer emailed or handed over in branch). The API runs it through
// the same OCR + storage pipeline as the customer's own QR upload.
//
// Used by SofVerification, so it appears on both the customer details page
// (onboarding queue) and the case details Source of Funds tab.

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CustomDropZone from "@/components/ui/DropZone";
import { Upload } from "lucide-react";
import { IconLoader2 } from "@tabler/icons-react";
import { uploadSofDocumentAsStaff } from "@/app/dashboard/client/onboarding/customer-queue/actions";

// Same formats the customer's QR page accepts. The size cap is the Next.js
// server-action body limit (next.config.mjs → 10mb), which the file passes
// through on its way to the API.
const ACCEPTED_EXTENSIONS = ["pdf", "png", "jpg", "jpeg", "webp", "heic", "heif"];
const MAX_FILE_MB = 10;

/**
 * @param {string}   customerId  customer the document belongs to
 * @param {string}   [caseId]    set when opened from a case — recorded in the audit log
 * @param {object}   docTypeLabels  { bank_statement: "Bank Statement", ... }
 * @param {Function} onUploaded  called with the updated SOF session after a successful upload
 */
export default function SofUploadDialog({ customerId, caseId, docTypeLabels, onUploaded }) {
  const [open, setOpen] = useState(false);
  const [docType, setDocType] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const resetForm = () => {
    setDocType("");
    setFile(null);
  };

  // Don't let the modal close mid-upload; clear the form whenever it closes.
  const handleOpenChange = (next) => {
    if (uploading) return;
    setOpen(next);
    if (!next) resetForm();
  };

  // Extension + size check before the file is accepted into the form.
  const handleFileSelected = (picked) => {
    if (!picked) return;
    const ext = (picked.name?.split(".").pop() || "").toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      toast.error(`File type .${ext || "?"} is not supported. Upload a PDF or image.`);
      return;
    }
    if (picked.size > MAX_FILE_MB * 1024 * 1024) {
      toast.error(`File is too large — the limit is ${MAX_FILE_MB} MB.`);
      return;
    }
    setFile(picked);
  };

  const handleUpload = async () => {
    if (!file || !docType || uploading) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("docType", docType);
      formData.append("file", file);
      if (caseId) formData.append("caseId", caseId);

      const res = await uploadSofDocumentAsStaff(customerId, formData);
      if (!res?.success) {
        toast.error(res?.error || res?.message || "Upload failed");
        return;
      }

      // The new document is the last one on the returned session. Rejected =
      // OCR says it isn't a valid bank document: it stays in the list with the
      // reason, but the file itself isn't stored.
      const newDoc = res.data?.documents?.at(-1);
      if (newDoc?.status === "rejected") {
        toast.error(res.message || "Document could not be verified");
      } else {
        toast.success(res.message || "Document uploaded");
      }

      onUploaded?.(res.data);
      setOpen(false);
      resetForm();
    } catch (error) {
      console.error("Staff SOF upload failed", error);
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Button size="sm" className="text-xs" onClick={() => setOpen(true)} disabled={!customerId}>
        <Upload className="size-4" /> Upload Document
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Source of Funds Document</DialogTitle>
            <DialogDescription>
              Upload a document on the customer&apos;s behalf. It is checked by OCR and
              added to the customer&apos;s documents, same as a QR upload.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Document Type</Label>
              <Select value={docType} onValueChange={setDocType} disabled={uploading}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(docTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">File</Label>
              <CustomDropZone
                fileTypes={ACCEPTED_EXTENSIONS}
                handleChange={handleFileSelected}
                file={file}
                setFile={setFile}
                loading={uploading}
                disabled={uploading}
              />
              <p className="text-[11px] text-muted-foreground">
                PDF or image, up to {MAX_FILE_MB} MB.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={uploading}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={!file || !docType || uploading}>
              {uploading ? (
                <IconLoader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              {uploading ? "Verifying..." : "Upload & Verify"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
