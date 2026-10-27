"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  IconAlertTriangle,
  IconCheck,
  IconExternalLink,
  IconLoader2,
  IconRefresh,
  IconSparkles,
  IconUsers,
} from "@tabler/icons-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  draftCaseReport,
  saveCaseReportEdits,
  suggestCaseReportNarrative,
} from "@/app/dashboard/client/monitoring-and-cases/case-manager/actions";
import { cn } from "@/lib/utils";

// Long enough not to save on every keystroke; short enough that leaving the
// step a moment later still keeps the text. Matches the hub's own autosave.
const AUTOSAVE_DELAY_MS = 1500;

// Report value → what the input shows.
function toInput(field, value) {
  if (value == null) return "";
  if (field.type === "date") return String(value).slice(0, 10);
  if (field.type === "list") return (Array.isArray(value) ? value : []).join("\n");
  return String(value);
}

// Input value → what the API stores.
function fromInput(field, value) {
  if (field.type === "number") return value === "" ? null : Number(value);
  if (field.type === "date") return value || null;
  if (field.type === "list") return value.split("\n").map((v) => v.trim()).filter(Boolean);
  if (field.type === "select" && value === "") return null;
  return value;
}

/**
 * The case's report draft of one type (ECDD, GFS, …), edited in the
 * Investigation Hub. This is the same record the standalone form opens — not
 * a copy — so the two can never disagree:
 *   • opened: the case's draft is loaded, or drafted from the case on first use
 *   • typing: changed fields autosave and become analyst-owned
 *   • "Refresh from case": recomputes figures and AI text for every field the
 *     analyst has NOT edited
 *   • "Suggest narrative": fresh AI prose shown beside each section, taken
 *     only when the analyst chooses
 *
 * Each `sections[].fields[]` key must be in EDITABLE_FIELDS[type]
 * (api/services/reportDrafts.js) — keep the two in step.
 */
