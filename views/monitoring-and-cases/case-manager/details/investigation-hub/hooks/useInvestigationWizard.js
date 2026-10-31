"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  INVESTIGATION_STEPS,
  DEFAULT_CHECKLIST,
  SMR_PART_ORDER,
} from "../data/investigationHubData";
import {
  getCaseInvestigation,
  saveCaseInvestigation,
} from "@/app/dashboard/client/monitoring-and-cases/case-manager/actions";

// Nothing is done until someone does it. The hub used to seed six of the twelve
// steps as complete, so every case opened at "6/12 · 50%" before an analyst had
// looked at it (docs/70 §3, docs/74 C18).
const NO_STEPS_DONE = INVESTIGATION_STEPS.map(() => false);

// How long the analyst has to stop typing before their work is written. Long
// enough not to save on every keystroke, short enough that closing the tab a
// couple of seconds later still keeps the answer.
const AUTOSAVE_DELAY_MS = 1500;

// The date step, looked up by kind so reordering or renaming steps in
// investigationHubData.js cannot silently point this at the wrong index.
const DATE_RANGE_STEP = INVESTIGATION_STEPS.findIndex((s) => s.kind === "dateRange");

const EMPTY_DATE_RANGE = { start: "", end: "", reviewFrom: "", reviewTo: "" };

// An <input type="date"> speaks "yyyy-mm-dd" and nothing else, while the API
// stores real Dates and hands back ISO strings. Slice the ISO string rather
// than reading local date getters: the values are stored at UTC midnight, and
// a local read would shift them a day west of Greenwich.
function toDateInput(value) {
  if (!value) return "";
  const iso = typeof value === "string" ? value : new Date(value).toISOString();
  return iso.slice(0, 10);
}

// A cleared input goes back as an explicit null rather than "". Both end up
// null in Mongo today, but "unset" is what we mean, and it keeps the payload
// from leaning on how the schema happens to coerce an empty string.
function toSavedDateRange(range) {
  return {
    start: range.start || null,
    end: range.end || null,
    reviewFrom: range.reviewFrom || null,
    reviewTo: range.reviewTo || null,
  };
}

// The alerts combined in this case, as the POI step's header lists them. This
// used to present the CASE uid as the "primary alert" and read a
// `duplicateAlerts` field the adapter never fills.
function caseAlertsOf(caseData) {
  return (caseData?.alerts || []).map((a) => ({
    id: a.id,
    uid: a.uid || String(a.id),
    title: [a.ruleId, a.ruleName].filter(Boolean).join(": ") || a.explanation || a.caseType || "Alert",
    date: a.createdAt ? new Date(a.createdAt).toLocaleDateString("en-AU") : "—",
  }));
}

/**
 * Owns all state and mutation logic for the Investigation Hub wizard: the
 * active step, per-step selections, custom
 * typologies/reasons, the AUSTRAC SMR part, and the investigation checklist.
 * Ported from the AML Case Workspace prototype's Component state machine.
 */
