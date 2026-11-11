"use client";

import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusPill } from "@/components/ui/StatusPill";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  IconArrowRight,
  IconDotsVertical,
  IconEye,
  IconFilePlus,
  IconFolder,
  IconGridDots,
  IconList,
  IconLoader2,
  IconPennant,
  IconSearch,
  IconSettingsCode,
  IconUserPlus,
  IconX,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import { getCaseList } from "@/app/dashboard/client/monitoring-and-cases/case-list/actions";
import { escalateAlertToCase } from "@/app/dashboard/client/monitoring-and-cases/case-manager/actions";
import { getEcddByCaseNumber } from "@/app/dashboard/client/report-compliance/ecdd/actions";
import EscalateDialog from "@/views/monitoring-and-cases/alert-details/EscalateDialog";
import { ArrowRight, Sparkle, Wand } from "lucide-react";
const CustomResizableTable = dynamic(() => import("@/components/ui/CustomResizable"), {
  ssr: false,
});
import { formatAUD, formatDateTime } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import CustomPagination from "@/components/CustomPagination";
import { useAlertStore } from "@/app/store/useAlertStore";

import { CaseRequestForm } from "@/views/monitoring-and-cases/case-details/ecdd/RFIForm";
import dynamic from "next/dynamic";
import AssignAnalystForm from "@/views/monitoring-and-cases/case-details/AssignAnalystForm";

import { DataTableColumnHeader } from "@/components/DatatableColumnHeader";
import { getDailyAIsummary } from "@/app/dashboard/client/monitoring-and-cases/alerts/ai-actions";
import AiSummaryGraph from "./ai-alerts/AiSummaryGraph";
import { ALERT_STATUS, RISK_LABEL } from "@/views/monitoring-and-cases/alert-details/alertAdapter";

