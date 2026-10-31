/**
 * Adapts a case document from GET /cases/:id into the shape the detail
 * sections consume (which was originally written against the mockCases
 * fixtures in @/lib/case-manager-data).
 *
 * Everything here is a rename, a lookup through a populated ref, or a
 * derivation from data the API already returns — nothing is invented. Fields
 * with no backend source resolve to null / [] so each section falls through to
 * its own empty state rather than rendering a misleading value.
 */

const KYC_LABELS = {
  verified: "Verified",
  in_review: "Pending Review",
  pending: "Pending",
  rejected: "Rejected",
};

// "government_body" -> "Government Body", "australia" -> "Australia"
const humanize = (value) =>
  !value
    ? null
    : String(value)
        .replace(/_/g, " ")
        .replace(/\b\w/g, (ch) => ch.toUpperCase());

const joinNonEmpty = (parts, sep = ", ") => parts.filter(Boolean).join(sep) || null;

// Case.riskLabel is nullable; fall back to banding the numeric riskScore so the
// profile badges and risk rating still say something truthful.
const riskLabelFromScore = (score) => {
  if (score == null) return null;
  if (score >= 80) return "Critical";
  if (score >= 60) return "High";
  if (score >= 40) return "Medium";
  return "Low";
};

const ageFrom = (dob) => {
  if (!dob) return null;
  const then = new Date(dob).getTime();
  if (Number.isNaN(then)) return null;
  const years = Math.floor((Date.now() - then) / (365.25 * 24 * 60 * 60 * 1000));
  return years > 0 && years < 130 ? years : null;
};

// A customer can be onboarded under several clients; use the relation belonging
// to the case's own tenant.
const pickRelation = (customer, clientId) => {
  const relations = customer?.relations || [];
  if (!relations.length) return null;
  const id = clientId && String(clientId);
  return relations.find((r) => id && String(r.client) === id) || relations[0];
};

const joinAddress = (addr = {}) =>
  joinNonEmpty([addr.address, addr.suburb, addr.state, addr.postcode, humanize(addr.country)]);

const adaptCustomer = (customer, clientId) => {
  if (!customer) return null;

  const form = customer.personalKyc?.personal_form || {};
  const details = form.customer_details || {};
  const employment = form.employment_details || {};
  const address = form.residential_address || {};
  const mailing = form.mailing_address || {};
  const funds = customer.personalKyc?.funds_wealth || {};
  const soleTrader = customer.personalKyc?.sole_trader || {};
  const relation = pickRelation(customer, clientId);
  const residentialAddress = joinAddress(address);
  const mailingAddress = joinAddress(mailing);

  return {
    // Fall back to the customer reference so an unnamed record still shows
    // something identifiable rather than an empty avatar.
    ...customer,
    name:
      customer.user?.name ||
      joinNonEmpty([details.given_name, details.middle_name, details.surname], " ") ||
      customer.uid ||
      null,
    dateOfBirth: details.date_of_birth || null,
    age: ageFrom(details.date_of_birth),
    otherNames: details.other_names || null,
    nationality: humanize(address.country) || humanize(customer.country),
    occupation: employment.occupation || null,
    industry: employment.industry || null,
    employerName: employment.employer_name || null,
    accountOpeningDate: relation?.registeredAt || null,
    onboardingChannel: relation?.onboardingChannel || null,
    email: customer.user?.email || null,
    // Customer.phone is AES-encrypted and a lean() query bypasses
    // decryptForRole, so the API deliberately does not send it.
    phone: null,
    address: residentialAddress,
    // Only worth a row when it differs from where they live.
    mailingAddress: mailingAddress && mailingAddress !== residentialAddress ? mailingAddress : null,
    // What the customer declared at onboarding — the baseline every
    // profile-inconsistency alert is read against.
    declaredProfile: {
      sourceOfFunds: funds.source_of_funds || null,
      sourceOfWealth: funds.source_of_wealth || null,
      accountPurpose: funds.account_purpose || null,
      estimatedTradingVolume: funds.estimated_trading_volume || null,
    },
    soleTrader: soleTrader.is_sole_trader
      ? {
          businessName: soleTrader.business_details?.business_name || null,
          abn: soleTrader.business_details?.abn || null,
          address: joinAddress(soleTrader.business_details?.business_address),
        }
      : null,
    riskRating: null, // filled in by adaptCase from the case-level risk label
  };
};

// ObjectId | populated doc | string → string id (for party.customer compares).
const refId = (v) => (v && v._id ? String(v._id) : v ? String(v) : null);

