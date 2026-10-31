"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  IconFile,
  IconFileTypePdf,
  IconFileTypeXls,
  IconPhoto,
  IconPlus,
  IconDownload,
  IconTrash,
  IconSearch,
  IconLoader2,
  IconFingerprint,
} from "@tabler/icons-react";
import { dateShowFormat } from "@/lib/utils";
import AddDocumentDialog from "@/components/documents/AddDocumentDialog";
import {
  getCaseDocuments,
  addCaseDocument,
  removeCaseDocument,
} from "@/app/dashboard/client/monitoring-and-cases/case-manager/actions";
import { screenStoredDocument } from "@/app/dashboard/client/monitoring-and-cases/case-manager/tbml-actions";

// What a case document can be. `trade_document` is the one the TBML engine can
// screen — the action is only offered on those.
const DOC_TYPE_OPTIONS = [
  { value: "trade_document", label: "Trade document (invoice, PI, packing list)" },
  { value: "letter_of_credit", label: "Letter of credit" },
  { value: "bank_statement", label: "Bank statement" },
  { value: "sanctions_screening", label: "Sanctions screening report" },
  { value: "adverse_media", label: "Adverse media report" },
  { value: "company_registry", label: "Company registry extract" },
  { value: "transaction_report", label: "Transaction analysis report" },
  { value: "osint_report", label: "OSINT findings" },
  { value: "other", label: "Other" },
];

const SCREENABLE = new Set(["trade_document", "letter_of_credit"]);

