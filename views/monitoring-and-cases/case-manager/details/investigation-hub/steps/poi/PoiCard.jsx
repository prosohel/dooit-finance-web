"use client";

import { useState } from "react";
import {
  IconBuilding,
  IconChevronDown,
  IconFlag,
  IconLoader2,
  IconPencil,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import { cn, getInitials } from "@/lib/utils";

const KYC_STYLE = {
  verified: "bg-success/10 text-success",
  rejected: "bg-danger/10 text-danger",
};

const ROLE_STYLE = {
  subject: "bg-danger/10 text-danger",
  counterparty: "bg-amber-100 text-amber-800",
  beneficiary: "bg-amber-100 text-amber-800",
};

// Stored as "yyyy-mm-dd"; a masked value ("***") is shown as it is.
const formatDob = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("en-AU", { timeZone: "UTC" });
};

const Pill = ({ className, children }) => (
  <span className={cn("rounded-full px-2 py-0.5 text-[10.5px] font-semibold", className)}>{children}</span>
);

/** KYC / PEP / sanctions at a glance — only what is known is shown. */
export function ScreeningPills({ kycStatus, isPep, sanction }) {
  return (
    <>
      {kycStatus && (
        <Pill className={KYC_STYLE[kycStatus] || "bg-muted text-muted-foreground"}>
          KYC {String(kycStatus).replace(/_/g, " ")}
        </Pill>
      )}
      {isPep && <Pill className="bg-violet-100 text-violet-700">PEP</Pill>}
      {sanction && <Pill className="bg-danger/10 text-danger">Sanctions match</Pill>}
    </>
  );
}

function RemoveButton({ onClick, busy, title = "Remove from case" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      title={title}
      className="flex size-7 shrink-0 items-center justify-center rounded-md border border-danger/30 bg-danger/10 text-danger transition-colors hover:bg-danger/20 disabled:opacity-50"
    >
      {busy ? <IconLoader2 className="size-3.5 animate-spin" /> : <IconX className="size-3.5" />}
    </button>
  );
}

/** A POI who is one of our customers (Case.customer / linkedCustomers). */
export function CustomerPoiCard({ poi, onRemove, busy }) {
  return (
    <div className="rounded-xl border border-border">
      <div className="flex items-center gap-3.5 px-4 py-3.5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
          {getInitials(poi.name || poi.uid || "?")}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-bold text-heading">{poi.name || poi.uid}</span>
            <ScreeningPills kycStatus={poi.kycStatus} isPep={poi.isPep} sanction={poi.sanction} />
          </div>
          <div className="text-xs text-muted-foreground">
            {[poi.uid, poi.overrides?.customerType, "Customer"].filter(Boolean).join(" · ")}
          </div>
        </div>
        <Pill className={poi.isPrimary ? "bg-danger/10 text-danger" : "bg-primary/10 text-primary"}>
          {poi.isPrimary ? "Primary subject" : "Linked customer"}
        </Pill>
        {/* The primary POI anchors the case and cannot be unlinked (API rule). */}
        {!poi.isPrimary && onRemove && <RemoveButton onClick={() => onRemove(poi)} busy={busy} />}
      </div>
    </div>
  );
}

/** A POI who is not a customer (Case.externalPois). */
export function ExternalPoiCard({ poi, onEdit, onRemove, busy }) {
  const [open, setOpen] = useState(false);
  const entity = poi.kind === "entity";
  const Icon = entity ? IconBuilding : IconUser;

  const details = [
    ["Also known as", (poi.aliases || []).join(", ")],
    ["Relationship", poi.relationship],
    ["Date of birth", formatDob(poi.dateOfBirth)],
    ["Nationality", poi.nationality],
    ["Occupation", poi.occupation],
    [
      "ID document",
      poi.idDocument?.number
        ? [poi.idDocument.type?.replace(/_/g, " "), poi.idDocument.number, poi.idDocument.country].filter(Boolean).join(" · ")
        : null,
    ],
    ["Registration no.", poi.registrationNumber],
    [entity ? "Country" : "Residence", poi.country],
    ["Address", poi.address],
    ["Email", poi.email],
    ["Phone", poi.phone],
    ["Account", poi.account],
    ["Institution", [poi.institution, poi.institutionCountry, poi.bic].filter(Boolean).join(" · ")],
    ["Notes", poi.notes],
  ].filter(([, v]) => v);

  return (
    <div className="rounded-xl border border-border">
      <div className="flex items-center gap-3.5 px-4 py-3.5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-heading">
          <Icon className="size-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-heading">{poi.name}</div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {poi.source === "alert" && <IconFlag className="size-3 text-amber-700" />}
            {[poi.kindLabel, "Not a customer", poi.sourceLabel].filter(Boolean).join(" · ")}
          </div>
        </div>
        <Pill className={ROLE_STYLE[poi.role] || "bg-primary/10 text-primary"}>{poi.roleLabel || "Associated party"}</Pill>
        {onEdit && (
          <button
            type="button"
            onClick={() => onEdit(poi)}
            title="Edit details"
            className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted"
          >
            <IconPencil className="size-3.5" />
          </button>
        )}
        {onRemove && <RemoveButton onClick={() => onRemove(poi)} busy={busy} />}
      </div>

      {details.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex w-full items-center gap-1 border-t border-border/70 px-4 py-2 text-xs font-semibold text-primary"
          >
            <IconChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
            {open ? "Hide details" : `Details (${details.length})`}
          </button>
          {open && (
            <dl className="grid grid-cols-1 gap-x-4 gap-y-1.5 px-4 pb-3.5 text-xs sm:grid-cols-[140px_1fr]">
              {details.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="whitespace-pre-wrap break-words text-heading">{v}</dd>
                </div>
              ))}
            </dl>
          )}
        </>
      )}
    </div>
  );
}
