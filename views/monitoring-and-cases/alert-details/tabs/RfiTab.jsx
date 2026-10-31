"use client";

// RFI: requests raised from this alert (GET /rfi?alert=<id>), with a real
// status filter, real pagination from advancedResults, view / send actions,
// and the existing create form.

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { IconEye, IconPlus, IconSend } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/StatusPill";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getRFIList, sendRFI } from "@/app/dashboard/client/monitoring-and-cases/case-list/actions";
import { CaseRequestForm } from "@/views/monitoring-and-cases/case-details/ecdd/RFIForm";
import RFIDetails from "@/views/monitoring-and-cases/case-details/ecdd/RFIDetails";
import { Mono, SimpleTable, fmtDate } from "../components";

const STATUS_VARIANT = { Draft: "muted", Sent: "info", Responded: "success", Overdue: "danger", Closed: "outline" };
const STATUSES = ["All", "Draft", "Sent", "Responded", "Overdue", "Closed"];
const LIMIT = 10;

const daysUntil = (d) => (d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86400e3) : null);

export default function RfiTab({ alert }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("All");
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);
  const [caseNumber, setCaseNumber] = useState(null);
  const [viewId, setViewId] = useState(null);
  const [sending, setSending] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { alert: alert.id, page, limit: LIMIT, sort: "createdAt", orderBy: "desc" };
      if (status !== "All") params.status = status;
      const res = await getRFIList(params);
      if (res?.success) {
        setRows(res.data || []);
        setTotal(res.totalRecords ?? res.count ?? 0);
      }
    } catch (e) {
      console.error("RFI list", e);
    } finally {
      setLoading(false);
    }
  }, [alert.id, page, status]);

  useEffect(() => { load(); }, [load]);

  const handleSend = async (rfi) => {
    const type = rfi.status === "Sent" ? "followup" : "initial";
    setSending(rfi._id);
    try {
      const res = await sendRFI(rfi._id, type);
      if (res?.succeed || res?.success) {
        toast.success(type === "followup" ? "Follow-up sent" : "RFI sent");
        load();
      } else {
        toast.error(res?.error || res?.message || "Failed to send RFI");
      }
    } catch (e) {
      toast.error("Failed to send RFI");
    } finally {
      setSending(null);
    }
  };

  const pages = Math.max(1, Math.ceil(total / LIMIT));
  const from = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const to = Math.min(total, page * LIMIT);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="h-8 w-44 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s === "All" ? "Status: All" : s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={() => { setCaseNumber(alert.uid); setOpenCreate(true); }}>
          <IconPlus className="size-4" /> New RFI
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2"><Skeleton className="h-9 w-full" /><Skeleton className="h-9 w-full" /></div>
      ) : (
        <SimpleTable
          emptyText={status === "All" ? "No RFIs have been raised from this alert." : `No ${status.toLowerCase()} RFIs for this alert.`}
          columns={[
            { key: "uid", header: "RFI", width: "1.2fr", render: (r) => <Mono>{r.uid}</Mono> },
            { key: "status", header: "Status", width: "110px", render: (r) => <StatusPill variant={STATUS_VARIANT[r.status] || "outline"}>{r.status || "—"}</StatusPill> },
            {
              key: "items", header: "Requested items", width: "2fr",
              render: (r) => {
                const items = Array.isArray(r.requestedItems) ? r.requestedItems : [];
                return items.length ? `${items.length} item${items.length > 1 ? "s" : ""} · ${items.map((i) => i.text).join("; ")}` : "—";
              },
            },
            { key: "sentAt", header: "Sent", width: "1fr", render: (r) => fmtDate(r.sentAt) },
            {
              key: "responseDeadline", header: "Response due", width: "1.1fr",
              render: (r) => {
                const d = daysUntil(r.responseDeadline);
                return r.responseDeadline ? <>{fmtDate(r.responseDeadline)} {d !== null && <span className={d < 0 ? "text-danger" : "text-muted-foreground"}>({d < 0 ? `${-d}d overdue` : `${d}d`})</span>}</> : "—";
              },
            },
            {
              key: "actions", header: "", width: "170px",
              render: (r) => (
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => setViewId(r._id)}><IconEye className="size-4" /> View</Button>
                  {(r.status === "Draft" || r.status === "Sent") && (
                    <Button size="sm" variant={r.status === "Draft" ? "default" : "outline"} disabled={sending === r._id} onClick={() => handleSend(r)}>
                      <IconSend className="size-4" /> {r.status === "Draft" ? "Send" : "Follow up"}
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
          rows={rows}
          rowKey={(r) => r._id}
        />
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Showing {from}–{to} of {total} request{total === 1 ? "" : "s"} for this alert</span>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="px-2">{page} / {pages}</span>
          <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>

      {openCreate && (
        <CaseRequestForm open={openCreate} setOpen={setOpenCreate} getRFI={load} caseNumber={caseNumber} setCaseNumber={setCaseNumber} />
      )}
      {viewId && <RFIDetails open={!!viewId} onOpenChange={(o) => !o && setViewId(null)} id={viewId} setId={setViewId} />}
    </div>
  );
}
