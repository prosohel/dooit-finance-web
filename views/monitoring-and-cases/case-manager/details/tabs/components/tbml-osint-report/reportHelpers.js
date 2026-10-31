import moment from "moment";

// ── formatting ───────────────────────────────────────────────────────────

// Pulls the first numeric token out of strings like "USD 1,350.00 per litre".
export function parseCurrencyNumber(value) {
  if (value == null) return null;
  const match = String(value).match(/[\d,]+\.?\d*/);
  if (!match) return null;
  const num = parseFloat(match[0].replace(/,/g, ""));
  return Number.isNaN(num) ? null : num;
}

export function formatNumber(value, { minimumFractionDigits, maximumFractionDigits = 2 } = {}) {
  const num = typeof value === "number" ? value : parseCurrencyNumber(value);
  if (num == null) return "—";
  // Default minimumFractionDigits tracks the max so callers can pass just
  // `maximumFractionDigits: 0` without tripping Intl's min <= max invariant.
  const min = minimumFractionDigits ?? Math.min(2, maximumFractionDigits);
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: min, maximumFractionDigits }).format(num);
}

export function formatCompletedAt(dateStr) {
  if (!dateStr) return "—";
  return `${moment.utc(dateStr).format("DD MMM YYYY HH:mm")} UTC`;
}

// "20riser project" -> "20-riser project" — the extraction sometimes drops
// the hyphen between a number and the following word.
export function tidyUnitLabel(unit) {
  if (!unit) return "";
  return String(unit).replace(/(\d)([a-z])/i, "$1-$2");
}

// ── line item descriptors ────────────────────────────────────────────────

export function describeHsCode(product) {
  return product?.hs_code ? `HS ${product.hs_code}` : "HS code not provided";
}

export function describeQuantity(product) {
  if (!product?.quantity) return "quantity not stated";
  return `${product.quantity}${product.unit ? ` ${product.unit}` : ""}`;
}

export function describeCurrency(product) {
  return product?.currency || "currency not stated";
}

// Pairs each declared line item with its analysis + market research,
// matching on description first and falling back to array position since
// the three arrays are produced in the same order.
export function buildLineItems(documentExtract, productAnalyses = [], osintResults = []) {
  const products = documentExtract?.products || [];
  return products.map((product, index) => {
    const analysis =
      productAnalyses.find((a) => a.product_description === product.description) ||
      productAnalyses[index] ||
      null;
    const osint =
      osintResults.find((o) => o.product_description === product.description) ||
      osintResults[index] ||
      null;
    return { product, analysis, osint };
  });
}

// Builds a short, human title suffix from the leading word of each product
// description (e.g. "Labor- Paint the risers..." + "Material - Paint" ->
// "Labor & Material") since the API doesn't return a case-level title.
export function deriveLineItemsSummary(products = []) {
  const words = products
    .map((p) => (p.description || "").trim().split(/[\s,-]+/)[0])
    .filter(Boolean);
  return Array.from(new Set(words)).join(" & ");
}

// ── risk / severity styling ──────────────────────────────────────────────

// `progress` holds the full, literal Tailwind class (rather than being
// composed from `badge` at render time) so the JIT compiler's static scan
// can actually find and generate it.
const LEVEL_STYLES = {
  HIGH: {
    badge: "bg-danger text-white",
    text: "text-danger",
    ring: "ring-danger/15",
    progress: "[&_[data-slot=progress-indicator]]:bg-danger",
  },
  MEDIUM: {
    badge: "bg-warning text-white",
    text: "text-warning",
    ring: "ring-warning/15",
    progress: "[&_[data-slot=progress-indicator]]:bg-warning",
  },
  MED: {
    badge: "bg-warning text-white",
    text: "text-warning",
    ring: "ring-warning/15",
    progress: "[&_[data-slot=progress-indicator]]:bg-warning",
  },
  LOW: {
    badge: "bg-success text-white",
    text: "text-success",
    ring: "ring-success/15",
    progress: "[&_[data-slot=progress-indicator]]:bg-success",
  },
  INSUFFICIENT_DATA: {
    badge: "bg-muted text-muted-foreground",
    text: "text-muted-foreground",
    ring: "ring-border",
    progress: "[&_[data-slot=progress-indicator]]:bg-muted-foreground",
  },
};

export function riskLevelStyle(level) {
  const key = String(level || "").toUpperCase();
  return LEVEL_STYLES[key] || LEVEL_STYLES.INSUFFICIENT_DATA;
}

// ── generic status chips (teal / ok / danger / warn / mute) ────────────────

const CHIP_STYLES = {
  teal: "border-primary/20 bg-primary/10 text-primary",
  ok: "border-success/20 bg-success/10 text-success",
  danger: "border-danger/20 bg-danger/10 text-danger",
  warn: "border-warning/30 bg-warning/10 text-yellow-700",
  mute: "border-border bg-muted text-muted-foreground",
};

export function chipClass(kind) {
  return CHIP_STYLES[kind] || CHIP_STYLES.mute;
}

// ── reference source roles (PRICED / SCREENED / CONTEXT) ───────────────────

const REFERENCE_ROLE_KIND = { PRICED: "teal", SCREENED: "ok", CONTEXT: "mute" };

export function referenceRoleKind(role) {
  return REFERENCE_ROLE_KIND[role] || "mute";
}

// ── declared-vs-mid deviation (used for the line-item summary figure) ──────

// Deviation of the declared price from the OSINT mid price, e.g. a labor
// line declared at 7,000 against a mid of 1,000 reads "+600%". Severity
// scales with how far off mid the declared value sits.
export function computePriceDeviation({ declared, mid }) {
  if (declared == null || mid == null || mid === 0) return null;
  const pct = ((declared - mid) / mid) * 100;
  const abs = Math.abs(pct);
  const kind = abs >= 100 ? "danger" : abs >= 15 ? "warn" : "ok";
  const sign = pct > 0 ? "+" : pct < 0 ? "-" : "";
  return { pct, kind, label: `${sign}${Math.round(abs)}%` };
}

// ── document totals line, e.g. "subtotal 8,500.00 · total 8,623.75 · unexplained 123.75" ──

// `gap` is the adapter's { amount, label } — the label already says which way
// the discrepancy runs ("Unexplained 123.75" / "Shortfall 80.55"), so it is
// reused rather than re-derived from a signed number.
export function buildTotalsLine(doc, gap) {
  const parts = [`subtotal ${formatNumber(doc.subtotal)}`];
  parts.push(`freight ${doc.freightCharges != null ? formatNumber(doc.freightCharges) : "—"}`);
  parts.push(`insurance ${doc.insurance != null ? formatNumber(doc.insurance) : "—"}`);
  parts.push(`total ${formatNumber(doc.totalAmount)}`);
  if (gap?.label) parts.push(gap.label.toLowerCase());
  return parts.join("   ·   ");
}

// ── declared-vs-market comparison ────────────────────────────────────────

// How the declared price sits relative to the OSINT market range: whether
// it's over the ceiling, under the floor, or inside the range, plus the
// short "5.2x market ceiling" style label shown next to the declared value.
export function computeMarketPosition({ declared, low, high }) {
  if (declared == null || low == null || high == null || high === 0 || low === 0) return null;
  if (declared > high) {
    return { direction: "over", label: `${(declared / high).toFixed(1)}x market ceiling` };
  }
  if (declared < low) {
    return { direction: "under", label: `${(low / declared).toFixed(1)}x below market floor` };
  }
  return { direction: "within", label: "within market range" };
}
