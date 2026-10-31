"use client";
import {
  createOSINTdata,
  getOSINTdata,
  getOSINTdataSources,
  getOSINTScreenshots,
} from "@/app/dashboard/client/onboarding/customer-queue/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ScreenshotLightbox } from "@/views/onboarding/customer-queue/details/Osiint";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  FileIcon,
  ImageIcon,
  Loader2,
  Radar,
  SearchX,
  Globe,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import OsintDataSourceCard from "./tabs/components/OsintDataSourceCard";

const PROCESSING_STATUSES = ["pending", "processing", "running", "queued"];

function statusMeta(status) {
  const s = (status || "").toLowerCase();
  if (s === "completed" || s === "complete") {
    return {
      label: "Completed",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
      Icon: CheckCircle2,
    };
  }
  if (s === "failed" || s === "error") {
    return {
      label: "Failed",
      className: "bg-red-50 text-red-700 border-red-200",
      Icon: AlertTriangle,
    };
  }
  if (PROCESSING_STATUSES.includes(s)) {
    return {
      label: "In Progress",
      className: "bg-sky-50 text-sky-700 border-sky-200",
      Icon: Loader2,
    };
  }
  return {
    label: "Not Generated",
    className: "bg-slate-50 text-slate-600 border-slate-200",
    Icon: SearchX,
  };
}

// Each report section is an accordion row: click the title to expand/collapse
// the full text. Collapsed by default so the narrow OSINT column stays scannable.
const DataCard = ({ title, description, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  if (!description) return null;
  return (
    <div className="rounded-lg border border-border bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
      >
        <h5 className="text-[12.5px] font-bold text-heading">{title}</h5>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <p className="whitespace-pre-line border-t border-border px-3 py-2 text-xs leading-relaxed text-gray-500">
          {description}
        </p>
      )}
    </div>
  );
};

const SOURCES_PAGE_SIZE = 5;

