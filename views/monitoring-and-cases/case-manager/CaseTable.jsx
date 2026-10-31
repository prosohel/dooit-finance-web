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
import { dateShowFormat } from "@/lib/utils";

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

export default function CaseTable({ cases, loading, currentPage, totalItems, limit, onPageChange }) {
  const router = useRouter();

  const totalPages = Math.ceil((totalItems || 0) / (limit || 10));
  const start = ((currentPage || 1) - 1) * (limit || 10) + 1;
  const end = Math.min((currentPage || 1) * (limit || 10), totalItems || 0);

  const handleRowClick = useCallback(
    (caseItem) => {
      router.push(`/dashboard/client/monitoring-and-cases/case-manager/${caseItem._id}`);
    },
    [router]
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
            onClick={(e) => { e.stopPropagation(); handleRowClick(row.original); }}
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
                `/dashboard/client/monitoring-and-cases/case-manager/${row.original._id}/edit`
              );
            }}
          >
            <IconEdit className="size-4" />
          </Button>
        </div>
      ),
    },
    {
      // The case's own reference, first after the row actions — it is what an
      // analyst quotes in a filing, an email or a ticket, and it was not on
      // this table at all.
      id: "uid",
      header: "Case ID",
      accessorKey: "uid",
      size: 170,
      cell: ({ row }) => (
        <button
          type="button"
          className="text-left font-mono text-xs font-semibold text-heading hover:underline"
          onClick={() => handleRowClick(row.original)}
          title={row.original.uid || undefined}
        >
          {/* A case saved before uids were minted reliably has none; show a
              short form of its id rather than an empty cell, marked so nobody
              mistakes it for a real case reference (docs/74 C17). */}
          {row.original.uid || `#${String(row.original._id || "").slice(-8)}`}
        </button>
      ),
    },
    {
      id: "title",
      header: "Case Title",
      accessorKey: "title",
      size: 240,
      cell: ({ row }) => (
        <button
          type="button"
          className="text-left hover:underline"
          onClick={() => handleRowClick(row.original)}
        >
          <p className="font-semibold text-heading text-sm line-clamp-1">{row.original.title}</p>
          <p className="text-xs text-muted-foreground font-mono">
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
          <div className="flex items-center gap-1 text-sm">
            <IconBell className="size-3.5 text-muted-foreground" />
            <span className={n > 0 ? "font-semibold text-heading" : "text-muted-foreground"}>
              {n}
            </span>
          </div>
        );
      },
    },
    {
      id: "netActivity",
      header: "Net Activity",
      size: 130,
      cell: ({ row }) => (
        <span className="text-sm font-medium text-heading">
          {fmtAUD(row.original.netActivity)}
        </span>
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
        <span className="text-sm">{row.original.createdBy?.name || "—"}</span>
      ),
    },
    {
      id: "updatedAt",
      header: "Last Updated",
      accessorKey: "updatedAt",
      size: 140,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {dateShowFormat(row.original.updatedAt)}
        </span>
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
