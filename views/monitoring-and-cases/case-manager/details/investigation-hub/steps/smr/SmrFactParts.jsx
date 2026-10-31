"use client";

import { Input } from "@/components/ui/input";
import OptionRow from "../../shared/OptionRow";
import { FieldLabel, ListTextarea, Fact, ApiOwnedNote, fmtDate, fmtAddress } from "./SmrBits";

/* Parts C–H of the SMR draft. The evidence (subject, other parties,
 * transactions, previous reports) is computed by the API from the case and is
 * read-only here; the analyst's own answers (yes/no gates, likely offence,
 * who completed the report) are editable. Full identity editing lives in the
 * standalone SMR form the toolbar links to. */

function PersonCard({ p }) {
  const docs = p?.identityVerification?.documents || [];
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-[13px] font-bold text-heading">{p?.name || "Unnamed"}</span>
        {(p?.otherNames || []).length > 0 && (
          <span className="text-xs text-muted-foreground">a.k.a. {p.otherNames.join(", ")}</span>
        )}
        <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-semibold">
          {p?.isCustomer ? "Customer" : "External party"}
        </span>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-3">
        <Fact label="Date of birth" value={fmtDate(p?.personDetails?.dateOfBirth)} />
        <Fact label="Nationality" value={p?.personDetails?.nationality} />
        <Fact label="Occupation" value={p?.occupation} />
        <Fact label="Address" value={fmtAddress(p?.businessAddress)} />
        <Fact label="Phone" value={(p?.phoneNumbers || []).join(", ")} />
        <Fact label="Email" value={(p?.emails || []).join(", ")} />
      </div>
      {(p?.accounts || []).length > 0 && (
        <div className="mt-2 text-xs text-muted-foreground">
          Accounts: {p.accounts.map((a) => [a.number, a.institution].filter(Boolean).join(" · ")).join("; ")}
        </div>
      )}
      {docs.length > 0 && (
        <div className="mt-1 text-xs text-muted-foreground">
          ID documents: {docs.map((d) => [d.type, d.number, d.country].filter(Boolean).join(" ")).join("; ")}
        </div>
      )}
      {p?.documentation && <div className="mt-1 text-xs text-muted-foreground">{p.documentation}</div>}
    </div>
  );
}

export function SmrPartC({ draft }) {
  const person = draft.report?.partC?.personOrganisation;
  return (
    <div className="flex flex-col gap-3">
      {person?.name ? <PersonCard p={person} /> : <p className="text-sm text-muted-foreground">No subject on this draft yet.</p>}
      <ApiOwnedNote>
        The subject&apos;s details come from the customer&apos;s KYC via the case analysis. To correct identity
        details, edit them in the full SMR form (&ldquo;Open SMR&rdquo; above) — &ldquo;Refresh from case&rdquo;
        recomputes this part.
      </ApiOwnedNote>
    </div>
  );
}

function YesNo({ label, path, draft }) {
  const value = draft.values[path];
  return (
    <div>
      <div className="mb-2">
        <FieldLabel label={label} path={path} draft={draft} />
      </div>
      <div className="flex gap-2.5">
        <OptionRow label="Yes" selected={value === true} onClick={() => draft.change(path, true)} />
        <OptionRow label="No" selected={value === false} onClick={() => draft.change(path, false)} />
      </div>
    </div>
  );
}

