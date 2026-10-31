import routeManifest from "./route-manifest";

export const BREADCRUMB_BASE = "/dashboard/client";

// Labels for URL segments whose title-cased form reads wrong: acronyms, "&",
// and places where the sidebar names a section differently from its folder.
const SEGMENT_LABELS = {
  "abc-risk-assesment": "ABC Risk Assessment",
  "aml-ctf-dashboard": "AML/CTF Dashboard",
  "aml-red-flags": "AML Red Flags",
  "aml-screening": "AML Screening",
  "back-test": "Rule Back Test",
  "case-list": "Case List",
  "case-manager": "Case Manager",
  "cra-scoring-config": "CRA Scoring Configuration",
  "customer-queue": "Customers",
  "due-diligence": "Due Diligence",
  "forms-hub": "Forms Hub",
  "in-review": "In Review",
  "internal-blacklist": "Internal Blacklist",
  "knowledge-hub": "Knowledge Hub",
  "manual-import": "Manual Import",
  "ml-risk-assesment": "ML Risk Assessment",
  "monitoring-and-cases": "Monitoring & Cases",
  "pep-and-adverse-media": "PEP & Adverse Media",
  "policy-hub": "Policy Hub",
  "pricing-plans": "Pricing Plans",
  "receive-crypto": "Receive Crypto",
  "regulatory-links": "Regulatory Links",
  "report-compliance": "Reports & Compliance",
  "risk-registers": "Risk Registers",
  "risk-rule-engine": "Risk Rule Engine",
  "rule-configuration": "Rule Configuration",
  "send-crypto": "Send Crypto",
  "smr-filing": "SMR Filing",
  "str-filling-report": "UAR Filing",
  "system-settings": "System Settings",
  "testing-and-governance": "Testing & Governance",
  "tf-risk-assesment": "TF Risk Assessment",
  "title-search": "Title Search",
  "track-progress": "Track Progress",
  "track-status": "Track Status",
  "training-hub": "Training Hub",
  "training-module": "Training Module",
  "transaction-rule-editor": "Transaction Rule Editor",
  "travel-rule": "Travel Rule",
  "user-and-role-management": "User & Role Management",
  "watchlist-and-screening": "Watchlist & Screening",
  "workflow-studio": "Workflow Studio",
  devices: "Devices & Activity",
  ecdd: "ECDD",
  ewra: "EWRA",
  gfs: "GFS",
  grc: "GRC",
  ifti: "IFTI",
  list: "Clients",
  smr: "SMR",
  ttr: "TTR",
  usage: "Service Usage",
  create: "Create",
  new: "New",
  add: "New",
  edit: "Edit",
  form: "Form",
  detail: "Details",
  details: "Details",
};

// Segments that describe an action on their parent rather than a place. As a
// middle crumb they add nothing ("TTR › Form › Details"), so they are skipped
// unless they are the page itself.
const ACTION_SEGMENTS = new Set(["form", "edit", "details", "detail"]);

const ACRONYMS = new Set(["aml", "ctf", "kyc", "kyb", "pep", "smr", "ttr", "ifti", "ecdd", "cdd", "uar", "str", "grc", "ewra", "gfs", "cra", "id"]);

const OBJECT_ID = /^[a-f0-9]{24}$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const looksLikeId = (segment) => OBJECT_ID.test(segment) || UUID.test(segment) || /^\d+$/.test(segment);

export const humanize = (segment) =>
  SEGMENT_LABELS[segment] ??
  decodeURIComponent(segment)
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => (ACRONYMS.has(w.toLowerCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");

const isDynamic = (patternSegment) => /^\[.*\]$/.test(patternSegment);

const matches = (pathSegments, patternSegments) => {
  for (let i = 0; i < patternSegments.length; i++) {
    const p = patternSegments[i];
    if (p.startsWith("[[...")) return true; // optional catch-all: 0+ segments
    if (p.startsWith("[...")) return pathSegments.length > i; // catch-all: 1+
    if (i >= pathSegments.length) return false;
    if (!isDynamic(p) && p !== pathSegments[i]) return false;
  }
  return pathSegments.length === patternSegments.length;
};

const split = (path) => path.split("/").filter(Boolean);
const compiled = routeManifest.map(split);

/**
 * The route pattern a concrete path resolves to, or null when no page exists
 * there. Static routes win over dynamic ones, as they do in Next.js.
 */
export const findRoute = (path, routes = compiled) => {
  const segs = split(path);
  let best = null;
  let bestScore = -1;
  for (const pattern of routes) {
    if (!matches(segs, pattern)) continue;
    const score = pattern.filter((p) => !isDynamic(p)).length;
    if (score > bestScore) {
      best = pattern;
      bestScore = score;
    }
  }
  return best;
};

/**
 * Crumbs for a pathname: `[{ label, href, path }]`, home first. `href` is null
 * for the current page and for ancestors that have no page of their own.
 * `labels` maps a concrete path to a runtime name (e.g. "ECDD #1042").
 */
export const buildCrumbs = (pathname, labels = {}, routes = compiled) => {
  if (!pathname?.startsWith(BREADCRUMB_BASE)) return [];
  const segs = split(pathname.slice(BREADCRUMB_BASE.length));
  if (segs.length === 0) return [];

  const crumbs = [{ label: "Dashboard", href: BREADCRUMB_BASE, path: BREADCRUMB_BASE, home: true }];

  segs.forEach((segment, i) => {
    const path = `${BREADCRUMB_BASE}/${segs.slice(0, i + 1).join("/")}`;
    const isLast = i === segs.length - 1;
    const route = findRoute(path, routes);
    const dynamic = route ? isDynamic(route[route.length - 1]) : looksLikeId(segment);

    if (!isLast && !dynamic && ACTION_SEGMENTS.has(segment)) return;

    let label = labels[path];
    if (!label && dynamic) {
      // `/form/[id]` is an edit screen; any other `[id]` is a record.
      label = ["form", "edit"].includes(segs[i - 1]) ? "Edit" : "Details";
    }
    crumbs.push({
      label: label || humanize(segment),
      href: !isLast && route ? path : null,
      path,
    });
  });

  return crumbs;
};
