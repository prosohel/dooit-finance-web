"use client";

// Fan-in / fan-out network of money movement between accounts, built from the
// flagged transactions' sender and beneficiary (see buildNetwork.js).
//
// Reading it: each hub is an account that sent to, or received from, 3+
// distinct counterparties. Spokes are directed transfers. Hover to trace an
// account's links; click (or pick from the list) to pin it.

import { useCallback, useMemo, useState } from "react";
import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY } from "d3-force";
import { IconTopologyStar3 } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { COLORS, HintRows, RISK_COLORS, Section, Segmented, formatCount } from "./shared";
import { FAN_THRESHOLD, buildNetwork, hasTransferData } from "./buildNetwork";
import { formatMoney } from "../constants";

const WIDTH = 760;
const HEIGHT = 380;
const PAD = 28;

const nodeColor = (n) => RISK_COLORS[n.riskLabel] || COLORS.primaryTint;
const partyLabel = (n) => n.name || n.account || "Unknown";
const truncate = (s, max) => (s && s.length > max ? `${s.slice(0, max - 1)}…` : s);
const moneyLines = (amounts = {}) =>
  Object.entries(amounts).map(([currency, sum]) => formatMoney(sum, currency === "—" ? "" : currency));

/* ── Layout ─────────────────────────────────────────────────────────────── */

function useLayout(network) {
  return useMemo(() => {
    const nodes = network.nodes.map((n) => ({ ...n }));
    const edges = network.edges.map((e) => ({ ...e }));

    // Node area tracks flagged-transaction count (sqrt: area, not radius).
    const maxTx = Math.max(1, ...nodes.map((n) => n.txCount));
    nodes.forEach((n) => {
      n.r = (n.isHub ? 7 : 3.5) + Math.sqrt(n.txCount / maxTx) * (n.isHub ? 11 : 6);
    });

    // Edge width: amount only when every visible transfer is in one currency —
    // BDT and USD are never compared. Otherwise, transaction count.
    const single = network.currencies.length === 1 ? network.currencies[0] : null;
    const weight = (e) => (single ? e.amounts[single] || 0 : e.txCount);
    const maxWeight = Math.max(1, ...edges.map(weight));
    edges.forEach((e) => {
      e.width = 0.75 + Math.sqrt(weight(e) / maxWeight) * 4.25;
    });

    // Run the simulation to rest before first paint. A settling graph is fun
    // once and noise every other time this dashboard opens.
    const simulation = forceSimulation(nodes)
      .force("link", forceLink(edges).id((n) => n.id).distance((e) => 26 + e.source.r + e.target.r).strength(0.9))
      .force("charge", forceManyBody().strength((n) => (n.isHub ? -260 : -40)))
      .force("x", forceX(0).strength(0.07))
      .force("y", forceY(0).strength(0.1))
      .force("collide", forceCollide().radius((n) => n.r + 3))
      .stop();
    for (let i = 0; i < 320; i++) simulation.tick();

    // Fit the result into the canvas instead of clamping, which would pile
    // nodes up along the edges.
    const minX = Math.min(...nodes.map((n) => n.x - n.r));
    const maxX = Math.max(...nodes.map((n) => n.x + n.r));
    const minY = Math.min(...nodes.map((n) => n.y - n.r));
    const maxY = Math.max(...nodes.map((n) => n.y + n.r));
    const scale = Math.min((WIDTH - PAD * 2) / (maxX - minX || 1), (HEIGHT - PAD * 2) / (maxY - minY || 1), 1.8);
    const offX = (WIDTH - (maxX - minX) * scale) / 2;
    const offY = (HEIGHT - (maxY - minY) * scale) / 2;
    nodes.forEach((n) => {
      n.x = offX + (n.x - minX) * scale;
      n.y = offY + (n.y - minY) * scale;
    });

    const neighbors = new Map(nodes.map((n) => [n.id, new Set()]));
    edges.forEach((e) => {
      neighbors.get(e.source.id).add(e.target.id);
      neighbors.get(e.target.id).add(e.source.id);
    });

    return { nodes, edges, neighbors, edgeMetric: single ? `amount (${single})` : "transaction count" };
  }, [network]);
}

/** Straight edge, trimmed so the arrowhead stops at the target's rim. */
function edgePath(e) {
  const dx = e.target.x - e.source.x;
  const dy = e.target.y - e.source.y;
  const len = Math.hypot(dx, dy) || 1;
  const startTrim = e.source.r;
  const endTrim = e.target.r + 2.5;
  return `M${e.source.x + (dx / len) * startTrim},${e.source.y + (dy / len) * startTrim}L${
    e.target.x - (dx / len) * endTrim
  },${e.target.y - (dy / len) * endTrim}`;
}