const adaptTransaction = (txn, caseCustomerIds = new Set()) => {
  const flags = txn.riskFlags || [];

  // Direction relative to the case's customers: a party slot referencing one
  // of them decides it; failing that, the transaction type does (a deposit
  // lands with the customer, a withdrawal leaves them). Neither → null, and
  // the table shows the type instead of guessing.
  const senderIsCase = caseCustomerIds.has(refId(txn.sender?.customer));
  const receiverIsCase = caseCustomerIds.has(refId(txn.receiver?.customer));
  const direction =
    senderIsCase && receiverIsCase
      ? "internal"
      : receiverIsCase
        ? "in"
        : senderIsCase
          ? "out"
          : txn.type === "deposit"
            ? "in"
            : txn.type === "withdrawal"
              ? "out"
              : null;

  return {
    ...txn,
    id: txn.uid || txn._id,
    date: txn.timestamp,
    // Totals, the chart and cross-row sums all need one currency; the server
    // converts foreign-currency rows into convertedAmountAUD.
    amountAUD: txn.convertedAmountAUD ?? txn.amount,
    direction,
    country: txn.receiver?.institutionCountry || txn.sender?.institutionCountry || null,
    paymentChannel: txn.channel || humanize(txn.type),
    riskIndicator: flags,
    // The table classifies rows as flagged/normal rather than showing the
    // Transaction status enum, so derive it from the risk signals. The original
    // enum value stays available as `transactionStatus`.
    transactionStatus: txn.status,
    status: flags.length > 0 || (txn.riskScore ?? 0) > 0 ? "flagged" : "normal",
  };
};

// ── Companion endpoints ───────────────────────────────────────────────────────
// GET /cases/:id/notes  →  CaseNote docs (author populated)
export const adaptNotes = (notes = []) =>
  notes.map((n) => ({
    id: n._id,
    author: n.author?.name || "Unknown",
    date: n.createdAt,
    text: n.content || "",
    // CaseNote has no pinned flag — pinning stays a client-side affordance.
    pinned: false,
    attachment: n.attachments?.[0] || null,
  }));

// GET /cases/:id/audit  →  AuditLog docs (user populated). That model is
// event-shaped (service/action/details), not before/after-shaped.
export const adaptAuditLog = (logs = []) =>
  logs.map((l) => ({
    id: l._id,
    date: l.createdAt,
    user: l.user?.name || "System",
    action: l.action,
    details: l.details,
    source: l.service,
  }));

// GET /cases/:id/reports → the `rfi` bucket, reshaped for RFISection.
export const adaptRfis = (rfis = []) =>
  rfis.map((r) => ({
    id: r.uid || r._id,
    status: r.status,
    documents: r.documents || [],
    dueDate: r.responseDeadline,
    sentBy: r.primaryContactName || null,
    sentDate: r.createdAt,
    respondedDate: r.respondedAt || null,
    message: r.message || null,
  }));

// GET /devices?customer=<id> → the shape DeviceInfoTab renders.
export const adaptDevices = (devices = []) =>
  devices.map((d) => ({
    type: d.deviceType === "mobile" ? "Mobile" : d.deviceType === "tablet" ? "Tablet" : "Desktop",
    os: [d.os, d.osVersion].filter(Boolean).join(" ") || "Unknown",
    ip: d.ipAddress || "—",
    location: [d.city, d.country].filter(Boolean).join(", ") || "Unknown",
    lastSeen: d.lastLoginAt || d.updatedAt,
  }));

// GET /cases/:id/reports → the `smr` bucket, reshaped for the Previous SARs card.
export const adaptPreviousSARs = (smrs = []) =>
  smrs.map((s) => ({
    id: s.uid || s._id,
    status: s.status,
    description: s.caseNumber || s.metadata?.austracReference || null,
    filedDate: s.createdAt,
  }));

// A person of interest who is not a customer (Case.externalPois). The raw
// fields pass through untouched — the POI step edits them — with display
// labels alongside.
const adaptExternalPoi = (p) => ({
  ...p,
  id: p._id,
  roleLabel: humanize(p.role),
  kindLabel: p.kind === "entity" ? "Entity" : "Individual",
  sourceLabel:
    p.source === "alert"
      ? joinNonEmpty([p.sourceAlertUid && `Alert ${p.sourceAlertUid}`, humanize(p.sourcePartySlot)], " · ")
      : "Manual entry",
});

