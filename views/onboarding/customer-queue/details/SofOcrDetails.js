"use client";
// OCR detail view for a single uploaded SOF document.
//
// The extraction buckets on doc.ocr (accountInformation / payslips /
// transactions / statementSummary — see SofOcrResultSchema) deliberately keep
// the OCR service's own snake_case keys. So nothing here hand-maps individual
// fields: every object renders as humanised key/value pairs and the
// transaction table derives its columns from the rows. When the OCR service
// starts returning a new field it shows up on its own instead of being
// silently dropped by a hardcoded field list.

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ScanLine,
  AlertTriangle,
  Lightbulb,
  TrendingUp,
  Code2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Copy,
  Check,
  X,
} from "lucide-react";
import { cn, dateShowFormat } from "@/lib/utils";

const DOC_TYPE_LABELS = {
  bank_statement: "Bank Statement",
  payslip: "Payslip",
  bank_cheque: "Bank Cheque",
  bank_certificate: "Bank Certificate",
};

// Words that read wrong in title case.
const ACRONYMS = new Set([
  "abn", "acn", "arbn", "bsb", "id", "ytd", "tfn", "sgc", "iban", "swift",
  "bic", "aud", "usd", "nzd", "gbp", "eur", "dr", "cr", "kyc", "aml",
]);

export const humanizeKey = (key) =>
  String(key)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) =>
      ACRONYMS.has(w.toLowerCase())
        ? w.toUpperCase()
        : w.charAt(0).toUpperCase() + w.slice(1)
    )
    .join(" ");

export const isBlank = (v) =>
  v === null ||
  v === undefined ||
  (typeof v === "string" && !v.trim()) ||
  (Array.isArray(v) && v.length === 0);

