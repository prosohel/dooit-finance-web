"use client";

import { jsPDF } from "jspdf";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { chipClass, riskLevelStyle } from "./reportHelpers";

const PAGE_MARGIN = 40;
const LINE_HEIGHT = 13;
const INK = [30, 32, 38];
const MUTED = [110, 116, 128];
const RULE = [225, 227, 232];
const HEADER_BAND = [23, 25, 31];

// Severity/risk colors, kept in sync with reportHelpers' riskLevelStyle so
// the PDF reads the same way the on-screen chips do.
const RISK_RGB = {
  HIGH: [211, 47, 47],
  MEDIUM: [194, 124, 14],
  MED: [194, 124, 14],
  LOW: [39, 148, 88],
  INSUFFICIENT_DATA: MUTED,
};
const riskRgb = (level) => RISK_RGB[String(level || "").toUpperCase()] || MUTED;

// Renders a polished, letter-style PDF of the run's headline findings so a
// case worker can attach it to an STR/SAR draft outside this app.
function exportRun(run) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const textWidth = pageWidth - PAGE_MARGIN * 2;
  const contentBottom = pageHeight - PAGE_MARGIN;
  let y = PAGE_MARGIN;

  const setMuted = () => doc.setTextColor(...MUTED);

  const ensureSpace = (needed) => {
    if (y + needed > contentBottom) {
      doc.addPage();
      y = PAGE_MARGIN;
    }
  };

  const measure = (text, fontSize, style = "normal", width = textWidth) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(fontSize);
    return doc.splitTextToSize(text, width);
  };

  const drawLines = (lines, x, fontSize, style, color, lineHeight = LINE_HEIGHT) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);
    lines.forEach((line) => {
      doc.text(line, x, y);
      y += lineHeight;
    });
  };

  const paragraph = (text, { fontSize = 10, style = "normal", color = INK, gapAfter = 10 } = {}) => {
    const lines = measure(text, fontSize, style);
    ensureSpace(lines.length * LINE_HEIGHT);
    drawLines(lines, PAGE_MARGIN, fontSize, style, color);
    y += gapAfter;
  };

  // Section heading: bold caps label over a thin rule.
  const sectionHeading = (text) => {
    ensureSpace(28);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...INK);
    doc.text(text.toUpperCase(), PAGE_MARGIN, y);
    y += 6;
    doc.setDrawColor(...RULE);
    doc.setLineWidth(1);
    doc.line(PAGE_MARGIN, y, pageWidth - PAGE_MARGIN, y);
    y += 16;
  };

  // A label/value pair set two-up per row, e.g. "Completed" / "22 Aug ...".
  const factGrid = (facts) => {
    const colWidth = textWidth / 2;
    for (let i = 0; i < facts.length; i += 2) {
      const rowFacts = facts.slice(i, i + 2);
      const rowLines = rowFacts.map((f) => measure(f.value, 10, "normal", colWidth - 10));
      const rowHeight = Math.max(...rowLines.map((l) => l.length)) * LINE_HEIGHT + 14;
      ensureSpace(rowHeight);
      const rowTop = y;
      rowFacts.forEach((f, idx) => {
        const x = PAGE_MARGIN + idx * colWidth;
        y = rowTop;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        setMuted();
        doc.text(f.label.toUpperCase(), x, y);
        y += 13;
        drawLines(rowLines[idx], x, 10, "normal", f.color || INK);
      });
      y = rowTop + rowHeight;
    }
  };

  // Small pill used for the overall risk level and per-line risk badges.
  const drawBadge = (x, yPos, text, rgb) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    const w = doc.getTextWidth(text) + 14;
    doc.setFillColor(...rgb);
    doc.roundedRect(x, yPos - 11, w, 15, 7, 7, "F");
    doc.setTextColor(255, 255, 255);
    doc.text(text, x + 7, yPos);
    return w;
  };

  // ── Header band ─────────────────────────────────────────────────────
  doc.setFillColor(...HEADER_BAND);
  doc.rect(0, 0, pageWidth, 70, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text("TBML Screening Report", PAGE_MARGIN, 32);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(200, 203, 210);
  doc.text(run.id, PAGE_MARGIN, 48);
  const generatedLabel = `Generated ${new Date().toLocaleString()}`;
  doc.text(generatedLabel, pageWidth - PAGE_MARGIN - doc.getTextWidth(generatedLabel), 48);
  y = 100;

  // ── Overall risk + indicator chips ──────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setMuted();
  doc.text("OVERALL RISK", PAGE_MARGIN, y);
  y += 15;
  const badgeW = drawBadge(
    PAGE_MARGIN,
    y,
    `${run.overallRisk.level} · ${run.overallRisk.score}`,
    riskRgb(run.overallRisk.level),
  );
  if (run.indicators?.length) {
    let chipX = PAGE_MARGIN + badgeW + 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    run.indicators.forEach((ind) => {
      const w = doc.getTextWidth(ind.label) + 14;
      if (chipX + w > pageWidth - PAGE_MARGIN) return;
      const rgb = ind.kind === "danger" ? RISK_RGB.HIGH : ind.kind === "warn" ? RISK_RGB.MEDIUM : MUTED;
      doc.setDrawColor(...rgb);
      doc.setLineWidth(1);
      doc.roundedRect(chipX, y - 11, w, 15, 7, 7, "S");
      doc.setTextColor(...rgb);
      doc.text(ind.label, chipX + 7, y);
      chipX += w + 6;
    });
  }
  y += 26;

  factGrid([
    { label: "Document", value: run.docSummaryLine },
    { label: "Completed", value: run.createdAtLabel },
    { label: "Prices tested", value: run.testedLine },
    {
      label: "Sanctions",
      value: run.sanctionsHit ? "Hit" : "No hit",
      color: run.sanctionsHit ? RISK_RGB.HIGH : RISK_RGB.LOW,
    },
  ]);
  y += 6;

  sectionHeading("Summary");
  paragraph(run.summary, { gapAfter: 14 });

  if (run.lineAnalyses?.length) {
    sectionHeading("Line item analysis");

    run.lineAnalyses.forEach((line, idx) => {
      const titleLines = measure(`${line.lineNumber}. ${line.title}`, 10.5, "bold", textWidth - 90);
      const summaryLines = measure(line.summary, 9.5, "normal", textWidth - 24);
      const findingLines = (line.findings || []).map((f) =>
        measure(f.description, 9, "normal", textWidth - 34),
      );

      const cardHeight =
        18 + // top padding + badge row
        titleLines.length * 14 +
        6 +
        summaryLines.length * 12 +
        10 +
        // each finding: one indicator-label line + its wrapped description lines
        findingLines.reduce((sum, l) => sum + 12 + l.length * 12 + 6, 0) +
        14;

      ensureSpace(Math.min(cardHeight, contentBottom - PAGE_MARGIN));
      const cardTop = y;
      let cy = y + 20;

      // Card border drawn after we know the content height below.
      const badge = `${line.riskLevel} · ${line.riskScore}`;
      drawBadge(pageWidth - PAGE_MARGIN - (doc.getTextWidth(badge) + 14), cardTop + 9, badge, riskRgb(line.riskLevel));

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(...INK);
      titleLines.forEach((l) => {
        doc.text(l, PAGE_MARGIN + 12, cy);
        cy += 14;
      });
      cy += 4;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      setMuted();
      doc.text(`Declared: ${line.declared != null ? line.declared.toLocaleString() : "—"}`, PAGE_MARGIN + 12, cy);
      cy += 14;

      doc.setTextColor(...INK);
      summaryLines.forEach((l) => {
        doc.text(l, PAGE_MARGIN + 12, cy);
        cy += 12;
      });
      cy += 8;

      (line.findings || []).forEach((f, i) => {
        doc.setFillColor(...riskRgb(f.severity));
        doc.circle(PAGE_MARGIN + 16, cy - 3, 2, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(...riskRgb(f.severity));
        doc.text(f.indicator, PAGE_MARGIN + 24, cy);
        cy += 12;

        doc.setFont("helvetica", "normal");
        doc.setTextColor(...INK);
        findingLines[i].forEach((l) => {
          doc.text(l, PAGE_MARGIN + 24, cy);
          cy += 12;
        });
        cy += 6;
      });

      const cardBottom = cy + 6;
      doc.setDrawColor(...RULE);
      doc.setLineWidth(1);
      doc.roundedRect(PAGE_MARGIN, cardTop, textWidth, cardBottom - cardTop, 6, 6, "S");

      y = cardBottom + (idx < run.lineAnalyses.length - 1 ? 12 : 0);
    });
  }

  // ── Footer: page numbers ────────────────────────────────────────────
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    const label = `${run.id}  ·  Page ${i} of ${pageCount}`;
    doc.text(label, pageWidth - PAGE_MARGIN - doc.getTextWidth(label), pageHeight - 20);
  }

  doc.save(`${run.id}-screening-report.pdf`);
  toast.success(`${run.id} exported`);
}

