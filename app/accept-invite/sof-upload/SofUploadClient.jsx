"use client";
// Mobile, no-login SOF (Source of Funds) upload flow.
// Reached by scanning a QR / opening a link that carries only the customer
// id (cid) — see sofVerificationController.ensureSofSession. There's no
// rotating token: the link is stable and auto-provisioned server-side per
// customer, same as the invite-accept flow this route is nested under.

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CustomDropZone from "@/components/ui/DropZone";
import {
  Loader2,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  LogOut,
  RotateCcw,
  Lock,
} from "lucide-react";
import { validateSofCustomer, uploadSofDocument } from "./actions";

const DOC_TYPE_OPTIONS = [
  { value: "bank_statement", label: "Bank Statement" },
  { value: "payslip", label: "Payslip" },
  { value: "bank_cheque", label: "Bank Cheque" },
  { value: "bank_certificate", label: "Bank Certificate" },
];

// heic/heif: what iPhone cameras actually produce — the OCR verdict (not the
// picker) decides whether a format is usable, so don't block them at the door.
const ACCEPTED_EXTENSIONS = ["pdf", "png", "jpg", "jpeg", "webp", "heic", "heif"];
// Must match the multer limit on routes/sofVerification.js.
const MAX_FILE_MB = 20;

/**
 * Dooit + requesting organisation lockup. The page is served by Dooit but the
 * document was asked for by the customer's own provider, so both marks are
 * shown — a stranger's upload page is exactly the sort of thing people are
 * told to be suspicious of. Falls back to the client's name as a wordmark when
 * no logo is on file, and to Dooit alone when the client can't be resolved.
 */
function BrandLockup({ client }) {
  const hasClient = Boolean(client?.logoUrl || client?.name);
  return (
    <div className="flex items-center justify-center gap-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="Dooit" className="h-8 w-auto" />
      {hasClient && (
        <>
          <span className="h-7 w-px bg-border" aria-hidden="true" />
          {client.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={client.logoUrl}
              alt={client.name || "Requesting organisation"}
              className="h-7 w-auto max-w-[150px] object-contain"
            />
          ) : (
            <span className="text-sm font-semibold text-foreground">{client.name}</span>
          )}
        </>
      )}
    </div>
  );
}

/** Shared frame so branding and the trust footer appear on every state. */
function PageShell({ client, children }) {
  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8">
      <header className="w-full max-w-md">
        <BrandLockup client={client} />
      </header>
      <main className="w-full max-w-md flex-1 flex flex-col justify-center py-8">{children}</main>
      <footer className="w-full max-w-md">
        <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1.5 text-center">
          <Lock className="size-3 shrink-0" />
          Secured by Dooit - your document is encrypted in transit and used only for verification.
        </p>
      </footer>
    </div>
  );
}