const formatValue = (v) => {
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

// Money-ish columns read better right-aligned.
const NUMERIC_COLUMNS = new Set([
  "debit", "credit", "balance", "amount", "gross_pay", "net_pay", "tax",
]);

// Preferred left-to-right order; anything else keeps discovery order after these.
const COLUMN_ORDER = [
  "date", "value_date", "description", "reference_number", "transaction_type",
  "branch", "dr_cr", "debit", "credit", "balance", "page_number",
];

const columnsOf = (rows) => {
  const discovered = [];
  rows.forEach((row) => {
    Object.keys(row || {}).forEach((k) => {
      if (!discovered.includes(k)) discovered.push(k);
    });
  });
  // Drop any column that is empty on every row — OCR returns a lot of nulls.
  const used = discovered.filter((k) => rows.some((r) => !isBlank(r?.[k])));
  return [
    ...COLUMN_ORDER.filter((k) => used.includes(k)),
    ...used.filter((k) => !COLUMN_ORDER.includes(k)),
  ];
};

/** Humanised key/value pairs for one flat object. Blank values are dropped. */
function KeyValues({ data }) {
  const entries = Object.entries(data || {}).filter(([, v]) => !isBlank(v));
  if (!entries.length) {
    return <p className="text-xs text-muted-foreground">Nothing extracted.</p>;
  }
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
      {entries.map(([key, value]) => (
        <div key={key} className="min-w-0">
          <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {humanizeKey(key)}
          </dt>
          <dd className="text-sm font-medium break-words whitespace-pre-line">
            {formatValue(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Section({ title, count, children }) {
  return (
    <section className="space-y-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
        {title}
        {count != null && <Badge variant="secondary">{count}</Badge>}
      </h4>
      {children}
    </section>
  );
}

function InsightList({ icon: Icon, title, items, tone }) {
  if (!items?.length) return null;
  return (
    <div className="space-y-2">
      <p className={cn("text-xs font-semibold flex items-center gap-1.5", tone)}>
        <Icon className="size-3.5" /> {title}
      </p>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-muted-foreground flex gap-2">
            <span className={cn("mt-1.5 size-1 rounded-full shrink-0", tone && "bg-current", tone)} />
            <span className="min-w-0">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SofOcrDetails({ doc }) {
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);
  const ocr = doc?.ocr || {};

  const rawJson = useMemo(
    () => (ocr.raw ? JSON.stringify(ocr.raw, null, 2) : ""),
    [ocr.raw]
  );

  const handleCopyRaw = async () => {
    try {
      await navigator.clipboard.writeText(rawJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Could not copy raw OCR response", error);
    }
  };

  const transactions = useMemo(
    () => (Array.isArray(ocr.transactions) ? ocr.transactions : []),
    [ocr.transactions]
  );
  const columns = useMemo(() => columnsOf(transactions), [transactions]);
  const payslips = Array.isArray(ocr.payslips) ? ocr.payslips : [];
  const analysis = ocr.analysis || {};

  const hasAnalysis =
    analysis.summary ||
    analysis.patterns?.length ||
    analysis.anomalies?.length ||
    analysis.insights?.length;

  // Nothing was extracted at all — usually an OCR outage at upload time.
  const hasExtraction =
    ocr.accountInformation || payslips.length || transactions.length || hasAnalysis;

  const docLabel = DOC_TYPE_LABELS[doc?.docType] || doc?.docType || "Document";

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs">
          <ScanLine className="size-3.5" /> OCR Details
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-4xl max-h-[88vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <ScanLine className="size-5 text-primary" />
            {docLabel} — extracted data
            {ocr.isValid === true && (
              <Badge variant="success" className="gap-1">
                <CheckCircle2 className="size-3" /> Passed OCR
              </Badge>
            )}
            {ocr.isValid === false && (
              <Badge variant="danger" className="gap-1">
                <XCircle className="size-3" /> Failed OCR
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {doc?.name || "Uploaded document"}
            {doc?.uploadedAt ? ` · uploaded ${dateShowFormat(doc.uploadedAt)}` : ""}
            {ocr.processedAt ? ` · processed ${dateShowFormat(ocr.processedAt)}` : ""}
          </DialogDescription>
        </DialogHeader>

        {/* min-w-0: DialogContent is a CSS grid, and a grid item defaults to
            min-width:auto — without this, wide content (JSON, transaction
            table) stretches the column instead of scrolling inside it. */}
        <div className="space-y-6 min-w-0">
          {ocr.rejectionReason && (
            <p className="text-sm text-danger bg-danger/5 border border-danger/20 rounded-md px-3 py-2">
              <span className="font-medium">Rejection reason: </span>
              {ocr.rejectionReason}
            </p>
          )}

          {!hasExtraction && !ocr.rejectionReason && (
            <p className="text-sm text-muted-foreground">
              No data was extracted from this document.
            </p>
          )}

          {ocr.accountInformation && (
            <Section title="Account information">
              <KeyValues data={ocr.accountInformation} />
            </Section>
          )}

          {payslips.map((slip, i) => (
            <Section
              key={i}
              title={payslips.length > 1 ? `Payslip ${i + 1}` : "Payslip"}
            >
              <KeyValues data={slip} />
            </Section>
          ))}

          {ocr.statementSummary && (
            <Section title="Statement summary">
              <KeyValues data={ocr.statementSummary} />
            </Section>
          )}

          {transactions.length > 0 && (
            <Section title="Transactions" count={transactions.length}>
              <div className="rounded-lg border border-border/60 overflow-x-auto max-h-[260px] sm:max-h-[340px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted/60 backdrop-blur">
                    <TableRow>
                      {columns.map((col) => (
                        <TableHead
                          key={col}
                          className={cn(
                            "text-xs whitespace-nowrap",
                            NUMERIC_COLUMNS.has(col) && "text-right"
                          )}
                        >
                          {humanizeKey(col)}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((row, i) => (
                      <TableRow key={i}>
                        {columns.map((col) => (
                          <TableCell
                            key={col}
                            className={cn(
                              "text-xs",
                              NUMERIC_COLUMNS.has(col) &&
                                "text-right tabular-nums whitespace-nowrap",
                              col === "credit" && !isBlank(row?.[col]) && "text-success",
                              col === "debit" && !isBlank(row?.[col]) && "text-danger"
                            )}
                          >
                            {isBlank(row?.[col]) ? "—" : formatValue(row[col])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Section>
          )}

          {hasAnalysis && (
            <>
              <Separator />
              <Section title="OCR analysis">
                {analysis.summary && (
                  <p className="text-sm leading-relaxed bg-muted/30 rounded-md p-3">
                    {analysis.summary}
                  </p>
                )}
                <div className="grid gap-5 sm:grid-cols-3">
                  <InsightList
                    icon={TrendingUp}
                    title="Patterns"
                    items={analysis.patterns}
                    tone="text-primary"
                  />
                  <InsightList
                    icon={AlertTriangle}
                    title="Anomalies"
                    items={analysis.anomalies}
                    tone="text-warning-foreground"
                  />
                  <InsightList
                    icon={Lightbulb}
                    title="Insights"
                    items={analysis.insights}
                    tone="text-success"
                  />
                </div>
              </Section>
            </>
          )}

          <Separator />

          <div className="flex items-center justify-between gap-2 flex-wrap">
            {doc?.url && (
              <Button variant="outline" size="sm" className="text-xs" asChild>
                <a href={doc.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-3.5" /> Open source document
                </a>
              </Button>
            )}
            {ocr.raw && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => setShowRaw((v) => !v)}
              >
                <Code2 className="size-3.5" /> Raw OCR response
                <ChevronDown
                  className={cn("size-3.5 transition-transform", showRaw && "rotate-180")}
                />
              </Button>
            )}
          </div>

          {showRaw && ocr.raw && (
            <div className="w-full min-w-0 rounded-md border border-border/60 overflow-hidden">
              {/* Header stays put while the JSON scrolls, so the close control
                  is reachable without scrolling back to the toggle button. */}
              <div className="flex items-center justify-between gap-2 px-3 py-2 bg-muted/60 border-b border-border/60">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground truncate">
                  Raw OCR response
                </p>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[11px]"
                    onClick={handleCopyRaw}
                  >
                    {copied ? (
                      <Check className="size-3.5 text-success" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => setShowRaw(false)}
                    aria-label="Hide raw OCR response"
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              </div>
              {/* Always wraps: indentation is preserved but long lines fold
                  instead of scrolling sideways, so this panel can never widen
                  the dialog at any breakpoint. Vertical scroll only. */}
              <pre className="text-[10px] sm:text-[11px] leading-relaxed p-3 max-h-56 sm:max-h-72 overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-all max-w-full">
                {rawJson}
              </pre>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
