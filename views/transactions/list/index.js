"use client";

/**
 * TransactionListView
 *
 * Responsibilities:
 * 1. Own the URL ↔ store sync (read on mount, write on every state change)
 * 2. Trigger store.fetch() whenever filters / pagination / sort change
 * 3. Render FilterToolbar, table, and pagination
 *
 * URL query params are kept in sync so the filtered view is
 * shareable / bookmarkable and survives browser back/forward.
 */

import { DataTableColumnHeader } from "@/components/DatatableColumnHeader";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusPill } from "@/components/ui/StatusPill";
import {
  IconDotsVertical,
  IconDownload,
  IconEye,
  IconFileTypePdf,
  IconGridDots,
  IconList,
  IconPencil,
  IconPennant,
  IconUpload,
} from "@tabler/icons-react";
import { ArrowRight, Plus } from "lucide-react";
import { useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";

import { formatAUD, formatDateTime } from "@/lib/utils";
import { DEFAULT_FILTERS, DEFAULT_SORT } from "@/app/store/useTransactionStore";
import useTransactionStore from "@/app/store/useTransactionStore";
import FilterToolbar from "./FilterToolbar";
import TransactionDetailView from "../form/Details";
import TransactionReportingModal from "../form/ReportingModal";
import TransactionDashboard from "./Dashboard";
import ImportModal from "./ImportModal";
import CustomPagination from "@/components/CustomPagination";
import { useState } from "react";
import { toast } from "sonner";
import {
  exportTransactionsCsv,
  downloadTransactionPdf,
} from "@/app/dashboard/client/transactions/actions";
import { buildQueryParams } from "@/app/store/useTransactionStore";

const CustomResizableTable = dynamic(() => import("@/components/ui/CustomResizable"), {
  ssr: false,
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Parse URL search params → store-compatible filter/pagination/sort object */
const parseUrlParams = (searchParams) => {
  const filterKeys = Object.keys(DEFAULT_FILTERS);
  const filters = { ...DEFAULT_FILTERS };

  filterKeys.forEach((k) => {
    const v = searchParams.get(k);
    if (v !== null && v !== "") filters[k] = v;
  });

  return {
    filters,
    page: Math.max(parseInt(searchParams.get("page") || "1", 10), 1),
    limit: Math.min(parseInt(searchParams.get("limit") || "10", 10), 100),
    sort: {
      field: searchParams.get("sort") || DEFAULT_SORT.field,
      order: searchParams.get("order") || DEFAULT_SORT.order,
    },
  };
};

/** Build URL query string from store state — used for router.replace */
const buildUrl = (filters, page, limit, sort) => {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));
  params.set("sort", sort.field);
  params.set("order", sort.order);
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== "" && v != null) params.set(k, v);
  });
  return `?${params.toString()}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Status styling map
// ─────────────────────────────────────────────────────────────────────────────

const statusVariants = {
  pending: "info",
  completed: "success",
  failed: "danger",
  cancelled: "warning",
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const TransactionListView = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    data,
    loading,
    error,
    totalRecords,
    page,
    limit,
    sort,
    filters,
    setFilters,
    setPage,
    setLimit,
    setSortExplicit,
    setSortWithDirection,
    fetch,
  } = useTransactionStore();

  // ── Modal state ───────────────────────────────────────────────────────────
  const [openDetailView, setOpenDetailView] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [viewReport, setViewReport] = useState(false);
  const [currentItemReport, setCurrentItemReport] = useState(null);
  const [openImport, setOpenImport] = useState(false);
  const [exporting, setExporting] = useState(false);

  // ─── 1. Hydrate store from URL on first mount ─────────────────────────────
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    const {
      filters: urlFilters,
      page: urlPage,
      limit: urlLimit,
      sort: urlSort,
    } = parseUrlParams(searchParams);

    setFilters(urlFilters);
    setPage(urlPage);
    setLimit(urlLimit);
    setSortExplicit(urlSort.field, urlSort.order);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── 2. Fetch whenever filters / pagination / sort change ─────────────────
  useEffect(() => {
    fetch();
  }, [filters, page, limit, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── 3. Mirror store state → URL (replace so it doesn't pollute history) ──
  useEffect(() => {
    if (!hydratedRef.current) return;
    const url = buildUrl(filters, page, limit, sort);
    router.replace(url, { scroll: false });
  }, [filters, page, limit, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleViewClick = useCallback((item) => {
    setCurrentItem(item);
    setOpenDetailView(true);
  }, []);
  const handleEditClick = useCallback(
    (item) => router.push(`/dashboard/client/transactions/edit?id=${item?._id}`),
    [router],
  );
  const handleViewReportClick = (item) => {
    setCurrentItemReport(item);
    setViewReport(true);
  };
  const handlePageChange = (p) => setPage(p.selected + 1);
  const handleLimitChange = (l) => setLimit(l);

  // ── CSV Export ────────────────────────────────────────────────────────────
  const handleExportCsv = useCallback(async () => {
    setExporting(true);
    try {
      const params = buildQueryParams({ filters, page: 1, limit: 10000, sort });
      const result = await exportTransactionsCsv(params);
      if (!result.success) {
        toast.error(result.message || "Export failed");
        return;
      }

      const bytes = Uint8Array.from(atob(result.data), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV exported successfully");
    } catch (err) {
      toast.error("Export failed: " + err.message);
    } finally {
      setExporting(false);
    }
  }, [filters, sort]);

  // ── PDF download from row action ──────────────────────────────────────────
  const handleRowDownloadPdf = useCallback(async (item) => {
    const tid = toast.loading("Generating PDF…");
    try {
      const result = await downloadTransactionPdf(item._id);
      if (!result.success) {
        toast.error(result.message || "PDF failed", { id: tid });
        return;
      }
      const bytes = Uint8Array.from(atob(result.data), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `transaction-${item.uid || item._id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded", { id: tid });
    } catch (err) {
      toast.error("PDF failed: " + err.message, { id: tid });
    }
  }, []);

  // ── Sort column header — explicit direction from dropdown ─────────────────
  const handleSort = useCallback(
    (field, direction) => {
      setSortWithDirection(field, direction);
    },
    [setSortWithDirection],
  );

  // ── Table columns — memoised so CustomResizableTable's columnOrder state
  //    doesn't reset on every parent render (e.g. loading toggle, data arrival)
  const columns = useMemo(
    () => [
      {
        id: "actions",
        header: "Actions",
        accessorKey: "actions",
        size: 60,
        cell: ({ row }) => (
          <div className="flex justify-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="!py-2 h-auto">
                  <IconDotsVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => handleViewClick(row.original)}>
                  <IconEye className="mr-2 size-3 text-muted-foreground/70" />
                  View
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleRowDownloadPdf(row.original)}>
                  <IconFileTypePdf className="mr-2 size-3 text-destructive/70" />
                  Download PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleEditClick(row.original)}>
                  <IconPencil className="mr-2 size-3 text-muted-foreground/70" />
                  Edit
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
      // {
      //   id: "id",
      //   header: ({ column }) => (
      //     <DataTableColumnHeader
      //       column={column}
      //       title="ID"
      //       onSort={(dir) => handleSort("uid", dir)}
      //       sortDirection={sort.field === "uid" ? sort.order : null}
      //     />
      //   ),
      //   accessorKey: "uid",
      //   cell: ({ row }) => (
      //     <span className="font-mono text-neutral-400 text-xs">#{row.original?.uid}</span>
      //   ),
      // },
      {
        id: "id",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title="ID"
            onSort={(dir) => handleSort("uid", dir)}
            sortDirection={sort.field === "uid" ? sort.order : null}
          />
        ),
        accessorKey: "uid",
        cell: ({ row }) => {
          const { date, time } = formatDateTime(row.original.transactionTimestamp);
          return (
            <div>
              <p className="font-mono text-xs text-neutral-500">{row.original.uid}</p>
              <p className="text-xs text-neutral-400">
                {date} · {time}
              </p>
            </div>
          );
        },
      },

      {
        id: "Flow Direction",
        header: "Flow Direction",
        accessorKey: "sender.name",
        size: 200,
        cell: ({ row }) => (
          <div className="flex gap-2 items-center py-2">
            <div>
              <span className="text-neutral-900 capitalize text-sm">
                {row.original?.sender?.name}
              </span>
              <p className="text-neutral-400 text-xs">{row.original?.sender?.account}</p>
            </div>
            <ArrowRight className="size-4 text-green-500 shrink-0" />
            <div>
              <span className="text-neutral-900 capitalize text-sm">
                {row.original?.receiver?.name}
              </span>
              <p className="text-neutral-400 text-xs">{row.original?.receiver?.account}</p>
            </div>
          </div>
        ),
      },
      {
        id: "type",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title="Type"
            onSort={(dir) => handleSort("type", dir)}
            sortDirection={sort.field === "type" ? sort.order : null}
          />
        ),
        accessorKey: "type",
        size: 100,
        cell: ({ row }) => <p className="text-neutral-500 capitalize">{row.original?.type}</p>,
      },
      {
        id: "beneficiaryName",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Beneficial Owner" />,
        accessorKey: "beneficiary.name",
        size: 140,
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <span className="text-neutral-700 text-sm">{row.original?.beneficiary?.name}</span>
            <span className="text-neutral-400 text-xs">{row.original?.beneficiary?.account}</span>
          </div>
        ),
      },
      {
        id: "amount",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title="Amount"
            onSort={(dir) => handleSort("amount", dir)}
            sortDirection={sort.field === "amount" ? sort.order : null}
          />
        ),
        accessorKey: "amount",
        size: 110,
        cell: ({ row }) => (
          <p className="text-neutral-500 text-end font-medium">
            {formatAUD(row.original?.amount, row.original?.currency)}
          </p>
        ),
      },
      {
        id: "channel",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Method" />,
        accessorKey: "channel",
        size: 90,
        cell: ({ row }) => (
          <p className="text-center text-muted-foreground capitalize">
            {row.original?.channel || "N/A"}
          </p>
        ),
      },
      {
        id: "reference",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Ref" />,
        accessorKey: "reference",
        cell: ({ row }) => (
          <p className="text-muted-foreground text-xs font-mono">
            {row.original?.reference || "—"}
          </p>
        ),
      },
      {
        id: "status",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title="Status"
            onSort={(dir) => handleSort("status", dir)}
            sortDirection={sort.field === "status" ? sort.order : null}
          />
        ),
        accessorKey: "status",
        cell: ({ row }) => (
          <StatusPill
            icon={<IconPennant />}
            variant={statusVariants[row.original.status] ?? "default"}
          >
            {row.original.status}
          </StatusPill>
        ),
      },
      {
        id: "date",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title="Date & Time"
            onSort={(dir) => handleSort("timestamp", dir)}
            sortDirection={sort.field === "timestamp" ? sort.order : null}
          />
        ),
        accessorKey: "timestamp",
        size: 110,
        cell: ({ row }) => {
          const dt = formatDateTime(row.original?.timestamp);
          return (
            <div>
              <p className="text-muted-foreground font-semibold text-xs">{dt?.date}</p>
              <p className="text-secondary-heading text-xs">{dt?.time}</p>
            </div>
          );
        },
      },
    ],
    [sort, handleSort, handleViewClick, handleEditClick, handleRowDownloadPdf],
  );

  // ── Toolbar actions (Export / Import / Add) ───────────────────────────────
  const Actions = () => (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" disabled={exporting} onClick={handleExportCsv}>
        {exporting ? (
          <span className="size-3.5 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
        ) : (
          <IconDownload />
        )}
        {exporting ? "Exporting…" : "Export CSV"}
      </Button>
      <Button variant="outline" size="sm" onClick={() => setOpenImport(true)}>
        <IconUpload />
        Import CSV
      </Button>
      <Button size="sm" onClick={() => router.push("/dashboard/client/transactions/new")}>
        <Plus />
        Add New
      </Button>
    </div>
  );

  // ── Empty / error states ──────────────────────────────────────────────────
  const isEmpty = !loading && !error && data.length === 0;

  return (
    <div className="space-y-3">
      <TransactionDashboard />

      {/* Filter toolbar */}
      <FilterToolbar />

      {/* View toggle (grid / list — wired up when needed) */}
      <div className="flex justify-end">
        <ButtonGroup>
          <Button variant="outline" size="sm">
            <IconGridDots />
          </Button>
          <Button variant="outline" size="sm">
            <IconList />
          </Button>
        </ButtonGroup>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Actions bar — always visible */}
      <div className="flex justify-end">
        <Actions />
      </div>

      {/* Empty state */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <p className="text-sm font-medium">No transactions match the current filters.</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => useTransactionStore.getState().resetFilters()}
          >
            Clear filters
          </Button>
        </div>
      )}

      {/* Data table */}
      {!isEmpty && (
        <CustomResizableTable
          columns={columns}
          data={data}
          onDoubleClick={handleViewReportClick}
          loading={loading}
          mainClass="transactions-table"
        />
      )}

      {/* Pagination */}
      <CustomPagination
        currentPage={page}
        onPageChange={handlePageChange}
        totalItems={totalRecords}
        limit={limit}
        onChangeLimit={handleLimitChange}
      />

      {/* Modals */}
      <TransactionDetailView
        open={openDetailView}
        setOpen={setOpenDetailView}
        currentItem={currentItem}
        setCurrentItem={setCurrentItem}
      />
      <TransactionReportingModal
        open={viewReport}
        setOpen={setViewReport}
        currentItem={currentItemReport}
        setCurrentItem={setCurrentItemReport}
      />
      <ImportModal open={openImport} setOpen={setOpenImport} onSuccess={() => fetch()} />
    </div>
  );
};

export default TransactionListView;
