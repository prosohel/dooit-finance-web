"use client";

import { useState } from "react";
import { IconChevronDown } from "@tabler/icons-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Mirrors POI_ROLES on the Case model.
export const POI_ROLE_OPTIONS = [
  { value: "subject", label: "Subject" },
  { value: "associated_party", label: "Associated party" },
  { value: "counterparty", label: "Counterparty" },
  { value: "beneficiary", label: "Beneficiary" },
  { value: "beneficial_owner", label: "Beneficial owner" },
  { value: "director", label: "Director / officeholder" },
  { value: "third_party", label: "Third party" },
  { value: "other", label: "Other" },
];

const ID_DOC_TYPES = [
  { value: "passport", label: "Passport" },
  { value: "driver_licence", label: "Driver licence" },
  { value: "national_id", label: "National ID card" },
  { value: "medicare", label: "Medicare card" },
  { value: "other", label: "Other" },
];

const EMPTY = {
  kind: "individual",
  name: "",
  aliases: "",
  role: "associated_party",
  relationship: "",
  dateOfBirth: "",
  nationality: "",
  occupation: "",
  idType: "",
  idNumber: "",
  idCountry: "",
  registrationNumber: "",
  country: "",
  address: "",
  email: "",
  phone: "",
  account: "",
  institution: "",
  institutionCountry: "",
  bic: "",
  notes: "",
};

// API POI (or alert-party prefill) → flat form state.
const toForm = (poi = {}) => ({
  ...EMPTY,
  ...Object.fromEntries(
    Object.keys(EMPTY)
      .filter((k) => poi[k] != null && typeof poi[k] !== "object")
      .map((k) => [k, poi[k]])
  ),
  aliases: (poi.aliases || []).join(", "),
  // <input type="date"> wants yyyy-mm-dd; anything else (the "***" mask shown
  // to a user without the decrypt grant) starts blank.
  dateOfBirth: /^\d{4}-\d{2}-\d{2}/.test(String(poi.dateOfBirth || "")) ? String(poi.dateOfBirth).slice(0, 10) : "",
  idType: poi.idDocument?.type || "",
  idNumber: poi.idDocument?.number || "",
  idCountry: poi.idDocument?.country || "",
});

// Flat form state → API payload. Empty strings go as "" which the API reads
// as "unset", so clearing a field on edit actually clears it.
const toPayload = (f) => {
  const individual = f.kind === "individual";
  return {
    kind: f.kind,
    name: f.name.trim(),
    aliases: f.aliases.split(",").map((a) => a.trim()).filter(Boolean),
    role: f.role,
    relationship: f.relationship.trim(),
    dateOfBirth: individual ? f.dateOfBirth : "",
    nationality: individual ? f.nationality.trim() : "",
    occupation: individual ? f.occupation.trim() : "",
    idDocument: individual
      ? { type: f.idType || null, number: f.idNumber.trim() || null, country: f.idCountry.trim() || null }
      : { type: null, number: null, country: null },
    registrationNumber: individual ? "" : f.registrationNumber.trim(),
    country: f.country.trim(),
    address: f.address.trim(),
    email: f.email.trim(),
    phone: f.phone.trim(),
    account: f.account.trim(),
    institution: f.institution.trim(),
    institutionCountry: f.institutionCountry.trim(),
    bic: f.bic.trim(),
    notes: f.notes.trim(),
  };
};

const validate = (f) => {
  const errors = {};
  if (!f.name.trim()) errors.name = "Name is required";
  if (f.dateOfBirth && new Date(f.dateOfBirth) > new Date()) errors.dateOfBirth = "Cannot be in the future";
  if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) errors.email = "Not a valid email";
  return errors;
};

/**
 * The details of a person of interest who is not a customer. Used for manual
 * entry, for reviewing a party picked off an alert before it is added, and for
 * editing. `lockedFields` are shown read-only (the identifiers that came off
 * the transaction, so the POI keeps matching its source).
 */
