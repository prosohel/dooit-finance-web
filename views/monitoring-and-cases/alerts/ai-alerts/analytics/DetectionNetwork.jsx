"use client";

// Fan-in / fan-out network of money movement between accounts.
//
// The daily summary is aggregate-only: it has no sender → beneficiary pairs,
// so by default this renders an explanatory empty state. The graph draws only
// when relationship-level data is supplied, in this shape:
//
//   {
//     nodes: [{ id, label?, riskLabel?, txCount?, volume?, currency? }],
//     edges: [{ source, target, amount?, currency?, txCount? }],
//   }
//
// Nothing here invents links: an empty or malformed payload is an empty state.

import { useMemo, useState } from "react";
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation } from "d3-force";
import { IconTopologyStar3 } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { COLORS, HintRows, RISK_COLORS, Section, formatCount } from "./shared";
import { formatMoney } from "../constants";

const WIDTH = 720;
const HEIGHT = 340;
const FAN_THRESHOLD = 3; // ≥3 distinct counterparties in one direction

export const hasRelationships = (graph) =>
  Array.isArray(graph?.nodes) && graph.nodes.length > 0 && Array.isArray(graph?.edges) && graph.edges.length > 0;

function useLayout(graph) {
  return useMemo(() => {
    const ids = new Set(graph.nodes.map((n) => String(n.id)));
    const nodes = graph.nodes.map((n) => ({ ...n, id: String(n.id) }));
    const edges = graph.edges
      .map((e) => ({ ...e, source: String(e.source), target: String(e.target) }))
      .filter((e) => ids.has(e.source) && ids.has(e.target));

    // Fan-in / fan-out from distinct counterparties per direction.
    const inbound = new Map();
    const outbound = new Map();
    edges.forEach((e) => {
      if (!outbound.has(e.source)) outbound.set(e.source, new Set());
      if (!inbound.has(e.target)) inbound.set(e.target, new Set());
      outbound.get(e.source).add(e.target);
      inbound.get(e.target).add(e.source);
    });
    nodes.forEach((n) => {
      n.inDegree = inbound.get(n.id)?.size || 0;
      n.outDegree = outbound.get(n.id)?.size || 0;
    });

    // Node size: transaction count, falling back to degree. sqrt so area —
    // not radius — tracks the value.
    const sizeOf = (n) => n.txCount ?? n.inDegree + n.outDegree;
    const maxSize = Math.max(1, ...nodes.map(sizeOf));
    nodes.forEach((n) => {
      n.r = 5 + Math.sqrt(sizeOf(n) / maxSize) * 13;
    });

    // Edge width: amount only when every edge is in one currency — amounts in
    // different currencies are never compared. Otherwise transaction count.
    const currencies = new Set(edges.map((e) => e.currency).filter(Boolean));
    const byAmount = currencies.size <= 1 && edges.every((e) => e.amount != null);
    const weightOf = (e) => (byAmount ? e.amount : e.txCount ?? 1);
    const maxWeight = Math.max(1, ...edges.map(weightOf));
    edges.forEach((e) => {
      e.width = 1 + (weightOf(e) / maxWeight) * 5;
    });

    // Static layout: run the simulation to rest up front rather than animate
    // it — a settling graph looks lively once and is noise every other time.
    const simulation = forceSimulation(nodes)
      .force("link", forceLink(edges).id((n) => n.id).distance(70))
      .force("charge", forceManyBody().strength(-180))
      .force("center", forceCenter(WIDTH / 2, HEIGHT / 2))
      .force("collide", forceCollide().radius((n) => n.r + 6))
      .stop();
    for (let i = 0; i < 300; i++) simulation.tick();
    nodes.forEach((n) => {
      n.x = Math.max(n.r + 4, Math.min(WIDTH - n.r - 4, n.x));
      n.y = Math.max(n.r + 4, Math.min(HEIGHT - n.r - 4, n.y));
    });

    return { nodes, edges, edgeMetric: byAmount ? "amount" : "transactions" };
  }, [graph]);
}

const patternOf = (n) =>
  [n.inDegree >= FAN_THRESHOLD && "Fan-in", n.outDegree >= FAN_THRESHOLD && "Fan-out"].filter(Boolean).join(" + ") ||
  "—";

/** Shortens an edge so its arrowhead stops at the target node's rim. */
function edgePath(e) {
  const dx = e.target.x - e.source.x;
  const dy = e.target.y - e.source.y;
  const len = Math.hypot(dx, dy) || 1;
  const trim = e.target.r + 3;
  return `M${e.source.x},${e.source.y}L${e.target.x - (dx / len) * trim},${e.target.y - (dy / len) * trim}`;
}

