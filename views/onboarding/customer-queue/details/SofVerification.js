"use client";
// SOF (Source of Funds) tab — reviewer side.
// Every customer gets a stable, no-login QR/link (keyed by customer id, not
// a rotating token) the moment this tab is opened — the backend
// auto-provisions the session + QR image on first read, so there's no
// "Generate" step. The customer scans it on their own phone and uploads a
// bank_statement / payslip / bank_cheque / bank_certificate (see
// /accept-invite/sof-upload). Uploads auto-verify via OCR and also land in
// Customer.documents (same store as the Documents tab); this view
// additionally shows the verification badge + lets staff override it.

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ShieldCheck,
  Mail,
  Copy,
  Check,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { IconLoader2 } from "@tabler/icons-react";
import { cn, dateShowFormat } from "@/lib/utils";
import SofOcrDetails, { humanizeKey, isBlank } from "./SofOcrDetails";
import {
  getSofVerification,
  sendSofVerificationEmail,
  reviewSofDocument,
  reprocessSofDocument,
} from "@/app/dashboard/client/onboarding/customer-queue/actions";

const DOC_TYPE_LABELS = {
  bank_statement: "Bank Statement",
  payslip: "Payslip",
  bank_cheque: "Bank Cheque",
  bank_certificate: "Bank Certificate",
};

const STATUS_UI = {
  verified: { label: "Verified", icon: CheckCircle2, badge: "success" },
  rejected: { label: "Rejected", icon: XCircle, badge: "danger" },
  needs_review: { label: "Needs Review", icon: Clock, badge: "warning" },
};

const SESSION_STATUS_UI = {
  pending: { label: "Not used yet", badge: "outline" },
  in_review: { label: "Awaiting Review", badge: "warning" },
  verified: { label: "Verified", badge: "success" },
  rejected: { label: "Rejected", badge: "danger" },
};

// `details` is a Customer document. The case-manager tab passes a linked
// customer from the case payload, which carries the address on user.email
// rather than the KYC form — hence the third fallback.
const customerEmail = (details) =>
  details?.personalKyc?.personal_form?.contact_details?.email ||
  details?.metadata?.email ||
  details?.user?.email ||
  "";