const ListView = ({}) => {
  const { alerts, fetching, totalItems, currentPage, limit, setCurrentPage, setLimit } =
    useAlertStore();
  const [caseNumber, setCaseNumber] = useState(null);
  // Which row is mid-escalation, so only that button shows a spinner.
  const [escalatingId, setEscalatingId] = useState(null);
  const [openRfi, setOpenRfi] = useState(false);
  const [openAssignToAnalyst, setOpenAssignToAnalyst] = useState(false);
  // Alert whose ECDD lookup is in flight — guards against double-clicks while
  // we decide between the review tab and the create form.
  const [ecddCheckingId, setEcddCheckingId] = useState(null);
  const router = useRouter();
  const riskVariants = {
    Low: "info",
    Medium: "warning",
    High: "danger",
  };
  // ECDD action is view-or-create: open the existing report's review tab when
  // this alert already has one, otherwise start a new form pre-filled with it.
  const handleGenerateEcdd = async (alert) => {
    const uid = alert?.uid;
    if (!uid) return;

    setEcddCheckingId(alert?._id || uid);
    try {
      const res = await getEcddByCaseNumber(uid);
      // The endpoint 404s when no report exists, so a populated `data` is the
      // existence check. Note this route returns `success`, not `succeed`.
      if (res?.success && res?.data?._id && alert?._id) {
        router.push(`/dashboard/client/monitoring-and-cases/alerts/${alert._id}?tab=ecdd-review`);
        return;
      }
    } catch (error) {
      // Fall through to the create form — a lookup failure shouldn't block it.
      console.error("ECDD lookup failed", error);
    } finally {
      setEcddCheckingId(null);
    }

    router.push(`/dashboard/client/report-compliance/ecdd/form?caseNumber=${uid}`);
  };

  const handleAssignToAnalyst = (data) => {
    setOpenAssignToAnalyst(true);
    setCaseNumber(data?._id);
  };
  // `linkedCase` is a raw ObjectId on the list endpoint (only the single-alert
  // route populates it), hence the object/string handling.
  const linkedCaseIdOf = (data) => data?.linkedCase?._id || data?.linkedCase || null;

  const openCase = (id) => router.push(`/dashboard/client/monitoring-and-cases/case-manager/${id}`);

  /**
   * Escalate straight from the queue.
   *
   * This row action used to be labelled "Triage" and only navigated — to the
   * case if there was one, otherwise to the alert's own page. Triage is a
   * decision, so the button now takes it: the same escalate-or-attach dialog
   * the alert detail page uses, which puts a second hit on the same customer
   * onto their open case instead of minting another single-alert case
   * (docs/74 §6.1).
   */
  const handleEscalate = async (data, payload) => {
    setEscalatingId(data?._id);
    try {
      const res = await escalateAlertToCase(data._id, payload);
      if (!res?.succeed) {
        toast.error(res?.message || "Could not escalate this alert");
        return;
      }
      toast.success(res.attached ? "Attached to the existing case" : "Escalated — case created");
      const caseId = res.data?._id;
      if (caseId) openCase(caseId);
    } catch (e) {
      console.error("Failed to escalate", e);
      toast.error("Could not escalate this alert");
    } finally {
      setEscalatingId(null);
    }
  };
  const columns = [
    {
      id: "actions",
      header: "Actions",
      size: 40,
      cell: ({ row }) => (
        <>
          <div className="flex justify-center gap-2">
            {(() => {
              const alert = row?.original;
              const linkedCaseId = linkedCaseIdOf(alert);

              if (linkedCaseId) {
                return (
                  <Button size="sm" variant="outline" onClick={() => openCase(linkedCaseId)}>
                    <IconFolder /> Open case
                  </Button>
                );
              }

              if (["dismissed", "false_positive"].includes(alert?.status)) {
                return (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      router.push(`/dashboard/client/monitoring-and-cases/alerts/${alert._id}`)
                    }
                  >
                    <IconEye /> View
                  </Button>
                );
              }

              return (
                <EscalateDialog
                  alert={{ id: alert?._id }}
                  busy={escalatingId === alert?._id}
                  onEscalate={(payload) => handleEscalate(alert, payload)}
                  trigger={
                    <Button size="sm" variant="outline" disabled={escalatingId === alert?._id}>
                      {escalatingId === alert?._id ? (
                        <IconLoader2 className="animate-spin" />
                      ) : (
                        <IconArrowRight />
                      )}
                      {/* Escalate */}
                      Triage
                    </Button>
                  }
                />
              );
            })()}
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                router.push(`/dashboard/client/monitoring-and-cases/alerts/${row?.original?._id}`)
              }
            >
              <IconEye size={16} />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  // size="sm"
                  className="!py-2 h-auto "
                >
                  <IconDotsVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  onClick={() =>
                    router.push(
                      `/dashboard/client/monitoring-and-cases/alerts/${row?.original?._id}`,
                    )
                  }
                >
                  <IconEye className="mr-2 size-4 " />
                  View
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleGenerateEcdd(row?.original)}>
                  <IconFilePlus className="mr-2 size-4 " />
                  ECDD
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAssignToAnalyst(row?.original)}>
                  <IconUserPlus className="mr-2 size-4 " />
                  Assign to Analyst
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </>
      ),
    },
    // {
    //   id: "uid",
    //   header: "Case ID",
    //   accessorKey: "uid",
    //   cell: ({ row }) => (
    //     <div>
    //       <p className="font-mono text-neutral-500 text-xs">{row?.original?.uid}</p>
    //     </div>
    //   ),
    // },
    {
      id: "id",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="ID"
          // onSort={(dir) => handleSort("uid", dir)}
          // sortDirection={sort.field === "uid" ? sort.order : null}
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
      id: "transaction",
      header: "Transaction",
      cell: ({ row }) => (
        <div className="flex justify-between items-center gap-2 py-2 px-2">
          <div>
            <p className="capitalize text-neutral-900 text-xs">
              {row?.original?.transaction?.sender?.name}
            </p>
            <p className="text-neutral-400 text-xs">
              {row?.original?.transaction?.sender?.account}
            </p>
          </div>
          <span>
            <ArrowRight className="size-4 text-green-500" />
          </span>
          <div>
            <p className="text-neutral-900 text-sm">{row?.original?.transaction?.receiver?.name}</p>
            <p className="text-neutral-400 text-xs">
              {row?.original?.transaction?.receiver?.account}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "transactionAmount",
      header: " Amount",
      accessorKey: "transaction.amount",
      width: 100,
      cell: ({ row }) => (
        <div className="text-end">
          <span className="text-xs text-neutral-600 font-mono">
            {formatAUD(row?.original?.transaction?.amount)}
          </span>
        </div>
      ),
    },
    // {
    //   id: "transactionDate",
    //   header: "Transaction Date",
    //   accessorKey: "transaction.timestamp",
    //   cell: ({ row }) => (
    //     <div>
    //       <p className="text-end text-neutral-600">
    //         {formatDateTime(row?.original?.transaction?.timestamp)?.date}
    //       </p>
    //       <p className="text-neutral-300 text-xs text-end">
    //         {formatDateTime(row?.original?.transaction?.timestamp)?.time}
    //       </p>
    //     </div>
    //   ),
    // },
    {
      id: "analyst",
      header: "Analyst",
      accessorKey: "analyst.name",
    },
    {
      id: "risk",
      header: "Risk",
      accessorKey: "risk",
      cell: ({ row }) => (
        <StatusPill icon={<IconPennant />} variant={RISK_LABEL[row?.original?.riskLabel]}>
          {row?.original?.riskLabel}
        </StatusPill>
      ),
    },
    {
      id: "origin",
      header: "Origin",
      accessorKey: "alertOrigin",
      cell: ({ row }) => (
        <StatusPill icon={<IconPennant />} variant={riskVariants[row?.original?.alertOrigin]}>
          {row?.original?.alertOrigin}
        </StatusPill>
      ),
    },

    {
      id: "alertType",
      header: "Alert Type",
      accessorKey: "caseType",
      cell: ({ row }) => (
        <div>
          <p className=" text-neutral-500 text-xs">{row?.original?.caseType}</p>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      accessorKey: "status",
      cell: ({ row }) => (
        <StatusPill variant={ALERT_STATUS[row.original.status]?.variant || "outline"}>
          {ALERT_STATUS[row.original.status]?.label || row.original.status}
        </StatusPill>
      ),
    },
  ];
  const handlePageChange = (page) => {
    setCurrentPage(page.selected + 1);
  };
  const handleLimitChange = (limit) => {
    setLimit(limit);
    setCurrentPage(1);
  };
  return (
    <div className="mt-4">
      <CustomResizableTable
        data={alerts}
        columns={columns}
        loading={fetching}
        tableId="case-list-table"
        mainClass="case-list-table"
      />
      <CustomPagination
        currentPage={currentPage}
        onPageChange={handlePageChange}
        totalItems={totalItems}
        limit={limit}
        onChangeLimit={handleLimitChange}
        mainClass="custom-alert-resizable-table"
      />
      {openRfi && (
        <CaseRequestForm
          open={openRfi}
          setOpen={setOpenRfi}
          caseNumber={caseNumber}
          setCaseNumber={setCaseNumber}
        />
      )}
      {openAssignToAnalyst && (
        <AssignAnalystForm
          open={openAssignToAnalyst}
          setOpen={setOpenAssignToAnalyst}
          id={caseNumber}
          setId={setCaseNumber}
        />
      )}
    </div>
  );
};
// Radix Select can't hold an empty value, so "all" stands for "no filter".
const ALL = "all";
const ALERT_TYPES = ["Fraud", "AML", "Compliance", "TF"];
const RISK_LEVELS = ["Critical", "High", "Medium", "Low"];
const defaultFilters = {
  status: ALL,
  riskLabel: ALL,
  caseType: ALL,
  dateFrom: "",
  dateTo: "",
};

