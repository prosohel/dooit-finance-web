'use client'
import { useSearchParams, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react'
import { getGFSById } from '../../actions';
import { downloadReportPdf } from '@/lib/downloadReportPdf';
import { Button } from '@/components/ui/button';
import {
  AlertCircle,
  ArrowLeft,
  User,
  FileText,
  CreditCard,
  Database,
  Users,
  Download,
  Loader2,
} from "lucide-react"

const LIST_PATH = '/dashboard/client/report-compliance/smr-filing/gfs';

const STATUS_TONE = {
  draft: { label: 'Draft', bg: '#fff6de', fg: '#8a6400', border: '#f6e0a8' },
  review: { label: 'Under Review', bg: '#fff1f6', fg: '#ca2f7f', border: '#fbd3e3' },
  submitted: { label: 'Submitted', bg: '#eef6f7', fg: '#005964', border: '#cfe3e6' },
  closed: { label: 'Closed', bg: '#f0fbf5', fg: '#199335', border: '#cceedd' },
}

const INTENSITY_LEVEL = { low: 1, medium: 2, high: 3, critical: 4 }

function fmtDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toISOString().slice(0, 10)
}

function fmtDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)}`
}

function fmtMoney(value) {
  const n = Number(value) || 0
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function parseDateRange(text) {
  if (!text) return null
  const parts = String(text).split(/\s+to\s+/i)
  if (parts.length !== 2) return null
  const start = new Date(parts[0].trim())
  const end = new Date(parts[1].trim())
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null
  return { start, end }
}

export default function GFSFormDetailPage() {
  const router = useRouter();
  const id = useSearchParams().get('id');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const getData = async () => {
    setLoading(true);
    try {
      const response = await getGFSById(id);
      setData(response?.data ?? null);
    } catch (error) {
      console.error('error', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) getData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[#696969] gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading report...
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-[#696969] gap-3">
        <p>GFS report not found.</p>
        <Button variant="outline" size="sm" onClick={() => router.push(LIST_PATH)}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
      </div>
    )
  }

  const status = STATUS_TONE[data.status] || STATUS_TONE.draft;
  const intensityKey = (data.suspicionIntensity || '').toLowerCase();
  const intensityLevel = INTENSITY_LEVEL[intensityKey] || 0;

  const totalDeposited = Number(data.totalDeposited) || 0;
  const totalWithdrawn = Number(data.totalWithdrawn) || 0;
  const totalSuspicion = Number(data.totalSuspicionAmount) || 0;
  const otherWithdrawals = Math.max(totalWithdrawn - totalSuspicion, 0);
  const retained = Math.max(totalDeposited - totalWithdrawn, 0);
  const percentOfInflow = totalDeposited ? Math.round((totalSuspicion / totalDeposited) * 100) : 0;
  const suspiciousWidth = totalDeposited ? Math.min((totalSuspicion / totalDeposited) * 100, 100) : 0;
  const otherWidth = totalDeposited ? Math.min((otherWithdrawals / totalDeposited) * 100, 100 - suspiciousWidth) : 0;

  const reviewRange = data.reviewStartDate && data.reviewEndDate
    ? { start: new Date(data.reviewStartDate), end: new Date(data.reviewEndDate) }
    : null;
  const suspicionRange = parseDateRange(data.suspicionDates);
  let windowLeft = 0, windowRight = 0;
  if (reviewRange && suspicionRange && reviewRange.end > reviewRange.start) {
    const span = reviewRange.end.getTime() - reviewRange.start.getTime();
    windowLeft = Math.min(Math.max((suspicionRange.start.getTime() - reviewRange.start.getTime()) / span * 100, 0), 100);
    windowRight = Math.min(Math.max((reviewRange.end.getTime() - suspicionRange.end.getTime()) / span * 100, 0), 100 - windowLeft);
  }

  const pepFlag = data?.metadata?.ecddReport?.pep_flag ?? data?.metadata?.gfsReport?.pepFlag;
  const sanctionsFlag = data?.metadata?.ecddReport?.sanction_flag ?? data?.metadata?.gfsReport?.sanctionsFlag;
  const caseUid = data?.metadata?.caseUid;

  const parties = [
    ...(data.ofis || []).map((o) => ({ ...o, kind: 'OFI' })),
    ...(data.pois || []).map((p) => ({ ...p, kind: 'POI' })),
  ];

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadReportPdf({ kind: 'gfs', id: data?._id, label: data?.uid });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fbfcfc] py-6 print:bg-white">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 flex flex-col gap-3.5">

        {/* Back */}
        <Button
          variant="outline"
          size="sm"
          className="w-fit print:hidden"
          onClick={() => router.push(LIST_PATH)}
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-2.5 flex-1 min-w-[280px]">
            <span className="w-6 h-6 rounded-md bg-[#005964] inline-block mt-0.5" />
            <div>
              <h1 className="m-0 text-[21px] font-semibold tracking-tight text-[#313132]">
                Suspicion Investigation Report
              </h1>
              <div className="mt-1 text-[12.5px] text-[#696969]">Detailed review of suspicious activity</div>
              <div className="mt-1 font-mono text-[11.5px] text-[#ababab]">
                {data.uid}{caseUid ? ` · ${caseUid}` : ''}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="font-mono text-[10.5px] uppercase tracking-wide px-2.5 py-1 rounded-full border"
              style={{ background: status.bg, color: status.fg, borderColor: status.border }}
            >
              {status.label}
            </span>
            <button
              onClick={handleExport}
              disabled={exporting || !data?._id}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-[#e0e5e5] bg-white text-[#313132] hover:bg-[#f5f7f7] flex items-center gap-1.5 print:hidden disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              {exporting ? 'Preparing PDF…' : 'Export PDF'}
            </button>
          </div>
        </div>

        {/* Suspicion Overview */}
        <Section icon={<AlertCircle className="h-3 w-3" />} title="Suspicion Overview" trailing={
          intensityKey ? (
            <span className="text-[10.5px] font-semibold uppercase tracking-wide px-2.5 py-0.5 rounded-full bg-[#fff1f6] text-[#ca2f7f] border border-[#fbd3e3]">
              {data.suspicionIntensity} intensity
            </span>
          ) : null
        }>
          <div className="grid gap-5 sm:grid-cols-[250px_1fr] items-start">
            <div className="flex flex-col gap-4">
              <Field label="Suspicion type">
                <div className="text-[20px] font-semibold tracking-tight text-[#313132]">{data.suspicionType || '—'}</div>
              </Field>

              {intensityLevel > 0 && (
                <div>
                  <FieldLabel>Intensity</FieldLabel>
                  <div className="flex gap-1 mb-1.5">
                    {[1, 2, 3, 4].map((seg) => (
                      <span key={seg} className={`flex-1 h-1.5 rounded-full ${seg <= intensityLevel ? 'bg-[#ca2f7f]' : 'bg-[#f0f2f2]'}`} />
                    ))}
                  </div>
                  <div className="text-[11.5px] text-[#696969]">{data.suspicionIntensity} — escalation recommended</div>
                </div>
              )}

              {reviewRange && (
                <div>
                  <FieldLabel>Review period</FieldLabel>
                  <div className="relative h-1.5 rounded-full bg-[#eef1f1] mb-2 mt-2">
                    {suspicionRange && (
                      <span
                        className="absolute top-0 bottom-0 rounded-full bg-[#005964]"
                        style={{ left: `${windowLeft}%`, right: `${windowRight}%` }}
                      />
                    )}
                  </div>
                  <div className="flex justify-between font-mono text-[10.5px] text-[#696969]">
                    <span>{fmtDate(data.reviewStartDate)}</span>
                    <span>{fmtDate(data.reviewEndDate)}</span>
                  </div>
                  {data.suspicionDates && (
                    <div className="text-[11.5px] text-[#313132] mt-1.5">
                      Suspicion window <span className="font-mono text-[11px]">{data.suspicionDates}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <div className="border border-[#eef1f1] rounded-[10px] p-3.5">
                <div className="flex items-baseline justify-between gap-3 mb-3">
                  <div>
                    <FieldLabel>Assessed suspicious</FieldLabel>
                    <div className="text-2xl font-semibold tracking-tight text-[#ca2f7f]">{fmtMoney(totalSuspicion)}</div>
                  </div>
                  <div className="text-right">
                    <FieldLabel>Of inflow</FieldLabel>
                    <div className="text-2xl font-semibold tracking-tight text-[#313132]">{percentOfInflow}%</div>
                  </div>
                </div>
                <div className="flex h-2 rounded-md overflow-hidden bg-[#eef1f1]">
                  <span style={{ width: `${suspiciousWidth}%` }} className="bg-[#ca2f7f]" />
                  <span style={{ width: `${otherWidth}%` }} className="bg-[#005964]" />
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2.5 text-[11.5px] text-[#4a4a4a]">
                  <Legend color="#ca2f7f" label={`Suspicious ${fmtMoney(totalSuspicion)}`} />
                  <Legend color="#005964" label={`Other withdrawals ${fmtMoney(otherWithdrawals)}`} />
                  <Legend color="#eef1f1" label={`Retained ${fmtMoney(retained)}`} />
                </div>
                <div className="flex gap-6 mt-3 pt-3 border-t border-[#f0f2f2]">
                  <div>
                    <FieldLabel>Deposited</FieldLabel>
                    <div className="text-sm font-semibold text-[#313132]">{fmtMoney(totalDeposited)}</div>
                  </div>
                  <div>
                    <FieldLabel>Withdrawn</FieldLabel>
                    <div className="text-sm font-semibold text-[#313132]">{fmtMoney(totalWithdrawn)}</div>
                  </div>
                </div>
              </div>

              {data.suspicionReason && (
                <div className="border-l-[3px] border-[#005964] bg-[#f7fafa] rounded-r-lg p-3">
                  <FieldLabel>Suspicion reason</FieldLabel>
                  <p className="m-0 mt-1.5 text-[12.5px] leading-relaxed text-[#4a4a4a]">{data.suspicionReason}</p>
                </div>
              )}
            </div>
          </div>
        </Section>

        {/* Behavioural Analysis */}
        {data.suspicionBehaviour && (
          <Section icon={<span className="text-[10px] font-semibold">B</span>} title="Behavioural Analysis">
            <p className="m-0 text-[12.5px] leading-relaxed text-[#4a4a4a]">{data.suspicionBehaviour}</p>
          </Section>
        )}

        {/* Customer Information */}
        <Section icon={<User className="h-3 w-3" />} title="Customer Information">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Customer name" strong>{data.customerName || '—'}</Field>
            <Field label="Customer UID"><span className="font-mono text-[#005964]">{data.customerUID || '—'}</span></Field>
            <Field label="Company name">{data.companyName || 'Not stated'}</Field>
            <Field label="Age">{data.customerAge ?? '—'}</Field>
            <Field label="Account opening date"><span className="font-mono">{fmtDateTime(data.accountOpeningDate)}</span></Field>
            <Field label="Source of funds">{data.sourceOfFunds || '—'}</Field>
            <Field label="Account opening purpose">{data.accountOpeningPurpose || '—'}</Field>
            <Field label="Customer country">{data.customerCountry || '—'}</Field>
            {(pepFlag !== undefined || sanctionsFlag !== undefined) && (
              <div>
                <FieldLabel>Screening</FieldLabel>
                <div className="flex gap-1.5 mt-1">
                  {pepFlag !== undefined && <Chip>{`PEP: ${pepFlag ? 'yes' : 'no'}`}</Chip>}
                  {sanctionsFlag !== undefined && <Chip>{`Sanctions: ${sanctionsFlag ? 'yes' : 'no'}`}</Chip>}
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* Institutions and Parties */}
        {parties.length > 0 && (
          <Section icon={<Users className="h-3 w-3" />} title={`Institutions and Parties (${parties.length})`}>
            <div className="flex flex-col divide-y divide-[#f0f2f2]">
              {parties.map((p, i) => (
                <div key={i} className="flex items-start gap-3.5 py-3 first:pt-0 last:pb-0">
                  <span className="font-mono text-[10px] uppercase tracking-wide text-[#ababab] w-10 flex-none pt-0.5">{p.kind}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 text-[13px] font-semibold text-[#313132]">
                      {p.name || '—'}
                      {/* Subject / Linked customer / Counterparty / Director … */}
                      {p.kind === 'POI' && p.relationship && (
                        <span className="rounded-full border border-[#e0e5e5] bg-[#f5f7f7] px-2 py-0.5 text-[10.5px] font-medium text-[#4a4a4a]">
                          {p.relationship}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#696969] mt-0.5">
                      {p.kind === 'OFI'
                        ? (p.scamType || '—')
                        // Drafts write `institution`; hand-entered rows use `bank`.
                        : [p.bank || p.institution, p.account, p.country].filter(Boolean).join(' · ') || '—'}
                    </div>
                  </div>
                  <div className="font-mono text-[11.5px] text-[#4a4a4a] flex-none">
                    {p.kind === 'OFI' ? fmtDate(p.reportDate) : (p.reference || '—')}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Transactions */}
        {(data.transactions || []).length > 0 && (
          <Section icon={<CreditCard className="h-3 w-3" />} title={`Transactions (${data.transactions.length})`}>
            <div className="flex flex-col gap-3">
              {data.transactions.map((t, i) => (
                <div key={t.id || i} className="border border-[#eef1f1] rounded-lg p-3.5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full bg-[#eef6f7] text-[#005964] border border-[#cfe3e6]">
                      {t.type || 'transaction'}
                    </span>
                    <div className="text-[20px] font-semibold text-[#313132] tracking-tight">{fmtMoney(t.amount)}</div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Field label="Date"><span className="font-mono">{fmtDateTime(t.date)}</span></Field>
                    <Field label="From bank">{t.fromBank || '—'}</Field>
                    <Field label="From name">{t.fromName || '—'}</Field>
                    <Field label="Reference"><span className="font-mono break-all">{t.reference || '—'}</span></Field>
                    <Field label="From account"><span className="font-mono break-all">{t.fromAccount || '—'}</span></Field>
                    <Field label="To account"><span className="font-mono break-all">{t.toAccount || '—'}</span></Field>
                    {t.cryptoAddress && (
                      <div className="sm:col-span-2 lg:col-span-2">
                        <Field label="Crypto address"><span className="font-mono break-all">{t.cryptoAddress}</span></Field>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Digital Footprint */}
        {((data.cryptoAddresses || []).length > 0 || (data.ipAddresses || []).length > 0) && (
          <Section icon={<Database className="h-3 w-3" />} title="Digital Footprint">
            <div className="grid gap-5 sm:grid-cols-2">
              {(data.cryptoAddresses || []).length > 0 && (
                <div>
                  <FieldLabel>Crypto addresses</FieldLabel>
                  <div className="flex flex-col gap-1.5 mt-1.5">
                    {data.cryptoAddresses.map((addr, i) => (
                      <div key={i} className="font-mono text-[11.5px] text-[#005964] break-all">{addr}</div>
                    ))}
                  </div>
                </div>
              )}
              {(data.ipAddresses || []).length > 0 && (
                <div>
                  <FieldLabel>IP addresses</FieldLabel>
                  <div className="flex flex-col gap-2.5 mt-1.5">
                    {data.ipAddresses.map((ip, i) => (
                      <div key={ip.id || i}>
                        <div className="font-mono text-[11.5px] text-[#313132]">{ip.address}</div>
                        <div className="text-xs text-[#696969] mt-0.5">{ip.country} · {fmtDateTime(ip.date)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Additional Notes */}
        {(data.additionalNotes || (data.attachments || []).length > 0) && (
          <Section icon={<FileText className="h-3 w-3" />} title="Additional Notes">
            {data.additionalNotes && (
              <p className="m-0 mb-3.5 text-[12.5px] leading-relaxed text-[#4a4a4a]">{data.additionalNotes}</p>
            )}
            {(data.attachments || []).map((name, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 border border-[#eef1f1] rounded-lg bg-[#f8fafa] text-[#313132] text-xs mb-1.5">
                <span className="w-4 h-4 rounded bg-[#005964] flex-none" />
                <span>{name}</span>
              </div>
            ))}
          </Section>
        )}
      </div>
    </div>
  )
}

function Section({ icon, title, trailing, children }) {
  return (
    <div className="bg-white border border-[#e8ebeb] rounded-[10px] p-4">
      <div className="flex items-center gap-2.5 pb-3 border-b border-[#f0f2f2] mb-3.5">
        <span className="w-5 h-5 rounded-md bg-[#005964] text-white flex items-center justify-center flex-none">{icon}</span>
        <h2 className="m-0 text-[13.5px] font-semibold text-[#313132]">{title}</h2>
        {trailing && <span className="ml-auto">{trailing}</span>}
      </div>
      {children}
    </div>
  )
}

function FieldLabel({ children }) {
  return <div className="text-[10.5px] text-[#ababab] uppercase tracking-wide">{children}</div>
}

function Field({ label, strong, children }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className={`mt-1 text-[12.5px] text-[#313132] ${strong ? 'font-semibold text-[13px]' : ''}`}>{children}</div>
    </div>
  )
}

function Legend({ color, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  )
}

function Chip({ children }) {
  return (
    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#f5f7f7] text-[#696969] border border-[#e8ebeb]">
      {children}
    </span>
  )
}