const docTypeLabel = (type) =>
  DOC_TYPE_OPTIONS.find((o) => o.value === type)?.label.replace(/\s*\(.*\)$/, "") ||
  (type ? type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Other");

const FILE_ICONS = { pdf: IconFileTypePdf, excel: IconFileTypeXls, image: IconPhoto };
const FILE_ICON_COLORS = { pdf: "text-red-500", excel: "text-green-600", image: "text-blue-500" };
const FILE_ICON_BG = { pdf: "bg-red-50", excel: "bg-green-50", image: "bg-blue-50" };

// The vault stores the original filename in the URL, so either source answers.
function inferType(doc) {
  const probe = `${doc.mimeType || ""} ${doc.url || ""} ${doc.name || ""}`.toLowerCase();
  if (probe.includes("pdf")) return "pdf";
  if (/(xlsx|xls|csv|spreadsheet)/.test(probe)) return "excel";
  if (/(image|jpe?g|png|gif|webp|tiff)/.test(probe)) return "image";
  return "file";
}

const sizeLabel = (bytes) =>
  bytes ? `${(bytes / 1024 / 1024).toFixed(bytes > 1024 * 1024 ? 1 : 2)} MB` : null;

/**
 * Case evidence.
 *
 * Files are stored in FileVault and recorded on the case (`Case.documents`), so
 * a document attached here is the same object the TBML tab screens — one upload,
 * one record. Screening a trade document from this tab reads the bytes back from
 * the vault server-side; the analyst never has to find the file twice.
 */
export default function FilesTab({ caseData, caseId }) {
  const id = caseId || caseData?._id;

  const [files, setFiles] = useState([]);
  const [state, setState] = useState({ loading: true, error: null });
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    if (!id) {
      setState({ loading: false, error: null });
      return;
    }
    const res = await getCaseDocuments(id);
    if (!res?.succeed) {
      setState({ loading: false, error: res?.message || "Could not load case files." });
      return;
    }
    setFiles(res.data || []);
    setState({ loading: false, error: null });
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // AddDocumentDialog has already put the file in FileVault and hands us
  // { name, url, mimeType, docType } — all that is left is recording it.
  const handleSave = async (payload) => {
    const res = await addCaseDocument(id, {
      name: payload.name,
      url: payload.url,
      mimeType: payload.mimeType,
      type: payload.docType,
    });
    if (!res?.succeed) {
      return { success: false, message: res?.message || "Could not attach the document." };
    }
    setFiles((prev) => [res.data, ...prev]);
    return { success: true, message: "Document attached to the case" };
  };

  const handleRemove = async (doc) => {
    setBusyId(doc._id);
    const res = await removeCaseDocument(id, doc._id);
    setBusyId(null);

    if (!res?.succeed) {
      toast.error(res?.message || "Could not remove the document.");
      return;
    }
    setFiles((prev) => prev.filter((f) => f._id !== doc._id));
    // The file stays in FileVault — detaching evidence from a case is not
    // authority to destroy it.
    toast.success(`"${doc.name}" detached from the case`);
  };

  const handleScreen = async (doc) => {
    setBusyId(doc._id);
    const res = await screenStoredDocument(id, doc._id);
    setBusyId(null);

    console.log((res.json()))

    if (!res?.succeed) {
      toast.error(res?.message || "Could not start the screening run.");
      return;
    }
    toast.success(`"${doc.name}" sent for TBML screening — it runs in the background.`);
    load();
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return files;
    return files.filter(
      (f) => f.name?.toLowerCase().includes(q) || docTypeLabel(f.type).toLowerCase().includes(q),
    );
  }, [files, search]);

  return (
    <Card className="border-border py-0 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-base font-semibold text-heading">
            <IconFile className="size-4" />
            Files
          </span>
          <Badge variant="outline" className="text-xs">
            {files.length} total
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <IconSearch className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search files…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-56 pl-8 text-sm"
            />
          </div>
          <Button size="sm" className="h-9 gap-1.5" disabled={!id} onClick={() => setAddOpen(true)}>
            <IconPlus className="size-3.5" />
            Add document
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-[3fr_1.4fr_1.4fr_1.2fr_1fr_120px] items-center gap-2 border-b border-border bg-muted/30 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <div>Name</div>
        <div>Type</div>
        <div>TBML</div>
        <div>Added By</div>
        <div>Date</div>
        <div className="text-right">Actions</div>
      </div>

      {state.loading ? (
        <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <IconLoader2 className="size-4 animate-spin" />
          Loading case files…
        </p>
      ) : state.error ? (
        <div className="flex flex-col items-center gap-2 py-10">
          <p className="text-sm text-danger">{state.error}</p>
          <Button size="sm" variant="outline" onClick={load}>
            Try again
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {files.length === 0 ? "No documents attached to this case yet." : "No files match your search."}
        </p>
      ) : (
        <div className="divide-y divide-border">
          {filtered.map((doc) => {
            const kind = inferType(doc);
            const Icon = FILE_ICONS[kind] || IconFile;
            const busy = busyId === doc._id;

            return (
              <div
                key={doc._id}
                className="grid grid-cols-[3fr_1.4fr_1.4fr_1.2fr_1fr_120px] items-center gap-2 px-5 py-3 text-sm"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={`flex size-7 shrink-0 items-center justify-center rounded-md ${FILE_ICON_BG[kind] || "bg-muted"}`}
                  >
                    <Icon className={`size-3.5 ${FILE_ICON_COLORS[kind] || "text-muted-foreground"}`} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-heading" title={doc.name}>
                      {doc.name}
                    </p>
                    {sizeLabel(doc.sizeBytes) && (
                      <p className="text-xs text-muted-foreground">{sizeLabel(doc.sizeBytes)}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Badge variant="outline" className="text-xs">
                    {docTypeLabel(doc.type)}
                  </Badge>
                </div>

                {/* Which screening run this document belongs to, if any — the
                    link between the Files tab and the TBML tab. */}
                <div className="min-w-0 text-xs">
                  {doc.tbml?.reportId ? (
                    <span className="block truncate font-mono text-muted-foreground" title={doc.tbml.reportId}>
                      {doc.tbml.reportId}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/60">—</span>
                  )}
                </div>

                <div className="truncate text-muted-foreground">
                  {doc.uploadedBy?.name || "—"}
                </div>
                <div className="text-muted-foreground">{dateShowFormat(doc.uploadedAt)}</div>

                <div className="flex items-center justify-end gap-3 text-muted-foreground">
                  {SCREENABLE.has(doc.type) && (
                    <button
                      type="button"
                      title={doc.tbml?.reportId ? "Re-screen for TBML" : "Screen for TBML"}
                      disabled={busy}
                      onClick={() => handleScreen(doc)}
                      className="hover:text-primary disabled:opacity-50"
                    >
                      <IconFingerprint className="size-4" />
                    </button>
                  )}
                  <a href={doc.url} target="_blank" rel="noopener noreferrer" title="Open" className="hover:text-heading">
                    <IconDownload className="size-4" />
                  </a>
                  <button
                    type="button"
                    title="Detach from case"
                    disabled={busy}
                    onClick={() => handleRemove(doc)}
                    className="hover:text-danger disabled:opacity-50"
                  >
                    {busy ? <IconLoader2 className="size-4 animate-spin" /> : <IconTrash className="size-4" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddDocumentDialog
        open={addOpen}
        setOpen={setAddOpen}
        docTypeOptions={DOC_TYPE_OPTIONS}
        description="Attach evidence to this case. The file is stored in FileVault; a trade document can then be screened for TBML."
        namePlaceholder="e.g. Commercial invoice INV-2026-0006"
        onSave={handleSave}
      />
    </Card>
  );
}
