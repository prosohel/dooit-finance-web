import moment from "moment";
import {
  buildLineItems,
  formatCompletedAt,
  parseCurrencyNumber,
  tidyUnitLabel,
} from "./reportHelpers";

/**
 * Maps a stored TBML screening run onto the `run` shape this view renders.
 *
 * The input is our own `TbmlReport` document from GET /tbml/reports/:reportId —
 * our headline fields plus `report`, which is the OSINT Engine's
 * ReportDetailResponse cached verbatim, and `files`, its document list. The UI
 * never talks to the engine directly: the API owns the key, the tenancy and the
 * cache.
 *
 * Every value here is a rename, a parse, or a count of something the engine
 * actually returned — where it returned nothing, the field stays null so the
 * component falls through to its own "not stated" state. That matters for this
 * report in particular: a blank field is evidence about the document, not a gap
 * in the UI.
 */

// ── primitives ───────────────────────────────────────────────────────────────

// The engine stringifies some absent values ("null" for a missing HS code), so
// an emptiness check has to cover those too.
const nullish = (value) => {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  if (!str || str.toLowerCase() === "null" || str.toLowerCase() === "none") return null;
  return value;
};

const num = (value) => (nullish(value) == null ? null : parseCurrencyNumber(value));

// Prices arrive as display strings — "AUD 179.00", "USD 0.82 per yard".
const currencyOf = (value) => String(nullish(value) ?? "").match(/\b([A-Z]{3})\b/)?.[1] || null;

const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;

const humanize = (value) =>
  !value ? null : String(value).replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

// Descriptions come off the document with the original line breaks in them.
const flatten = (text) => String(text || "").replace(/\s+/g, " ").trim();

const money = (value) =>
  Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── parties ──────────────────────────────────────────────────────────────────

const PARTY_SLOTS = [
  ["Exporter", "exporter"],
  ["Importer", "importer"],
  ["Notify party", "notify_party"],
  ["Issuing bank", "issuing_bank"],
  ["Beneficiary bank", "beneficiary_bank"],
];

const adaptParty = (party) => ({
  name: nullish(party?.name),
  address: nullish(party?.address),
  country: nullish(party?.country),
  phone: nullish(party?.phone),
  email: nullish(party?.email),
  swiftCode: nullish(party?.swift_code),
  iban: nullish(party?.iban),
  bankName: nullish(party?.bank_name),
  taxId: nullish(party?.tax_id),
});

// ── document extract ─────────────────────────────────────────────────────────

const adaptExtract = (extract = {}) => ({
  documentType: nullish(extract.document_type),
  documentNumber: nullish(extract.document_number),
  documentDate: nullish(extract.document_date),
  lcNumber: nullish(extract.lc_number),
  pageNumber: extract.page_number ?? null,
  incoterms: nullish(extract.incoterms),
  portOfLoading: nullish(extract.port_of_loading),
  portOfDischarge: nullish(extract.port_of_discharge),
  shippingMethod: nullish(extract.shipping_method),
  containerNumber: nullish(extract.container_number),
  vesselFlight: nullish(extract.vessel_flight),
  paymentTerms: nullish(extract.payment_terms),
  salesTerms: nullish(extract.sales_terms),
  subtotal: num(extract.subtotal),
  freightCharges: num(extract.freight_charges),
  insurance: num(extract.insurance),
  totalAmount: num(extract.total_amount),
  currency: nullish(extract.currency),
  amountInWords: nullish(extract.amount_in_words),
  fobValue: num(extract.fob_value),
  cifValue: num(extract.cif_value),
  rawText: nullish(extract.raw_text),
});

const adaptProduct = (product) => ({
  lineNumber: product.line_number,
  description: flatten(product.description),
  searchTerm: nullish(product.search_term),
  goodsCategory: nullish(product.goods_category),
  hsCode: nullish(product.hs_code),
  quantity: nullish(product.quantity),
  unit: nullish(product.unit),
  unitPrice: num(product.unit_price),
  totalPrice: num(product.total_price),
  currency: nullish(product.currency) || currencyOf(product.unit_price),
  countryOfOrigin: nullish(product.country_of_origin),
});

/**
 * Which of the fields an analyst would look for were left blank.
 *
 * The engine leaves a field empty rather than guessing at it, so this list is a
 * finding in its own right — "no incoterms, no ports, no HS codes" is what an
 * invoice that cannot be trade-verified looks like.
 */
