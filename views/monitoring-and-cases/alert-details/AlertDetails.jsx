"use client";

// Alert details page: /dashboard/client/monitoring-and-cases/alerts/[id]
//
// One fetch (GET /alert/:id) feeds the header and every tab through
// alertAdapter. The raw document is also pushed into the alert store because
// the ECDD Review / Reports / RFI-form components still read `details` there.
// The active tab is mirrored into ?tab= so links and the back button work.

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import useAlertStore from "@/app/store/alerts";
import { getCaseDetails } from "@/app/dashboard/client/monitoring-and-cases/case-list/actions";
import { getCaseById } from "@/app/dashboard/client/monitoring-and-cases/case-manager/actions";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { adaptAlert } from "./alertAdapter";
import AlertHeader from "./AlertHeader";
import OverviewTab from "./tabs/OverviewTab";
import CustomerTab from "./tabs/CustomerTab";
import TransactionTab from "./tabs/TransactionTab";
import RfiTab from "./tabs/RfiTab";
import DispositionTab from "./tabs/DispositionTab";
import ReportsTab from "./tabs/ReportsTab";
import Ecdd from "@/views/monitoring-and-cases/case-details/Ecdd";
import useBreadcrumbLabel from "@/hooks/useBreadcrumbLabel";

const TABS = [
  { id: "overview", label: "Overview", Component: OverviewTab },
  { id: "customer", label: "Customer & CRA", Component: CustomerTab },
  { id: "transaction", label: "Transaction & Parties", Component: TransactionTab },
  { id: "ecdd-review", label: "ECDD Review", Component: Ecdd, legacy: true },
  { id: "rfi", label: "RFI", Component: RfiTab },
  { id: "reports", label: "Reports", Component: ReportsTab },
  { id: "disposition", label: "Disposition & Audit", Component: DispositionTab },
];

// Old ?tab= values from bookmarks / the ECDD list keep working
const TAB_ALIASES = {
  "summary-and-timeline": "overview",
  "customer-profile-and-cra": "customer",
  "investigation-panel": "transaction",
  "action-and-disposition": "disposition",
};

export default function AlertDetails({ id, initialTab }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setDetails, setFetching } = useAlertStore();

  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const resolveTab = (v) => {
    const key = TAB_ALIASES[v] || v;
    return TABS.some((t) => t.id === key) ? key : "overview";
  };
  const [activeTab, setActiveTab] = useState(() => resolveTab(initialTab));

  // Keep the tab in sync with the URL (deep links + back button)
  useEffect(() => {
    const fromUrl = searchParams.get("tab");
    if (fromUrl && resolveTab(fromUrl) !== activeTab) setActiveTab(resolveTab(fromUrl));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const selectTab = (tabId) => {
    setActiveTab(tabId);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      setFetching(true);
      try {
        const res = await getCaseDetails(id);
        if (res?.succeed && res?.data) {
          setRaw(res.data);
          setDetails(res.data);
          setError(null);
          return;
        }
        // A Case id pasted into the alert route: send it to the case hub
        const asCase = await getCaseById(id);
        if (asCase?.succeed && asCase?.data?._id) {
          router.replace(`/dashboard/client/monitoring-and-cases/case-manager/${asCase.data._id}`);
          return;
        }
        setError(res?.error || res?.message || "Alert not found");
      } catch (e) {
        console.error("Failed to load alert", e);
        setError("Failed to load alert");
      } finally {
        setLoading(false);
        setFetching(false);
      }
    },
    [id, router, setDetails, setFetching],
  );

  useEffect(() => {
    load();
    return () => {
      setDetails(null);
      setFetching(false);
    };
  }, [load, setDetails, setFetching]);

  const alert = useMemo(() => adaptAlert(raw), [raw]);
  useBreadcrumbLabel(raw?.uid && `Alert #${raw.uid}`);
  const refresh = useCallback(() => load({ silent: true }), [load]);

  if (loading && !raw) return <PageSkeleton />;

  if (error || !alert) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-white p-10 text-center">
        <p className="text-sm font-medium text-heading">{error || "Alert not found"}</p>
        <Button variant="outline" onClick={() => router.push("/dashboard/client/monitoring-and-cases/alerts")}>
          Back to alerts
        </Button>
      </div>
    );
  }

  const current = TABS.find((t) => t.id === activeTab) || TABS[0];
  const Active = current.Component;

  return (
    <div className="flex flex-col gap-4">
      <AlertHeader alert={alert} onRefresh={refresh} onOpenTab={selectTab} />

      <div className="rounded-xl border border-border bg-white">
        <nav className="flex gap-1 overflow-x-auto border-b border-border px-4" aria-label="Alert sections">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => selectTab(tab.id)}
              className={cn(
                "relative whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors",
                activeTab === tab.id ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
              {activeTab === tab.id && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />}
            </button>
          ))}
        </nav>
        <div className="p-5">
          {current.legacy ? <Active /> : <Active alert={alert} raw={raw} onRefresh={refresh} onOpenTab={selectTab} />}
        </div>
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-border bg-white p-5">
        <Skeleton className="mb-3 h-3 w-72" />
        <Skeleton className="mb-2 h-6 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <div className="rounded-xl border border-border bg-white p-5">
        <Skeleton className="mb-4 h-9 w-full" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="col-span-2 h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    </div>
  );
}
