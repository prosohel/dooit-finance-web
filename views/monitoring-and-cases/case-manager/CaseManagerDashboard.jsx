"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  IconSearch,
  IconFilter,
  IconPlus,
  IconDownload,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";
import CaseAnalyticsPanel from "./CaseAnalyticsPanel";
import CaseTable from "./CaseTable";
import CaseFilters from "./CaseFilters";
import CreateCaseSheet from "./CreateCaseSheet";
import { useCaseManagerStore } from "@/app/store/useCaseManagerStore";
import { getCases } from "@/app/dashboard/client/monitoring-and-cases/case-manager/actions";

// Backend enums mapped for quick-filter dropdowns
const PRIORITY_OPTIONS = ["low", "medium", "high", "critical"];
const STATUS_OPTIONS = ["open", "under_investigation", "pending_review", "closed", "escalated"];
const TYPE_OPTIONS = ["SAR", "PEP", "transaction_monitoring", "other"];

const STATUS_LABELS = {
  open: "Open",
  under_investigation: "Under Investigation",
  pending_review: "Pending Review",
  closed: "Closed",
  escalated: "Escalated",
};

export default function CaseManagerDashboard() {
  const {
    cases,
    setCases,
    fetching,
    setFetching,
    currentPage,
    setCurrentPage,
    limit,
    setLimit,
    totalItems,
    setTotalItems,
    setTotalPages,
    searchQuery,
    setSearchQuery,
    filters,
    setFilter,
  } = useCaseManagerStore();

  const [rawSearch, setRawSearch] = useState(searchQuery);
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [createSheetOpen, setCreateSheetOpen] = useState(false);

  // Debounce search input → store
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(rawSearch), 300);
    return () => clearTimeout(t);
  }, [rawSearch, setSearchQuery]);

  // Fetch cases whenever page, limit, or filters change
  useEffect(() => {
    const load = async () => {
      setFetching(true);
      try {
        // Map store filter keys → backend API params
        const params = {
          page: currentPage,
          limit,
          ...(filters.riskLevel && { priority: filters.riskLevel }),
          ...(filters.caseType && { type: filters.caseType }),
          ...(filters.status && { status: filters.status }),
          ...(filters.dateFrom && { startDate: filters.dateFrom }),
          ...(filters.dateTo && { endDate: filters.dateTo }),
          sortBy: filters.sortBy || "createdAt",
          sortOrder: filters.sortOrder || "desc",
        };

        const res = await getCases(params);
        if (res?.succeed) {
          setCases(res.data);
          setTotalItems(res.pagination.total);
          setTotalPages(res.pagination.pages);
        }
      } catch (err) {
        console.error("Failed to fetch cases", err);
      } finally {
        setFetching(false);
      }
    };
    load();
  }, [currentPage, limit, filters]);

  // Client-side search on the fetched page (title, type, createdBy)
  const displayedCases = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return cases;
    return cases.filter(
      (c) =>
        c.title?.toLowerCase().includes(q) ||
        c.type?.toLowerCase().includes(q) ||
        c.createdBy?.name?.toLowerCase().includes(q) ||
        (c.assignedTo || []).some((u) => u.name?.toLowerCase().includes(q)),
    );
  }, [cases, searchQuery]);

  const activeFilterCount = useMemo(
    () =>
      Object.entries(filters).filter(([k, v]) => !["sortBy", "sortOrder"].includes(k) && v !== "")
        .length,
    [filters],
  );

  const handleExport = useCallback(() => {
    const csvContent = [
      ["Title", "Type", "Priority", "Status", "Assigned To", "Created"].join(","),
      ...displayedCases.map((c) =>
        [
          `"${c.title}"`,
          c.type,
          c.priority,
          c.status,
          `"${(c.assignedTo || []).map((u) => u.name).join("; ")}"`,
          c.createdAt,
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cases-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [displayedCases]);

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-heading">Case Manager</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Monitor and manage compliance cases
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleExport}>
            <IconDownload className="size-3.5" />
            Export
          </Button>
          <Button size="sm" className="gap-1.5 text-xs" onClick={() => setCreateSheetOpen(true)}>
            <IconPlus className="size-3.5" />
            New Case
          </Button>
        </div>
      </div>

      {/* Analytics Toggle */}
      <div>
        <button
          onClick={() => setShowAnalytics((v) => !v)}
          className="mb-3 flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-heading transition-colors"
        >
          {showAnalytics ? (
            <IconChevronUp className="size-4" />
          ) : (
            <IconChevronDown className="size-4" />
          )}
          {showAnalytics ? "Hide" : "Show"} Analytics
        </button>
        {showAnalytics && <CaseAnalyticsPanel />}
      </div>

      {/* Table Section */}
      <Card className="overflow-hidden border-0 bg-gray-50 shadow-none">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b p-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              className="pl-8 h-9 text-sm"
              placeholder="Search by title, type or analyst..."
              value={rawSearch}
              onChange={(e) => setRawSearch(e.target.value)}
            />
          </div>

          {/* Priority quick filter */}
          <Select
            value={filters.riskLevel || "all"}
            onValueChange={(v) => setFilter("riskLevel", v === "all" ? "" : v)}
          >
            <SelectTrigger className="h-9 w-[130px] text-xs">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              {PRIORITY_OPTIONS.map((p) => (
                <SelectItem key={p} value={p} className="capitalize">
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status quick filter */}
          <Select
            value={filters.status || "all"}
            onValueChange={(v) => setFilter("status", v === "all" ? "" : v)}
          >
            <SelectTrigger className="h-9 w-[160px] text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Case type quick filter */}
          <Select
            value={filters.caseType || "all"}
            onValueChange={(v) => setFilter("caseType", v === "all" ? "" : v)}
          >
            <SelectTrigger className="h-9 w-[160px] text-xs">
              <SelectValue placeholder="Case Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {TYPE_OPTIONS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Full Filter Sheet */}
          <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="relative h-9 gap-1.5 text-xs">
                <IconFilter className="size-3.5" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-80">
              <SheetHeader>
                <SheetTitle className="sr-only">Filter Cases</SheetTitle>
              </SheetHeader>
              <div className="mt-2 h-full pb-6">
                <CaseFilters onClose={() => setFilterSheetOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>

          <div className="ml-auto text-xs text-muted-foreground">
            {totalItems} case{totalItems !== 1 ? "s" : ""}
          </div>
        </div>

        <CardContent className="p-0">
          <CaseTable
            cases={displayedCases}
            loading={fetching}
            currentPage={currentPage}
            totalItems={totalItems}
            limit={limit}
            onPageChange={setCurrentPage}
          />
        </CardContent>
      </Card>

      <CreateCaseSheet open={createSheetOpen} onOpenChange={setCreateSheetOpen} />
    </div>
  );
}
