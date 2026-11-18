"use client";

import { useMemo, useState } from "react";
import moment from "moment";
import {
  IconUsers,
  IconUserCheck,
  IconFlag,
  IconNotes,
  IconMailForward,
  IconFileText,
  IconUserSearch,
  IconActivity,
  IconArrowRight,
  IconX,
} from "@tabler/icons-react";
import CollapsibleSection from "../components/CollapsibleSection";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn, getInitials } from "@/lib/utils";

// ── Categories ────────────────────────────────────────────────────────────────
// The audit log is free-text action names, so entries are bucketed by keyword.
// Order matters: the first match wins ("RFI Sent" is an RFI, not a report).
const CATEGORIES = [
  { id: "assignment", label: "Assignment", icon: IconUserCheck, tone: "text-violet-600 bg-violet-50", match: /assign|transfer|handover/ },
  { id: "status", label: "Status", icon: IconFlag, tone: "text-amber-600 bg-amber-50", match: /status|close|reopen|escalat|priority|open/ },
  { id: "note", label: "Notes", icon: IconNotes, tone: "text-slate-600 bg-slate-100", match: /note|comment/ },
  { id: "rfi", label: "RFIs", icon: IconMailForward, tone: "text-sky-600 bg-sky-50", match: /rfi|request for info/ },
  { id: "report", label: "Reports", icon: IconFileText, tone: "text-emerald-600 bg-emerald-50", match: /report|smr|str|sar|ttr|draft|fil(e|ing)/ },
  { id: "party", label: "Parties", icon: IconUserSearch, tone: "text-rose-600 bg-rose-50", match: /poi|party|customer|entity|link/ },
];
const OTHER = { id: "other", label: "Other", icon: IconActivity, tone: "text-muted-foreground bg-muted" };
const CATEGORY_BY_ID = Object.fromEntries([...CATEGORIES, OTHER].map((c) => [c.id, c]));

const categorise = (action = "") => {
  const a = String(action).toLowerCase();
  return CATEGORIES.find((c) => c.match.test(a))?.id || "other";
};

// Notes, RFIs and reassignments can also land in the audit log server-side.
// Treat a companion record as a duplicate when the same person logged the
// same kind of action within a minute of it.
const isDuplicate = (log, entry) =>
  log.some(
    (l) =>
      l.category === entry.category &&
      l.user === entry.user &&
      Math.abs(new Date(l.date) - new Date(entry.date)) < 60_000,
  );

export function buildHistory({ auditLog = [], notes = [], rfis = [], assignment }) {
  const entries = auditLog
    .filter((l) => l.date)
    .map((l) => ({
      id: `audit-${l.id}`,
      date: l.date,
      user: l.user || "System",
      action: l.action || "Updated case",
      details: l.details || null,
      from: l.previousValue && l.previousValue !== "—" ? l.previousValue : null,
      to: l.newValue && l.newValue !== "—" ? l.newValue : null,
      category: categorise(l.action),
    }));

  const companions = [
    ...notes
      .filter((n) => n.date)
      .map((n) => ({
        id: `note-${n.id}`,
        date: n.date,
        user: n.author || "Unknown",
        action: "Added a note",
        details: n.text || null,
        category: "note",
      })),
    ...rfis
      .filter((r) => r.sentDate && r.sentBy)
      .map((r) => ({
        id: `rfi-${r.id}`,
        date: r.sentDate,
        user: r.sentBy,
        action: `Sent ${r.id}`,
        details: r.documents?.length ? `Requested ${r.documents.join(", ")}` : null,
        category: "rfi",
      })),
    ...(assignment?.history || [])
      .filter((h) => h.date)
      .map((h, i) => ({
        id: `assign-${i}-${h.date}`,
        date: h.date,
        user: h.by || h.analyst,
        action: h.action === "Reassigned" ? "Took over the case" : h.action || "Assigned",
        details: h.by && h.by !== h.analyst ? `Assigned to ${h.analyst}` : null,
        category: "assignment",
      })),
  ].filter((e) => !isDuplicate(entries, e));

  return [...entries, ...companions].sort((a, b) => new Date(b.date) - new Date(a.date));
}

