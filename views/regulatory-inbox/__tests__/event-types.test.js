import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { ACTIONS, EVENT_TYPES, describeEvent } from "../event-types";

/** The reply form's values, as ReplyForm hands them to `build`. */
const FORM = {
  by: "CAMLCO",
  text: "We enclose the requested KYC files.",
  note: "Noted by the board on 12 Oct.",
  items: [1, 2],
  attachments: [{ name: "kyc.pdf", url: "vault://files/abc", sha256: "ab".repeat(32) }],
  milestones: [{ finding: "F-1", action: "Rescreen PEPs", owner: "CAMLCO", due: "2026-12-31" }],
  milestone: 1,
  accountsFrozen: "3",
  balanceAtFreeze: "1250000",
};

/** One inbound event per action, shaped like the hub delivers it. */
const INBOUND = {
  "rfi.respond": { type: "rfi.issued", subject: { uid: "RFI-2026-0007" }, payload: { rfi_number: "RFI-2026-0007" } },
  "circular.acknowledge": { type: "circular.published", subject: { uid: "CIR-2026-0003" }, payload: { circular_number: "BFIU Circular 31" } },
  "inspection.acknowledge": { type: "inspection.noticed", subject: { uid: "INS-2026-0002" }, payload: { inspection: "INS-2026-0002" } },
  "remediation.plan": { type: "remediation.revision_requested", subject: { uid: "REM-2026-0004" }, payload: { plan: "REM-2026-0004" } },
  "remediation.evidence": { type: "remediation.plan_approved", subject: { uid: "REM-2026-0004" }, payload: { plan: "REM-2026-0004" } },
  "penalty.respond": { type: "penalty.show_cause_issued", subject: { uid: "PEN-2026-0001" }, payload: { case: "PEN-2026-0001" } },
  "penalty.appeal": { type: "penalty.decided", subject: { uid: "PEN-2026-0001" }, payload: { case: "PEN-2026-0001" } },
  "freeze.execute": { type: "freeze.issued", subject: { uid: "FO-2026-0009" }, payload: { order_number: "FO-2026-0009" } },
};

describe("describeEvent", () => {
  it("labels a known event and reads the regulator's reference from the payload", () => {
    const d = describeEvent({ type: "rfi.issued", payload: { rfi_number: "RFI-2026-0007" } });
    expect(d).toMatchObject({ label: "Request for information", tone: "action", action: "rfi.respond", subject: "RFI-2026-0007" });
  });

  it("falls back to the event's subject when the payload has no reference", () => {
    expect(describeEvent({ type: "rfi.issued", payload: {}, subject: { uid: "RFI-9" } }).subject).toBe("RFI-9");
  });

  it("shows an unknown type as a plain notification from the sending app", () => {
    const d = describeEvent({ type: "something.new", from: { app: "bfiu" }, subject: { uid: "X-1" } });
    expect(d).toMatchObject({ label: "something.new", from: "BFIU", tone: "info", subject: "X-1" });
    expect(d.action).toBeUndefined();
    expect(describeEvent({ type: "something.new", from: { app: "afcos" } }).from).toBe("AFC OS");
  });

  it("marks the officer's upload as a document uploaded on the RO's behalf", () => {
    const d = describeEvent({ type: "submission.received", payload: { submission_id: "SUB-2026-00015", uploaded_by: "mltfpd" } });
    expect(d).toMatchObject({ label: "Document uploaded on your behalf", from: "Bangladesh Bank · MLTFPD", subject: "SUB-2026-00015" });
  });

  it("treats receipts as receipts, never as something to answer", () => {
    for (const type of ["receipt.delivered", "receipt.read", "receipt.acknowledged"]) {
      const d = describeEvent({ type, payload: { subject: { uid: "RFI-1" } } });
      expect(d.tone).toBe("receipt");
      expect(d.action).toBeUndefined();
      expect(d.subject).toBe("RFI-1");
    }
  });
});

describe("the event catalogue", () => {
  it("every action an event names exists", () => {
    for (const [type, meta] of Object.entries(EVENT_TYPES)) {
      if (meta.action) expect(ACTIONS[meta.action], `${type} → ${meta.action}`).toBeDefined();
    }
  });

  it("every action is reachable from at least one event", () => {
    const used = new Set(Object.values(EVENT_TYPES).map((m) => m.action).filter(Boolean));
    for (const key of Object.keys(ACTIONS)) expect(used.has(key), key).toBe(true);
  });

  it("only the four known tones are used (each has a style in the inbox)", () => {
    for (const meta of Object.values(EVENT_TYPES)) expect(["urgent", "action", "info", "receipt"]).toContain(meta.tone);
  });
});