// The search box feeds a Mongo $regex, so user input must be literal.
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// `uid` is the human-readable alert code (partial match); `_id` is the Mongo
// ObjectId, which can only be matched exactly and must be 24 hex chars or the
// API throws a CastError.
const SEARCH_FIELDS = [
  { value: "uid", label: "UID", placeholder: "Search by UID..." },
  { value: "_id", label: "ID", placeholder: "Paste full alert ID..." },
];
const isObjectId = (s) => /^[a-f\d]{24}$/i.test(s);

/**
 * The alert list endpoint (advancedResults) hands query params straight to
 * Mongo `find`, with `field[gte]` / `field[regex]` style keys becoming
 * operators — so each filter maps onto a real alert field here.
 */
const buildFilterParams = (filters, search, searchField) => {
  const params = {};
  if (filters.status !== ALL) params.status = filters.status;
  if (filters.riskLabel !== ALL) params.riskLabel = filters.riskLabel;
  if (filters.caseType !== ALL) params.caseType = filters.caseType;
  if (filters.dateFrom)
    params["createdAt[gte]"] = new Date(`${filters.dateFrom}T00:00:00`).toISOString();
  if (filters.dateTo)
    params["createdAt[lte]"] = new Date(`${filters.dateTo}T23:59:59.999`).toISOString();
  const q = search.trim();
  if (q && searchField === "_id") {
    params._id = q;
  } else if (q) {
    params["uid[regex]"] = escapeRegex(q);
    params["uid[options]"] = "i";
  }
  return params;
};

