"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  draftCaseReport,
  saveCaseReportEdits,
  suggestCaseReportNarrative,
} from "@/app/dashboard/client/monitoring-and-cases/case-manager/actions";

// Matches the narrative editor's autosave cadence.
const AUTOSAVE_DELAY_MS = 1500;

// What the hub may edit, as EDITABLE_FIELDS.smr lists it
// (api/services/reportDrafts.js — keep the two in step). Values travel in API
// shape (strings, arrays, booleans); any input conversion is the component's.
export const SMR_EDITABLE_PATHS = [
  "partA.designatedServices", "partA.serviceStatus",
  "partA.suspicionReasons", "partA.otherReasons",
  "partB.groundsForSuspicion", "partB.groundsList", "partB.investigationNotes",
  "partD.hasOtherParties", "partE.hasUnidentifiedPersons",
  "partG.likelyOffence",
  "partH.reportingEntity.internalReference",
  "partH.reportingEntity.completedBy.name", "partH.reportingEntity.completedBy.jobTitle",
  "partH.reportingEntity.completedBy.phone", "partH.reportingEntity.completedBy.email",
];

// The AI's flat narrative keys → where the SMR stores them.
const SUGGESTION_PATHS = {
  groundsForSuspicion: "partB.groundsForSuspicion",
  groundsList: "partB.groundsList",
  investigationNotes: "partB.investigationNotes",
};

export const getPath = (obj, path) =>
  path.split(".").reduce((o, p) => (o && typeof o === "object" ? o[p] : undefined), obj);

const toValues = (report) =>
  Object.fromEntries(SMR_EDITABLE_PATHS.map((p) => [p, getPath(report, p)]));

const sameValue = (a, b) =>
  JSON.stringify(a === undefined ? null : a) === JSON.stringify(b === undefined ? null : b);

/**
 * The case's real SMR draft, edited in the Investigation Hub — the same SMR
 * record the standalone SMR form and the Reports tab open, not a copy
 * (docs/74 phase C9). Same contract as the narrative editors:
 *   • opened: the case's draft is loaded, or drafted from the case on first use
 *   • editing: changed paths autosave and become analyst-owned (`editedFields`)
 *   • "Refresh from case": recomputes facts and AI text for untouched paths
 *   • "Suggest narrative": fresh Part B prose, taken only when chosen
 */
export function useSmrDraft(caseId, { onReportLoaded } = {}) {
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
  const onLoaded = useRef(onReportLoaded);
  onLoaded.current = onReportLoaded;

  const applyReport = useCallback((doc) => {
    setReport(doc);
    setValues(toValues(doc));
    setEdited(doc?.editedFields || []);
    if (doc?._id) onLoaded.current?.(doc);
  }, []);

  const load = useCallback(
    async ({ regenerate = false } = {}) => {
      const res = await draftCaseReport(caseId, "smr", { regenerate });
      if (!res?.succeed) throw new Error(res?.message || "Could not load the SMR draft");
      applyReport(res.data);
      return res.data;
    },
    [caseId, applyReport]
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

  // Send only the paths touched since the last save.
  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    const keys = [...dirty.current];
    if (!keys.length) return true;
    dirty.current.clear();
    const patch = Object.fromEntries(keys.map((k) => [k, latest.current[k]]));
    setSaveState((s) => ({ ...s, saving: true }));
    try {
      const res = await saveCaseReportEdits(caseId, "smr", patch);
      if (!res?.succeed) throw new Error(res?.message || "Could not save");
      setEdited(res.data.editedFields || []);
      setSaveState({ saving: false, savedAt: new Date(), error: null });
      return true;
    } catch (e) {
      keys.forEach((k) => dirty.current.add(k)); // retry them with the next save
      setSaveState({ saving: false, savedAt: null, error: e.message });
      return false;
    }
  }, [caseId]);

  // Save what is pending when the analyst leaves the step.
  useEffect(() => () => void flush(), [flush]);

  const change = useCallback(
    (path, value) => {
      setValues((prev) => ({ ...prev, [path]: value }));
      dirty.current.add(path);
      clearTimeout(timer.current);
      timer.current = setTimeout(flush, AUTOSAVE_DELAY_MS);
    },
    [flush]
  );

  const toggleInList = useCallback(
    (path, option) => {
      const cur = Array.isArray(latest.current[path]) ? latest.current[path] : [];
      change(path, cur.includes(option) ? cur.filter((o) => o !== option) : [...cur, option]);
    },
    [change]
  );

  const refreshFromCase = useCallback(async () => {
    if (
      !window.confirm(
        "Recompute the facts and AI text from the case? Fields you have edited are kept exactly as they are."
      )
    )
      return;
    setRefreshing(true);
    try {
      if (!(await flush())) throw new Error("Save your pending edits first");
      await load({ regenerate: true });
      setSuggestions({});
      toast.success("SMR refreshed from the case");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setRefreshing(false);
    }
  }, [flush, load]);

  const suggest = useCallback(async () => {
    setSuggesting(true);
    try {
      const res = await suggestCaseReportNarrative(caseId, "smr");
      if (!res?.succeed) throw new Error(res?.message || "Could not get a suggestion");
      const { narrative = {}, meta = {} } = res.data;
      // Only offer what differs from what is already there.
      const offered = Object.fromEntries(
        Object.entries(narrative)
          .filter(([k]) => SUGGESTION_PATHS[k])
          .map(([k, v]) => [SUGGESTION_PATHS[k], v])
          .filter(([path, v]) => v != null && v !== "" && !sameValue(v, latest.current[path]))
      );
      setSuggestions(offered);
      if (meta.error) toast.error(`AI narrative unavailable: ${meta.error.message || meta.error.code}`);
      else if (!Object.keys(offered).length) toast.info("No new suggestions — the narrative is up to date");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSuggesting(false);
    }
  }, [caseId]);

  const takeSuggestion = useCallback(
    (path) => {
      change(path, suggestions[path]);
      setSuggestions((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => k !== path)));
    },
    [change, suggestions]
  );
  const dismissSuggestion = useCallback(
    (path) => setSuggestions((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => k !== path))),
    []
  );

  return {
    report,
    values,
    edited,
    loadState,
    saveState,
    refreshing,
    suggesting,
    suggestions,
    aiUsed: new Set(report?.aiMeta?.sectionsUsed || []),
    change,
    toggleInList,
    flush,
    refreshFromCase,
    suggest,
    takeSuggestion,
    dismissSuggestion,
  };
}
