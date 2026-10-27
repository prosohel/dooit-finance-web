import { create } from "zustand";

// Runtime names for breadcrumb crumbs, keyed by concrete path
// ("/dashboard/client/report-compliance/ecdd/6a87…" → "ECDD #1042").
// Entries are kept for the session on purpose: after visiting a case, its
// name still shows as the parent crumb on that case's /edit page.
export const useBreadcrumbStore = create((set) => ({
  labels: {},
  setLabel: (path, label) =>
    set((state) =>
      state.labels[path] === label ? state : { labels: { ...state.labels, [path]: label } },
    ),
}));