const ScreenshotCard = ({ screenshot, index, screenshots }) => {
  const [activeIndex, setActiveIndex] = useState(-1);

  const navigate = useCallback(
    (direction) => {
      setActiveIndex((current) => {
        if (current < 0) return current;
        return (current + direction + screenshots.length) % screenshots.length;
      });
    },
    [screenshots.length],
  );
  return (
    <div>
      <div
        className="w-full border rounded-lg overflow-hidden cursor-pointer"
        onClick={() => setActiveIndex(index)}
      >
        <img
          src={`data:image/png;base64,${screenshot.base64}`}
          alt={screenshot.query_text}
          className="w-full h-full object-cover"
        />
      </div>
      <ScreenshotLightbox
        screenshots={screenshots}
        activeIndex={activeIndex}
        onClose={() => setActiveIndex(-1)}
        onNavigate={navigate}
      />
    </div>
  );
};
export default function OsiintData({ caseData }) {
  const id = caseData?.customer?._id;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [sources, setSources] = useState([]);
  const [showAllSources, setShowAllSources] = useState(false);
  const [screenshots, setScreenshots] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(null);

  const fetchOsintReport = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const entityType = "customers";
      const response = await getOSINTdata(entityType, id);
      const sourcesResponse = await getOSINTdataSources(entityType, id);

      const sourcesList = Array.isArray(sourcesResponse)
        ? sourcesResponse.filter((itm) => itm.subject_match === "MATCH")
        : [];
      setReportData(response);
      setSources(sourcesList);
      // const screenshotData = await getOSINTScreenshots(entityType, id);
      // setScreenshots(screenshotData);
    } catch (err) {
      setError(err?.message || "Failed to load OSINT report");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOsintReport();
  }, [fetchOsintReport]);

  const handleGenerate = useCallback(async () => {
    if (!id || generating) return;
    setGenerating(true);
    setGenerateError(null);
    try {
      await createOSINTdata({
        entity_type: "customers",
        entity_id: id,
      });
      await fetchOsintReport();
    } catch (err) {
      setGenerateError(err?.message || "Failed to generate OSINT report");
    } finally {
      setGenerating(false);
    }
  }, [id, generating, fetchOsintReport]);

  const data = reportData?.report;
  const hasReport = Boolean(data);
  const isProcessing = PROCESSING_STATUSES.includes((reportData?.status || "").toLowerCase());
  const status = statusMeta(reportData?.status);

  return (
    <div className=" rounded-lg  space-y-2">
      <div className="flex items-center justify-between gap-2 px-3 ">
        {/* <h5 className="font-bold text-base flex items-center gap-2">
          <FileIcon className="w-4 h-4" /> OSINT Report
        </h5> */}
        {/* {!loading && reportData && (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
              status.className,
            )}
          >
            <StatusIcon className={cn("w-3 h-3", isProcessing && "animate-spin")} />
            {status.label}
          </span>
        )} */}
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-xs">Loading OSINT report…</p>
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
          <AlertTriangle className="w-6 h-6 text-red-600" />
          <p className="text-sm font-semibold text-slate-800">Unable to load OSINT report</p>
          <p className="text-xs text-slate-500">{error}</p>
        </div>
      )}

      {!loading && !error && !hasReport && (
        <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
          {isProcessing ? (
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          ) : (
            <SearchX className="w-6 h-6 text-slate-400" />
          )}
          <div className="space-y-1 px-4">
            <p className="text-sm font-semibold text-slate-800">
              {isProcessing ? "OSINT scan in progress" : "No OSINT report available"}
            </p>
            <p className="max-w-sm text-xs text-slate-500">
              {isProcessing
                ? "The scan is currently running. This can take a few minutes — check back shortly."
                : "Generate an OSINT scan to get intelligence for this customer."}
            </p>
          </div>
          {!isProcessing && (
            <div className="flex flex-col items-center gap-1">
              <Button type="button" size="sm" onClick={handleGenerate} disabled={generating || !id}>
                {generating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Radar className="w-3.5 h-3.5" />
                )}
                {generating ? "Generating…" : "Generate OSINT Report"}
              </Button>
              {generateError && <p className="max-w-sm text-xs text-red-500">{generateError}</p>}
            </div>
          )}
        </div>
      )}

      {!loading && !error && hasReport && (
        <div className="flex flex-col gap-2">
          <DataCard
            title="Analysis and Interpretation"
            description={data?.analysis_and_interpretation}
            defaultOpen
          />
          <DataCard title="Introduction" description={data?.introduction} />
          <DataCard title="Area of Interest" description={data?.area_of_interest} />
          <DataCard title="Data Collection" description={data?.data_collection} />
          <DataCard title="Conclusion" description={data?.conclusion} />
          <DataCard title="Risk Assessment" description={data?.risk_assessment} />
        </div>
      )}

      {!loading && !error && sources.length > 0 && (
        <div className="flex flex-col gap-2 px-1">
          <h5 className="font-bold text-base px-3 py-2 flex items-center gap-2">
            <Globe className="w-4 h-4" /> Data Sources
          </h5>
          <div className="flex flex-col gap-2">
            {(showAllSources ? sources : sources.slice(0, SOURCES_PAGE_SIZE)).map((source, idx) => (
              <OsintDataSourceCard key={source.evidence_id || idx} source={source} />
            ))}
          </div>
          {sources.length > SOURCES_PAGE_SIZE && (
            <button
              type="button"
              className="self-center text-xs font-bold hover:underline transition-all duration-300"
              onClick={() => setShowAllSources((prev) => !prev)}
            >
              {showAllSources ? "See Less" : `See More (${sources.length - SOURCES_PAGE_SIZE})`}
            </button>
          )}
        </div>
      )}

      {screenshots.length > 0 && (
        <div className="flex flex-col gap-2">
          <h5 className="font-bold text-base px-3 py-2 text-center flex items-center gap-2 justify-center">
            <ImageIcon className="w-4 h-4" /> Screenshots
          </h5>
          <div className="grid grid-cols-3 gap-2 items-center justify-center">
            {screenshots.map((screenshot, idx) => (
              <ScreenshotCard
                key={idx}
                screenshot={screenshot}
                index={idx}
                screenshots={screenshots}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
