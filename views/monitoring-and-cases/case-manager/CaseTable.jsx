"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/ui/StatusPill";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import {
  IconEye,
  IconEdit,
  IconPennant,
  IconChevronLeft,
  IconChevronRight,
  IconFileReport,
  IconBell,
  IconArrowRight,
} from "@tabler/icons-react";
import { dateShowFormat, formatDateTime } from "@/lib/utils";
import { DataTableColumnHeader } from "@/components/DatatableColumnHeader";

const fmtAUD = (v) =>
  v == null
    ? "—"
    : new Intl.NumberFormat("en-AU", {
        style: "currency",
        currency: "AUD",
        maximumFractionDigits: 0,
      }).format(v);

const CustomResizableTable = dynamic(() => import("@/components/ui/CustomResizable"), {
  ssr: false,
});

const priorityVariants = {
  low: "info",
  medium: "warning",
  high: "danger",
  critical: "dark",
};

const statusVariants = {
  open: "info",
  under_investigation: "warning",
  pending_review: "outline",
  closed: "success",
  escalated: "danger",
};

const STATUS_LABELS = {
  open: "Open",
  under_investigation: "Under Investigation",
  pending_review: "Pending Review",
  closed: "Closed",
  escalated: "Escalated",
};

export default function CaseTable({
  cases,
  loading,
  currentPage,
  totalItems,
  limit,
  onPageChange,
}) {
  const router = useRouter();

  const totalPages = Math.ceil((totalItems || 0) / (limit || 10));
  const start = ((currentPage || 1) - 1) * (limit || 10) + 1;
  const end = Math.min((currentPage || 1) * (limit || 10), totalItems || 0);

  const handleRowClick = useCallback(
    (caseItem) => {
      router.push(`/dashboard/client/monitoring-and-cases/case-manager/${caseItem._id}`);
    },
    [router],
  );

  const columns = [
    {
      id: "actions",
      header: "Actions",
      size: 90,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={(e) => {
              e.stopPropagation();
              handleRowClick(row.original);
            }}
          >
            <IconEye className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={(e) => {
              e.stopPropagation();
              router.push(
                `/dashboard/client/monitoring-and-cases/case-manager/${row.original._id}/edit`,
              );
            }}
          >
            <IconEdit className="size-4" />
          </Button>
        </div>
      ),
    },

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
        const { date, time } = formatDateTime(row.original.updatedAt);
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
      id: "title",
      header: "Case Title",
      accessorKey: "title",
      size: 240,
      cell: ({ row }) => (
        <button
          type="button"
          className="text-left hover:underline py-3"
          onClick={() => handleRowClick(row.original)}
        >
          <p className=" text-neutral-900 text-xs line-clamp-1">{row.original.title}</p>
          <p className="text-xs text-neutral-400 font-mono">
            {row.original.type?.replace("_", " ")}
          </p>
        </button>
      ),
    },
    {
      id: "priority",
      header: "Priority",
      accessorKey: "priority",
      size: 110,
      cell: ({ row }) => (
        <StatusPill icon={<IconPennant />} variant={priorityVariants[row.original.priority]}>
          <span className="capitalize">{row.original.priority}</span>
        </StatusPill>
      ),
    },
    {
      id: "status",
      header: "Status",
      accessorKey: "status",
      size: 160,
      cell: ({ row }) => (
        <StatusPill variant={statusVariants[row.original.status]}>
          {STATUS_LABELS[row.original.status] || row.original.status}
        </StatusPill>
      ),
    },
    {
      id: "filing",
      header: "Filing",
      size: 110,
      cell: ({ row }) =>
        row.original.sarFiled ? (
          <StatusPill icon={<IconFileReport />} variant="success">
            SAR Filed
          </StatusPill>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      id: "alerts",
      header: "Alerts",
      size: 80,
      cell: ({ row }) => {
        const n = row.original.alertCount ?? row.original.linkedAlerts?.length ?? 0;
        return (
          <div className="flex items-center gap-1 text-xs">
            <IconBell className="size-3.5 text-muted-foreground" />
            <span className={n > 0 ? " text-heading" : "text-muted-foreground"}>{n}</span>
          </div>
        );
      },
    },
    {
      id: "netActivity",
      header: "Net Activity",
      size: 130,
      cell: ({ row }) => (
        <div className="text-end">
          <span className="text-xs text-neutral-500">{fmtAUD(row.original.netActivity)}</span>
        </div>
      ),
    },
    {
      id: "review",
      header: "Assignee → Reviewer",
      size: 180,
      cell: ({ row }) => {
        const renderAvatar = (u) =>
          u ? (
            <Avatar className="h-6 w-6 border-2 border-white" title={u.name}>
              <AvatarImage src={u.avatar} />
              <AvatarFallback className="text-[8px]">
                {u.name?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ) : (
            <span className="grid h-6 w-6 place-items-center rounded-full border-2 border-dashed border-muted text-[10px] text-muted-foreground">
              —
            </span>
          );
        return (
          <div className="flex items-center gap-1.5">
            {renderAvatar(row.original.assignedTo)}
            <IconArrowRight className="size-3 text-muted-foreground" />
            {renderAvatar(row.original.reviewer)}
          </div>
        );
      },
    },
    {
      id: "createdBy",
      header: "Created By",
      accessorKey: "createdBy.name",
      size: 140,
      cell: ({ row }) => (
        <span className="text-xs text-neutral-500">{row.original.createdBy?.name || "—"}</span>
      ),
    },
  ];

  return (
    <div>
      <CustomResizableTable
        columns={columns}
        data={cases || []}
        loading={loading}
        tableId="case-manager-table"
        mainClass="case-manager-table"
        onDoubleClick={handleRowClick}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
          <span>
            Showing {start}–{end} of {totalItems} cases
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={currentPage === 1}
              onClick={() => onPageChange?.(currentPage - 1)}
            >
              <IconChevronLeft className="size-4" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
              const pg = i + 1;
              return (
                <Button
                  key={pg}
                  variant={currentPage === pg ? "default" : "outline"}
                  size="sm"
                  className="h-7 w-7 p-0 text-xs"
                  onClick={() => onPageChange?.(pg)}
                >
                  {pg}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={currentPage === totalPages}
              onClick={() => onPageChange?.(currentPage + 1)}
            >
              <IconChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