// `caseId` is optional — when this panel is rendered inside a case (the
// case-manager Source of Funds tab) the request is logged as an RFI against
// that case rather than against the customer alone.
export default function SofVerification({ details, onUpdated, caseId }) {
  const customerId = details?._id;

  const [sof, setSof] = useState(null);
  // base64 data URL rendered by the API on each read — not part of the session
  // record, so it always reflects the current frontend origin.
  const [qrCode, setQrCode] = useState(null);
  const [rfi, setRfi] = useState(null);
  const [url, setUrl] = useState(null);
  const [fetching, setFetching] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reviewingId, setReviewingId] = useState(null);
  const [email, setEmail] = useState("");

  useEffect(() => {
    setEmail(customerEmail(details));
  }, [details]);

  const fetchSof = async () => {
    if (!customerId) return;
    setFetching(true);
    try {
      const res = await getSofVerification(customerId);
      if (res?.success) {
        setSof(res.data);
        setUrl(res.url);
        setQrCode(res.qrCode || null);
      } else {
        toast.error(res?.error || res?.message || "Failed to load SOF verification");
      }
    } catch (error) {
      console.error("Failed to load SOF verification", error);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchSof();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const handleSendEmail = async () => {
    if (emailing || !email) return;
    setEmailing(true);
    try {
      const res = await sendSofVerificationEmail(customerId, { email, caseId });
      if (res?.success) {
        setSof(res.data);
        setUrl(res.url || url);
        setRfi(res.rfi || null);
        toast.success(
          res.rfi?.uid
            ? `${res.message || "Email sent"} · logged as ${res.rfi.uid}`
            : res.message || "Email sent"
        );
        onUpdated?.();
      } else {
        toast.error(res?.error || res?.message || "Failed to send email");
      }
    } catch (error) {
      console.error("Send SOF email failed", error);
      toast.error("Failed to send email");
    } finally {
      setEmailing(false);
    }
  };

  const handleCopy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Could not copy link");
    }
  };

  const handleReprocess = async (docId) => {
    if (reviewingId) return;
    setReviewingId(docId);
    try {
      const res = await reprocessSofDocument(customerId, docId);
      if (res?.success) {
        toast.success(res.message || "OCR re-run complete");
        setSof(res.data);
        onUpdated?.();
      } else {
        toast.error(res?.error || res?.message || "Failed to re-run OCR");
      }
    } catch (error) {
      console.error("Reprocess SOF document failed", error);
      toast.error("Failed to re-run OCR");
    } finally {
      setReviewingId(null);
    }
  };

  const handleReview = async (docId, status) => {
    if (reviewingId) return;
    setReviewingId(docId);
    try {
      const res = await reviewSofDocument(customerId, docId, { status });
      if (res?.success) {
        toast.success("Document updated");
        setSof(res.data);
        onUpdated?.();
      } else {
        toast.error(res?.error || res?.message || "Failed to update document");
      }
    } catch (error) {
      console.error("Review SOF document failed", error);
      toast.error("Failed to update document");
    } finally {
      setReviewingId(null);
    }
  };

  const documents = sof?.documents || [];
  const sessionUi = SESSION_STATUS_UI[sof?.status] || SESSION_STATUS_UI.pending;

  return (
    <div className="grid gap-6 lg:grid-cols-3 mt-6">
      <Card className="border-border/50">
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" />
              Source of Funds
            </h3>
            <Badge variant={sessionUi.badge}>{sessionUi.label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            This customer has a permanent QR / link they can scan or open on
            their own phone to upload a bank statement, payslip, bank cheque
            or bank certificate — no login required.
          </p>

          <div className="rounded-xl border border-dashed border-border p-4 grid place-items-center min-h-[220px] bg-muted/20">
            {fetching && !qrCode ? (
              <IconLoader2 className="size-8 animate-spin text-muted-foreground" />
            ) : qrCode ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrCode} alt="SOF upload QR code" className="size-44 rounded-md bg-white p-2" />
            ) : (
              <p className="text-xs text-muted-foreground">QR unavailable — try reloading.</p>
            )}
          </div>

          {url && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Input value={url} readOnly className="text-xs" />
                <Button variant="outline" size="icon" onClick={handleCopy} title="Copy link">
                  {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
                </Button>
                <Button variant="outline" size="icon" asChild title="Open link">
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-4" />
                  </a>
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-1.5 pt-2 border-t border-border/60">
            <Label className="font-bold text-xs">Email the upload link</Label>
            <div className="flex items-center gap-2">
              <Input
                type="email"
                placeholder="customer@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="text-xs"
              />
              <Button size="sm" onClick={handleSendEmail} disabled={emailing || !email}>
                {emailing ? <IconLoader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
                Send
              </Button>
            </div>
            {sof?.sentTo?.email && (
              <p className="text-[11px] text-muted-foreground">
                Last sent to {sof.sentTo.email}
                {sof.sentTo.sentAt ? ` · ${dateShowFormat(sof.sentTo.sentAt)}` : ""}
                {rfi?.uid ? ` · logged as ${rfi.uid} (${rfi.status})` : ""}
              </p>
            )}
          </div>
        </div>
      </Card>

      <Card className="border-border/50 lg:col-span-2">
        <div className="p-6">
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-6">
            <FileText className="size-5 text-primary" />
            Uploaded Documents
            <Badge variant="secondary">{documents.length}</Badge>
          </h3>

          {fetching ? (
            <div className="text-center py-12 text-muted-foreground">
              <IconLoader2 className="size-6 mx-auto mb-2 animate-spin" />
              <p className="text-sm">Loading...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12 rounded-xl border border-dashed border-border">
              <FileText className="size-8 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No documents uploaded via QR yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => {
                const ui = STATUS_UI[doc.status] || STATUS_UI.needs_review;
                const Icon = ui.icon;
                // Inline teaser only — the full extraction lives in the OCR
                // Details dialog. Statements carry an account block, payslips
                // carry a payslips[] entry; both render the same way.
                const preview = doc.ocr?.accountInformation || doc.ocr?.payslips?.[0];
                const previewEntries = Object.entries(preview || {})
                  .filter(([, v]) => !isBlank(v) && typeof v !== "object")
                  .slice(0, 3);
                return (
                  <div
                    key={doc._id}
                    className="flex flex-col gap-3 p-4 rounded-lg border border-border/60"
                  >
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "p-2 rounded-full",
                            doc.status === "verified" && "bg-success/15 text-success",
                            doc.status === "rejected" && "bg-danger/15 text-danger",
                            doc.status === "needs_review" && "bg-warning/15 text-warning-foreground",
                          )}
                        >
                          <Icon className="size-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {doc.name || DOC_TYPE_LABELS[doc.docType]}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {DOC_TYPE_LABELS[doc.docType] || doc.docType} ·{" "}
                            {doc.uploadedAt ? dateShowFormat(doc.uploadedAt) : "—"}
                          </p>
                        </div>
                      </div>
                      <Badge variant={ui.badge}>{ui.label}</Badge>
                    </div>

                    {doc.ocr?.rejectionReason && (
                      <p className="text-xs text-danger bg-danger/5 border border-danger/20 rounded-md px-3 py-2">
                        {doc.ocr.rejectionReason}
                      </p>
                    )}

                    {previewEntries.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs bg-muted/30 rounded-md p-3">
                        {previewEntries.map(([key, value]) => (
                          <div key={key} className="min-w-0">
                            <p className="text-muted-foreground">{humanizeKey(key)}</p>
                            <p className="font-medium truncate">{String(value)}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Rejected-at-upload docs are never stored (OCR-first
                          policy) — no file, no View, no re-run. */}
                      {doc.url && (
                        <Button variant="outline" size="sm" className="text-xs" asChild>
                          <a href={doc.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="size-3.5" /> View
                          </a>
                        </Button>
                      )}
                      <SofOcrDetails doc={doc} />
                      {doc.url && doc.status === "needs_review" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          disabled={reviewingId === doc._id}
                          onClick={() => handleReprocess(doc._id)}
                        >
                          {reviewingId === doc._id ? (
                            <IconLoader2 className="size-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="size-3.5" />
                          )}
                          Re-run OCR
                        </Button>
                      )}
                      {doc.status !== "verified" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs text-success border-success/30 hover:bg-success/5"
                          disabled={reviewingId === doc._id}
                          onClick={() => handleReview(doc._id, "verified")}
                        >
                          {reviewingId === doc._id ? (
                            <IconLoader2 className="size-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="size-3.5" />
                          )}
                          Mark Verified
                        </Button>
                      )}
                      {doc.status !== "rejected" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs text-danger border-danger/30 hover:bg-danger/5"
                          disabled={reviewingId === doc._id}
                          onClick={() => handleReview(doc._id, "rejected")}
                        >
                          {reviewingId === doc._id ? (
                            <IconLoader2 className="size-3.5 animate-spin" />
                          ) : (
                            <XCircle className="size-3.5" />
                          )}
                          Reject
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
