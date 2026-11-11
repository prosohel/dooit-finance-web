// Turns flagged transactions into a fan-in / fan-out account network.
//
// Pure data — no React, no layout — so it is unit-tested on its own.
//
// Sources, per detection item:
//   transaction.sender / transaction.beneficiary  → nodes and a directed edge
//   transaction.amount / currency                 → edge amount, per currency
//   overall.riskLabel / riskScore                 → node and edge risk
//   collectiveContext.senderUniqueBeneficiariesDay / beneficiaryUniqueSendersDay
//     → the account's true fan degree for the day. The items are only the
//       *flagged* transactions, so the edges we can draw undercount it.

export const FAN_THRESHOLD = 3; // distinct counterparties in one direction

const RISK_RANK = { Low: 1, Medium: 2, High: 3, Critical: 4 };
const riskierOf = (a, b) => ((RISK_RANK[b] || 0) > (RISK_RANK[a] || 0) ? b : a);

/** Stable identity for a party. Masked account numbers ("****1fcf") can
 *  collide, so they are only trusted together with institution and name. */
export const partyKey = (party) => {
  if (!party) return null;
  if (party.customer) return `c:${party.customer}`;
  if (!party.account && !party.name) return null;
  return `p:${party.institution || ""}|${party.account || ""}|${party.name || ""}`;
};

const addAmount = (map, currency, amount) => {
  if (amount == null || !Number.isFinite(Number(amount))) return;
  const key = currency || "—";
  map[key] = (map[key] || 0) + Number(amount);
};

export const hasTransferData = (items) =>
  Array.isArray(items) &&
  items.some((item) => partyKey(item?.transaction?.sender) && partyKey(item?.transaction?.beneficiary));

/** Every account and every sender → beneficiary pair in the items. */
export function collectGraph(items = []) {
  const nodes = new Map();
  const edges = new Map();

  const upsertNode = (party, key) => {
    if (!nodes.has(key)) {
      nodes.set(key, {
        id: key,
        name: party.name || null,
        account: party.account || null,
        institution: party.institution || null,
        country: party.country || null,
        riskLabel: null,
        maxScore: null,
        txCount: 0,
        sent: {},
        received: {},
        reportedFanOut: 0,
        reportedFanIn: 0,
        out: new Set(),
        in: new Set(),
      });
    }
    return nodes.get(key);
  };

  for (const item of items) {
    const tx = item?.transaction;
    const senderKey = partyKey(tx?.sender);
    const beneficiaryKey = partyKey(tx?.beneficiary);
    if (!senderKey || !beneficiaryKey || senderKey === beneficiaryKey) continue;

    const risk = item.overall?.riskLabel || null;
    const score = item.overall?.riskScore ?? null;
    const ctx = item.collectiveContext || {};

    const sender = upsertNode(tx.sender, senderKey);
    const beneficiary = upsertNode(tx.beneficiary, beneficiaryKey);

    for (const node of [sender, beneficiary]) {
      node.txCount += 1;
      node.riskLabel = riskierOf(node.riskLabel, risk);
      if (score != null) node.maxScore = Math.max(node.maxScore ?? 0, score);
    }
    addAmount(sender.sent, tx.currency, tx.amount);
    addAmount(beneficiary.received, tx.currency, tx.amount);
    sender.out.add(beneficiaryKey);
    beneficiary.in.add(senderKey);
    sender.reportedFanOut = Math.max(sender.reportedFanOut, ctx.senderUniqueBeneficiariesDay || 0);
    beneficiary.reportedFanIn = Math.max(beneficiary.reportedFanIn, ctx.beneficiaryUniqueSendersDay || 0);

    const edgeKey = `${senderKey}>${beneficiaryKey}`;
    if (!edges.has(edgeKey)) {
      edges.set(edgeKey, {
        id: edgeKey,
        source: senderKey,
        target: beneficiaryKey,
        txCount: 0,
        amounts: {},
        riskLabel: null,
        transactionUids: [],
      });
    }
    const edge = edges.get(edgeKey);
    edge.txCount += 1;
    addAmount(edge.amounts, tx.currency, tx.amount);
    edge.riskLabel = riskierOf(edge.riskLabel, risk);
    if (item.transactionUid && edge.transactionUids.length < 5) edge.transactionUids.push(item.transactionUid);
  }

  for (const node of nodes.values()) {
    // The day's reported degree when the API gives one; never less than what
    // the flagged transactions alone show.
    node.fanOut = Math.max(node.out.size, node.reportedFanOut);
    node.fanIn = Math.max(node.in.size, node.reportedFanIn);
    node.patterns = [
      node.fanOut >= FAN_THRESHOLD && "fan-out",
      node.fanIn >= FAN_THRESHOLD && "fan-in",
    ].filter(Boolean);
  }

  return { nodes, edges };
}