// `clientId` — requesting tenant from the link's ?client= param; drives which
// organisation the page is co-branded for (verified server-side).
export default function SofUploadClient({ cid, clientId }) {
  const [validating, setValidating] = useState(true);
  const [invalidReason, setInvalidReason] = useState(null);
  const [customerName, setCustomerName] = useState(null);
  const [client, setClient] = useState(null);
  const [uploadedList, setUploadedList] = useState([]);

  const [docType, setDocType] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [lastResult, setLastResult] = useState(null); // { status, message, ocr }
  const [exited, setExited] = useState(false);

  // Taps on the drop zone open this hidden input instead of the drag-drop
  // library's own one — MIME-based accept, which phone pickers honour far
  // more reliably than the extension list the library emits.
  const pickerRef = useRef(null);

  // Single gate for every source (drop, tap-to-pick): extension + size
  // checked here so the sources can't diverge.
  const handleFileSelected = (picked) => {
    if (!picked) return;
    const ext = (picked.name?.split(".").pop() || "").toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      toast.error(`File type .${ext || "?"} is not supported. Please upload a PDF or photo.`);
      return;
    }
    if (picked.size > MAX_FILE_MB * 1024 * 1024) {
      toast.error(`File is too large — the limit is ${MAX_FILE_MB} MB.`);
      return;
    }
    setFile(picked);
  };

  // Reset the input value after reading so picking the same file (or retaking
  // a photo) fires onChange again.
  const onNativePick = (e) => {
    handleFileSelected(e.target.files?.[0]);
    e.target.value = "";
  };

  useEffect(() => {
    const run = async () => {
      if (!cid) {
        setInvalidReason("This link is missing required information.");
        setValidating(false);
        return;
      }
      try {
        const res = await validateSofCustomer(cid, clientId);
        if (res?.success) {
          setCustomerName(res.data?.customerName || null);
          setClient(res.data?.client || null);
          setUploadedList(res.data?.documents || []);
        } else {
          setInvalidReason(res?.error || res?.message || "This link is invalid.");
        }
      } catch (error) {
        setInvalidReason("Unable to verify this link. Please try again.");
      } finally {
        setValidating(false);
      }
    };
    run();
  }, [cid, clientId]);

  const resetForm = () => {
    setDocType("");
    setFile(null);
    setLastResult(null);
  };

  const handleUpload = async () => {
    if (!file || !docType || uploading) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("cid", cid);
      formData.append("docType", docType);
      formData.append("file", file);

      const res = await uploadSofDocument(formData);
      if (res?.success) {
        const doc = res.data?.document;
        setLastResult({
          status: doc?.status || "needs_review",
          message: res.message,
          ocr: doc?.ocr,
          docType,
        });
        setUploadedList((prev) => [
          ...prev,
          {
            _id: doc?._id,
            docType,
            name: doc?.name,
            status: doc?.status,
            uploadedAt: doc?.uploadedAt,
          },
        ]);
      } else {
        toast.error(res?.error || res?.message || "Upload failed. Please try again.");
      }
    } catch (error) {
      console.error("SOF upload failed", error);
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (validating) {
    return (
      <PageShell client={client}>
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="size-8 animate-spin" />
          <p className="text-sm">Checking your link...</p>
        </div>
      </PageShell>
    );
  }

  // ── Invalid / expired link ──────────────────────────────────────────────
  if (invalidReason) {
    return (
      <PageShell client={client}>
        <Card className="w-full p-6 text-center space-y-3">
          <XCircle className="size-10 text-danger mx-auto" />
          <h1 className="text-lg font-semibold">Link Unavailable</h1>
          <p className="text-sm text-muted-foreground">{invalidReason}</p>
          <p className="text-xs text-muted-foreground">
            Please ask{client?.name ? ` ${client.name}` : " the organisation that contacted you"}{" "}
            for a new upload link and try again.
          </p>
        </Card>
      </PageShell>
    );
  }

  // ── Exited / done screen ─────────────────────────────────────────────────
  if (exited) {
    return (
      <PageShell client={client}>
        <Card className="w-full p-6 text-center space-y-3">
          <CheckCircle2 className="size-10 text-success mx-auto" />
          <h1 className="text-lg font-semibold">All Done</h1>
          <p className="text-sm text-muted-foreground">
            Thanks{customerName ? `, ${customerName}` : ""}. Your document
            {uploadedList.length > 1 ? "s have" : " has"} been submitted
            {client?.name ? ` to ${client.name}` : ""}. You can close this window now.
          </p>
          <Button variant="outline" size="sm" onClick={() => setExited(false)} className="text-xs">
            <RotateCcw className="size-3.5" /> Upload another document
          </Button>
        </Card>
      </PageShell>
    );
  }

  const acct = lastResult?.ocr?.accountInformation;

  return (
    <PageShell client={client}>
      <div className="w-full space-y-5">
        <div className="text-center space-y-2">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-primary/10">
            <ShieldCheck className="size-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold">Source of Funds Verification</h1>
          <p className="text-sm text-muted-foreground">
            {customerName ? (
              <>
                Hi <span className="font-medium text-foreground">{customerName}</span>,{" "}
              </>
            ) : null}
            {client?.name ? (
              <>
                <span className="font-medium text-foreground">{client.name}</span> needs one
                document confirming your source of funds. It only takes a minute.
              </>
            ) : (
              "please upload one of the accepted documents below."
            )}
          </p>
        </div>

        {uploadedList.length > 0 && (
          <Card className="p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
              Uploaded ({uploadedList.length})
            </p>
            <div className="space-y-2">
              {uploadedList.map((d, i) => (
                <div key={d._id || i} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">
                    {DOC_TYPE_OPTIONS.find((o) => o.value === d.docType)?.label || d.docType}
                  </span>
                  <Badge
                    variant={
                      d.status === "verified"
                        ? "success"
                        : d.status === "rejected"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {d.status === "verified"
                      ? "Verified"
                      : d.status === "rejected"
                        ? "Rejected"
                        : "Pending"}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        {lastResult ? (
          <Card className="p-6 text-center space-y-4">
            {lastResult.status === "verified" ? (
              <CheckCircle2 className="size-10 text-success mx-auto" />
            ) : lastResult.status === "rejected" ? (
              <XCircle className="size-10 text-danger mx-auto" />
            ) : (
              <Clock className="size-10 text-warning-foreground mx-auto" />
            )}
            <div>
              <h2 className="text-lg font-semibold">
                {lastResult.status === "verified"
                  ? "Document Verified"
                  : lastResult.status === "rejected"
                    ? "Document Not Verified"
                    : "Uploaded — Pending Review"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">{lastResult.message}</p>
            </div>

            {lastResult.ocr?.rejectionReason && (
              <p className="text-xs text-danger bg-danger/5 border border-danger/20 rounded-md px-3 py-2 text-left">
                {lastResult.ocr.rejectionReason}
              </p>
            )}

            {acct && (
              <div className="grid grid-cols-1 gap-2 text-xs bg-muted/30 rounded-md p-3 text-left">
                {acct.account_holder_name && (
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Account Holder</span>
                    <span className="font-medium truncate">{acct.account_holder_name}</span>
                  </div>
                )}
                {acct.bank_name && (
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Bank</span>
                    <span className="font-medium truncate">{acct.bank_name}</span>
                  </div>
                )}
                {acct.account_number && (
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Account No.</span>
                    <span className="font-medium truncate">{acct.account_number}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <Button variant="outline" className="flex-1 text-xs" onClick={resetForm}>
                <RotateCcw className="size-4" /> Upload Another
              </Button>
              <Button className="flex-1 text-xs" onClick={() => setExited(true)}>
                <CheckCircle2 className="size-4" /> Done
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="p-6 space-y-4">
            <div className="space-y-1.5">
              <p className="text-sm font-semibold">Document Type</p>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {DOC_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Capture-phase handler beats the library's own label-click, so
                the tap opens our MIME-accept input; drop events pass through
                untouched. The library's extension-based accept hides the
                Files app from Android choosers (PDFs become unpickable) —
                MIME accept restores it. */}
            <div
              onClickCapture={(e) => {
                if (uploading) return;
                // The selected-file chip's "Remove" X lives inside the zone —
                // let real buttons handle their own clicks.
                if (e.target.closest("button")) return;
                e.preventDefault();
                e.stopPropagation();
                pickerRef.current?.click();
              }}
            >
              <CustomDropZone
                fileTypes={ACCEPTED_EXTENSIONS}
                handleChange={handleFileSelected}
                file={file}
                loading={uploading}
                disabled={uploading}
                setFile={setFile}
              />
            </div>
            <input
              ref={pickerRef}
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              onChange={onNativePick}
            />

            <Button
              className="w-full"
              onClick={handleUpload}
              disabled={!file || !docType || uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Uploading...
                </>
              ) : (
                "Upload & Verify"
              )}
            </Button>
          </Card>
        )}

        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => setExited(true)}
          >
            <LogOut className="size-3.5" /> Exit
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