function NetworkGraph({ graph }) {
  const { nodes, edges, edgeMetric } = useLayout(graph);
  const [hover, setHover] = useState(null); // { kind: "node" | "edge", item }

  const focusId = hover?.kind === "node" ? hover.item.id : null;
  const isLinked = (e) => !focusId || e.source.id === focusId || e.target.id === focusId;

  const tooltip = hover && (() => {
    if (hover.kind === "node") {
      const n = hover.item;
      return {
        x: n.x,
        y: n.y - n.r,
        body: (
          <HintRows
            title={n.label || n.id}
            rows={[
              ["Risk", n.riskLabel || "—"],
              ["Pattern", patternOf(n)],
              ["Senders in", formatCount(n.inDegree)],
              ["Beneficiaries out", formatCount(n.outDegree)],
              ...(n.txCount != null ? [["Transactions", formatCount(n.txCount)]] : []),
              ...(n.volume != null ? [["Volume", formatMoney(n.volume, n.currency)]] : []),
            ]}
          />
        ),
      };
    }
    const e = hover.item;
    return {
      x: (e.source.x + e.target.x) / 2,
      y: (e.source.y + e.target.y) / 2,
      body: (
        <HintRows
          title={`${e.source.label || e.source.id} → ${e.target.label || e.target.id}`}
          rows={[
            ...(e.amount != null ? [["Amount", formatMoney(e.amount, e.currency)]] : []),
            ...(e.txCount != null ? [["Transactions", formatCount(e.txCount)]] : []),
          ]}
        />
      ),
    };
  })();

  const riskKeys = [...new Set(nodes.map((n) => n.riskLabel).filter(Boolean))];

  return (
    <div>
      <div className="relative">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full" role="img" aria-label="Account network">
          <defs>
            <marker id="tm-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M0,0L10,5L0,10z" fill={COLORS.muted} />
            </marker>
          </defs>
          <g>
            {edges.map((e, i) => (
              <path
                key={i}
                d={edgePath(e)}
                fill="none"
                stroke={COLORS.muted}
                strokeWidth={e.width}
                strokeLinecap="round"
                markerEnd="url(#tm-arrow)"
                className="cursor-default transition-opacity duration-150"
                opacity={isLinked(e) ? 0.75 : 0.12}
                onMouseEnter={() => setHover({ kind: "edge", item: e })}
                onMouseLeave={() => setHover(null)}
              />
            ))}
          </g>
          <g>
            {nodes.map((n) => {
              const dimmed = focusId && focusId !== n.id && !edges.some(
                (e) => (e.source.id === focusId && e.target.id === n.id) || (e.target.id === focusId && e.source.id === n.id)
              );
              return (
                <circle
                  key={n.id}
                  cx={n.x}
                  cy={n.y}
                  r={n.r}
                  fill={RISK_COLORS[n.riskLabel] || COLORS.primaryTint}
                  stroke="#fff"
                  strokeWidth={1.5}
                  className="cursor-default transition-opacity duration-150"
                  opacity={dimmed ? 0.2 : 1}
                  onMouseEnter={() => setHover({ kind: "node", item: n })}
                  onMouseLeave={() => setHover(null)}
                />
              );
            })}
          </g>
        </svg>

        {tooltip && (
          <div
            className="pointer-events-none absolute z-10 min-w-40 -translate-x-1/2 -translate-y-[calc(100%+8px)] rounded-lg border border-border bg-white px-2.5 py-2 text-xs shadow-md"
            style={{ left: `${(tooltip.x / WIDTH) * 100}%`, top: `${(tooltip.y / HEIGHT) * 100}%` }}
          >
            {tooltip.body}
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10.5px] text-muted-foreground">
        {riskKeys.map((key) => (
          <span key={key} className="flex items-center gap-1">
            <span className="size-2 rounded-full" style={{ backgroundColor: RISK_COLORS[key] || COLORS.primaryTint }} />
            {key}
          </span>
        ))}
        <span>Node size: transaction volume</span>
        <span>Edge width: {edgeMetric === "amount" ? "amount" : "transaction count (mixed currencies)"}</span>
      </div>
    </div>
  );
}

/** Faint schematic of the fan pattern, so the empty state shows what will appear. */
function FanSketch({ className }) {
  const spokes = [
    [18, 14],
    [14, 40],
    [18, 66],
    [102, 14],
    [106, 40],
    [102, 66],
  ];
  return (
    <svg viewBox="0 0 120 80" className={cn("h-16 w-24", className)} aria-hidden>
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

export default function DetectionNetwork({ graph }) {
  const ready = hasRelationships(graph);

  return (
    <Section
      title="Detection patterns"
      aside={ready ? "Fan-in and fan-out between accounts" : "Fan-in / fan-out network"}
    >
      {ready ? (
        <NetworkGraph graph={graph} />
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-lg bg-smoke-200/60 px-6 py-5 text-center sm:flex-row sm:text-left">
          <FanSketch className="shrink-0" />
          <div className="min-w-0">
            <p className="flex items-center justify-center gap-1.5 text-xs font-semibold text-heading sm:justify-start">
              <IconTopologyStar3 className="size-3.5 text-muted-foreground" />
              Needs transaction-level data
            </p>
            <p className="mt-1 max-w-xl text-xs text-muted-foreground">
              This summary is aggregated and has no sender-to-beneficiary links, so money movement between accounts
              can&apos;t be mapped here. The network appears when account relationship data is included in the response.
            </p>
          </div>
        </div>
      )}
    </Section>
  );
}