export function adaptCase(api) {
  if (!api) return null;

  const customers = api.linkedCustomers || [];
  const alerts = api.linkedAlerts || [];
  const primaryCustomer = customers[0] || null;
  const primaryAlert = alerts[0] || null;
  const relation = pickRelation(primaryCustomer, api.client);

  const riskTag = api.riskLabel || riskLabelFromScore(api.riskScore);
  const customer = adaptCustomer(primaryCustomer, api.client);
  if (customer) customer.riskRating = riskTag;

  return {
    ...api,

    // ── Identity ──────────────────────────────────────────────────────────────
    displayId: api.uid || api._id,
    // The profile section labels this "Customer ID", so it wants the customer's
    // reference, not the case's.
    uid: primaryCustomer?.uid || api.uid,
    caseName: api.title,
    customerName: customer?.name || null,
    customerType: humanize(relation?.type),
    customer,

    // ── Dates ─────────────────────────────────────────────────────────────────
    createdDate: api.createdAt,
    lastUpdated: api.updatedAt,

    // ── Classification ────────────────────────────────────────────────────────
    riskTag,
    riskCategory: api.caseType || humanize(api.type),
    alertType: primaryAlert?.caseType || humanize(primaryAlert?.alertOrigin),
    detectionRule:
      joinNonEmpty([primaryAlert?.ruleId, primaryAlert?.ruleName], ": ") ||
      primaryAlert?.explanation ||
      null,

    // ── Screening ─────────────────────────────────────────────────────────────
    kycStatus: KYC_LABELS[primaryCustomer?.kycStatus] || humanize(primaryCustomer?.kycStatus),
    pepStatus: primaryCustomer ? (primaryCustomer.isPep ? "PEP" : "Not a PEP") : null,
    sanctionsStatus: primaryCustomer
      ? primaryCustomer.sanction
        ? "Confirmed Match"
        : "No Match"
      : null,
    // No backend field for these yet — the profile rows render "—".
    cddStatus: null,
    eddStatus: null,

    // ── Money & counts ────────────────────────────────────────────────────────
    // netActivity is already summed in AUD server-side.
    totalExposure: api.netActivity,
    relatedAlertsCount: alerts.length,
    previousInvestigationsCount: (api.relatedCases || []).length,
    confidenceScore: null, // no equivalent metric exists

    // ── Collections ───────────────────────────────────────────────────────────
    transactions: (() => {
      const ids = new Set(
        [api.customer, ...customers].map((c) => refId(c?._id ? c._id : c)).filter(Boolean),
      );
      return (api.linkedTransactions || []).map((t) => adaptTransaction(t, ids));
    })(),
    assignedAnalyst: api.assignedTo?.name || null,
    // "Connected" means the other parties on the case — the primary customer is
    // already rendered by the profile section.
    connectedCustomers: customers.slice(1).map((c) => ({
      name: c.user?.name || null,
      relationship: humanize(pickRelation(c, api.client)?.type),
      riskTag: null,
    })),

    // Every person of interest on the case, primary first. `overrides` is the
    // slice of case-level fields that describe THAT customer, so the profile
    // section can be pointed at any of them without knowing about switching.
    pois: customers.map((c, i) => {
      const adapted = adaptCustomer(c, api.client);
      if (adapted && i === 0) adapted.riskRating = riskTag;
      // `case.customer` is the primary; fall back to position only when it
      // is not populated (it cannot be unlinked, so the UI must know which).
      const primaryId = api.customer?._id || api.customer;
      const isPrimary = primaryId ? String(primaryId) === String(c._id) : i === 0;
      return {
        id: c._id,
        uid: c.uid || null,
        name: adapted?.name || c.uid || null,
        isPrimary,
        kycStatus: c.kycStatus || null,
        isPep: !!c.isPep,
        sanction: !!c.sanction,
        riskRating: isPrimary ? riskTag : null,
        overrides: {
          customer: adapted,
          uid: c.uid || api.uid,
          customerName: adapted?.name || null,
          customerType: humanize(pickRelation(c, api.client)?.type),
          kycStatus: KYC_LABELS[c.kycStatus] || humanize(c.kycStatus),
          pepStatus: c.isPep ? "PEP" : "Not a PEP",
          sanctionsStatus: c.sanction ? "Confirmed Match" : "No Match",
        },
      };
    }),

    // Persons of interest who are not customers — counterparties, directors,
    // third parties — added from an alert party or by hand.
    externalPois: (api.externalPois || []).map(adaptExternalPoi),

    // The case's alerts, newest first — the Investigation Hub lists them all
    // rather than implying a case is ever about a single rule hit.
    alerts: alerts.map((a) => ({
      id: a._id,
      uid: a.uid,
      ruleId: a.ruleId || null,
      ruleName: a.ruleName || null,
      explanation: a.explanation || null,
      riskScore: a.riskScore ?? null,
      riskLabel: a.riskLabel || null,
      caseType: a.caseType || null,
      alertOrigin: a.alertOrigin || null,
      status: a.status || null,
      createdAt: a.createdAt || null,
    })),
    // Filings (previousSARs, rfis, auditLog, notes) arrive from the companion
    // endpoints and are merged in by CaseDetails — see the adapt* helpers above.
    previousSARs: [],

    // ── No backend source yet (sections fall through to empty states) ─────────
    // Note: case documents are NOT here — FilesTab loads them from
    // GET /cases/:id/documents, so they stay out of the case payload.
    duplicateAlerts: [], // linkedAlerts are the source alerts, not duplicates
    notes: [],
    rfis: [],
    activities: [],
    auditLog: [],
    atm: null,
    devices: [],
    relationships: [],
    beneficialOwners: [],
  };
}