/* ── Pieces ─────────────────────────────────────────────────────────────── */

function PatternTags({ node, size = "sm" }) {
  const tags = [
    node.fanOut >= FAN_THRESHOLD && { key: "out", label: "Fan-out", n: node.fanOut },
    node.fanIn >= FAN_THRESHOLD && { key: "in", label: "Fan-in", n: node.fanIn },
  ].filter(Boolean);
  return tags.map((t) => (
    <span
      key={t.key}
      className={cn(
        "rounded bg-primary/[0.07] font-semibold tabular-nums text-primary",
        size === "sm" ? "px-1 py-px text-[9.5px]" : "px-1.5 py-0.5 text-[10.5px]"
      )}
    >
      {t.label} {t.n}
    </span>
  ));
}

function nodeHint(n) {
  const drawnOut = n.out?.size ?? 0;
  const drawnIn = n.in?.size ?? 0;
  return (
    <HintRows
      title={partyLabel(n)}
      rows={[
        ["Account", [n.account, n.institution].filter(Boolean).join(" · ") || "—"],
        ...(n.country ? [["Country", n.country]] : []),
        ["Risk", n.riskLabel ? `${n.riskLabel}${n.maxScore != null ? ` · ${n.maxScore}` : ""}` : "—"],
        ["Flagged transactions", formatCount(n.txCount)],
        // The day's reported count can exceed what's drawn: only flagged
        // transactions are in the payload.
        ...(n.fanOut ? [["Beneficiaries today", `${formatCount(n.fanOut)}${n.fanOut > drawnOut ? ` · ${drawnOut} flagged` : ""}`]] : []),
        ...(n.fanIn ? [["Senders today", `${formatCount(n.fanIn)}${n.fanIn > drawnIn ? ` · ${drawnIn} flagged` : ""}`]] : []),
        ...moneyLines(n.sent).map((m, i) => [i ? "" : "Sent", m]),
        ...moneyLines(n.received).map((m, i) => [i ? "" : "Received", m]),
      ]}
    />
  );
}

function edgeHint(e) {
  return (
    <HintRows
      title={`${truncate(partyLabel(e.source), 22)} → ${truncate(partyLabel(e.target), 22)}`}
      rows={[
        ...moneyLines(e.amounts).map((m, i) => [i ? "" : "Amount", m]),
        ["Transactions", formatCount(e.txCount)],
        ...(e.riskLabel ? [["Highest risk", e.riskLabel]] : []),
      ]}
    />
  );
}

function FloatingHint({ x, y, children }) {
  // Flip the anchor near the canvas edges so the card never clips.
  const fx = x / WIDTH;
  const alignX = fx < 0.22 ? "0%" : fx > 0.78 ? "-100%" : "-50%";
  const below = y / HEIGHT < 0.3;
  return (
    <div
      className="pointer-events-none absolute z-10 min-w-44 rounded-lg border border-border bg-white px-2.5 py-2 text-xs shadow-md"
      style={{
        left: `${fx * 100}%`,
        top: `${(y / HEIGHT) * 100}%`,
        transform: `translate(${alignX}, ${below ? "14px" : "calc(-100% - 14px)"})`,
      }}
    >
      {children}
    </div>
  );
}

/* ── Graph ──────────────────────────────────────────────────────────────── */

