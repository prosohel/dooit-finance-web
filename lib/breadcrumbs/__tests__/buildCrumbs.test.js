import { describe, it, expect } from "vitest";
import { buildCrumbs, findRoute, humanize } from "../index";

// A fixed manifest so the tests don't move when pages are added.
const routes = [
  "/dashboard/client",
  "/dashboard/client/report-compliance",
  "/dashboard/client/report-compliance/ecdd",
  "/dashboard/client/report-compliance/ecdd/[id]",
  "/dashboard/client/report-compliance/ecdd/form",
  "/dashboard/client/report-compliance/ttr",
  "/dashboard/client/report-compliance/ttr/form",
  "/dashboard/client/report-compliance/ttr/form/detail",
  "/dashboard/client/monitoring-and-cases/alerts",
  "/dashboard/client/monitoring-and-cases/alerts/[id]",
  "/dashboard/client/monitoring-and-cases/case-manager/[id]",
  "/dashboard/client/monitoring-and-cases/case-manager/[id]/edit",
  "/dashboard/client/list/form/[id]",
].map((r) => r.split("/").filter(Boolean));

const ID = "6a873e090915b430e99f7d13";
const crumbs = (path, labels) => buildCrumbs(path, labels, routes);
const view = (path, labels) => crumbs(path, labels).map(({ label, href }) => [label, href]);

describe("buildCrumbs", () => {
  it("renders nothing on the dashboard root or outside the client area", () => {
    expect(crumbs("/dashboard/client")).toEqual([]);
    expect(crumbs("/auth/login")).toEqual([]);
  });

  it("links only ancestors that are real pages; the current page is never a link", () => {
    expect(view(`/dashboard/client/report-compliance/ecdd/${ID}`)).toEqual([
      ["Dashboard", "/dashboard/client"],
      ["Reports & Compliance", "/dashboard/client/report-compliance"],
      ["ECDD", "/dashboard/client/report-compliance/ecdd"],
      ["Details", null],
    ]);
  });

  it("shows page-less section folders as plain text", () => {
    expect(view(`/dashboard/client/monitoring-and-cases/alerts/${ID}`)[1]).toEqual(["Monitoring & Cases", null]);
  });

  it("prefers a static route over a dynamic sibling", () => {
    expect(findRoute("/dashboard/client/report-compliance/ecdd/form", routes).at(-1)).toBe("form");
    expect(view("/dashboard/client/report-compliance/ecdd/form").at(-1)).toEqual(["Form", null]);
  });

  it("skips middle action segments like form", () => {
    expect(view("/dashboard/client/report-compliance/ttr/form/detail").map(([l]) => l)).toEqual([
      "Dashboard",
      "Reports & Compliance",
      "TTR",
      "Details",
    ]);
  });

  it("uses runtime labels, including for a parent record crumb", () => {
    const casePath = `/dashboard/client/monitoring-and-cases/case-manager/${ID}`;
    expect(view(`${casePath}/edit`, { [casePath]: "Case CASE-0042" }).slice(-2)).toEqual([
      ["Case CASE-0042", casePath],
      ["Edit", null],
    ]);
  });

  it("labels an id under /form as an edit screen", () => {
    expect(view(`/dashboard/client/list/form/${ID}`).map(([l]) => l)).toEqual(["Dashboard", "Clients", "Edit"]);
  });
});

describe("humanize", () => {
  it("title-cases unknown segments and keeps compliance acronyms upper-case", () => {
    expect(humanize("kyc-refresh-queue")).toBe("KYC Refresh Queue");
    expect(humanize("pep-and-adverse-media")).toBe("PEP & Adverse Media");
  });
});