export default function PoiForm({
  initial,
  lockedFields = [],
  submitLabel = "Add person of interest",
  submitting = false,
  onSubmit,
  onCancel,
}) {
  const [form, setForm] = useState(() => toForm(initial));
  const [errors, setErrors] = useState({});
  // Only open the long-tail sections by default when they already hold data.
  const [showMore, setShowMore] = useState(
    () => !!(initial?.email || initial?.phone || initial?.account || initial?.institution || initial?.address)
  );

  const set = (key) => (e) => {
    const value = e?.target ? e.target.value : e;
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };
  const locked = (key) => lockedFields.includes(key);
  const individual = form.kind === "individual";

  const handleSubmit = (e) => {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return;
    const payload = toPayload(form);
    if (!initial?.id) return onSubmit(payload);
    // Editing: send only what changed. Fields shown masked ("***") or blank
    // because the user cannot decrypt them are then never written back.
    const before = toPayload(toForm(initial));
    const changed = Object.fromEntries(
      Object.entries(payload).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(before[k]))
    );
    onSubmit(changed);
  };

  const masked = Object.values(toForm(initial)).includes("***");

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {masked && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Some details are hidden (***) because your role cannot view protected data. Fields you leave untouched keep
          their stored values.
        </p>
      )}
      {/* Kind toggle */}
      <div className="flex gap-1.5 rounded-lg bg-muted p-1">
        {[
          ["individual", "Individual"],
          ["entity", "Company / entity"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => set("kind")(value)}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
              form.kind === value ? "bg-white text-heading shadow-sm" : "text-muted-foreground hover:text-heading"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={individual ? "Full name" : "Legal name"} required error={errors.name} className="sm:col-span-2">
          <Input value={form.name} onChange={set("name")} disabled={locked("name")} autoFocus={!locked("name")} />
        </Field>
        <Field label="Role in the case">
          <Select value={form.role} onValueChange={set("role")}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {POI_ROLE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Relationship to subject">
          <Input value={form.relationship} onChange={set("relationship")} placeholder="e.g. Sister, receiving account holder" />
        </Field>
        <Field label="Also known as" hint="Comma-separated" className="sm:col-span-2">
          <Input value={form.aliases} onChange={set("aliases")} />
        </Field>
      </div>

      {individual ? (
        <Section title="Identity">
          <Field label="Date of birth" error={errors.dateOfBirth}>
            <Input type="date" value={form.dateOfBirth} onChange={set("dateOfBirth")} />
          </Field>
          <Field label="Nationality">
            <Input value={form.nationality} onChange={set("nationality")} />
          </Field>
          <Field label="ID document">
            <Select value={form.idType || undefined} onValueChange={set("idType")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {ID_DOC_TYPES.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="ID number">
            <Input value={form.idNumber} onChange={set("idNumber")} />
          </Field>
          <Field label="ID issuing country">
            <Input value={form.idCountry} onChange={set("idCountry")} />
          </Field>
          <Field label="Occupation">
            <Input value={form.occupation} onChange={set("occupation")} />
          </Field>
        </Section>
      ) : (
        <Section title="Registration">
          <Field label="ABN / ACN / registration no.">
            <Input value={form.registrationNumber} onChange={set("registrationNumber")} />
          </Field>
          <Field label="Country of registration">
            <Input value={form.country} onChange={set("country")} />
          </Field>
        </Section>
      )}

      <button
        type="button"
        onClick={() => setShowMore((v) => !v)}
        className="flex items-center gap-1 self-start text-xs font-semibold text-primary"
      >
        <IconChevronDown className={cn("size-3.5 transition-transform", showMore && "rotate-180")} />
        Contact and account details
      </button>

      {showMore && (
        <>
          <Section title="Contact">
            {individual && (
              <Field label="Country of residence">
                <Input value={form.country} onChange={set("country")} />
              </Field>
            )}
            <Field label="Email" error={errors.email}>
              <Input type="email" value={form.email} onChange={set("email")} />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={set("phone")} />
            </Field>
            <Field label="Address" className="sm:col-span-2">
              <Input value={form.address} onChange={set("address")} disabled={locked("address")} />
            </Field>
          </Section>
          <Section title="Account">
            <Field label="Account / IBAN / wallet">
              <Input value={form.account} onChange={set("account")} disabled={locked("account")} />
            </Field>
            <Field label="Financial institution">
              <Input value={form.institution} onChange={set("institution")} disabled={locked("institution")} />
            </Field>
            <Field label="Institution country">
              <Input value={form.institutionCountry} onChange={set("institutionCountry")} disabled={locked("institutionCountry")} />
            </Field>
            <Field label="BIC / SWIFT">
              <Input value={form.bic} onChange={set("bic")} disabled={locked("bic")} />
            </Field>
          </Section>
        </>
      )}

      <Field label="Investigator notes">
        <Textarea rows={3} value={form.notes} onChange={set("notes")} placeholder="Why they are of interest, where the information came from" />
      </Field>

      <div className="flex justify-end gap-2 border-t border-border pt-3">
        {onCancel && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <div className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function Field({ label, hint, required, error, className, children }) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Label className="text-xs text-muted-foreground">
        {label}
        {required && <span className="text-danger"> *</span>}
        {hint && <span className="font-normal text-muted-foreground/70"> · {hint}</span>}
      </Label>
      {children}
      {error && <p className="text-[11px] text-danger">{error}</p>}
    </div>
  );
}