describe("replies the RO sends", () => {
  it("every action builds a complete event: type, destination, subject, payload with who sent it", () => {
    for (const [key, action] of Object.entries(ACTIONS)) {
      const out = action.build(INBOUND[key], FORM);
      expect(out.type, key).toMatch(/^[a-z_]+\.[a-z_]+$/);
      expect(["afcos", "bfiu"], key).toContain(out.to);
      expect(out.subject.kind, key).toBeTruthy();
      expect(out.subject.uid, key).toBeTruthy();
      expect(out.payload.by, key).toBe("CAMLCO");
    }
  });

  it("an RFI response carries the request number, the text, the answered items and the attachments", () => {
    const out = ACTIONS["rfi.respond"].build(INBOUND["rfi.respond"], FORM);
    expect(out).toMatchObject({ type: "rfi.responded", to: "afcos", subject: { kind: "RegulatoryRequest", uid: "RFI-2026-0007" } });
    expect(out.payload).toMatchObject({ rfi_number: "RFI-2026-0007", response_text: FORM.text, items_answered: [1, 2], attachments: FORM.attachments });
  });

  it("a circular acknowledgement becomes evidence only when files are attached", () => {
    const plain = ACTIONS["circular.acknowledge"].build(INBOUND["circular.acknowledge"], { ...FORM, attachments: [] });
    expect(plain.type).toBe("circular.acknowledged");
    const withFiles = ACTIONS["circular.acknowledge"].build(INBOUND["circular.acknowledge"], FORM);
    expect(withFiles.type).toBe("circular.evidence");
    expect(withFiles.payload.evidence_documents).toEqual(FORM.attachments);
  });

  it("a circular is identified by its register uid, because circular numbers can repeat across years", () => {
    const out = ACTIONS["circular.acknowledge"].build(INBOUND["circular.acknowledge"], FORM);
    expect(out.subject.uid).toBe("CIR-2026-0003");
    expect(out.payload).toMatchObject({ circular: "CIR-2026-0003", circular_number: "BFIU Circular 31" });
  });

  it("a freezing order confirmation goes to BFIU, with numbers and no account holder names", () => {
    const out = ACTIONS["freeze.execute"].build(INBOUND["freeze.execute"], FORM);
    expect(out).toMatchObject({ type: "freeze.executed", to: "bfiu" });
    expect(out.payload).toEqual({ order_number: "FO-2026-0009", accounts_frozen: 3, balance_at_freeze: 1250000, note: FORM.note, by: "CAMLCO" });
    expect(ACTIONS["freeze.execute"].build(INBOUND["freeze.execute"], { ...FORM, balanceAtFreeze: "" }).payload.balance_at_freeze).toBeNull();
  });

  it("a show-cause response keeps the full text and a summary of at most 400 characters", () => {
    const long = "x".repeat(900);
    const out = ACTIONS["penalty.respond"].build(INBOUND["penalty.respond"], { ...FORM, text: long });
    expect(out.payload.response_text).toHaveLength(900);
    expect(out.payload.summary).toHaveLength(400);
  });

  it("an older show-cause sent as a request is answered against its request number", () => {
    const out = ACTIONS["penalty.respond"].build({ type: "show_cause.issued", payload: { rfi_number: "RFI-2026-0011" } }, FORM);
    expect(out.subject.uid).toBe("RFI-2026-0011");
  });

  it("an appeal states its grounds against the penalty case", () => {
    const out = ACTIONS["penalty.appeal"].build(INBOUND["penalty.appeal"], FORM);
    expect(out).toMatchObject({ type: "penalty.appeal", subject: { kind: "PenaltyCase", uid: "PEN-2026-0001" }, payload: { case: "PEN-2026-0001", grounds: FORM.text } });
  });

  it("remediation plan and evidence name the plan; evidence names the milestone", () => {
    const plan = ACTIONS["remediation.plan"].build(INBOUND["remediation.plan"], FORM);
    expect(plan.payload).toMatchObject({ plan_id: "REM-2026-0004", milestones: FORM.milestones });
    const ev = ACTIONS["remediation.evidence"].build(INBOUND["remediation.evidence"], FORM);
    expect(ev.payload).toMatchObject({ plan_id: "REM-2026-0004", milestone: 1, evidence_documents: FORM.attachments });
  });
});

/**
 * Contract with the regulator's side: every event the Portal produces must
 * have a handler in AFC OS, or the officer's screen never updates. The AFC OS
 * repo sits beside this one in the workspace; when it is not checked out
 * (a Portal-only clone) the check is skipped.
 */
const HANDLERS_FILE = path.resolve(__dirname, "../../../../api_afc_os/services/exchange/handlers.js");
const hasAfcOs = fs.existsSync(HANDLERS_FILE);

describe.skipIf(!hasAfcOs)("contract with AFC OS handlers", () => {
  const source = hasAfcOs ? fs.readFileSync(HANDLERS_FILE, "utf8") : "";
  const handled = new Set([...source.matchAll(/async "([a-z_]+\.[a-z_]+)"\(/g)].map((m) => m[1]));

  it("AFC OS handles every reply type the inbox can send", () => {
    const produced = new Set();
    for (const [key, action] of Object.entries(ACTIONS)) {
      produced.add(action.build(INBOUND[key], FORM).type);
      produced.add(action.build(INBOUND[key], { ...FORM, attachments: [] }).type);
    }
    for (const type of produced) expect(handled.has(type), `no AFC OS handler for ${type}`).toBe(true);
  });

  it("AFC OS handles the two events the Uploads page sends", () => {
    for (const type of ["submission.received", "return.submitted"]) expect(handled.has(type), type).toBe(true);
  });

  it("AFC OS handles the receipts the hub echoes when the RO reads or acknowledges", () => {
    for (const type of ["receipt.delivered", "receipt.read", "receipt.acknowledged"]) expect(handled.has(type), type).toBe(true);
  });
});