// Everyone who has touched the case, most active first. The current assignee
// is pinned to the front so "who owns this now" is always the first thing read.
export function getContributors(history, assignedAnalyst) {
  const map = new Map();
  for (const e of history) {
    const c = map.get(e.user) || { name: e.user, count: 0, last: e.date };
    c.count += 1;
    if (new Date(e.date) > new Date(c.last)) c.last = e.date;
    map.set(e.user, c);
  }
  return [...map.values()].sort((a, b) => {
    if (a.name === assignedAnalyst) return -1;
    if (b.name === assignedAnalyst) return 1;
    return b.count - a.count;
  });
}

const dayLabel = (date) => {
  const d = moment(date);
  if (d.isSame(moment(), "day")) return "Today";
  if (d.isSame(moment().subtract(1, "day"), "day")) return "Yesterday";
  return d.format(d.isSame(moment(), "year") ? "ddd, DD MMM" : "DD MMM YYYY");
};

// Only the first screenful staggers in; anything further down is off-screen
// by the time it would animate, and a long cascade would make the tab feel slow.
const STAGGER_CAP = 10;

export default function AnalystHistorySection({
  auditLog,
  notes,
  rfis,
  assignment,
  assignedAnalyst,
  sectionRef,
  // Inside a dialog: render the feed bare, without the section card.
  embedded = false,
}) {
  const history = useMemo(
    () => buildHistory({ auditLog, notes, rfis, assignment }),
    [auditLog, notes, rfis, assignment],
  );

  const [analyst, setAnalyst] = useState(null);
  const [category, setCategory] = useState("all");
  // The entrance plays once, when the tab opens. Filtering is something an
  // analyst does repeatedly, so results swap instantly after the first touch.
  const [entered, setEntered] = useState(false);
  const touch = () => setEntered(true);

  const contributors = useMemo(
    () => getContributors(history, assignedAnalyst),
    [history, assignedAnalyst],
  );

  const byAnalyst = analyst ? history.filter((e) => e.user === analyst) : history;
  const visible = category === "all" ? byAnalyst : byAnalyst.filter((e) => e.category === category);

  // Category chips only for what the (analyst-filtered) feed actually contains.
  const categoryCounts = byAnalyst.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + 1;
    return acc;
  }, {});
  const categoryChips = [...CATEGORIES, OTHER].filter((c) => categoryCounts[c.id]);

  const groups = [];
  for (const e of visible) {
    const label = dayLabel(e.date);
    const last = groups[groups.length - 1];
    if (last?.label === label) last.items.push(e);
    else groups.push({ label, items: [e] });
  }

  let rowIndex = 0;

  const body =
      history.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
          <IconUsers className="mb-2 size-8 text-muted-foreground/50" stroke={1.4} />
          <p className="text-sm font-medium text-heading">No analyst activity yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Assignments, notes, RFIs and status changes will appear here as they happen.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {/* ── Contributors ─────────────────────────────────────────────── */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Contributors
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {contributors.map((c) => {
                const active = analyst === c.name;
                const share = Math.round((c.count / history.length) * 100);
                return (
                  <button
                    key={c.name}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      touch();
                      setAnalyst(active ? null : c.name);
                      setCategory("all");
                    }}
                    className={cn(
                      "ah-press flex min-w-0 items-center gap-3 rounded-lg border p-3 text-left",
                      active
                        ? "border-primary/40 bg-primary/[0.05]"
                        : "border-border bg-background hover:bg-muted/40",
                      analyst && !active && "opacity-60 hover:opacity-100",
                    )}
                  >
                    <Avatar className="size-9 shrink-0">
                      <AvatarFallback
                        className={cn(
                          "text-xs font-semibold",
                          active ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary",
                        )}
                      >
                        {getInitials(c.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-semibold text-heading">{c.name}</span>
                        {c.name === assignedAnalyst && (
                          <span className="shrink-0 rounded-full bg-emerald-50 px-1.5 py-px text-[10px] font-semibold text-emerald-700">
                            Assigned
                          </span>
                        )}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        <span className="tabular-nums">{c.count}</span>{" "}
                        {c.count === 1 ? "action" : "actions"} · last {moment(c.last).fromNow()}
                      </span>
                      {/* Share of the case's activity — a static bar, it's data. */}
                      <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-muted">
                        <span
                          className="block h-full rounded-full bg-primary/60"
                          style={{ width: `${Math.max(share, 4)}%` }}
                        />
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Filters ──────────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Chip
              active={category === "all"}
              onClick={() => {
                touch();
                setCategory("all");
              }}
            >
              All <span className="tabular-nums opacity-70">{byAnalyst.length}</span>
            </Chip>
            {categoryChips.map((c) => (
              <Chip
                key={c.id}
                active={category === c.id}
                onClick={() => {
                  touch();
                  setCategory(category === c.id ? "all" : c.id);
                }}
              >
                <c.icon className="size-3.5" />
                {c.label} <span className="tabular-nums opacity-70">{categoryCounts[c.id]}</span>
              </Chip>
            ))}
            {analyst && (
              <button
                type="button"
                onClick={() => {
                  setAnalyst(null);
                  setCategory("all");
                }}
                className="ah-press ml-auto flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <IconX className="size-3.5" />
                Clear {analyst}
              </button>
            )}
          </div>

          {/* ── Feed ─────────────────────────────────────────────────────── */}
          {visible.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No matching activity for this filter.
            </p>
          ) : (
            <ol className="flex flex-col gap-5">
              {groups.map((g) => (
                <li key={g.label}>
                  <p className="mb-2 text-xs font-semibold text-muted-foreground">{g.label}</p>
                  <ol className="relative ml-[17px] border-l border-border">
                    {g.items.map((e) => {
                      const i = rowIndex++;
                      const cat = CATEGORY_BY_ID[e.category];
                      return (
                        <li
                          key={e.id}
                          className={cn("relative pb-4 pl-7 last:pb-0", !entered && i < STAGGER_CAP && "ah-rise")}
                          style={!entered && i < STAGGER_CAP ? { "--ah-delay": `${i * 40}ms` } : undefined}
                        >
                          <span
                            className={cn(
                              "absolute -left-[13px] top-0 flex size-[26px] items-center justify-center rounded-full ring-4 ring-card",
                              cat.tone,
                            )}
                          >
                            <cat.icon className="size-3.5" stroke={1.8} />
                          </span>
                          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                            <p className="text-sm text-muted-foreground">
                              <span className="font-semibold text-heading">{e.user}</span>{" "}
                              <span className="text-heading">{lowerFirst(e.action)}</span>
                            </p>
                            <time
                              dateTime={e.date}
                              title={moment(e.date).format("DD MMM YYYY hh:mm:ss A")}
                              className="shrink-0 text-xs tabular-nums text-muted-foreground"
                            >
                              {moment(e.date).format("hh:mm A")}
                            </time>
                          </div>
                          {(e.from || e.to) && (
                            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                              {e.from && (
                                <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground line-through decoration-muted-foreground/40">
                                  {e.from}
                                </span>
                              )}
                              {e.from && e.to && <IconArrowRight className="size-3 text-muted-foreground" />}
                              {e.to && (
                                <span className="rounded bg-primary/[0.08] px-1.5 py-0.5 font-medium text-primary">
                                  {e.to}
                                </span>
                              )}
                            </p>
                          )}
                          {e.details && (
                            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                              {e.details}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                </li>
              ))}
            </ol>
          )}
        </div>
      );

  if (embedded) return body;

  return (
    <CollapsibleSection
      id="analyst-history"
      title="Analyst History"
      icon={IconUsers}
      badge={history.length}
      collapsible={false}
      sectionRef={sectionRef}
    >
      {body}
    </CollapsibleSection>
  );
}

// "Case Escalated" → "case Escalated" reads oddly; only lower a leading
// capital when the action is a verb phrase, not an acronym ("RFI Sent").
const lowerFirst = (s = "") => (/^[A-Z][a-z]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s);

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "ah-press flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium",
        active
          ? "border-primary/30 bg-primary/[0.08] text-primary"
          : "border-border bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
