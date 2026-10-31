"use client";

// Transaction & Parties: the full transaction on the alert, every party with
// its customer link, the transaction's own risk (score, flags, signals),
// crypto / travel-rule data when present, and the customer's other recent
// transactions (GET /alert/:id/related-transactions).

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IconArrowRight, IconCoin, IconFileText, IconLink, IconShieldCheck, IconUsers } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/StatusPill";
import { Skeleton } from "@/components/ui/skeleton";
import CollapsibleSection from "@/views/monitoring-and-cases/case-manager/details/components/CollapsibleSection";
import RiskScoreGauge from "@/views/monitoring-and-cases/case-manager/details/components/RiskScoreGauge";
import { getRelatedTransactions } from "@/app/dashboard/client/monitoring-and-cases/case-list/actions";
import { TXN_STATUS, humanize } from "../alertAdapter";
import { Field, FieldGrid, Mono, IdChip, EmptyState, SimpleTable, fmtDate, fmtMoney } from "../components";

const ROLE_VARIANT = { sender: "info", receiver: "success", beneficiary: "warning", intermediary: "muted" };

export default function TransactionTab({ alert }) {
  const router = useRouter();
  const t = alert.transaction;
  if (!t) return <EmptyState>This alert is not tied to a transaction.</EmptyState>;

  return (
    <div className="flex flex-col gap-4">
      <CollapsibleSection
        id="txn"
        title="Transaction"
        icon={IconFileText}
        actions={
          <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/client/transactions/edit?id=${t.id}`)}>
            Open transaction <IconArrowRight className="size-4" />
          </Button>
        }
      >
        <FieldGrid cols={4}>
          <Field label="Transaction" value={t.uid} mono />
          <Field label="Amount" value={<strong>{fmtMoney(t.amount, t.currency)}</strong>} />
          <Field label="AUD equivalent" value={t.amountAUD !== null && t.currency !== "AUD" ? fmtMoney(t.amountAUD, "AUD") : null} />
          <Field label="Type / subtype" value={[humanize(t.type), t.subtype].filter(Boolean).join(" · ") || null} />
          <Field label="Channel" value={humanize(t.channel)} />
          <Field label="Status" value={t.status ? <StatusPill variant={TXN_STATUS[t.status] || "outline"}>{humanize(t.status)}</StatusPill> : null} />
          <Field label="Timestamp" value={fmtDate(t.timestamp)} />
          <Field label="Reference" value={t.reference} mono />
          <Field label="Purpose" value={t.purpose} />
          <Field label="Remittance code" value={t.remittanceCode} mono />
          <Field label="Narrative" value={t.narrative} className="col-span-2" />
          <Field label="Related party" value={t.relatedPartyFlag ? `Yes${t.relatedPartyTxnId ? ` · ${t.relatedPartyTxnId}` : ""}` : "No"} />
          <Field label="Investigation" value={t.investigation?.caseUid || t.investigation?.caseId ? <span className="inline-flex items-center gap-1"><IconLink className="size-3.5" />{t.investigation.caseUid || "Linked to a case"}</span> : t.investigation?.flagged ? "Flagged" : null} />
        </FieldGrid>
      </CollapsibleSection>

      <CollapsibleSection id="parties" title="Parties" icon={IconUsers} badge={t.parties.length}>
        <SimpleTable
          emptyText="No party details on this transaction."
          columns={[
            { key: "role", header: "Role", width: "120px", render: (p) => <StatusPill variant={ROLE_VARIANT[p.role] || "outline"}>{humanize(p.role)}</StatusPill> },
            { key: "name", header: "Name", width: "1.2fr" },
            { key: "account", header: "Account", width: "1fr", render: (p) => p.account ? <Mono>{p.account}</Mono> : "—" },
            { key: "institution", header: "Institution", width: "1.2fr", render: (p) => [p.institution, p.bic].filter(Boolean).join(" · ") || "—" },
            { key: "country", header: "Country", width: "90px" },
            {
              key: "customer", header: "Customer", width: "1fr",
              render: (p) => p.customerId
                ? <button type="button" className="text-primary hover:underline" onClick={() => router.push(`/dashboard/client/onboarding/customer-queue/details?id=${p.customerId}`)}><IdChip>{p.customerUid || "Open"}</IdChip></button>
                : <span className="text-muted-foreground">Not a customer</span>,
            },
          ]}
          rows={t.parties}
          rowKey={(p) => p.role}
        />
      </CollapsibleSection>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <CollapsibleSection id="txn-risk" title="Risk on this transaction" icon={IconShieldCheck}>
          <div className="flex flex-col gap-3.5">
            <div className="flex flex-wrap items-center gap-6">
              <RiskScoreGauge score={t.riskScore ?? 0} label="Transaction risk" />
              <div className="flex flex-wrap gap-1.5">
                {t.riskFlags.length ? t.riskFlags.map((f) => <StatusPill key={f} variant="warning">{f}</StatusPill>) : <span className="text-xs text-muted-foreground">No risk flags</span>}
              </div>
            </div>
            <SimpleTable
              emptyText="No typed risk signals on this transaction."
              columns={[
                { key: "key", header: "Signal", width: "1.4fr", render: (s) => <Mono>{s.key}</Mono> },
                { key: "value", header: "Value", width: "1fr", render: (s) => String(s.value) },
                { key: "source", header: "Source", width: "90px" },
                { key: "observedAt", header: "Observed", width: "1fr", render: (s) => fmtDate(s.observedAt) },
              ]}
              rows={t.signals}
              rowKey={(s, i) => `${s.key}-${i}`}
            />
            {t.evaluation?.lastEvaluatedAt && (
              <p className="text-xs text-muted-foreground">
                Last evaluated {fmtDate(t.evaluation.lastEvaluatedAt)} · {t.evaluation.firedRuleIds?.length || 0} rule{t.evaluation.firedRuleIds?.length === 1 ? "" : "s"} fired
                {t.evaluation.firedRuleIds?.length ? ` (${t.evaluation.firedRuleIds.join(", ")})` : ""}
              </p>
            )}
          </div>
        </CollapsibleSection>

        <CollapsibleSection id="crypto" title="Crypto, travel rule & bullion" icon={IconCoin}>
          {!t.crypto && !t.travelRule && !t.bullion && !t.forensic ? (
            <EmptyState>No crypto, travel-rule or bullion data on this transaction.</EmptyState>
          ) : (
            <div className="flex flex-col gap-4">
              {t.crypto && (
                <FieldGrid cols={2}>
                  <Field label="Wallet" value={t.crypto.walletAddress} mono className="col-span-2" />
                  <Field label="Tx hash" value={t.crypto.txHash} mono className="col-span-2" />
                  <Field label="Network" value={t.crypto.network} />
                  <Field label="Hops" value={t.crypto.hops} />
                  <Field label="Cluster" value={t.crypto.cluster} />
                </FieldGrid>
              )}
              {t.forensic && (
                <FieldGrid cols={2}>
                  <Field label="Wallet cluster" value={t.forensic.walletCluster} />
                  <Field label="Chainalysis score" value={t.forensic.chainalysisScore} />
                  <Field label="Forensic notes" value={t.forensic.notes} className="col-span-2" />
                </FieldGrid>
              )}
              {t.travelRule && (
                <FieldGrid cols={2}>
                  <Field label="Originator VASP" value={[t.travelRule.originatorVaspName, t.travelRule.originatorVaspId].filter(Boolean).join(" · ") || null} />
                  <Field label="Beneficiary VASP" value={[t.travelRule.beneficiaryVaspName, t.travelRule.beneficiaryVaspId].filter(Boolean).join(" · ") || null} />
                  <Field label="Message id" value={t.travelRule.travelMessageId} mono />
                  <Field label="Protocol" value={t.travelRule.protocol} />
                </FieldGrid>
              )}
              {t.bullion && (
                <FieldGrid cols={3}>
                  <Field label="Bullion type" value={t.bullion.type} />
                  <Field label="Purity" value={t.bullion.purity} />
                  <Field label="Weight" value={t.bullion.weight} />
                </FieldGrid>
              )}
            </div>
          )}
        </CollapsibleSection>
      </div>

      <RelatedTransactions alert={alert} />
    </div>
  );
}

function RelatedTransactions({ alert }) {
  const router = useRouter();
  const [state, setState] = useState({ loading: true, rows: [], total: 0, days: 90 });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getRelatedTransactions(alert.id, { days: 90, limit: 20 });
        if (!cancelled) setState({ loading: false, rows: res?.data || [], total: res?.total || 0, days: res?.days || 90 });
      } catch (e) {
        console.error("related transactions", e);
        if (!cancelled) setState({ loading: false, rows: [], total: 0, days: 90 });
      }
    })();
    return () => { cancelled = true; };
  }, [alert.id]);

  const name = alert.customer?.name || "this customer";
  const counterparty = (r) => {
    const other = r.beneficiary?.name || r.receiver?.name || r.sender?.name;
    const country = r.beneficiary?.institutionCountry || r.receiver?.institutionCountry;
    return [other, country].filter(Boolean).join(" · ") || "—";
  };

  return (
    <CollapsibleSection
      id="related-txns"
      title={`Other transactions by ${name} — last ${state.days} days`}
      icon={IconFileText}
      badge={state.loading ? null : `${state.rows.length} of ${state.total}`}
      actions={<Button size="sm" variant="outline" onClick={() => router.push("/dashboard/client/transactions")}>Transaction monitoring <IconArrowRight className="size-4" /></Button>}
    >
      {state.loading ? (
        <div className="flex flex-col gap-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
      ) : (
        <SimpleTable
          emptyText={alert.customer ? `No other transactions for ${name} in the last ${state.days} days.` : "No customer on this alert to look up."}
          columns={[
            { key: "uid", header: "Transaction", width: "1.2fr", render: (r) => <button type="button" className="text-primary hover:underline" onClick={() => router.push(`/dashboard/client/transactions/edit?id=${r._id}`)}><Mono>{r.uid}</Mono></button> },
            { key: "timestamp", header: "Date", width: "1fr", render: (r) => fmtDate(r.timestamp) },
            { key: "type", header: "Type", width: "100px", render: (r) => humanize(r.type) },
            { key: "amount", header: "Amount", width: "1fr", render: (r) => fmtMoney(r.amount, r.currency) },
            { key: "counterparty", header: "Counterparty", width: "1.2fr", render: counterparty },
            { key: "status", header: "Status", width: "110px", render: (r) => <StatusPill variant={TXN_STATUS[r.status] || "outline"}>{humanize(r.status)}</StatusPill> },
            { key: "riskScore", header: "Risk", width: "60px", render: (r) => r.riskScore ?? "—" },
          ]}
          rows={state.rows}
          rowKey={(r) => r._id}
        />
      )}
    </CollapsibleSection>
  );
}