export function useInvestigationWizard(caseData, caseId) {
  const [activeStep, setActiveStep] = useState(0); // start at Triage, not mid-way
  const [narrativeTpl, setNarrativeTpl] = useState("ecdd");
  const [smrPart, setSmrPart] = useState("A");
  // The case's real SMR draft the hub's SMR step edits (docs/74 phase C9),
  // recorded so CaseInvestigation.smr.report links progress to the record.
  const [smrReportId, setSmrReportId] = useState(null);
  const [typoDraft, setTypoDraft] = useState("");
  const [reasonDraft, setReasonDraft] = useState("");
  const [customTypologies, setCustomTypologies] = useState([]);
  const [customReasons, setCustomReasons] = useState([]);
  const [stepsDone, setStepsDone] = useState(NO_STEPS_DONE);
  const [checklist, setChecklist] = useState(DEFAULT_CHECKLIST);
  const [dateRange, setDateRange] = useState(EMPTY_DATE_RANGE);
  // Names typed into the old, local-only POI step. Read-only here: the POI
  // step offers to add each one to the case properly.
  const [legacyPois, setLegacyPois] = useState([]);
  const [sel, setSel] = useState({
    services: [],
    reasons: [],
    provided: "",
  });

  // ── Persistence (docs/74 C18) ─────────────────────────────────────────────
  // `loaded` gates the autosave: without it the empty initial state would be
  // written over the analyst's saved work the moment the hub mounted.
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState({ saving: false, savedAt: null, error: null });
  const saveTimer = useRef(null);
  const latest = useRef(null);

  useEffect(() => {
    if (!caseId) {
      setLoaded(true); // nothing to load against; the hub still works in-memory
      return;
    }
    let cancelled = false;

    getCaseInvestigation(caseId)
      .then((res) => {
        if (cancelled) return;
        const saved = res?.succeed ? res.data : null;
        if (saved) {
          // Only restore what was actually stored — a field the analyst never
          // touched keeps its default rather than becoming null.
          if (typeof saved.activeStep === "number") setActiveStep(saved.activeStep);
          if (saved.stepsDone?.length) setStepsDone(saved.stepsDone);
          if (saved.checklist?.length) setChecklist(saved.checklist);
          if (saved.selections) setSel((prev) => ({ ...prev, ...saved.selections }));
          // `saved.pois` is legacy: POIs now live on the case itself
          // (linkedCustomers + externalPois). Only the hand-typed ones carry
          // anything the case does not already know — the "poi-ind-" /
          // "poi-conn-" rows were seeded from fields that were always empty.
          setLegacyPois(
            (saved.pois || []).filter(
              (p) => p?.name && !/^poi-(ind|conn)-/.test(String(p.id || ""))
            )
          );
          if (saved.dateRange) {
            setDateRange({
              start: toDateInput(saved.dateRange.start),
              end: toDateInput(saved.dateRange.end),
              reviewFrom: toDateInput(saved.dateRange.reviewFrom),
              reviewTo: toDateInput(saved.dateRange.reviewTo),
            });
          }
          if (saved.customTypologies?.length) setCustomTypologies(saved.customTypologies);
          if (saved.customReasons?.length) setCustomReasons(saved.customReasons);
          if (saved.narrativeTemplate) setNarrativeTpl(saved.narrativeTemplate);
          if (saved.smr?.part) setSmrPart(saved.smr.part);
          if (saved.smr?.report) setSmrReportId(saved.smr.report);
          setSaveState({ saving: false, savedAt: saved.updatedAt || null, error: null });
        }
      })
      .catch(() => {
        // A failed load must not wipe anything: stay on defaults and let the
        // analyst work, but do not autosave over what may exist on the server.
        if (!cancelled) setSaveState({ saving: false, savedAt: null, error: "load" });
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [caseId]);

  // Write the analyst's work, debounced. Kept in a ref so the timer always
  // sends the newest state rather than the state captured when it was set.
  latest.current = {
    activeStep,
    stepsDone,
    checklist,
    selections: sel,
    dateRange: toSavedDateRange(dateRange),
    customTypologies,
    customReasons,
    narrativeTemplate: narrativeTpl,
    smr: { part: smrPart, report: smrReportId },
  };

  const flush = useCallback(async () => {
    if (!caseId) return;
    setSaveState((s) => ({ ...s, saving: true }));
    try {
      const res = await saveCaseInvestigation(caseId, latest.current);
      setSaveState({
        saving: false,
        savedAt: res?.succeed ? res.data?.updatedAt || new Date().toISOString() : null,
        error: res?.succeed ? null : "save",
      });
    } catch {
      setSaveState({ saving: false, savedAt: null, error: "save" });
    }
  }, [caseId]);

  useEffect(() => {
    // Never autosave before the load has settled, and never when the load
    // itself failed — either would risk overwriting stored progress.
    if (!loaded || !caseId || saveState.error === "load") return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flush, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(saveTimer.current);
    // The dependency list is the analyst's work: any change schedules a save.
  }, [
    loaded, caseId, flush, saveState.error,
    activeStep, stepsDone, checklist, sel, dateRange, customTypologies, customReasons,
    narrativeTpl, smrPart, smrReportId,
  ]);

  const caseAlerts = useMemo(() => caseAlertsOf(caseData), [caseData]);

  const steps = useMemo(
    () => INVESTIGATION_STEPS.map((s, i) => ({ ...s, done: stepsDone[i] })),
    [stepsDone],
  );

  const markDone = (i) =>
    setStepsDone((prev) => {
      if (prev[i]) return prev;
      const next = prev.slice();
      next[i] = true;
      return next;
    });

  const setRadio = (key, opt) => {
    setSel((prev) => ({ ...prev, [key]: opt }));
    if (typeof key === "number") markDone(key);
  };

  const toggleMulti = (key, opt) => {
    setSel((prev) => {
      const cur = Array.isArray(prev[key]) ? prev[key].slice() : [];
      const idx = cur.indexOf(opt);
      if (idx >= 0) cur.splice(idx, 1);
      else cur.push(opt);
      return { ...prev, [key]: cur };
    });
    if (typeof key === "number") markDone(key);
  };

  const addTypology = () => {
    const v = typoDraft.trim();
    if (!v) return;
    setCustomTypologies((prev) => [...prev, v]);
    setSel((prev) => ({ ...prev, 7: [...(prev[7] || []), v] }));
    setTypoDraft("");
    markDone(7);
  };

  const addReason = () => {
    const v = reasonDraft.trim();
    if (!v) return;
    setCustomReasons((prev) => [...prev, v]);
    setSel((prev) => ({ ...prev, reasons: [...(prev.reasons || []), v] }));
    setReasonDraft("");
  };

  // Merges a patch, so editing one field and the "match flagged activity"
  // shortcut (which sets two at once) share a single path. The step counts as
  // done only when the activity period it exists to capture is complete —
  // a review window on its own does not answer the question the step asks.
  const applyDateRange = (patch) => {
    const next = { ...dateRange, ...patch };
    setDateRange(next);
    if (next.start && next.end && DATE_RANGE_STEP >= 0) markDone(DATE_RANGE_STEP);
  };

  const toggleCheck = (i) =>
    setChecklist((prev) => {
      const next = prev.slice();
      next[i] = { ...next[i], checked: !next[i].checked };
      return next;
    });

  const goToStep = (i) => setActiveStep(Math.max(0, Math.min(steps.length - 1, i)));
  const goPrev = () => goToStep(activeStep - 1);
  const goNext = () => {
    markDone(activeStep);
    goToStep(activeStep + 1);
  };

  const smrGo = (dir) => {
    const idx = SMR_PART_ORDER.indexOf(smrPart);
    const next = Math.max(0, Math.min(SMR_PART_ORDER.length - 1, idx + dir));
    setSmrPart(SMR_PART_ORDER[next]);
    if (dir > 0 && idx === SMR_PART_ORDER.length - 1) markDone(activeStep);
  };

  const doneCount = stepsDone.filter(Boolean).length;
  const checkedCount = checklist.filter((c) => c.checked).length;

  return {
    steps,
    activeStep,
    doneCount,
    goToStep,
    goPrev,
    goNext,

    checklist,
    checkedCount,
    toggleCheck,

    narrativeTpl,
    setNarrativeTpl,

    smrPart,
    setSmrPart,
    smrGo,
    setSmrReportId,

    sel,
    setRadio,
    toggleMulti,

    typoDraft,
    setTypoDraft,
    addTypology,
    customTypologies,

    reasonDraft,
    setReasonDraft,
    addReason,
    customReasons,

    dateRange,
    applyDateRange,

    caseAlerts,
    legacyPois,

    // Persistence, for the hub header's "Saving… / Saved" indicator.
    loaded,
    saving: saveState.saving,
    savedAt: saveState.savedAt,
    saveError: saveState.error,
    saveNow: flush,
  };
}