export function SmrPartD({ draft }) {
  const parties = draft.report?.partD?.otherParties || [];
  return (
    <div className="flex flex-col gap-4">
      <YesNo label="Are other parties involved in the matter?" path="partD.hasOtherParties" draft={draft} />
      {parties.length > 0 ? (
        <div className="flex flex-col gap-2.5">
          {parties.map((p, i) => (
            <PersonCard key={`${p?.name || "party"}-${i}`} p={p} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No other parties identified from the case.</p>
      )}
      <ApiOwnedNote>
        Other parties are the case&apos;s linked customers, its recorded persons of interest and the remaining
        transaction counterparties. Manage them on the POIs step; detailed identity editing lives in the full SMR form.
      </ApiOwnedNote>
    </div>
  );
}

export function SmrPartE({ draft }) {
  const people = draft.report?.partE?.unidentifiedPersons || [];
  return (
    <div className="flex flex-col gap-4">
      <YesNo
        label="Were persons involved who could not be identified?"
        path="partE.hasUnidentifiedPersons"
        draft={draft}
      />
      {people.length > 0 && (
        <div className="flex flex-col gap-2">
          {people.map((u, i) => (
            <div key={i} className="rounded-lg border border-border p-3 text-sm text-heading">
              {u.description || "—"}
              {u.documentation && <div className="mt-1 text-xs text-muted-foreground">{u.documentation}</div>}
            </div>
          ))}
        </div>
      )}
      <ApiOwnedNote>Describe unidentified persons in the full SMR form if the answer is yes.</ApiOwnedNote>
    </div>
  );
}

export function SmrPartF({ draft }) {
  const txns = draft.report?.partF?.transactions || [];
  return (
    <div className="flex flex-col gap-3">
      {txns.length === 0 ? (
        <p className="text-sm text-muted-foreground">No transactions in the analysis window.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[640px] text-left text-[12.5px]">
            <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                {["Date", "Reference", "Type", "Amount", "Sender → Payee", "Completed"].map((h) => (
                  <th key={h} className="px-3 py-2 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70 text-heading">
              {txns.map((t, i) => (
                <tr key={t.referenceNumber || i}>
                  <td className="px-3 py-2 whitespace-nowrap">{fmtDate(t.date)}</td>
                  <td className="px-3 py-2">{t.referenceNumber || "—"}</td>
                  <td className="px-3 py-2">{t.type || "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {t.totalAmount?.amount != null
                      ? `${t.totalAmount.amount.toLocaleString()} ${t.totalAmount.currencyCode || ""}`
                      : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {[t.sender?.name, t.payee?.name].filter(Boolean).join(" → ") || "—"}
                  </td>
                  <td className="px-3 py-2">{t.completed ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ApiOwnedNote>
        The transactions are the case analysis&apos;s evidence set — &ldquo;Refresh from case&rdquo; updates them.
      </ApiOwnedNote>
    </div>
  );
}

export function SmrPartG({ draft }) {
  const previous = draft.report?.partG?.previousReports || [];
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <FieldLabel
          label="Likely offence(s) — the analyst's legal characterisation"
          path="partG.likelyOffence"
          draft={draft}
          htmlFor="smr-partG.likelyOffence"
        />
        <ListTextarea
          path="partG.likelyOffence"
          draft={draft}
          placeholder="e.g. Money laundering — one per line"
          minHeightClass="min-h-20"
        />
      </div>
      <div>
        <div className="mb-2 text-xs font-semibold text-muted-foreground">
          Previous reports for this customer (approved SMRs)
        </div>
        {previous.length === 0 ? (
          <p className="text-sm text-muted-foreground">None.</p>
        ) : (
          <ul className="flex flex-col gap-1.5 text-[13px] text-heading">
            {previous.map((r, i) => (
              <li key={r.referenceNumber || i} className="rounded-lg border border-border px-3 py-2">
                {r.referenceNumber || "—"} · {fmtDate(r.date)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function SmrPartH({ draft }) {
  const entity = draft.report?.partH?.reportingEntity;
  const field = (label, path, type = "text") => (
    <div className="flex flex-col gap-1.5">
      <FieldLabel label={label} path={path} draft={draft} htmlFor={`smr-${path}`} />
      <Input
        id={`smr-${path}`}
        type={type}
        value={draft.values[path] || ""}
        onChange={(e) => draft.change(path, e.target.value)}
        className="text-sm"
      />
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <Fact label="Reporting entity" value={entity?.name} />
        <Fact label="Address" value={fmtAddress(entity?.address)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {field("Internal reference", "partH.reportingEntity.internalReference")}
        {field("Completed by — name", "partH.reportingEntity.completedBy.name")}
        {field("Job title", "partH.reportingEntity.completedBy.jobTitle")}
        {field("Phone", "partH.reportingEntity.completedBy.phone")}
        {field("Email", "partH.reportingEntity.completedBy.email")}
      </div>
      <ApiOwnedNote>
        Submission (draft → review → approved) happens on the case&apos;s Reports tab, where the SMR can also be
        exported as a PDF.
      </ApiOwnedNote>
    </div>
  );
}
