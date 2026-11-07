import { describe, it, expect } from "vitest";
import {
  KINDS,
  applyReceipt,
  buildReturnEvent,
  buildSubmissionEvent,
  countInbox,
  daysLeft,
  deadlineOf,
  filterInbox,
  isOnBehalf,
  kindLabel,
  latestClosedQuarter,
  newBatchId,
  submissionEvents,
  validateReturn,
} from "../logic";

const NOW = Date.UTC(2026, 10, 6, 6, 0, 0); // 6 Nov 2026, 12:00 Dhaka
const day = (n) => new Date(NOW + n * 86_400_000).toISOString();

/** A small inbox: what one bank might see in a week. */
const EVENTS = [
  { eventId: "e1", type: "rfi.issued", status: "delivered", payload: { rfi_number: "RFI-1", deadline_date: day(5) } },
  { eventId: "e2", type: "rfi.issued", status: "read", payload: { rfi_number: "RFI-2", deadline_date: day(-2) } },
  { eventId: "e3", type: "rfi.issued", status: "acknowledged", payload: { rfi_number: "RFI-3", deadline_date: day(-9) } },
  { eventId: "e4", type: "freeze.released", status: "queued", payload: { order_number: "FO-1" } },
  { eventId: "e5", type: "receipt.read", status: "delivered", payload: { subject: { uid: "RFI-3" } } },
  { eventId: "e6", type: "submission.analysed", status: "delivered", payload: { submission_id: "SUB-1", uploaded_by: "mltfpd" } },
];

describe("deadlines", () => {
  it("counts whole days, negative once the date has passed", () => {
    expect(daysLeft(day(5), NOW)).toBe(5);
    expect(daysLeft(day(-2), NOW)).toBe(-2);
    expect(daysLeft(null, NOW)).toBeNull();
  });

  it("a deadline later today still counts as one day left, not overdue", () => {
    expect(daysLeft(new Date(NOW + 3 * 3_600_000).toISOString(), NOW)).toBe(1);
  });

  it("reads the deadline from whichever field the event family uses", () => {
    expect(deadlineOf({ payload: { deadline_date: "a" } })).toBe("a");
    expect(deadlineOf({ payload: { respond_by: "b" } })).toBe("b");
    expect(deadlineOf({ payload: { acknowledge_by: "c" } })).toBe("c");
    expect(deadlineOf({ payload: { acknowledge_due_at: "d" } })).toBe("d");
    expect(deadlineOf({ payload: { payment_due: "e" } })).toBe("e");
    expect(deadlineOf({ payload: { expiry: "f" } })).toBe("f");
    expect(deadlineOf({ payload: {} })).toBeNull();
    expect(deadlineOf({})).toBeNull();
  });
});

describe("inbox tabs", () => {
  const ids = (rows) => rows.map((r) => r.ev.eventId);

  it("Open shows only what still needs a reply", () => {
    expect(ids(filterInbox(EVENTS, "open"))).toEqual(["e1", "e2"]);
  });

  it("All shows every message but no receipts", () => {
    expect(ids(filterInbox(EVENTS, "all"))).toEqual(["e1", "e2", "e3", "e4", "e6"]);
  });

  it("Receipts shows only receipts", () => {
    expect(ids(filterInbox(EVENTS, "receipts"))).toEqual(["e5"]);
  });

  it("is empty before the first load", () => {
    expect(filterInbox(null, "open")).toEqual([]);
  });
});

describe("inbox header counts", () => {
  it("counts open, overdue, unread and receipts", () => {
    expect(countInbox(EVENTS, NOW)).toEqual({ open: 2, overdue: 1, unread: 3, receipts: 1 });
  });

  it("an answered request is never overdue, however old its deadline", () => {
    expect(countInbox([EVENTS[2]], NOW).overdue).toBe(0);
  });

  it("an unread receipt is not counted as unread mail", () => {
    expect(countInbox([EVENTS[4]], NOW).unread).toBe(0);
  });

  it("is all zeros before the first load", () => {
    expect(countInbox(null, NOW)).toEqual({ open: 0, overdue: 0, unread: 0, receipts: 0 });
  });
});

describe("receipts", () => {
  it("updates only the event the receipt was for, without mutating the list", () => {
    const next = applyReceipt(EVENTS, "e1", { status: "read", receipts: { readAt: day(0) } });
    expect(next[0]).toMatchObject({ status: "read", receipts: { readAt: day(0) } });
    expect(next[1]).toBe(EVENTS[1]);
    expect(EVENTS[0].status).toBe("delivered");
  });
});

