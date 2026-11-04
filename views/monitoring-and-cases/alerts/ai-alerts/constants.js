// Filter values are the exact enums the Transaction Monitoring API accepts.

export const DETECTORS = [
  { value: "rule", label: "Rules" },
  { value: "ml", label: "ML model" },
  { value: "dl", label: "DL model" },
];

export const RISK_LABELS = ["Low", "Medium", "High", "Critical"];

export const CASE_TYPES = ["Fraud", "AML", "Compliance", "TF"];

export const SORT_OPTIONS = [
  { value: "score", label: "Highest score" },
  { value: "time", label: "Transaction time" },
  { value: "detected", label: "Detected time" },
];

export const DATE_FIELDS = [
  { value: "run", label: "Run date" },
  { value: "transaction", label: "Transaction date" },
];

export const MAX_RANGE_DAYS = 366;

export const riskVariants = {
  Low: "info",
  Medium: "warning",
  High: "danger",
  Critical: "danger",
};

export const detectorLabel = (value) =>
  DETECTORS.find((d) => d.value === value)?.label || value;

/** YYYY-MM-DD in Asia/Dhaka — the timezone the API's date parameters use. */
export const dhakaDate = (date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(date);

export const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

export const daysBetween = (start, end) =>
  Math.round((new Date(end) - new Date(start)) / (24 * 60 * 60 * 1000));

export const formatMoney = (amount, currency) => {
  if (amount == null) return "—";
  const value = new Intl.NumberFormat("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  return currency ? `${currency} ${value}` : value;
};

/** "derived.sender_sum_last_5" → "sender sum last 5" — keeps the path's tail readable. */
export const fieldLabel = (field = "") => field.split(".").pop().replace(/_/g, " ");