function NetworkGraph({ network, activeId, hover, onHover, onPin }) {
  const { nodes, edges, neighbors, edgeMetric } = useLayout(network);
  const focusId = activeId;
  const linked = focusId ? neighbors.get(focusId) : null;

  const isLit = (id) => !focusId || id === focusId || linked?.has(id);
  const edgeLit = (e) => !focusId || e.source.id === focusId || e.target.id === focusId;

  const hint = (() => {
    if (!hover) return null;
    if (hover.kind === "node") {
      const n = nodes.find((x) => x.id === hover.id);
      return n && { x: n.x, y: n.y + (hover.fromList ? 0 : -n.r), body: hover.fromList ? null : nodeHint(n) };
    }
    const e = edges.find((x) => x.id === hover.id);
    return e && { x: (e.source.x + e.target.x) / 2, y: (e.source.y + e.target.y) / 2, body: edgeHint(e) };
  })();

  const riskKeys = ["Critical", "High", "Medium", "Low"].filter((k) => nodes.some((n) => n.riskLabel === k));

  return (
    <div className="min-w-0">
      <div className="relative">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-auto w-full select-none"
          role="img"
          aria-label={`Account network: ${network.hubs.length} fan hubs, ${nodes.length} accounts`}
          onClick={() => onPin(null)}
        >
          <defs>
            {[
              ["tm-arrow", COLORS.muted],
              ["tm-arrow-lit", COLORS.primaryLight],
            ].map(([id, fill]) => (
              <marker key={id} id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto">
                <path d="M0,1L10,5L0,9z" fill={fill} />
              </marker>
            ))}
          </defs>

          <g>
            {edges.map((e) => {
              const lit = focusId && edgeLit(e);
              return (
                <path
                  key={e.id}
                  d={edgePath(e)}
                  fill="none"
                  stroke={lit ? COLORS.primaryLight : COLORS.muted}
                  strokeWidth={e.width}
                  strokeLinecap="round"
                  markerEnd={`url(#${lit ? "tm-arrow-lit" : "tm-arrow"})`}
                  style={{ opacity: !focusId ? 0.5 : lit ? 0.9 : 0.07 }}
                  className="transition-opacity duration-150 ease-out"
                  onMouseEnter={() => onHover({ kind: "edge", id: e.id })}
                  onMouseLeave={() => onHover(null)}
                />
              );
            })}
          </g>

          <g>
            {nodes.map((n) => (
              <g
                key={n.id}
                transform={`translate(${n.x},${n.y})`}
                style={{ opacity: isLit(n.id) ? 1 : 0.15 }}
                className="cursor-pointer transition-opacity duration-150 ease-out"
                onMouseEnter={() => onHover({ kind: "node", id: n.id })}
                onMouseLeave={() => onHover(null)}
                onClick={(event) => {
                  event.stopPropagation();
                  onPin(n.id);
                }}
              >
                {/* Generous invisible hit area — small spokes are hard to hover. */}
                <circle r={Math.max(n.r + 4, 9)} fill="transparent" />
                {n.id === focusId && <circle r={n.r + 3.5} fill="none" stroke={COLORS.primary} strokeWidth={1.5} />}
                <circle r={n.r} fill={nodeColor(n)} stroke="#fff" strokeWidth={n.isHub ? 2 : 1} />
                {n.isHub && (
                  <text
                    y={n.r + 11}
                    textAnchor="middle"
                    className="fill-heading text-[10px] font-medium"
                    stroke="#fff"
                    strokeWidth={3}
                    paintOrder="stroke"
                  >
                    {truncate(partyLabel(n), 18)}
                  </text>
                )}
              </g>
            ))}
          </g>
        </svg>

        {hint?.body && (
          <FloatingHint x={hint.x} y={hint.y}>
            {hint.body}
          </FloatingHint>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10.5px] text-muted-foreground">
        {riskKeys.map((key) => (
          <span key={key} className="flex items-center gap-1">
            <span className="size-2 rounded-full" style={{ backgroundColor: RISK_COLORS[key] }} />
            {key}
          </span>
        ))}
        <span>Size: flagged transactions</span>
        <span>Line width: {edgeMetric}</span>
        <span className="hidden sm:inline">Click an account to pin it</span>
      </div>
    </div>
  );
}

/* ── Hub list ───────────────────────────────────────────────────────────── */

function HubList({ hubs, activeId, pinnedId, onHover, onPin }) {
  return (
    <ol className="space-y-0.5" onMouseLeave={() => onHover(null)}>
      {hubs.map((hub, i) => {
        const active = hub.id === activeId;
        const pinned = hub.id === pinnedId;
        return (
          <li key={hub.id}>
            <button
              type="button"
              aria-pressed={pinned}
              onMouseEnter={() => onHover({ kind: "node", id: hub.id, fromList: true })}
              onFocus={() => onHover({ kind: "node", id: hub.id, fromList: true })}
              onBlur={() => onHover(null)}
              onClick={() => onPin(hub.id)}
              className={cn(
                "flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition-[background-color,transform] duration-150 ease-out active:scale-[0.98]",
                active ? "bg-primary/[0.07]" : "hover:bg-smoke-200/70"
              )}
            >
              <span className="mt-px w-3.5 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">{i + 1}</span>
              <span className="mt-1 size-2 shrink-0 rounded-full" style={{ backgroundColor: nodeColor(hub) }} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-heading">{partyLabel(hub)}</span>
                <span className="block truncate text-[10.5px] text-muted-foreground">
                  {[hub.account, hub.institution].filter(Boolean).join(" · ")}
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-1">
                  <PatternTags node={hub} />
                  {hub.hiddenSpokes > 0 && (
                    <span className="text-[9.5px] text-muted-foreground">+{hub.hiddenSpokes} not drawn</span>
                  )}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/* ── Empty states ───────────────────────────────────────────────────────── */

/** Faint schematic of the fan pattern, so the empty state shows what will appear. */
function FanSketch() {
  const spokes = [[18, 14], [14, 40], [18, 66], [102, 14], [106, 40], [102, 66]];
  return (
    <svg viewBox="0 0 120 80" className="h-16 w-24 shrink-0" aria-hidden>
      {spokes.map(([x, y], i) => (
        <line key={i} x1={60} y1={40} x2={x} y2={y} stroke="#d6d6d6" strokeWidth={1.5} />
      ))}
      {spokes.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={4.5} fill="#e5e5e5" />
      ))}
      <circle cx={60} cy={40} r={9} fill="#cbd1d2" />
    </svg>
  );
}

function EmptyState({ title, children }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg bg-smoke-200/60 px-6 py-5 text-center sm:flex-row sm:text-left">
      <FanSketch />
      <div className="min-w-0">
        <p className="flex items-center justify-center gap-1.5 text-xs font-semibold text-heading sm:justify-start">
          <IconTopologyStar3 className="size-3.5 text-muted-foreground" />
          {title}
        </p>
        <p className="mt-1 max-w-xl text-xs text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}

/* ── Section ────────────────────────────────────────────────────────────── */

export { hasTransferData };

export default function DetectionNetwork({ transactions }) {
  const [pattern, setPattern] = useState("all");
  const [pinned, setPinned] = useState(null);
  const [hover, setHover] = useState(null);

  const ready = hasTransferData(transactions);
  const overview = useMemo(() => (ready ? buildNetwork(transactions) : null), [ready, transactions]);
  const network = useMemo(
    () => (ready ? (pattern === "all" ? overview : buildNetwork(transactions, { pattern })) : null),
    [ready, pattern, overview, transactions]
  );

  // Pinned wins; otherwise whatever is hovered. Edges never take focus.
  const activeId = pinned ?? (hover?.kind === "node" ? hover.id : null);

  const changePattern = useCallback((value) => {
    setPattern(value);
    setPinned(null);
    setHover(null);
  }, []);

  const pin = useCallback((id) => setPinned((current) => (id && current !== id ? id : null)), []);

  if (!ready) {
    return (
      <Section title="Detection patterns" aside="Fan-in / fan-out network">
        <EmptyState title="Needs transaction-level data">
          These detections carry no sender and beneficiary details, so money movement between accounts can&apos;t be
          mapped yet.
        </EmptyState>
      </Section>
    );
  }

  const { stats } = overview;
  const options = [
    { value: "all", label: "All" },
    { value: "fan-out", label: `Fan-out ${stats.fanOut}` },
    { value: "fan-in", label: `Fan-in ${stats.fanIn}` },
  ];

  return (
    <Section
      title="Detection patterns"
      aside={`${formatCount(stats.accounts)} accounts · ${formatCount(stats.transfers)} flagged transfers`}
      action={
        stats.fanOut + stats.fanIn > 0 && (
          <Segmented label="Filter by pattern" value={pattern} options={options} onChange={changePattern} />
        )
      }
    >
      {network.hubs.length === 0 ? (
        <EmptyState title="No fan patterns">
          No account sent to or received from {FAN_THRESHOLD}+ distinct counterparties across these{" "}
          {formatCount(stats.transfers)} flagged transfers.
        </EmptyState>
      ) : (
        <div
          className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]"
          onKeyDown={(event) => event.key === "Escape" && setPinned(null)}
        >
          {/* Keyed by filter: the new layout crossfades in rather than nodes
              jumping to unrelated positions. */}
          <div key={pattern} className="transition-opacity duration-200 ease-out starting:opacity-0">
            <NetworkGraph network={network} activeId={activeId} hover={hover} onHover={setHover} onPin={pin} />
          </div>
          <div className="min-w-0 lg:border-l lg:border-border lg:pl-3">
            <p className="mb-1.5 px-2 text-[11px] text-muted-foreground">
              Top {network.hubs.length} {pattern === "all" ? "hubs" : pattern} by counterparties
            </p>
            <div className="max-h-[22rem] overflow-y-auto">
              <HubList hubs={network.hubs} activeId={activeId} pinnedId={pinned} onHover={setHover} onPin={pin} />
            </div>
          </div>
        </div>
      )}
    </Section>
  );
}