const AlertsTab = () => {
  const { currentPage, limit, setAlerts, setFetching, setTotalItems, setCurrentPage } =
    useAlertStore();
  // false = every alert, true = only alerts raised by the AI risk service.
  const [aiOnly, setAiOnly] = useState(false);
  const [filters, setFilters] = useState(defaultFilters);
  const [rawSearch, setRawSearch] = useState("");
  const [search, setSearch] = useState("");
  const [searchField, setSearchField] = useState("uid");
  const searchFieldMeta = SEARCH_FIELDS.find((f) => f.value === searchField);
  // A partial ObjectId can't be queried — flag it instead of hitting the API.
  const invalidIdSearch = searchField === "_id" && !!search.trim() && !isObjectId(search.trim());

  const handleSearchFieldChange = (value) => {
    setSearchField(value);
    if (search.trim()) setCurrentPage(1);
  };

  const hasActiveFilters =
    !!search.trim() || Object.keys(defaultFilters).some((k) => filters[k] !== defaultFilters[k]);

  const handleAiToggle = (value) => {
    if (value === aiOnly) return;
    setAiOnly(value);
    setCurrentPage(1);
  };

  const setFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters(defaultFilters);
    setRawSearch("");
    setSearch("");
    setSearchField("uid");
    setCurrentPage(1);
  };

  // Debounce typing so each keystroke doesn't hit the API.
  useEffect(() => {
    const t = setTimeout(() => {
      if (rawSearch === search) return;
      setSearch(rawSearch);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [rawSearch]);

  useEffect(() => {
    // Drop responses from superseded requests so fast filter changes can't
    // leave stale rows on screen.
    let cancelled = false;
    const fetchData = async () => {
      if (invalidIdSearch) {
        setAlerts([]);
        setTotalItems(0);
        return;
      }
      setFetching(true);
      try {
        const queryParams = {
          page: currentPage,
          limit: limit,
          alertOrigin: aiOnly ? "AI Based" : "Rule Based",
          ...buildFilterParams(filters, search, searchField),
        };
        const response = await getCaseList(queryParams);
        if (cancelled) return;

        setAlerts(response?.data || []);
        setTotalItems(response?.totalRecords || 0);
      } catch (error) {
        if (!cancelled) console.error("Failed to get data", error);
      } finally {
        if (!cancelled) setFetching(false);
      }
    };
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [currentPage, limit, aiOnly, filters, search, searchField]);

  // useEffect(() => {
  //   const fetchAiSummary = async () => {
  //     try {
  //       const response = await getDailyAIsummary();
  //       console.log("AI summary response", response);
  //       if (response?.ok) {
  //         setAiAnalyticsSummary(response?.data);
  //       } else {
  //         console.error("Failed to get AI summary", response?.detail);
  //       }
  //     } catch (error) {
  //       console.error("Failed to get AI summary", error);
  //     }
  //   };
  //   fetchAiSummary();
  // }, []);

  return (
    <div>
      <div className="flex items-center justify-between bg-white  rounded-md ">
        <div className="flex items-center gap-2  ">
          <ButtonGroup>
            <Button
              variant={aiOnly ? "outline" : "default"}
              aria-pressed={!aiOnly}
              onClick={() => handleAiToggle(false)}
            >
              <IconSettingsCode />
              Rule Based
            </Button>
            <Button
              variant={aiOnly ? "default" : "outline"}
              aria-pressed={aiOnly}
              onClick={() => handleAiToggle(true)}
            >
              <Wand className=" size-4" />
              AI Based
            </Button>
          </ButtonGroup>
          {/* <Select value={searchField} onValueChange={handleSearchFieldChange}>
            <SelectTrigger aria-label="Search by" className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEARCH_FIELDS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select> */}
          <InputGroup
            className={"max-w-64"}
            // title={invalidIdSearch ? "Enter the full 24-character alert ID" : undefined}
          >
            <InputGroupInput
              placeholder={searchFieldMeta?.placeholder}
              value={rawSearch}
              // aria-invalid={invalidIdSearch || undefined}
              onChange={(e) => setRawSearch(e.target.value)}
            />
            <InputGroupAddon>
              <IconSearch />
            </InputGroupAddon>
          </InputGroup>
          {invalidIdSearch && (
            <span className="text-xs text-destructive whitespace-nowrap">
              ID must be 24 characters
            </span>
          )}

          <Select value={filters.status} onValueChange={(v) => setFilter("status", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {Object.entries(ALERT_STATUS).map(([value, { label }]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.riskLabel} onValueChange={(v) => setFilter("riskLabel", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Risk Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All risk levels</SelectItem>
              {RISK_LEVELS.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.caseType} onValueChange={(v) => setFilter("caseType", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Alert Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All alert types</SelectItem>
              {ALERT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            aria-label="From date"
            className="w-auto"
            value={filters.dateFrom}
            max={filters.dateTo || undefined}
            onChange={(e) => setFilter("dateFrom", e.target.value)}
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            aria-label="To date"
            className="w-auto"
            value={filters.dateTo}
            min={filters.dateFrom || undefined}
            onChange={(e) => setFilter("dateTo", e.target.value)}
          />
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <IconX /> Clear
            </Button>
          )}
        </div>
        <div>
          <ButtonGroup>
            <Button
              variant="outline"
              // onClick={() => setView("grid")}
              // variant={view === "grid" ? "default" : "outline"}
            >
              <IconGridDots />
            </Button>
            <Button
              variant="outline"
              // variant={view === "list" ? "default" : "outline"}
              // onClick={() => setView("list")}
            >
              <IconList />
            </Button>
          </ButtonGroup>
        </div>
      </div>
      {aiOnly && (
        <div className="mt-2">
          <AiSummaryGraph />
        </div>
      )}
      <ListView />
    </div>
  );
};

export default function AlertListView() {
  return <AlertsTab />;
}