// Result strip at the top of a screening run: overall risk, detected
// indicators, how much of the invoice was price-tested, sanctions status,
// and the free-text run summary underneath.
export default function ScreeningSummaryCard({ run }) {
  const style = riskLevelStyle(run.overallRisk.level);

  return (
    <div className="flex flex-col gap-3.5 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={cn("size-1.5 rounded-full", style.badge.split(" ")[0])} />
          <span className="text-xs font-semibold tracking-wide text-heading uppercase">
            TBML screening result
          </span>
          <span className="font-mono text-xs text-muted-foreground">{run.id}</span>
        </div>
        <span className="text-xs text-muted-foreground">{run.docSummaryLine}</span>
      </div>

      <div className="flex flex-wrap items-end gap-8">
        <div>
          <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            Overall risk
          </p>
          <p className={cn("text-xl font-bold", style.text)}>
            {run.overallRisk.level}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              {run.overallRisk.score}
            </span>
          </p>
        </div>

        <div>
          <p className="mb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            Indicators
          </p>
          <div className="flex flex-wrap gap-1.5">
            {run.indicators.map((ind) => (
              <span
                key={ind.label}
                className={cn(
                  "rounded-md border px-2 py-1 font-mono text-[11px] font-semibold",
                  chipClass(ind.kind),
                )}
              >
                {ind.label}
              </span>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            Price tested
          </p>
          <p className="text-sm font-semibold text-heading">{run.testedLine}</p>
        </div>
        {/*
        <div>
          <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            Sanctions
          </p>
          <p
            className={cn(
              "text-sm font-semibold",
              run.sanctionsHit ? "text-danger" : "text-success",
            )}
          >
            {run.sanctionsHit ? "Hit" : "No hit"}
          </p>
        </div> */}

        <div className="flex-1" />

        <Button size="sm" onClick={() => exportRun(run)}>
          Export
        </Button>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">{run.summary}</p>
    </div>
  );
}