const ABSENT_FIELD_RULES = [
  ["currency", (d) => d.currency],
  ["quantities", (d, products) => products.some((p) => p.quantity)],
  ["HS codes", (d, products) => products.some((p) => p.hsCode)],
  ["incoterms", (d) => d.incoterms],
  ["ports", (d) => d.portOfLoading || d.portOfDischarge],
  [
    "banks / SWIFT",
    (d, products, parties) =>
      parties["Issuing bank"]?.name ||
      parties["Beneficiary bank"]?.name ||
      parties["Issuing bank"]?.swiftCode ||
      parties["Beneficiary bank"]?.swiftCode,
  ],
  ["container & vessel", (d) => d.containerNumber || d.vesselFlight],
  ["LC reference", (d) => d.lcNumber],
  ["payment terms", (d) => d.paymentTerms],
  ["country of origin", (d, products) => products.some((p) => p.countryOfOrigin)],
];

const buildAbsentFields = (doc, products, parties) =>
  ABSENT_FIELD_RULES.filter(([, present]) => !present(doc, products, parties)).map(
    ([label]) => label,
  );

/**
 * The arithmetic on the face of the document. `total_amount` should equal the
 * subtotal plus whatever freight and insurance are itemised; when it doesn't,
 * the difference is stated and left unexplained rather than reconciled here —
 * the reason (a discount, a tax line, an unstated charge) is for the analyst.
 */
const buildGap = (doc) => {
  if (doc.subtotal == null || doc.totalAmount == null) return null;
  const expected = doc.subtotal + (doc.freightCharges || 0) + (doc.insurance || 0);
  const amount = doc.totalAmount - expected;
  if (Math.abs(amount) < 0.01) return null;

  return {
    amount,
    label: amount > 0 ? `Unexplained ${money(amount)}` : `Shortfall ${money(amount)}`,
    note:
      amount > 0
        ? "total_amount exceeds the subtotal with no freight or insurance itemised on the document."
        : "total_amount is below the subtotal and no deduction is itemised on the document.",
  };
};

// ── OSINT research ───────────────────────────────────────────────────────────

const adaptOsintResult = (result) => ({
  productKey: result.product_key,
  productDescription: flatten(result.product_description),
  searchTerm: nullish(result.search_term),
  goodsCategory: nullish(result.goods_category),
  hsCode: nullish(result.hs_code),
  dataAvailability: result.data_availability || "NONE",
  availabilityNote: nullish(result.availability_note),
  referenceLow: num(result.reference_price_low),
  referenceHigh: num(result.reference_price_high),
  referenceMid: num(result.reference_price_mid),
  currency: nullish(result.reference_price_currency) || currencyOf(result.reference_price_low),
  unit: tidyUnitLabel(nullish(result.reference_price_unit)),
  observations: result.price_observation_count ?? 0,
  exactMatchObservations: result.exact_match_observations ?? null,
  comparableObservations: result.comparable_observations ?? null,
  typicalOrigins: result.typical_origin_countries || [],
  typicalRoutes: result.typical_trade_routes || [],
  sanctionedJurisdiction: !!result.sanctioned_jurisdiction_flag,
  hsCodesObserved: result.hs_codes_observed || [],
  priceSources: result.price_sources || [],
  // Only pages the research pass actually quoted from — the rest are in the
  // references list with their reason for being set aside.
  findings: (result.sources || [])
    .filter((s) => s.salient_quote)
    .map((s) => ({ source: s.domain, text: s.salient_quote })),
});

// What a source was consulted for, from the query that surfaced it.
const QUERY_TAG_LABELS = {
  price_reference: "Price range",
  hs_code_lookup: "HS code",
  sanctions_check: "Sanctions",
  trade_route: "Trade route",
  origin_country: "Origin",
};

// PRICED sources moved a reference range, SCREENED ones answered a sanctions
// question, CONTEXT ones were read and set aside. Only PRICED is load-bearing.
const roleOf = (source) => {
  if (source.price_observations?.length) return "PRICED";
  if (source.sanctions_signals?.length) return "SCREENED";
  return "CONTEXT";
};

const ROLE_ORDER = { PRICED: 0, SCREENED: 1, CONTEXT: 2 };