/**
 * The view an analyst can read: the strongest fan hubs and their direct
 * counterparties, not the whole hairball.
 *
 * pattern: "all" | "fan-out" | "fan-in"
 */
export function buildNetwork(items, { pattern = "all", maxHubs = 10, maxSpokes = 24 } = {}) {
  const { nodes, edges } = collectGraph(items);

  const degreeFor = (node) =>
    pattern === "fan-out" ? node.fanOut : pattern === "fan-in" ? node.fanIn : Math.max(node.fanOut, node.fanIn);

  const hubs = [...nodes.values()]
    .filter((n) => (pattern === "all" ? n.patterns.length > 0 : n.patterns.includes(pattern)))
    .sort((a, b) => degreeFor(b) - degreeFor(a) || b.txCount - a.txCount || (b.maxScore ?? 0) - (a.maxScore ?? 0))
    .slice(0, maxHubs);

  const hubIds = new Set(hubs.map((h) => h.id));
  const visibleEdges = new Map();

  for (const hub of hubs) {
    // Spokes in the hub's direction(s), busiest first, capped so one 200-way
    // fan-out can't swallow the canvas.
    const spokes = [];
    if (pattern !== "fan-in" && hub.patterns.includes("fan-out")) {
      for (const target of hub.out) spokes.push(edges.get(`${hub.id}>${target}`));
    }
    if (pattern !== "fan-out" && hub.patterns.includes("fan-in")) {
      for (const source of hub.in) spokes.push(edges.get(`${source}>${hub.id}`));
    }
    spokes.sort((a, b) => b.txCount - a.txCount);
    hub.hiddenSpokes = Math.max(0, spokes.length - maxSpokes);
    hub.shownSpokes = Math.min(spokes.length, maxSpokes);
    spokes.slice(0, maxSpokes).forEach((e) => visibleEdges.set(e.id, e));
  }

  // Links between two visible hubs count too — they're often the layering
  // step between a fan-in and the fan-out that follows it.
  for (const edge of edges.values()) {
    if (hubIds.has(edge.source) && hubIds.has(edge.target)) visibleEdges.set(edge.id, edge);
  }

  const visibleIds = new Set();
  for (const e of visibleEdges.values()) {
    visibleIds.add(e.source);
    visibleIds.add(e.target);
  }
  hubs.forEach((h) => visibleIds.add(h.id));

  const shownNodes = [...visibleIds].map((id) => ({
    ...nodes.get(id),
    isHub: hubIds.has(id),
  }));

  const currencies = new Set();
  for (const e of visibleEdges.values()) Object.keys(e.amounts).forEach((c) => currencies.add(c));

  return {
    nodes: shownNodes,
    edges: [...visibleEdges.values()].map((e) => ({ ...e })),
    hubs,
    currencies: [...currencies],
    stats: {
      accounts: nodes.size,
      transfers: [...edges.values()].reduce((sum, e) => sum + e.txCount, 0),
      fanOut: [...nodes.values()].filter((n) => n.patterns.includes("fan-out")).length,
      fanIn: [...nodes.values()].filter((n) => n.patterns.includes("fan-in")).length,
    },
  };
}