export default function ReportNarrativeEditor({ caseId, type, label, sections, formPath, onOpenPois }) {
  const fields = useMemo(() => sections.flatMap((s) => s.fields), [sections]);
  const byKey = useMemo(() => Object.fromEntries(fields.map((f) => [f.key, f])), [fields]);
  const toValues = useCallback(
    (report) => Object.fromEntries(fields.map((f) => [f.key, toInput(f, report?.[f.key])])),
    [fields]
  );

  const [report, setReport] = useState(null);
  const [values, setValues] = useState({});
  const [edited, setEdited] = useState([]);
  const [loadState, setLoadState] = useState({ loading: true, error: null });
  const [saveState, setSaveState] = useState({ saving: false, savedAt: null, error: null });
  const [refreshing, setRefreshing] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState({});

  const dirty = useRef(new Set());
  const latest = useRef(values);
  latest.current = values;
  const timer = useRef(null);

  const applyReport = useCallback(
    (doc) => {
      setReport(doc);
      setValues(toValues(doc));
      setEdited(doc?.editedFields || []);
    },
    [toValues]
  );

  const load = useCallback(
    async ({ regenerate = false } = {}) => {
      const res = await draftCaseReport(caseId, type, { regenerate });
      if (!res?.succeed) throw new Error(res?.message || `Could not load the ${label} draft`);
      applyReport(res.data);
      return res.data;
    },
    [caseId, type, label, applyReport]
  );

  useEffect(() => {
    if (!caseId) return;
    let cancelled = false;
    setLoadState({ loading: true, error: null });
    load()
      .then(() => !cancelled && setLoadState({ loading: false, error: null }))
      .catch((e) => !cancelled && setLoadState({ loading: false, error: e.message }));
    return () => {
      cancelled = true;
    };
  }, [caseId, load]);

  // Send only the fields touched since the last save.
  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    const keys = [...dirty.current];
    if (!keys.length) return true;
    dirty.current.clear();
    const patch = Object.fromEntries(keys.map((k) => [k, fromInput(byKey[k], latest.current[k])]));
    setSaveState((s) => ({ ...s, saving: true }));
    try {
      const res = await saveCaseReportEdits(caseId, type, patch);
      if (!res?.succeed) throw new Error(res?.message || "Could not save");
      setEdited(res.data.editedFields || []);
      setSaveState({ saving: false, savedAt: new Date(), error: null });
      return true;
    } catch (e) {
      keys.forEach((k) => dirty.current.add(k)); // retry them with the next save
      setSaveState({ saving: false, savedAt: null, error: e.message });
      return false;
    }
  }, [caseId, type, byKey]);

  // Save what is pending when the analyst leaves the step.
  useEffect(() => () => void flush(), [flush]);

  const change = (key, value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    dirty.current.add(key);
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, AUTOSAVE_DELAY_MS);
  };

  const refreshFromCase = async () => {
    if (
      !window.confirm(
        "Recompute the figures and AI text from the case? Fields you have edited are kept exactly as they are."
      )
    )
      return;
    setRefreshing(true);
    try {
      if (!(await flush())) throw new Error("Save your pending edits first");
      await load({ regenerate: true });
      setSuggestions({});
      toast.success(`${label} refreshed from the case`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setRefreshing(false);
    }
  };

  const suggest = async () => {
    setSuggesting(true);
    try {
      const res = await suggestCaseReportNarrative(caseId, type);
      if (!res?.succeed) throw new Error(res?.message || "Could not get a suggestion");
      const { narrative = {}, meta = {} } = res.data;
      // Only offer what differs from what is already there.
      const offered = Object.fromEntries(
        Object.entries(narrative)
          .filter(([k]) => byKey[k])
          .map(([k, v]) => [k, toInput(byKey[k], v)])
          .filter(([k, v]) => v && v !== latest.current[k])
      );
      setSuggestions(offered);
      if (meta.error) toast.error(`AI narrative unavailable: ${meta.error.message || meta.error.code}`);
      else if (!Object.keys(offered).length) toast.info("No new suggestions — the narrative is up to date");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSuggesting(false);
    }
  };

  const takeSuggestion = (key) => {
    change(key, suggestions[key]);
    dismissSuggestion(key);
  };
  const dismissSuggestion = (key) =>
    setSuggestions((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => k !== key)));

  if (loadState.loading) {
    return (
      <p className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
        <IconLoader2 className="size-4 animate-spin" />
        Loading the case&apos;s {label} — a first draft is written from the case data, which can take up to 20 seconds…
      </p>
    );
  }
  if (loadState.error) {
    return (
      <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
        <div className="flex items-center gap-2 font-semibold">
          <IconAlertTriangle className="size-4" />
          {loadState.error}
        </div>
      </div>
    );
  }

  const aiUsed = new Set(report?.aiMeta?.sectionsUsed || []);
  const aiError = report?.aiMeta?.error;
  const scope = report?.aiMeta?.scope;
  const persons = report?.personsOfInterest || [];

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <SaveStatus state={saveState} onRetry={flush} label={label} />
        <div className="ml-auto flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={suggest} disabled={suggesting}>
            {suggesting ? <IconLoader2 className="size-3.5 animate-spin" /> : <IconSparkles className="size-3.5" />}
            Suggest narrative
          </Button>
          <Button size="sm" variant="outline" onClick={refreshFromCase} disabled={refreshing}>
            {refreshing ? <IconLoader2 className="size-3.5 animate-spin" /> : <IconRefresh className="size-3.5" />}
            Refresh from case
          </Button>
          {report?._id && (
            <Button size="sm" variant="outline" asChild>
              <Link href={`${formPath}?id=${report._id}`} target="_blank">
                <IconExternalLink className="size-3.5" />
                Open {label} {report.uid || ""}
              </Link>
            </Button>
          )}
        </div>
      </div>

      {aiError && (
        <Banner tone="warn">
          The AI narrative could not be drafted ({aiError.message || aiError.code}). The figures are complete; write the
          narrative yourself or try &ldquo;Suggest narrative&rdquo; again.
        </Banner>
      )}
      {scope?.mismatch && (
        <Banner tone="warn">
          The summary service saw {scope.theirTransactionCount} transaction(s) against this client&apos;s{" "}
          {scope.ourTransactionCount}. Its narrative may describe activity outside this client — read it carefully.
        </Banner>
      )}

      {sections.map((section) => (
        <div key={section.heading} className="rounded-xl border border-border p-5">
          <div className="mb-4 text-[15px] font-bold text-heading">{section.heading}</div>
          {section.persons && <PersonsOfInterest persons={persons} onOpenPois={onOpenPois} />}
          <div className="grid gap-4 sm:grid-cols-2">
            {section.fields.map((f) => (
              <Field
                key={f.key}
                id={`${type}-${f.key}`}
                field={f}
                value={values[f.key] ?? ""}
                onChange={(v) => change(f.key, v)}
                badge={edited.includes(f.key) ? "edited" : f.ai && aiUsed.has(f.key) ? "ai" : null}
                suggestion={suggestions[f.key]}
                onTake={() => takeSuggestion(f.key)}
                onDismiss={() => dismissSuggestion(f.key)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Field({ id, field, value, onChange, badge, suggestion, onTake, onDismiss }) {
  return (
    <div className={cn("flex flex-col gap-1.5", field.full && "sm:col-span-2")}>
      <label htmlFor={id} className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        {field.label}
        {badge === "ai" && (
          <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">AI draft</span>
        )}
        {badge === "edited" && (
          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">Edited</span>
        )}
      </label>

      {field.type === "textarea" || field.type === "list" ? (
        <Textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.type === "list" ? "One per line" : field.placeholder}
          className="min-h-24 resize-y text-sm"
        />
      ) : field.type === "select" ? (
        <Select value={value || undefined} onValueChange={onChange}>
          <SelectTrigger id={id} className="w-full text-sm">
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((o) => (
              <SelectItem key={o} value={o}>
                {field.optionLabels?.[o] || o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          id={id}
          type={field.type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className="text-sm"
        />
      )}

      {suggestion && (
        <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-900">
          <div className="mb-1 flex items-center gap-1 font-semibold">
            <IconSparkles className="size-3" /> Suggested
          </div>
          <p className="whitespace-pre-wrap">{field.optionLabels?.[suggestion] || suggestion}</p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" className="h-6 px-2 text-xs" onClick={onTake}>
              Use this
            </Button>
            <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={onDismiss}>
              Dismiss
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function PersonsOfInterest({ persons, onOpenPois }) {
  return (
    <div className="mb-4 rounded-lg border border-border">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-xs font-semibold text-heading">
        <IconUsers className="size-3.5" />
        Persons of interest ({persons.length})
        {onOpenPois && (
          <button type="button" onClick={onOpenPois} className="ml-auto font-semibold text-primary">
            Manage
          </button>
        )}
      </div>
      {persons.length === 0 ? (
        <p className="px-3 py-2.5 text-xs text-muted-foreground">None on this draft.</p>
      ) : (
        <div className="divide-y divide-border/70">
          {persons.map((p, i) => (
            <div key={p.poi || p.customer || i} className="flex flex-wrap items-center gap-2 px-3 py-2 text-xs">
              <span className="font-semibold text-heading">{p.name}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-semibold">{p.role}</span>
              {p.relationship && <span className="text-muted-foreground">{p.relationship}</span>}
              <span className="ml-auto text-muted-foreground">
                {[p.nationality || p.country, p.source === "alert" ? "from alert" : p.source === "manual" ? "manual" : "customer"]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>
          ))}
        </div>
      )}
      <p className="border-t border-border px-3 py-1.5 text-[11px] text-muted-foreground">
        Changed the persons of interest? &ldquo;Refresh from case&rdquo; updates this list, directors, beneficial owners and
        related parties — unless you have edited those fields.
      </p>
    </div>
  );
}

function SaveStatus({ state, onRetry, label }) {
  if (state.saving) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <IconLoader2 className="size-3.5 animate-spin" /> Saving…
      </span>
    );
  }
  if (state.error) {
    return (
      <span className="flex items-center gap-2 text-xs text-danger">
        <IconAlertTriangle className="size-3.5" /> Not saved: {state.error}
        <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={onRetry}>
          Retry
        </Button>
      </span>
    );
  }
  if (state.savedAt) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <IconCheck className="size-3.5 text-success" /> Saved to the {label}
      </span>
    );
  }
  return (
    <span className="text-xs text-muted-foreground">Changes save automatically to the case&apos;s {label}.</span>
  );
}

function Banner({ tone, children }) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border px-3 py-2 text-xs",
        tone === "warn" && "border-amber-200 bg-amber-50 text-amber-900"
      )}
    >
      <IconAlertTriangle className="mt-0.5 size-3.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