const buildReferences = (osintResults = []) => {
  const byUrl = new Map();

  for (const result of osintResults) {
    for (const source of result.sources || []) {
      // The same page can back several products; keep its strongest role.
      const existing = byUrl.get(source.url);
      const role = roleOf(source);
      if (existing && ROLE_ORDER[existing.role] <= ROLE_ORDER[role]) continue;

      byUrl.set(source.url, {
        url: source.url,
        domain: source.domain,
        title: source.title || source.domain,
        note: source.relevance_reason || "",
        usedFor: QUERY_TAG_LABELS[source.query_tag] || humanize(source.query_tag) || "Context",
        role,
        relevant: !!source.relevant,
        relevance: source.relevance || null,
        retrieved: source.retrieved_at
          ? moment.utc(source.retrieved_at).format("DD MMM HH:mm")
          : "—",
      });
    }
  }

  return [...byUrl.values()].sort(
    (a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || a.domain.localeCompare(b.domain),
  );
};

// ── line items ───────────────────────────────────────────────────────────────

// How many market quotes to show inline; the rest are in the references list.
const MAX_EVIDENCE = 6;

const buildLineAnalyses = (products, productAnalyses, osintResults, rawExtract) => {
  const pairs = buildLineItems(rawExtract, productAnalyses, osintResults);

  return pairs.map(({ analysis, osint }, index) => {
    const product = products[index];
    const evidence = (osint?.sources || [])
      .filter((s) => s.relevant && s.salient_quote)
      .map((s) => ({ source: s.domain, quote: s.salient_quote }));

    const reference = osint
      ? {
          low: num(osint.reference_price_low),
          high: num(osint.reference_price_high),
          mid: num(osint.reference_price_mid),
          currency: nullish(osint.reference_price_currency) || currencyOf(osint.reference_price_low),
          unit: tidyUnitLabel(nullish(osint.reference_price_unit)),
          observations: osint.price_observation_count ?? 0,
        }
      : null;

    // A line counts as "tested" only when the engine actually computed a
    // deviation. A reference range can exist while the line stays untested —
    // that happens when the declared unit and the market unit don't line up,
    // and saying so is the honest answer rather than comparing incomparable
    // numbers.
    const testable = analysis?.price_deviation_pct != null;

    return {
      lineNumber: product?.lineNumber ?? index + 1,
      title: product?.description || flatten(analysis?.product_description) || `Line ${index + 1}`,
      declared: num(analysis?.declared_unit_price) ?? product?.unitPrice ?? null,
      declaredCurrency: currencyOf(analysis?.declared_unit_price) || product?.currency || null,
      testable,
      deviationPct: analysis?.price_deviation_pct ?? null,
      referenceRangeLabel: nullish(analysis?.reference_price_range),
      reference,
      // Two different questions, and the engine can answer them differently:
      // `dataAvailability` is whether the DECLARED price could be tested,
      // `marketDataAvailability` is whether market data was found at all. A
      // line with SUFFICIENT market data and NONE testable is the normal shape
      // of "we found a price, but not in a unit we can compare against".
      dataAvailability: analysis?.data_availability || "NONE",
      marketDataAvailability: osint?.data_availability || null,
      riskLevel: analysis?.risk_level || "INSUFFICIENT_DATA",
      riskScore: analysis?.risk_score ?? 0,
      summary: analysis?.summary || "",
      // The engine's finding shape is already what FindingDetail renders:
      // { indicator, severity, description, evidence, recommendation }.
      findings: analysis?.findings || [],
      blockedNote: testable ? null : nullish(osint?.availability_note),
      marketEvidence: evidence.slice(0, MAX_EVIDENCE),
      marketEvidenceTotal: evidence.length,
    };
  });
};

// ── indicators ───────────────────────────────────────────────────────────────

const SEVERITY_KIND = { CRITICAL: "danger", HIGH: "danger", MEDIUM: "warn", LOW: "mute" };
const SEVERITY_RANK = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
const RANK_SEVERITY = { 4: "CRITICAL", 3: "HIGH", 2: "MEDIUM", 1: "LOW" };

// Colours each detected indicator by the worst severity it was raised at.
const buildIndicators = (indicators = [], productAnalyses = []) => {
  const worst = new Map();
  for (const analysis of productAnalyses) {
    for (const finding of analysis.findings || []) {
      const rank = SEVERITY_RANK[finding.severity] || 0;
      if (rank > (worst.get(finding.indicator) || 0)) worst.set(finding.indicator, rank);
    }
  }

  return indicators.map((label) => ({
    label,
    kind: SEVERITY_KIND[RANK_SEVERITY[worst.get(label)]] || "mute",
  }));
};

// ── audit trail ──────────────────────────────────────────────────────────────

const buildAudit = (methodology = {}) => ({
  stats: [
    {
      value: `${methodology.queries_successful ?? 0}/${methodology.queries_attempted ?? 0}`,
      label: "queries ok",
    },
    { value: String(methodology.results_seen ?? 0), label: "results seen" },
    { value: String(methodology.urls_selected ?? 0), label: "urls selected" },
    {
      value: `${methodology.pages_read ?? 0} / ${methodology.pages_failed ?? 0}`,
      label: "read / failed",
    },
    { value: String(methodology.price_observations ?? 0), label: "price obs." },
    { value: String(methodology.model_usage?.calls ?? 0), label: "model calls" },
  ],
  domains: methodology.domains_consulted || [],
  // The engine's own caveats about this run — what it could not do, and any
  // conclusion it withdrew. Carried through verbatim, never summarised away.
  notes: [...(methodology.limitations || []), ...(methodology.narrative_warnings || [])],
  footer: [
    methodology.search_provider,
    methodology.collected_at ? `collected ${formatCompletedAt(methodology.collected_at)}` : null,
  ]
    .filter(Boolean)
    .join(" · "),
});

// ── source document ──────────────────────────────────────────────────────────

// "Commercial Invoice" -> "CI", "Proforma Invoice" -> "PI", "Invoice" -> "INV".
const shortDocType = (documentType) => {
  if (!documentType) return "DOC";
  const words = String(documentType).trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words
    .map((w) => w[0])
    .join("")
    .toUpperCase();
};

const buildSourceDocument = (record, doc, documents, methodology) => {
  const file = documents?.files?.[0] || null;
  const pages = methodology?.pages_in_document;

  const meta =
    [
      pages ? plural(pages, "page") : null,
      file?.size_bytes ? `${Math.round(file.size_bytes / 1024).toLocaleString()} KB` : null,
      file?.uploaded_at ? `uploaded ${moment.utc(file.uploaded_at).format("DD MMM HH:mm")}` : null,
      doc.documentType ? `detected ${doc.documentType}` : null,
    ]
      .filter(Boolean)
      .join(" · ") || "no file metadata returned";

  return {
    type: shortDocType(doc.documentType),
    file: file?.filename || record.documentName || "source document",
    meta,
    // Streamed through our own proxy — the engine needs an API key that must
    // not reach the browser. See app/api/tbml/[reportId]/files/[fileId].
    url: file
      ? `/api/tbml/${encodeURIComponent(record.reportId)}/files/${encodeURIComponent(file.file_id)}`
      : null,
    fileCount: documents?.file_count ?? (file ? 1 : 0),
  };
};

// ── run summary (list endpoints) ─────────────────────────────────────────────

const STATUS_LABELS = {
  PENDING: "queued",
  PROCESSING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
  COLLECTION_FAILED: "collection failed",
};

export const isRunning = (status) => status === "PENDING" || status === "PROCESSING";

export const statusLabel = (status) =>
  STATUS_LABELS[status] || String(status || "unknown").toLowerCase();

/**
 * The pill in the run switcher, built from GET /tbml/cases/:caseId/reports —
 * which returns our denormalised headline fields, never the cached payload.
 */
export function adaptTbmlSummary(record) {
  const risk = record.overallRiskLevel || "INSUFFICIENT_DATA";
  const submitted = record.submittedAt || record.createdAt;
  const day = submitted ? moment.utc(submitted).format("DD MMM") : "—";

  return {
    id: record.reportId,
    submissionId: record.submissionId || null,
    status: record.status,
    createdAt: submitted,
    completedAt: record.completedAt || null,
    documentName: record.documentName || null,
    caseDocumentId: record.caseDocument || null,
    environment: record.environment || null,
    dbSource: record.dbSource ?? null,
    requiresReview: !!record.requiresAnalystReview,
    productsDetected: record.productsDetected ?? 0,
    riskLevel: risk,
    riskScore: record.overallRiskScore ?? 0,
    errorMessage: record.errorMessage || null,
    // Set when the API's background sweep last failed to reach the engine —
    // the run may be further along than what is shown here.
    pollError: record.lastPollError || null,
    submittedBy: record.submittedBy?.name || null,
    pillMeta:
      record.status === "COMPLETED"
        ? `${day} · ${risk} ${record.overallRiskScore ?? 0}`
        : `${day} · ${statusLabel(record.status)}`,
  };
}

// ── full run ─────────────────────────────────────────────────────────────────

function buildCreatedAtLabel(summary) {
  const when = formatCompletedAt(summary.completedAt || summary.createdAt);
  if (summary.status === "COMPLETED") return `Screening run completed ${when}`;
  if (summary.status === "FAILED" || summary.status === "COLLECTION_FAILED") {
    return `Screening run failed ${when}`;
  }
  return `Screening run ${statusLabel(summary.status)} — started ${formatCompletedAt(summary.createdAt)}`;
}

function buildReferencesFooter(methodology = {}) {
  const domains = methodology.domains_consulted?.length ?? 0;
  const queries = methodology.queries_attempted ?? 0;
  return (
    `${plural(domains, "domain")} consulted across ${queries} ${queries === 1 ? "query" : "queries"}; ` +
    `${methodology.urls_selected ?? 0} URLs selected, ${methodology.pages_read ?? 0} pages read, ` +
    `${methodology.pages_relevant ?? 0} assessed relevant. ` +
    "Only sources marked PRICED contributed to a reference range."
  );
}

/**
 * @param record  a TbmlReport document from GET /tbml/reports/:reportId. Its
 *                `report` field holds the engine's cached ReportDetailResponse
 *                and `files` its document list; returns null until the run has
 *                settled and that payload exists.
 */
export function adaptTbmlRun(record) {
  const report = record?.report;
  if (!report) return null;

  const documents = record.files || null;
  const extracts = report.document_extracts || [];
  const rawExtract = extracts[0] || {};
  const methodology = report.methodology || {};

  const doc = adaptExtract(rawExtract);
  const parties = Object.fromEntries(
    PARTY_SLOTS.map(([label, key]) => [label, adaptParty(rawExtract[key])]),
  );

  // A multi-page submission returns one extract per page; the line items run
  // across all of them.
  const rawProducts = extracts.flatMap((e) => e.products || []);
  const products = rawProducts.map(adaptProduct);
  const productAnalyses = report.product_analyses || [];
  const osintResults = report.osint_results || [];

  const lineAnalyses = buildLineAnalyses(products, productAnalyses, osintResults, {
    // buildLineItems pairs on the raw `description`, so it needs the raw rows.
    products: rawProducts,
  });

  const testedCount = productAnalyses.filter((a) => a.price_deviation_pct != null).length;
  const summary = adaptTbmlSummary(record);

  return {
    ...summary,

    overallRisk: { level: summary.riskLevel, score: summary.riskScore },
    indicators: buildIndicators(report.tbml_indicators_detected, productAnalyses),
    summary: report.overall_risk_summary || "",
    narrative: report.narrative_report || "",

    // Compliance signals the engine raises about its own output. These are the
    // reason a run cannot be read as a clean bill of health, so they are
    // carried through verbatim rather than folded into the summary.
    requiresReview: !!report.requires_analyst_review,
    reviewReasons: report.review_reasons || [],
    errorMessage: report.error_message || summary.errorMessage || null,

    createdAtLabel: buildCreatedAtLabel(summary),
    docSummaryLine: [
      [doc.documentType, doc.documentNumber].filter(Boolean).join(" ") || "document",
      plural(methodology.documents_extracted ?? extracts.length, "document"),
      plural(products.length, "line item"),
    ].join(" · "),
    testedLine: `${testedCount} of ${plural(products.length, "line item")}`,
    sanctionsHit: osintResults.some((r) => r.sanctioned_jurisdiction_flag),

    sourceDocument: buildSourceDocument(record, doc, documents, methodology),
    documentExtract: doc,
    parties,
    gap: buildGap(doc),
    absentFields: buildAbsentFields(doc, products, parties),

    products,
    lineAnalyses,
    osintResults: osintResults.map(adaptOsintResult),
    references: buildReferences(osintResults),
    referencesFooter: buildReferencesFooter(methodology),
    audit: buildAudit(methodology),
  };
}
