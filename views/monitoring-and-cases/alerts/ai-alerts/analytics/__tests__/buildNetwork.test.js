import { describe, expect, it } from "vitest";
import { buildNetwork, collectGraph, hasTransferData, partyKey } from "../buildNetwork";

const party = (account, extra = {}) => ({ name: `N ${account}`, account, institution: "Bank", ...extra });
const tx = (from, to, { amount = 100, currency = "BDT", risk = "High", ctx = {}, uid } = {}) => ({
  transactionUid: uid,
  overall: { riskLabel: risk, riskScore: risk === "Critical" ? 99 : 80 },
  collectiveContext: ctx,
  transaction: { sender: party(from), beneficiary: party(to), amount, currency },
});

describe("partyKey", () => {
  it("prefers the customer id", () => {
    expect(partyKey({ customer: "c1", account: "****1" })).toBe("c:c1");
  });
  it("does not merge equal masked accounts at different institutions", () => {
    expect(partyKey({ account: "****1fcf", institution: "A" })).not.toBe(partyKey({ account: "****1fcf", institution: "B" }));
  });
  it("returns null for an empty party", () => {
    expect(partyKey({})).toBeNull();
    expect(partyKey(null)).toBeNull();
  });
});

describe("hasTransferData", () => {
  it("needs both sides of at least one transfer", () => {
    expect(hasTransferData([])).toBe(false);
    expect(hasTransferData([{ transaction: { sender: party("1") } }])).toBe(false);
    expect(hasTransferData([tx("1", "2")])).toBe(true);
  });
});

describe("collectGraph", () => {
  it("aggregates repeat transfers into one edge, keeping currencies apart", () => {
    const { edges } = collectGraph([tx("A", "B", { amount: 10 }), tx("A", "B", { amount: 5, currency: "USD" }), tx("A", "B", { amount: 1 })]);
    expect(edges.size).toBe(1);
    const edge = [...edges.values()][0];
    expect(edge.txCount).toBe(3);
    expect(edge.amounts).toEqual({ BDT: 11, USD: 5 });
  });

  it("takes the riskiest label seen", () => {
    const { nodes } = collectGraph([tx("A", "B"), tx("A", "C", { risk: "Critical" })]);
    expect([...nodes.values()].find((n) => n.account === "A").riskLabel).toBe("Critical");
  });

  it("uses the reported daily fan degree when it exceeds the flagged edges", () => {
    const { nodes } = collectGraph([tx("A", "B", { ctx: { senderUniqueBeneficiariesDay: 7, beneficiaryUniqueSendersDay: 4 } })]);
    const a = [...nodes.values()].find((n) => n.account === "A");
    const b = [...nodes.values()].find((n) => n.account === "B");
    expect(a.fanOut).toBe(7);
    expect(a.patterns).toEqual(["fan-out"]);
    expect(b.fanIn).toBe(4);
    expect(b.patterns).toEqual(["fan-in"]);
  });

  it("skips self-transfers and transfers missing a party", () => {
    const { edges } = collectGraph([tx("A", "A"), { transaction: { sender: party("A") } }]);
    expect(edges.size).toBe(0);
  });
});

describe("buildNetwork", () => {
  // Hub H fans out to 4; hub R receives from 3; P→Q is a lone pair.
  const items = [
    tx("H", "1"), tx("H", "2"), tx("H", "3"), tx("H", "4"),
    tx("x", "R"), tx("y", "R"), tx("z", "R"),
    tx("P", "Q"),
  ];

  it("keeps hubs and their spokes, drops unrelated pairs", () => {
    const net = buildNetwork(items);
    const accounts = net.nodes.map((n) => n.account).sort();
    expect(net.hubs.map((h) => h.account).sort()).toEqual(["H", "R"]);
    expect(accounts).not.toContain("P");
    expect(net.edges).toHaveLength(7);
    expect(net.stats).toMatchObject({ accounts: 11, transfers: 8, fanOut: 1, fanIn: 1 });
  });

  it("filters by pattern", () => {
    expect(buildNetwork(items, { pattern: "fan-in" }).hubs.map((h) => h.account)).toEqual(["R"]);
    expect(buildNetwork(items, { pattern: "fan-out" }).hubs.map((h) => h.account)).toEqual(["H"]);
  });

  it("caps spokes per hub and reports the rest", () => {
    const net = buildNetwork(items, { pattern: "fan-out", maxSpokes: 2 });
    expect(net.edges).toHaveLength(2);
    expect(net.hubs[0].hiddenSpokes).toBe(2);
  });

  it("lists visible currencies so amounts are never mixed", () => {
    const net = buildNetwork([...items, tx("H", "5", { currency: "USD" })], { pattern: "fan-out" });
    expect(net.currencies.sort()).toEqual(["BDT", "USD"]);
  });
});