describe("uploads", () => {
  it("offers the six document kinds AFC OS accepts", () => {
    expect(KINDS.map((k) => k.docType)).toEqual(["risk_assessment", "programme", "procedure", "policy", "customer_data", "audit_report"]);
  });

  it("labels a kind, and shows an unknown one as it came", () => {
    expect(kindLabel("customer_data")).toBe("Customer data dump");
    expect(kindLabel("board_minutes")).toBe("board_minutes");
    expect(kindLabel(undefined)).toBeNull();
  });

  it("recognises a document an MLTFPD officer uploaded for the RO", () => {
    expect(isOnBehalf(EVENTS[5])).toBe(true);
    expect(isOnBehalf({ payload: { uploaded_by: "portal" } })).toBe(false);
    expect(isOnBehalf({})).toBe(false);
  });

  it("lists only submission events, newest first", () => {
    const hub = [
      { eventId: "a", type: "submission.received" },
      { eventId: "b", type: "rfi.issued" },
      { eventId: "c", type: "submission.analysed" },
    ];
    expect(submissionEvents(hub).map((e) => e.eventId)).toEqual(["c", "a"]);
    expect(submissionEvents(null)).toEqual([]);
  });

  it("makes a batch id from the date and six characters", () => {
    expect(newBatchId(new Date(NOW), () => 0.123456789)).toMatch(/^PORTAL-20261106-[0-9A-Z]{6}$/);
    expect(newBatchId(new Date(NOW), () => 0.5)).toMatch(/^PORTAL-20261106-[0-9A-Z]{6}$/); // "0.i" in base 36 is padded
  });

  it("builds one submission event per file with the vault reference and the hash", () => {
    const ev = buildSubmissionEvent({
      docType: "policy",
      upload: { name: "aml-policy.pdf", url: "vault://files/f1", sha256: "vaulthash", mimeType: "application/pdf" },
      sha256: "browserhash",
      sizeBytes: 2048,
      batchId: "PORTAL-20261106-ABC123",
      index: 2,
      count: 3,
      by: "CAMLCO",
    });
    expect(ev).toEqual({
      type: "submission.received",
      to: "afcos",
      subject: { kind: "Submission", uid: null },
      payload: {
        doc_type: "policy",
        file: { name: "aml-policy.pdf", url: "vault://files/f1", sha256: "vaulthash", mimeType: "application/pdf", sizeBytes: 2048 },
        batch: { id: "PORTAL-20261106-ABC123", index: 2, count: 3 },
        by: "CAMLCO",
      },
      idempotencyKey: "portal:submission:PORTAL-20261106-ABC123:2",
    });
  });

  it("uses the browser's hash when the vault returns none", () => {
    const ev = buildSubmissionEvent({ docType: "policy", upload: { name: "a.pdf", url: "u" }, sha256: "browserhash", sizeBytes: 1, batchId: "B", index: 1, count: 1, by: "x" });
    expect(ev.payload.file.sha256).toBe("browserhash");
  });
});

describe("quarterly return", () => {
  it("proposes the latest quarter that has ended", () => {
    expect(latestClosedQuarter(new Date(Date.UTC(2026, 10, 6)))).toBe("2026-Q3");
    expect(latestClosedQuarter(new Date(Date.UTC(2026, 3, 1)))).toBe("2026-Q1");
    expect(latestClosedQuarter(new Date(Date.UTC(2026, 0, 15)))).toBe("2025-Q4");
    expect(latestClosedQuarter(new Date(Date.UTC(2026, 11, 31)))).toBe("2026-Q3");
  });

  const good = { strCount: "4", ctrCount: "310", txVolumeBdt: "42000000000" };

  it("accepts a well-formed period and three non-negative numbers", () => {
    expect(validateReturn("2026-Q3", good)).toBeNull();
    expect(validateReturn("2026-Q3", { ...good, strCount: "0" })).toBeNull();
  });

  it("refuses a period that is not a calendar quarter", () => {
    for (const p of ["2026-Q5", "2026Q3", "Q3-2026", "2026-H1", ""]) expect(validateReturn(p, good)).toBe("Period looks like 2026-Q3");
  });

  it("refuses a missing, non-numeric or negative figure", () => {
    const msg = "Enter the three figures as numbers";
    expect(validateReturn("2026-Q3", { ...good, ctrCount: "" })).toBe(msg);
    expect(validateReturn("2026-Q3", { ...good, ctrCount: "many" })).toBe(msg);
    expect(validateReturn("2026-Q3", { ...good, txVolumeBdt: "-1" })).toBe(msg);
    expect(validateReturn("2026-Q3", { strCount: "1", ctrCount: "2" })).toBe(msg);
    expect(validateReturn("2026-Q3", undefined)).toBe(msg);
  });

  it("sends the figures as numbers under the template's field names", () => {
    const ev = buildReturnEvent({ period: "2026-Q3", figures: good, by: "CAMLCO", now: 1 });
    expect(ev).toEqual({
      type: "return.submitted",
      to: "afcos",
      subject: { kind: "DataReturn", uid: null },
      payload: { kind: "quarterly_compliance", period: "2026-Q3", figures: { strCount: 4, ctrCount: 310, txVolumeBdt: 42000000000 }, by: "CAMLCO" },
      idempotencyKey: "portal:return:quarterly_compliance:2026-Q3:1",
    });
  });
});
