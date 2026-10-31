"use client";
/**
 * KYB Intake — Business verification intake wizard.
 * React port of docs/kyb-ui-design/project/"KYB Intake Form.dc.html" (6 steps:
 * Entity / Addresses / Ownership & control / People / Documents / Review),
 * per user request to follow the design bundle's visual style (docs/65 log).
 *
 * Deliberate deviations from the prototype, all standing decisions:
 * - No "ASIC document no." fields and no fake "Matched to ASIC/ABR" verified
 *   badges — no registry integration exists, so a permanent tick would lie,
 *   and ASIC-filing fields were dropped from the model entirely.
 * - "Jurisdiction" is a plain country dropdown (the same shared country list
 *   used everywhere else in the app), not the mockup's bespoke combined
 *   "State, Country" strings — it feeds general_information
 *   .country_of_incorporation directly, the document's sole country field.
 * - Registry identifiers are one dynamic list matching identifiers[] on the
 *   model directly (Type/Value/Jurisdiction rows), not fixed named inputs —
 *   the form follows the schema's shape, not the mockup's field layout.
 *
 * Submit POSTs to /customer/company (the writer added alongside this
 * rebuild), then routes to the KYB Review dossier for the new record.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useBreadcrumbLabel from "@/hooks/useBreadcrumbLabel";
import { toast } from "sonner";
import {
  createCompany,
  updateCompany,
  getCompanyById,
  ocrExtractCompany,
  ocrExtractTrust,
  getTrusts,
  getTrustById,
  createTrust,
  updateTrust,
} from "@/app/dashboard/client/companies/actions";
import { fileUploadOnCloudinary } from "@/app/actions";
import { countriesData } from "@/constants";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import SearchableSelect from "@/components/AsyncPaginatedSelect";

// Form primitives and the trust capture form live in shared modules so the
// standalone Trust pages render the same implementation (docs/65 Step 62).
import {
  C,
  monoFam,
  fld,
  labelCss,
  COUNTRY_OPTIONS,
  toNum,
  labelFor,
  dateOnly,
  rowIsBlank,
  blankStr,
  digitsOnly,
  todayISO,
  Fld,
  VField,
  Input,
  Select,
  MultiField,
  Seg,
  AddBtn,
  RemoveBtn,
  splitName,
  EMAIL_RE,
  URL_RE,
  POSTCODE_RE,
  isAdultDob,
  errCss,
} from "@/views/kyb/form-kit";
import {
  TRUST_TYPES,
  TRUST_TYPE_ID_FIELD,
  GENERIC_TRUST_ID_FIELDS,
  PEP_STATUS_OPTIONS,
  SANCTIONS_STATUS_OPTIONS,
  BENEFICIARY_TYPES,
  emptyTrustAddress,
  emptyTrustee,
  emptyCompanyTrustee,
  emptyAuthorisedRep,
  emptyControllingPerson,
  emptyTrustBeneficiary,
  emptyTrust,
  buildTrustAddress,
  buildResidentialAddress,
  splitNames,
  buildTrustPayload,
  trustKycToWizardState,
  applyOcrToTrust,
  TrustSection,
  trustFieldGrid,
  smallRemoveBtn,
  validateTrust,
  TrustAddressFields,
  TrustFields,
} from "@/views/kyb/trust-form";


// Use the app's existing font system (Inter Tight / Geist Mono, ui/app/layout.js
// + globals.css) rather than the design bundle's IBM Plex — the layout follows
// the design, typography stays consistent with the rest of the dashboard.
const sans = "var(--font-sans)";

// Inline validation message under a field (docs/65 Step 62).

const card = {
  background: "#fff",
  border: `1px solid ${C.line}`,
  borderRadius: 14,
  padding: "24px 26px",
};
const h2 = { margin: "0 0 3px", fontSize: 16, fontWeight: 600 };
const sub13 = { margin: "0 0 20px", fontSize: 13, color: C.sub };
const upLabel = {
  fontSize: 12,
  letterSpacing: ".04em",
  textTransform: "uppercase",
  color: C.subtle,
  fontWeight: 600,
};
const rowCard = {
  border: `1px solid ${C.hair}`,
  borderRadius: 12,
  padding: "16px 18px",
  position: "relative",
};

const STEP_TITLES = [
  "Entity details",
  "Addresses",
  "Ownership & control",
  "People & appointments",
  "Documents",
  "Review & submit",
];

// Company legal structures only (docs/65 Step 65). "Trust" and "Partnership"
// were offered here until Step 65 and are gone for three reasons:
//  1. Neither is a company. A Trust is onboarded through the separate
//     TrustKyc flow (the Step 45 decision that removed "trust" from the
//     entity_type enum — leaving the label in the dropdown contradicted it),
//     and a Partnership has its own capture in the non-individual customer
//     form, including partnership type and partnership-agreement documents.
//  2. Choosing either was already lossy: both stored the same "other" enum
//     value as Limited Liability Company, and labelFor() resolves a value to
//     its FIRST label — so a company saved as "Trust" reopened as "Limited
//     Liability Company". The option promised a distinction the schema
//     cannot hold.
//  3. Nothing downstream ever showed them: the Review page, list dashboard
//     and details page all map the stored enum value, so these two only ever
//     existed as entry-side labels.
// Removing them changes no stored data and no edit-mode display — "other"
// already resolved to Limited Liability Company.
const ENTITY_TYPES = [
  ["Proprietary Limited", "proprietary_limited"],
  ["Public Limited", "public_company"],
  ["Foreign Company", "foreign_company"],
  ["Limited Liability Company", "other"],
];
// "Who this holder holds on behalf of" when Beneficially held = No (docs/65
// Step 43) — Trust/Nominee/Minor per the requirement; Other is the escape
// hatch. Only Trust is TrustKyc-shaped and gets a linked TrustKyc record;
// Nominee/Minor just capture who the real beneficiary is.
const BENEFICIAL_ARRANGEMENT_TYPES = [
  ["Trust", "trust"],
  ["Nominee", "nominee"],
  ["Minor", "minor"],
  ["Other", "other"],
];
const CLASSES = ["Limited By Shares", "Limited By Guarantee", "Unlimited"];
const SUBCLASSES = ["Proprietary Company", "Public Company"];
const STATUSES = [
  ["Registered", "active"],
  ["Deregistered", "deregistered"],
  ["Under external administration", "external_administration"],
];
const ACTIVITIES = [
  "Digital currency exchange (VASP)",
  "Financial services",
  "Technology / SaaS",
  "Holding company",
  "Other",
];
// Mirrors the model's identifiers[] register directly (IdentifierSchema:
// id_type | value | jurisdiction) — one dynamic list, not fixed named inputs,
// so the form's shape matches the schema's shape rather than the mockup's
// fixed ACN/ABN/Register-No/LEI layout.
const IDENTIFIER_TYPES = [
  ["ACN", "acn"],
  ["ABN", "abn"],
  ["ARBN", "arbn"],
  ["LEI", "lei"],
  ["Register No", "corporate_key"],
  ["Other", "other"],
];
// Document type the uploader is attesting each file to be — mirrors the
// step's own "Still required" checklist so an upload can actually satisfy
// it, plus the two generic catch-alls the model comment already names
// (docs/65 Step 34 — previously every upload was silently forced to
// "charter_formation" regardless of what was actually attached).
const DOCUMENT_TYPES = [
  ["Certificate of Incorporation", "certificate_of_incorporation"],
  ["Constitution / Charter", "constitution"],
  ["Register of Members / Shareholders", "register_of_members"],
  ["Proof of Registered Address", "proof_of_address"],
  ["Ownership / Structure Chart", "ownership_structure_chart"],
  ["ASIC Extract", "asic_extract"],
  ["Other", "other"],
];
const emptyIdentifier = { id_type: "ACN", value: "", jurisdiction: "" };
// Registered Agent Office moved out to its own "Local agents" list below —
// it needs a Name field the other two address types don't (docs/65 Step 26).
const ADDRESS_TYPES = ["Registered Address", "Principal Place of Business"];
const APPOINTMENTS = [
  ["Director", "director"],
  ["Secretary", "secretary"],
  ["Officer", "amlctf_compliance_officer"],
  ["Authorized Signer (PoA)", "authorized_signer"],
];
const CONTROL_TYPES = [
  ["Ownership (25%+)", "ownership"],
  ["Voting rights (25%+)", "voting_rights"],
  ["Right to appoint directors", "other_means"],
  ["Senior managing official", "other_means"],
  ["Other significant control", "other_means"],
];
const PAID_STATUSES = ["Fully paid", "Partly paid", "Unpaid"];
// Starting options for the Security class dropdown — the model's
// security_class fields (ShareCapitalSchema, ShareholderSchema) are free
// text, so this list isn't an enum: both the Capital step and Shareholders'
// Security field share it via `securityClasses` state, and picking "+ Add"
// on either one appends the typed name to the shared list so it shows up
// as a pickable option on the other immediately (docs/65 Step 38).
const DEFAULT_SECURITY_CLASSES = ["Ordinary", "Preference", "Redeemable Preference", "Convertible Note", "Employee Share", "Other"];

const emptyAddress = {
  type: "Registered Address",
  street: "",
  suburb: "",
  state: "",
  postcode: "",
  country: "",
  from: "",
  to: "",
};
const emptyAgent = { name: "", street: "", suburb: "", state: "", postcode: "", country: "" };
const emptyHolder = {
  name: "",
  security: "Ordinary",
  holding: "",
  percent: "",
  // Was defaulted to "No" — harmless before, but now "No" requires the new
  // beneficial-arrangement fields below (docs/65 Step 43), so every freshly
  // added row would immediately demand extra input for what's normally the
  // common case (the registered holder is the real owner). Defaulting to
  // "Yes" avoids that; existing records restore whatever they actually have.
  beneficially: "Yes",
  paid: "Fully paid",
  beneficialType: "",
  // Person vs company beneficiary (docs/65 Step 66) — decides whether the
  // name is captured as split person-name parts or a single entity name.
  beneficiaryKind: "individual",
  // Split name parts (docs/65 Step 67). Middle name is genuinely optional;
  // first + last are what identify the person for screening.
  beneficiaryFirst: "",
  beneficiaryMiddle: "",
  beneficiaryLast: "",
  beneficiaryEntityName: "",
  beneficiaryDob: "",
  trust: null,
};
const emptyUbo = { full_name: "", percent: "", control: "Ownership (25%+)", country: "", dob: "" };
const emptyCapitalRow = { security_class: "Ordinary", number_issued: "", total_paid: "", total_unpaid: "", voting: "Yes" };
const emptyPerson = {
  full_name: "",
  appointment: "Director",
  date_appointed: "",
  dob: "",
  birth_place: "",
  residential_address: { street: "", suburb: "", state: "", postcode: "", country: "" },
};

// eKYB OCR pre-fill (docs/65 Step 48/49) — converts one row of the OCR
// service's response into this wizard's local row shape. The upstream
// response is documented as mirroring "general_information +
// directors_beneficial_owner", but a real sample (docs/65 Step 49) showed it
// actually returns a near-complete CompanyKyc-shaped extraction — top-level
// identifiers[]/appointments[]/share_capital[]/shareholders[]/
// related_entities[] as well, each already shaped exactly like this
// wizard's own mapCompanyToWizardState() reads them (same field names as
// the real CompanyKyc schema). These mappers mirror that existing restore
// logic field-for-field rather than guessing at alternate key names.
const ocrIdentifierRow = (i = {}) => ({
  id_type: labelFor(IDENTIFIER_TYPES, i.id_type, "Other"),
  value: (i.value || "").trim(),
  jurisdiction: i.jurisdiction || "",
});
// Prefers the richer top-level appointments[] (full name/DOB/address/role —
// what a real ASIC extract actually contains) over
// directors_beneficial_owner.directors[], which the schema only ever
// carries given_name/surname for (it's a legacy mirror, not a primary
// source) — applyOcrResult() below only falls back to the latter when
// appointments[] is absent.
const ocrAppointmentToPerson = (a = {}) => ({
  ...emptyPerson,
  full_name: [a.given_name, a.surname].filter(Boolean).join(" ") || a.full_name || "",
  appointment: labelFor(APPOINTMENTS, a.role, "Director"),
  date_appointed: dateOnly(a.date_appointed),
  dob: dateOnly(a.date_of_birth || a.dob),
  birth_place: a.birth_place || "",
  residential_address: {
    street: a.residential_address?.street || "",
    suburb: a.residential_address?.suburb || "",
    state: a.residential_address?.state || "",
    postcode: a.residential_address?.postcode || "",
    country: a.residential_address?.country || "",
  },
});
const ocrOwnerToUbo = (o = {}) => ({
  full_name: o.full_name || "",
  percent: o.ownership_percent ?? o.percent ?? "",
  control: labelFor(CONTROL_TYPES, o.control_type, "Ownership (25%+)"),
  country: o.residential_address?.country || o.country || "",
  dob: dateOnly(o.date_of_birth || o.dob),
});
const ocrAddressRow = (a = {}, type) => ({
  type,
  street: a.street || "",
  suburb: a.suburb || "",
  state: a.state || "",
  postcode: a.postcode || "",
  country: a.country || "",
  from: "",
  to: "",
});
const ocrAgentRow = (a = {}) => ({
  name: a.name || "",
  street: a.address?.street || a.street || "",
  suburb: a.address?.suburb || a.suburb || "",
  state: a.address?.state || a.state || "",
  postcode: a.address?.postcode || a.postcode || "",
  country: a.address?.country || a.country || "",
});
const ocrCapitalRow = (c = {}) => ({
  security_class: c.security_class || "Ordinary",
  number_issued: c.amount_issued ?? "",
  total_paid: c.total_paid ?? "",
  total_unpaid: c.total_unpaid ?? "",
  voting: c.voting === false ? "No" : "Yes",
});
// beneficially_held:false rows come back with no beneficial_arrangement —
// an ASIC extract has no way to tell us who the arrangement is actually
// for (that's not a fact the register itself records) — so these rows
// land incomplete on purpose and the submit-time validation (docs/65 Step
// 43) already blocks submission until a human resolves them. applyOcrResult
// counts these so the toast can say so explicitly rather than the user
// only discovering it at submit time.
const ocrHolderRow = (h = {}) => ({
  ...emptyHolder,
  name: h.holder_name || "",
  security: h.security_class || "Ordinary",
  holding: h.units_held ?? "",
  percent: h.percent_held ?? "",
  beneficially: h.beneficially_held === false ? "No" : "Yes",
  paid: h.fully_paid === false ? "Partly paid" : "Fully paid",
});
const ocrRelatedEntityRow = (r = {}) => ({
  name: r.name || "",
  percent: r.percent_interest ?? "",
  acquired: dateOnly(r.date_acquired),
  jurisdiction: r.jurisdiction || "",
});

const DRAFT_KEY = "kyb-intake-draft";
// A parent is "foreign" relative to the subject entity's own country of
// incorporation (entity.jurisdiction → general_information.country_of_incorporation),
// not hardcoded to Australia — the subject entity itself can be incorporated
// anywhere via the Jurisdiction dropdown in Entity details.
const isForeign = (jur, home) =>
  Boolean(jur) && String(jur).toLowerCase() !== String(home || "").toLowerCase();

// First non-empty value for a given identifier type (e.g. "ACN") from the
// dynamic identifiers[] list.
const findIdentifierValue = (identifiers, type) =>
  identifiers.find((i) => i.id_type === type && i.value.trim())?.value.trim() || "";
// general_information.registration_number is ACN- or ARBN-based (docs/65
// Step 18/26): a local company has an ACN, a foreign company registered
// with ASIC has an ARBN instead — never both. Prefer ACN, fall back to ARBN.
const findRegistrationNumber = (identifiers) =>
  findIdentifierValue(identifiers, "ACN") || findIdentifierValue(identifiers, "ARBN");


// Restore a beneficiary's name into the wizard's split fields (docs/65 Step
// 67). The parts are canonical, but a record can legitimately carry only
// `full_name` — an OCR/imported payload, or a row migrated from the pre-Step
// 66 single-name shape — so that gets split rather than shown as blank:
// first token to first, last token to last, anything between to middle.
// A Minor is always a person, whatever the person/entity toggle last held —
// the toggle isn't rendered on that row (docs/65 Step 67).
const isEntityBeneficiary = (h) => h.beneficialType !== "Minor" && h.beneficiaryKind === "entity";
// Is this holder's beneficiary identified? Entity => a name; person => first
// AND last, which is what screening needs (a lone surname isn't a match).
const beneficiaryNamed = (h) =>
  isEntityBeneficiary(h)
    ? Boolean(h.beneficiaryEntityName.trim())
    : Boolean(h.beneficiaryFirst.trim() && h.beneficiaryLast.trim());

const beneficiaryNameParts = (b = {}) => {
  const parts = {
    beneficiaryFirst: b?.first_name || "",
    beneficiaryMiddle: b?.middle_name || "",
    beneficiaryLast: b?.last_name || "",
    beneficiaryEntityName: b?.entity_name || "",
  };
  if (parts.beneficiaryFirst || parts.beneficiaryLast) return parts;
  const words = String(b?.full_name || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return parts;
  return {
    ...parts,
    beneficiaryFirst: words[0],
    beneficiaryMiddle: words.slice(1, -1).join(" "),
    beneficiaryLast: words.length > 1 ? words[words.length - 1] : "",
  };
};



// Edit mode: map a CompanyKyc document (API shape) back into the wizard's
// local state shapes (docs/65 Step 29) — the inverse of buildPayload() below.
function mapCompanyToWizardState(doc) {
  const gi = doc.general_information || {};
  const [klass, subclass] = (gi.class_subclass || "").split(" · ");
  const addressRows = [
    ...(gi.registered_addresses || []).map((a) => ({
      type: "Registered Address",
      street: a.street || "",
      suburb: a.suburb || "",
      state: a.state || "",
      postcode: a.postcode || "",
      country: a.country || "",
      from: "",
      to: "",
    })),
    ...(gi.business_addresses || []).map((a) => ({
      type: "Principal Place of Business",
      street: a.street || "",
      suburb: a.suburb || "",
      state: a.state || "",
      postcode: a.postcode || "",
      country: a.country || "",
      from: "",
      to: "",
    })),
  ];
  const relatedParent = (doc.related_entities || []).find((r) => r.relation === "parent");
  const relatedSubs = (doc.related_entities || []).filter((r) => r.relation === "subsidiary");

  return {
    entity: {
      legal_name: gi.legal_name || "",
      trading_names: gi.trading_names || "",
      entity_type: labelFor(ENTITY_TYPES, gi.entity_type, "Proprietary Limited"),
      jurisdiction: gi.country_of_incorporation || "Australia",
      klass: klass || "Limited By Shares",
      subclass: subclass || "Proprietary Company",
      registration_date: dateOnly(gi.registration_date),
      status: labelFor(STATUSES, gi.status, "Registered"),
      activity: gi.industry || "Digital currency exchange (VASP)",
      phone_number: Array.isArray(gi.phone_number) ? gi.phone_number : gi.phone_number ? [gi.phone_number] : [],
      contact_email: Array.isArray(gi.contact_email) ? gi.contact_email : gi.contact_email ? [gi.contact_email] : [],
      nature_of_business: gi.nature_of_business || "",
      annual_income: gi.annual_income || "",
      estimated_trading_volume: gi.estimated_trading_volume || "",
    },
    accountPurpose: {
      digital_currency_exchange: Boolean(gi.account_purpose?.digital_currency_exchange),
      peer_to_peer: Boolean(gi.account_purpose?.peer_to_peer),
      fx: Boolean(gi.account_purpose?.fx),
      other: Boolean(gi.account_purpose?.other),
      other_details: gi.account_purpose?.other_details || "",
    },
    identifiers: (doc.identifiers || []).length
      ? doc.identifiers.map((i) => ({
          id_type: labelFor(IDENTIFIER_TYPES, i.id_type, "Other"),
          value: i.value || "",
          jurisdiction: i.jurisdiction || "",
        }))
      : [
          { id_type: "ACN", value: "", jurisdiction: "" },
          { id_type: "ABN", value: "", jurisdiction: "" },
        ],
    addresses: addressRows.length ? addressRows : [{ ...emptyAddress }],
    agents: (gi.local_agents || []).map((a) => ({
      name: a.name || "",
      street: a.address?.street || "",
      suburb: a.address?.suburb || "",
      state: a.address?.state || "",
      postcode: a.address?.postcode || "",
      country: a.address?.country || "",
    })),
    // All rows restored, not just the first (docs/65 Step 38 — Capital
    // became a multi-row list matching share_capital[] directly).
    capital: (doc.share_capital || []).length
      ? doc.share_capital.map((row) => ({
          security_class: row.security_class || "Ordinary",
          number_issued: row.amount_issued ?? "",
          total_paid: row.total_paid ?? "",
          total_unpaid: row.total_unpaid ?? "",
          voting: row.voting === false ? "No" : "Yes",
        }))
      : [{ ...emptyCapitalRow }],
    // beneficial_arrangement / holder_entity restore is docs/65 Step 43 —
    // a "trust" arrangement's TrustKyc comes from the populated
    // holder_entity (holder_model:"TrustKyc"; getCompanyKyc populates
    // shareholders.holder_entity server-side).
    holders: (doc.shareholders || []).length
      ? doc.shareholders.map((h) => ({
          name: h.holder_name || "",
          security: h.security_class || "Ordinary",
          holding: h.units_held ?? "",
          percent: h.percent_held ?? "",
          beneficially: h.beneficially_held ? "Yes" : "No",
          paid: h.fully_paid ? "Fully paid" : "Partly paid",
          beneficialType: labelFor(BENEFICIAL_ARRANGEMENT_TYPES, h.beneficial_arrangement?.arrangement_type, ""),
          beneficiaryKind: h.beneficial_arrangement?.beneficiary_type === "entity" ? "entity" : "individual",
          ...beneficiaryNameParts(h.beneficial_arrangement?.beneficiary),
          beneficiaryDob: dateOnly(h.beneficial_arrangement?.beneficiary?.date_of_birth),
          trust: h.holder_model === "TrustKyc" && h.holder_entity ? trustKycToWizardState(h.holder_entity) : null,
        }))
      : [{ ...emptyHolder }],
    parent: relatedParent
      ? {
          name: relatedParent.name || "",
          percent: relatedParent.percent_interest ?? "",
          acquired: dateOnly(relatedParent.date_acquired),
          jurisdiction: relatedParent.jurisdiction || "",
        }
      : { name: "", percent: "", acquired: "", jurisdiction: "" },
    subsidiaries: relatedSubs.length
      ? relatedSubs.map((s) => ({
          name: s.name || "",
          percent: s.percent_interest ?? "",
          acquired: dateOnly(s.date_acquired),
          jurisdiction: s.jurisdiction || "",
        }))
      : [{ name: "", percent: "", acquired: "", jurisdiction: "" }],
    ubos: (doc.directors_beneficial_owner?.beneficial_owners || []).length
      ? doc.directors_beneficial_owner.beneficial_owners.map((u) => ({
          full_name: u.full_name || "",
          percent: u.ownership_percent ?? "",
          control: labelFor(CONTROL_TYPES, u.control_type, "Ownership (25%+)"),
          country: u.residential_address?.country || "",
          dob: dateOnly(u.date_of_birth),
        }))
      : [{ ...emptyUbo }],
    people: (doc.appointments || []).length
      ? doc.appointments.map((a) => ({
          full_name: [a.given_name, a.surname].filter(Boolean).join(" "),
          appointment: labelFor(APPOINTMENTS, a.role, "Director"),
          date_appointed: dateOnly(a.date_appointed),
          dob: dateOnly(a.date_of_birth),
          birth_place: a.birth_place || "",
          residential_address: {
            street: a.residential_address?.street || "",
            suburb: a.residential_address?.suburb || "",
            state: a.residential_address?.state || "",
            postcode: a.residential_address?.postcode || "",
            country: a.residential_address?.country || "",
          },
        }))
      : [{ ...emptyPerson }],
    docs: (doc.documents || []).map((d) => ({
      _id: d._id,
      name: d.name || "Document",
      size: 0,
      date: d.uploadedAt || new Date().toISOString(),
      url: d.url || "",
      mimeType: d.mimeType || "",
      category: labelFor(DOCUMENT_TYPES, d.category, "Other"),
      status: d.url ? "done" : "error",
    })),
  };
}















const chipPending = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  background: "#fbf2e0",
  color: C.amber,
  fontSize: 11,
  fontWeight: 600,
  padding: "3px 9px",
  borderRadius: 6,
};

function WarnIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={C.amberIcon} strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5" />
      <circle cx="12" cy="16" r=".6" fill={C.amberIcon} />
    </svg>
  );
}

function DoneIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={C.greenText} strokeWidth="2.4" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" stroke="#cde6dd" />
      <path d="M8 12l3 3 5-6" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Wizard                                                              */
/* ------------------------------------------------------------------ */
export default function AddCompany() {
  const router = useRouter();
  const fileRef = useRef(null);
  // Edit mode: ?id=<companyId> — same wizard, pre-filled from the existing
  // record and saved via PUT instead of POST (docs/65 Step 29).
  const id = useSearchParams().get("id");
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [loadingRecord, setLoadingRecord] = useState(Boolean(id));

  const [entity, setEntity] = useState({
    legal_name: "",
    trading_names: "",
    entity_type: "Proprietary Limited",
    jurisdiction: "Australia",
    klass: "Limited By Shares",
    subclass: "Proprietary Company",
    registration_date: "",
    status: "Registered",
    activity: "Digital currency exchange (VASP)",
    phone_number: [""],
    contact_email: [""],
    nature_of_business: "",
    annual_income: "",
    estimated_trading_volume: "",
  });
  useBreadcrumbLabel(id ? String(entity.legal_name || "").trim() || "Edit entity" : "New entity");
  // Matches general_information.account_purpose (Mixed) shape used by every
  // other onboarding form in the app (ui/onboarding-ui business-registration
  // forms) — kept as a separate state slice, same pattern as capital/holders.
  const [accountPurpose, setAccountPurpose] = useState({
    digital_currency_exchange: false,
    peer_to_peer: false,
    fx: false,
    other: false,
    other_details: "",
  });
  // Registry identifiers — one dynamic list matching identifiers[] on the
  // model directly; ACN/ABN pre-seeded since they're required to submit, but
  // any row's type/value/jurisdiction is freely editable (incl. ARBN, LEI,
  // Register No (corporate_key), Other, or additional rows of the same type).
  const [identifiers, setIdentifiers] = useState([
    { id_type: "ACN", value: "", jurisdiction: "" },
    { id_type: "ABN", value: "", jurisdiction: "" },
  ]);
  const [addresses, setAddresses] = useState([{ ...emptyAddress }]);
  // Registered agents — separate list from addresses (needs a Name field),
  // starts empty since not every entity has one (docs/65 Step 26).
  const [agents, setAgents] = useState([]);
  const [capital, setCapital] = useState([{ ...emptyCapitalRow }]);
  const [securityClasses, setSecurityClasses] = useState(DEFAULT_SECURITY_CLASSES);
  const registerSecurityClass = (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSecurityClasses((list) => (list.includes(trimmed) ? list : [...list, trimmed]));
  };
  const [holders, setHolders] = useState([{ ...emptyHolder }]);
  // Which holder row's beneficial-trust modal is open, if any (docs/65 Step
  // 46 — the full TrustFields form moved from always-inline to a Dialog
  // given how many sections it now has). Index into `holders`, not a copy
  // of the row, so edits always land on the live array via pHolder().
  const [trustModalIndex, setTrustModalIndex] = useState(null);
  // Reveal-all switch for the trust form's validation (docs/65 Step 62) —
  // set by Done and by the wizard's own submit gate, cleared each time the
  // modal is opened fresh so a new trust doesn't open covered in red.
  const [trustErrorsShown, setTrustErrorsShown] = useState(false);
  const openTrustModal = (i) => {
    setTrustErrorsShown(false);
    setTrustModalIndex(i);
  };
  // Outstanding validation issues on a holder's beneficial trust. A holder
  // with the arrangement set to Trust but no trust captured at all counts as
  // a blank form, not as "nothing to check".
  const trustIssueCount = (h) => Object.keys(validateTrust(h.trust || emptyTrust())).length;
  const [parent, setParent] = useState({ name: "", percent: "", acquired: "", jurisdiction: "" });
  const [ubos, setUbos] = useState([{ ...emptyUbo }]);
  const [subsidiaries, setSubsidiaries] = useState([
    { name: "", percent: "", acquired: "", jurisdiction: "" },
  ]);
  const [people, setPeople] = useState([{ ...emptyPerson }]);
  const [docs, setDocs] = useState([]);
  const [attest, setAttest] = useState({ ubo: false, registry: false });
  // eKYB OCR pre-fill (docs/65 Step 48) — create mode only (see stepEntity
  // below); a separate, small state slice rather than piggybacking on
  // `docs` since this file is picked before it's decided whether to attach
  // it as a register document at all.
  const [ocrDocType, setOcrDocType] = useState("ASIC Company Extract");
  const [ocrFile, setOcrFile] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);

  // draft restore / save — never in edit mode, a stale local draft must not
  // clobber a real record being edited.
  useEffect(() => {
    if (id) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      // A draft saved before docs/65 Step 38 has phone_number/contact_email
      // as plain strings and capital as a single object, not arrays — both
      // would crash MultiField/capital.map on restore, so normalize shape
      // rather than trusting whatever's in localStorage.
      const toArr = (v) => (Array.isArray(v) ? v : v ? [v] : [""]);
      if (d.entity)
        setEntity({
          ...d.entity,
          phone_number: toArr(d.entity.phone_number),
          contact_email: toArr(d.entity.contact_email),
        });
      if (d.identifiers) setIdentifiers(d.identifiers);
      // Merge with the current empty shape so a draft saved before a field
      // was added (e.g. the Full-address → street/suburb/state/country split)
      // doesn't restore rows with missing keys and crash on the next .trim().
      if (d.addresses) setAddresses(d.addresses.map((a) => ({ ...emptyAddress, ...a })));
      if (d.agents) setAgents(d.agents.map((a) => ({ ...emptyAgent, ...a })));
      if (d.capital) {
        const rows = (Array.isArray(d.capital) ? d.capital : [d.capital]).map((r) => ({ ...emptyCapitalRow, ...r }));
        setCapital(rows);
        setSecurityClasses((list) => {
          const extra = rows.map((r) => r.security_class).filter((c) => c && !list.includes(c));
          return extra.length ? [...list, ...extra] : list;
        });
      }
      if (d.holders) setHolders(d.holders);
      if (d.parent) setParent(d.parent);
      if (d.ubos) setUbos(d.ubos);
      if (d.subsidiaries) setSubsidiaries(d.subsidiaries);
      if (d.people)
        setPeople(
          d.people.map((p) => ({
            ...emptyPerson,
            ...p,
            residential_address: { ...emptyPerson.residential_address, ...(typeof p.residential_address === "object" ? p.residential_address : {}) },
          }))
        );
      if (d.accountPurpose) setAccountPurpose(d.accountPurpose);
      toast.info("Draft restored");
    } catch {
      /* corrupted draft — start fresh */
    }
  }, []);

  // Edit mode: load the existing record and map it into the wizard's local
  // state shapes (docs/65 Step 29).
  useEffect(() => {
    if (!id) return;
    (async () => {
      const res = await getCompanyById(id);
      if (!res?.success || !res?.data) {
        toast.error("Could not load company record");
        router.replace("/dashboard/client/companies");
        return;
      }
      const s = mapCompanyToWizardState(res.data);
      setEntity(s.entity);
      setAccountPurpose(s.accountPurpose);
      setIdentifiers(s.identifiers);
      setAddresses(s.addresses);
      setAgents(s.agents);
      setCapital(s.capital);
      setHolders(s.holders);
      // Seed the shared Security-class list with any custom classes already
      // on the record so an edited company's existing classes stay visible
      // as options (docs/65 Step 38), not just the default starter list.
      setSecurityClasses((list) => {
        const found = [...s.capital.map((r) => r.security_class), ...s.holders.map((h) => h.security)].filter(Boolean);
        const extra = found.filter((c) => !list.includes(c));
        return extra.length ? [...list, ...extra] : list;
      });
      setParent(s.parent);
      setSubsidiaries(s.subsidiaries);
      setUbos(s.ubos);
      setPeople(s.people);
      setDocs(s.docs);
      setLoadingRecord(false);
    })();
  }, [id, router]);

  const saveDraft = () => {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ entity, identifiers, addresses, agents, capital, holders, parent, ubos, subsidiaries, people, accountPurpose })
    );
    toast.success("Draft saved on this device");
  };

  const setE = (k) => (e) => setEntity((s) => ({ ...s, [k]: e.target.value }));
  const patchRow = (setter) => (i, k, v) =>
    setter((rows) => rows.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const removeRow = (setter) => (i) =>
    setter((rows) => (rows.length > 1 ? rows.filter((_, idx) => idx !== i) : rows));
  // Identifiers may be removed down to zero — submit-time validation (not
  // array length) is what enforces ACN/ABN presence.
  const removeFreely = (setter) => (i) => setter((rows) => rows.filter((_, idx) => idx !== i));

  const pIdent = patchRow(setIdentifiers);
  const pAddr = patchRow(setAddresses);
  const pAgent = patchRow(setAgents);
  const pHolder = patchRow(setHolders);
  const pCapital = patchRow(setCapital);
  const pUbo = patchRow(setUbos);
  const pSub = patchRow(setSubsidiaries);
  const pPerson = patchRow(setPeople);
  const pPersonAddr = (i, k, v) =>
    setPeople((rows) =>
      rows.map((r, idx) => (idx === i ? { ...r, residential_address: { ...r.residential_address, [k]: v } } : r))
    );

  // Capital ↔ Shareholders alignment: number issued per security class
  // (summed across capital rows sharing a class) drives each holder's
  // "% of issued" — derived at render/build time rather than a separately
  // typed field, so the two sections can't drift out of sync with each
  // other. Falls back to manual entry only for a class with no matching
  // Capital row (nothing to divide by).
  const issuedByClass = useMemo(() => {
    const map = {};
    capital.forEach((row) => {
      const cls = row.security_class.trim();
      const issued = toNum(row.number_issued);
      if (cls && Number.isFinite(issued)) map[cls] = (map[cls] || 0) + issued;
    });
    return map;
  }, [capital]);
  const holderPercent = (h) => {
    const issued = issuedByClass[h.security.trim()];
    const held = toNum(h.holding);
    if (!issued || !Number.isFinite(held)) return null;
    return Math.round((held / issued) * 10000) / 100;
  };
  // Per class: how many issued units are currently allocated to a holder,
  // for the reconciliation note shown on each Capital row.
  const heldByClass = useMemo(() => {
    const map = {};
    holders.forEach((h) => {
      const cls = h.security.trim();
      const held = toNum(h.holding);
      if (cls && Number.isFinite(held)) map[cls] = (map[cls] || 0) + held;
    });
    return map;
  }, [holders]);

  const foreignParent = isForeign(parent.jurisdiction, entity.jurisdiction);
  const uboResolved =
    !foreignParent ||
    ubos.some((u) => u.full_name.trim() && (Number(u.percent) >= 25 || u.control !== "Ownership (25%+)"));

  // completion — share of the required intake facts captured
  const completion = useMemo(() => {
    const checks = [
      entity.legal_name.trim(),
      entity.entity_type,
      entity.jurisdiction,
      entity.registration_date,
      findRegistrationNumber(identifiers),
      findIdentifierValue(identifiers, "ABN"),
      addresses.some((a) => a.street?.trim()),
      holders.some((h) => h.name.trim()),
      uboResolved,
      people.some((p) => p.full_name.trim()),
      docs.length > 0,
      attest.ubo && attest.registry,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [entity, identifiers, addresses, holders, uboResolved, people, docs, attest]);

  const goStep = (i) => {
    setStep(i);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Real upload to the platform FileVault (same fileUploadOnCloudinary action
  // used by the customer-profile Documents section and the onboarding-queue
  // Documents tab) — rows start "uploading", flip to "done" (with the
  // returned public URL) or "error" per file, independently of each other.
  // The raw File is kept on the row (_file) so a failed row can be retried
  // without re-picking it — never sent to the API, never draft-persisted
  // (saveDraft already excludes `docs` entirely, File isn't serializable).
  const uploadDoc = async (uploadId, file) => {
    try {
      const res = await fileUploadOnCloudinary(file);
      const publicUrl = res?.file?.publicUrl;
      if (!res?.success || !publicUrl) throw new Error(res?.message || "Upload failed");
      setDocs((d) => d.map((x) => (x._uploadId === uploadId ? { ...x, url: publicUrl, status: "done" } : x)));
    } catch (err) {
      setDocs((d) => d.map((x) => (x._uploadId === uploadId ? { ...x, status: "error" } : x)));
      toast.error(`${file.name}: ${err.message || "Upload failed"}`);
    }
  };

  const onFiles = (fileList) => {
    const rawFiles = Array.from(fileList || []);
    const added = rawFiles.map((f) => ({
      _uploadId: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      _file: f,
      name: f.name,
      size: f.size,
      date: new Date().toISOString(),
      mimeType: f.type || "application/octet-stream",
      category: "Other",
      url: "",
      status: "uploading",
    }));
    if (!added.length) return;
    setDocs((d) => [...d, ...added]);
    added.forEach((row) => uploadDoc(row._uploadId, row._file));
  };

  const retryUpload = (row) => {
    if (!row._file) return;
    setDocs((d) => d.map((x) => (x._uploadId === row._uploadId ? { ...x, status: "uploading" } : x)));
    uploadDoc(row._uploadId, row._file);
  };

  // eKYB OCR pre-fill (docs/65 Step 48) — merges an OCR response's
  // general_information / directors_beneficial_owner into wizard state.
  // Deliberately additive, never destructive: a scalar entity field only
  // overwrites the current value when OCR actually returned something for
  // it; a list section (addresses/agents/people/ubos) replaces the single
  // still-blank starter row if that's all there is, otherwise appends —
  // OCR pre-fill should never silently erase something the user already
  // typed. Returns how many rows landed in each list, for the toast.
  const applyOcrResult = (ocrData) => {
    const gi = ocrData?.general_information || {};
    const db = ocrData?.directors_beneficial_owner || {};
    const counts = { identifiers: 0, addresses: 0, agents: 0, people: 0, ubos: 0, capital: 0, holders: 0, incompleteHolders: 0, related: 0 };

    if (Object.keys(gi).length) {
      setEntity((s) => {
        // class_subclass is free text (not enum-backed), joined with " · "
        // when *this* wizard builds it — but a real OCR response (docs/65
        // Step 49) came back "Limited By Shares - Proprietary Company", a
        // plain hyphen, so splitting on " · " would silently fail to find
        // it and dump the whole string into klass. Detecting known
        // CLASSES/SUBCLASSES substrings instead is delimiter-agnostic.
        const csText = gi.class_subclass || "";
        const detectedKlass = CLASSES.find((c) => csText.toLowerCase().includes(c.toLowerCase()));
        const detectedSubclass = SUBCLASSES.find((c) => csText.toLowerCase().includes(c.toLowerCase()));
        const phones = Array.isArray(gi.phone_number) ? gi.phone_number.filter(Boolean) : gi.phone_number ? [gi.phone_number] : [];
        const emails = Array.isArray(gi.contact_email) ? gi.contact_email.filter(Boolean) : gi.contact_email ? [gi.contact_email] : [];
        return {
          ...s,
          legal_name: gi.legal_name?.trim() || s.legal_name,
          trading_names: gi.trading_names?.trim() || s.trading_names,
          entity_type: gi.entity_type ? labelFor(ENTITY_TYPES, gi.entity_type, s.entity_type) : s.entity_type,
          jurisdiction: gi.country_of_incorporation?.trim() || s.jurisdiction,
          klass: detectedKlass || s.klass,
          subclass: detectedSubclass || s.subclass,
          registration_date: dateOnly(gi.registration_date) || s.registration_date,
          status: gi.status ? labelFor(STATUSES, gi.status, s.status) : s.status,
          activity: gi.industry?.trim() || s.activity,
          phone_number: phones.length ? phones : s.phone_number,
          contact_email: emails.length ? emails : s.contact_email,
          nature_of_business: gi.nature_of_business?.trim() || s.nature_of_business,
          annual_income: gi.annual_income?.trim() || s.annual_income,
          estimated_trading_volume: gi.estimated_trading_volume?.trim() || s.estimated_trading_volume,
        };
      });

      if (gi.account_purpose) {
        setAccountPurpose((s) => ({
          digital_currency_exchange: gi.account_purpose.digital_currency_exchange ?? s.digital_currency_exchange,
          peer_to_peer: gi.account_purpose.peer_to_peer ?? s.peer_to_peer,
          fx: gi.account_purpose.fx ?? s.fx,
          other: gi.account_purpose.other ?? s.other,
          other_details: s.other_details,
        }));
      }

      const newAddrs = [
        ...(gi.registered_addresses || []).map((a) => ocrAddressRow(a, "Registered Address")),
        ...(gi.business_addresses || []).map((a) => ocrAddressRow(a, "Principal Place of Business")),
      ];
      if (newAddrs.length) {
        counts.addresses = newAddrs.length;
        setAddresses((rows) =>
          rows.length === 1 && rowIsBlank(rows[0], ["street", "suburb", "state", "postcode", "country"])
            ? newAddrs
            : [...rows, ...newAddrs],
        );
      }

      const newAgents = (gi.local_agents || []).map(ocrAgentRow).filter((a) => a.name.trim());
      if (newAgents.length) {
        counts.agents = newAgents.length;
        setAgents((rows) => [...rows, ...newAgents]);
      }
    }

    // identifiers[] (docs/65 Step 49 — a real sample showed the OCR service
    // returns this top-level, richer than deriving a single ACN row from
    // general_information.registration_number alone). Reconciled row by
    // row against the two pre-seeded ACN/ABN rows rather than wholesale
    // replaced, so a value the user already typed is never overwritten.
    const ocrIdentifiers = (ocrData?.identifiers || []).map(ocrIdentifierRow).filter((i) => i.value);
    if (ocrIdentifiers.length) {
      counts.identifiers = ocrIdentifiers.length;
      setIdentifiers((rows) => {
        let next = [...rows];
        ocrIdentifiers.forEach((oi) => {
          const idx = next.findIndex((r) => r.id_type === oi.id_type && !r.value.trim());
          if (idx >= 0) next[idx] = { ...next[idx], value: oi.value, jurisdiction: oi.jurisdiction || next[idx].jurisdiction };
          else if (!next.some((r) => r.id_type === oi.id_type && r.value.trim() === oi.value)) next = [...next, oi];
        });
        return next;
      });
    } else if (gi.registration_number?.trim()) {
      // Fallback for a response that only returned general_information.
      setIdentifiers((rows) => {
        const idx = rows.findIndex((r) => r.id_type === "ACN");
        if (idx < 0 || rows[idx].value.trim()) return rows;
        const copy = [...rows];
        copy[idx] = { ...copy[idx], value: gi.registration_number.trim() };
        return copy;
      });
    }

    // appointments[] (docs/65 Step 49) is the same shape this wizard's own
    // edit-mode restore reads (mapCompanyToWizardState) and is far richer
    // than directors_beneficial_owner.directors[] (name-only) — preferred
    // whenever present; the minimal directors[] is only a fallback so a
    // response lacking appointments[] still pre-fills something.
    const appointmentSource = (ocrData?.appointments || []).length ? ocrData.appointments : db.directors || [];
    const newPeople = appointmentSource.map(ocrAppointmentToPerson).filter((p) => p.full_name.trim());
    if (newPeople.length) {
      counts.people = newPeople.length;
      setPeople((rows) => (rows.length === 1 && rowIsBlank(rows[0], ["full_name"]) ? newPeople : [...rows, ...newPeople]));
    }

    const newUbos = (db.beneficial_owners || []).map(ocrOwnerToUbo).filter((u) => u.full_name.trim());
    if (newUbos.length) {
      counts.ubos = newUbos.length;
      setUbos((rows) => (rows.length === 1 && rowIsBlank(rows[0], ["full_name"]) ? newUbos : [...rows, ...newUbos]));
    }

    // share_capital[] / shareholders[] (docs/65 Step 49) — top-level,
    // absent from the originally-documented "general_information +
    // directors_beneficial_owner" contract but present in a real response.
    const newCapital = (ocrData?.share_capital || []).map(ocrCapitalRow).filter((c) => c.security_class);
    if (newCapital.length) {
      counts.capital = newCapital.length;
      setCapital((rows) =>
        rows.length === 1 && rowIsBlank(rows[0], ["number_issued", "total_paid", "total_unpaid"]) ? newCapital : [...rows, ...newCapital],
      );
    }

    const newHolders = (ocrData?.shareholders || []).map(ocrHolderRow).filter((h) => h.name.trim());
    if (newHolders.length) {
      counts.holders = newHolders.length;
      // Held-on-behalf-of rows land with beneficially:"No" but no
      // arrangement — an ASIC register can't tell us who a nominee/trust
      // arrangement is actually for, so these need a manual follow-up in
      // the Shareholders step before submit (the existing validation
      // already blocks submission until resolved; this just surfaces it
      // early rather than at the end of the wizard).
      counts.incompleteHolders = newHolders.filter((h) => h.beneficially === "No").length;
      setHolders((rows) => (rows.length === 1 && rowIsBlank(rows[0], ["name"]) ? newHolders : [...rows, ...newHolders]));
    }

    const relatedEntities = ocrData?.related_entities || [];
    const relatedParent = relatedEntities.find((r) => r.relation === "parent");
    const relatedSubs = relatedEntities.filter((r) => r.relation === "subsidiary");
    if (relatedParent) {
      counts.related += 1;
      setParent((s) => (s.name.trim() ? s : ocrRelatedEntityRow(relatedParent)));
    }
    if (relatedSubs.length) {
      counts.related += relatedSubs.length;
      const newSubs = relatedSubs.map(ocrRelatedEntityRow);
      setSubsidiaries((rows) => (rows.length === 1 && rowIsBlank(rows[0], ["name"]) ? newSubs : [...rows, ...newSubs]));
    }

    return counts;
  };

  const runOcrExtraction = async () => {
    if (!ocrFile) return;
    setOcrLoading(true);
    try {
      const res = await ocrExtractCompany(ocrFile);
      if (!res?.success || !res?.data) {
        toast.error(res?.error || res?.message || "Could not extract data from this document — try a clearer scan or fill the form manually.");
        return;
      }
      const counts = applyOcrResult(res.data);
      // The same file becomes a real register document too, tagged with
      // whichever ASIC document type was picked — one upload does double
      // duty instead of asking the user to attach it again in the
      // Documents step.
      const category = ocrDocType === "ASIC Form 201 (Company Registration)" ? "Certificate of Incorporation" : "ASIC Extract";
      const uploadId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
      setDocs((d) => [
        ...d,
        {
          _uploadId: uploadId,
          _file: ocrFile,
          name: ocrFile.name,
          size: ocrFile.size,
          date: new Date().toISOString(),
          mimeType: ocrFile.type || "application/octet-stream",
          category,
          url: "",
          status: "uploading",
        },
      ]);
      uploadDoc(uploadId, ocrFile);
      const parts = [
        counts.identifiers && `${counts.identifiers} identifier(s)`,
        counts.addresses && `${counts.addresses} address(es)`,
        counts.agents && `${counts.agents} local agent(s)`,
        counts.people && `${counts.people} appointment(s)`,
        counts.ubos && `${counts.ubos} beneficial owner(s)`,
        counts.capital && `${counts.capital} capital row(s)`,
        counts.holders && `${counts.holders} shareholder(s)`,
        counts.related && `${counts.related} related entit(y/ies)`,
      ].filter(Boolean);
      toast.success(`Pre-filled from the document${parts.length ? ` — added ${parts.join(", ")}` : ""}. Review every field before submitting.`);
      if (counts.incompleteHolders) {
        toast.warning(
          `${counts.incompleteHolders} shareholder(s) aren't beneficially held — the document doesn't say who the arrangement is for. Complete "Held on behalf of" in Shareholders before submitting.`,
        );
      }
      setOcrFile(null);
    } catch (err) {
      toast.error(err.message || "OCR extraction failed — try again or fill the form manually.");
    } finally {
      setOcrLoading(false);
    }
  };

  const buildPayload = () => {
    // Every row of a given type is sent (not just the first) — the model
    // accepts concurrent entries per type (docs/65 Step 26).
    const byType = (t) => addresses.filter((a) => a.type === t && a.street?.trim());
    const country = entity.jurisdiction;
    // Country defaults to the entity's own jurisdiction but can be overridden
    // per row — same pattern as identifiers[].jurisdiction below (relevant
    // for a local agent based in a different jurisdiction to the entity).
    const addrObj = (a) =>
      a
        ? {
          street: a.street,
          suburb: a.suburb,
          state: a.state,
          postcode: a.postcode,
          country: a.country?.trim() || country,
        }
        : undefined;
    const identifierPayload = identifiers
      .filter((i) => i.value.trim())
      .map((i) => ({
        id_type: IDENTIFIER_TYPES.find(([l]) => l === i.id_type)?.[1] || "other",
        value: i.value.trim(),
        jurisdiction: i.jurisdiction.trim() || country,
      }));
    // Structured, not free text (docs/65 Step 27). Country now defaults to
    // the entity's own jurisdiction (docs/65 Step 54, owner decision —
    // overrides the earlier Step 52 stance that a person's residence
    // shouldn't inherit it) once the row has any real data at all; the
    // has-any-data gate below still checks the raw fields, not the
    // defaulted value, so a completely untouched row still doesn't get a
    // residential_address object just because country would default.
    const residentialAddr = (a) =>
      a && (a.street?.trim() || a.suburb?.trim() || a.state?.trim() || a.postcode?.trim() || a.country?.trim())
        ? { street: a.street, suburb: a.suburb, state: a.state, postcode: a.postcode, country: a.country?.trim() || entity.jurisdiction }
        : undefined;
    const appointments = people
      .filter((p) => p.full_name.trim())
      .map((p) => ({
        role: APPOINTMENTS.find(([l]) => l === p.appointment)?.[1] || "other",
        ...splitName(p.full_name),
        date_appointed: p.date_appointed || undefined,
        date_of_birth: p.dob || undefined,
        birth_place: p.birth_place || undefined,
        residential_address: residentialAddr(p.residential_address),
        screening_status: "pending",
      }));
    const related = [];
    // Parent/subsidiary jurisdiction now defaults to the entity's own
    // (docs/65 Step 53, owner decision) — same visible-default treatment as
    // addresses/agents/identifiers. Doesn't weaken foreign-parent detection:
    // isForeign() short-circuits false on an empty jurisdiction anyway, so a
    // still-blank field and a field defaulted-and-equal-to-home reach the
    // same "not foreign" conclusion either way — this only removes the
    // silent mismatch between what the dropdown showed and what got saved.
    if (parent.name.trim())
      related.push({
        relation: "parent",
        name: parent.name.trim(),
        percent_interest: toNum(parent.percent),
        jurisdiction: parent.jurisdiction || entity.jurisdiction || undefined,
        date_acquired: parent.acquired || undefined,
      });
    subsidiaries
      .filter((s) => s.name.trim())
      .forEach((s) =>
        related.push({
          relation: "subsidiary",
          name: s.name.trim(),
          percent_interest: toNum(s.percent),
          jurisdiction: s.jurisdiction || entity.jurisdiction || undefined,
          date_acquired: s.acquired || undefined,
        })
      );
    // Address effective-from/to are captured in the UI (design parity) but the
    // model has no effective-dated addresses yet — intentionally not sent.
    return {
      general_information: {
        legal_name: entity.legal_name.trim(),
        trading_names: entity.trading_names.trim() || undefined,
        registration_number: findRegistrationNumber(identifiers),
        country_of_incorporation: country,
        industry: entity.activity,
        registered_addresses: byType("Registered Address").map(addrObj),
        business_addresses: byType("Principal Place of Business").map(addrObj),
        local_agents: agents
          .filter((a) => a.name?.trim() || a.street?.trim())
          .map((a) => ({ name: a.name?.trim() || undefined, address: addrObj(a) })),
        entity_type: ENTITY_TYPES.find(([l]) => l === entity.entity_type)?.[1] || "other",
        registration_date: entity.registration_date || undefined,
        status: STATUSES.find(([l]) => l === entity.status)?.[1] || "active",
        class_subclass: [entity.klass, entity.subclass].filter(Boolean).join(" · "),
        phone_number: entity.phone_number.map((v) => v.trim()).filter(Boolean),
        contact_email: entity.contact_email.map((v) => v.trim()).filter(Boolean),
        nature_of_business: entity.nature_of_business.trim() || undefined,
        annual_income: entity.annual_income.trim() || undefined,
        estimated_trading_volume: entity.estimated_trading_volume.trim() || undefined,
        account_purpose: accountPurpose,
      },
      identifiers: identifierPayload,
      appointments,
      directors_beneficial_owner: {
        beneficial_owners: ubos
          .filter((u) => u.full_name.trim())
          .map((u) => ({
            full_name: u.full_name.trim(),
            date_of_birth: u.dob || undefined,
            ownership_percent: toNum(u.percent),
            control_type: CONTROL_TYPES.find(([l]) => l === u.control)?.[1] || "ownership",
            // Country of residence defaults to the entity's own jurisdiction
            // when left blank (docs/65 Step 54, owner decision).
            residential_address: { country: u.country.trim() || entity.jurisdiction || undefined },
          })),
      },
      share_capital: capital
        .filter((row) => row.security_class.trim())
        .map((row) => ({
          security_class: row.security_class.trim(),
          amount_issued: toNum(row.number_issued),
          total_paid: toNum(row.total_paid),
          total_unpaid: toNum(row.total_unpaid),
          voting: row.voting === "Yes",
        })),
      shareholders: holders
        .filter((h) => h.name.trim())
        .map((h) => {
          const beneficiallyHeld = h.beneficially === "Yes";
          const arrangementType = BENEFICIAL_ARRANGEMENT_TYPES.find(([l]) => l === h.beneficialType)?.[1];
          return {
            holder_name: h.name.trim(),
            security_class: h.security || undefined,
            units_held: toNum(h.holding),
            // Derived from Capital's issued units for the same class when
            // possible, so the two sections can't disagree (docs/65 Step 40);
            // manual h.percent only backstops a class with no Capital row.
            percent_held: holderPercent(h) ?? toNum(h.percent),
            beneficially_held: beneficiallyHeld,
            fully_paid: h.paid === "Fully paid",
            // Trust/Nominee/Minor (docs/65 Step 43) — only when not
            // beneficially held; a "trust" arrangement's `trust` key is
            // payload-only, consumed server-side by resolveTrustLinks() and
            // never persisted on the shareholder row itself.
            ...(!beneficiallyHeld
              ? {
                  beneficial_arrangement: {
                    arrangement_type: arrangementType,
                    // A minor is a person by definition, so that row never
                    // offers the person/entity choice (docs/65 Step 66).
                    beneficiary_type: isEntityBeneficiary(h) ? "entity" : "individual",
                    // Split parts are what the wizard captures (docs/65 Step
                    // 67), so they're what it writes — `full_name` is left
                    // for payloads that only have a whole name (OCR, an
                    // imported register) rather than derived and stored
                    // twice.
                    beneficiary: isEntityBeneficiary(h)
                      ? { entity_name: h.beneficiaryEntityName.trim() || undefined }
                      : {
                          first_name: h.beneficiaryFirst.trim() || undefined,
                          middle_name: h.beneficiaryMiddle.trim() || undefined,
                          last_name: h.beneficiaryLast.trim() || undefined,
                          date_of_birth: h.beneficialType === "Minor" ? h.beneficiaryDob || undefined : undefined,
                        },
                  },
                  ...(arrangementType === "trust" && h.trust ? { trust: buildTrustPayload(h.trust) } : {}),
                }
              : {}),
          };
        }),
      related_entities: related,
      documents: docs
        .filter((f) => f.status === "done" && f.url)
        .map((f) => ({
          ...(f._id ? { _id: f._id } : {}),
          name: f.name,
          url: f.url,
          mimeType: f.mimeType,
          category: DOCUMENT_TYPES.find(([l]) => l === f.category)?.[1] || "other",
        })),
    };
  };

  const submit = async () => {
    const missing = [];
    if (!entity.legal_name.trim()) missing.push(["Legal entity name", 0]);
    if (!entity.registration_date) missing.push(["Registration date", 0]);
    if (!findRegistrationNumber(identifiers)) missing.push(["ACN or ARBN", 0]);
    if (!findIdentifierValue(identifiers, "ABN")) missing.push(["ABN", 0]);
    // Trust/Nominee/Minor (docs/65 Step 43; entity-level branch removed in
    // Step 45): any holder not beneficially held requires its arrangement to
    // be resolved (trust needs a trust name, nominee/minor need a
    // beneficiary name).
    const unresolvedHolder = holders.some((h) => {
      if (!h.name.trim() || h.beneficially !== "No") return false;
      if (!h.beneficialType) return true;
      return h.beneficialType === "Trust" ? !h.trust?.full_trust_name?.trim() : !beneficiaryNamed(h);
    });
    if (unresolvedHolder) missing.push(["Beneficial arrangement details for non-beneficially-held holders", 2]);
    if (missing.length) {
      toast.error(`Required: ${missing.map(([l]) => l).join(", ")}`);
      goStep(missing[0][1]);
      return;
    }
    // A named trust isn't a complete one (docs/65 Step 62) — the whole trust
    // form has to pass before the linked TrustKyc record gets created. Opens
    // the offending holder's modal with every outstanding field revealed
    // rather than just naming the step.
    const badTrust = holders.findIndex(
      (h) => h.name.trim() && h.beneficially === "No" && h.beneficialType === "Trust" && trustIssueCount(h) > 0,
    );
    if (badTrust !== -1) {
      const n = trustIssueCount(holders[badTrust]);
      toast.error(
        `${holders[badTrust].name.trim()}'s beneficial trust is incomplete — ${n} ${n === 1 ? "field needs" : "fields need"} attention.`,
      );
      goStep(2);
      setTrustModalIndex(badTrust);
      setTrustErrorsShown(true);
      return;
    }
    if (!attest.ubo || !attest.registry) {
      toast.error("Both attestations are required before submitting.");
      return;
    }
    if (docs.some((f) => f.status === "uploading")) {
      toast.error("Wait for document uploads to finish before submitting.");
      goStep(4);
      return;
    }
    if (docs.some((f) => f.status === "error")) {
      toast.error("Remove or retry the failed document upload before submitting.");
      goStep(4);
      return;
    }
    setSubmitting(true);
    try {
      const res = id
        ? await updateCompany(id, buildPayload())
        : await createCompany(buildPayload());
      const savedId = id || res?.data?._id;
      if (res?.success && savedId) {
        if (!id) localStorage.removeItem(DRAFT_KEY);
        toast.success(id ? `${entity.legal_name} updated` : `${entity.legal_name} submitted for KYB review`);
        router.push(`/dashboard/client/companies/review?id=${savedId}`);
      } else {
        toast.error(res?.message || res?.error || "Failed to submit — please try again.");
      }
    } catch {
      toast.error("Failed to submit — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------- step content renderers ---------------- */

  // Responsive by construction: every row grid in this wizard goes through
  // this one helper, so switching it to auto-fit/minmax makes every section
  // reflow to fewer columns (down to 1 on a narrow viewport) with no media
  // queries and no per-call-site changes. `cols`'s track *count* still sets
  // how many columns fit at typical desktop widths; the original fr-weights
  // (e.g. "2fr 1fr 1fr…" making a name field wider than a percent field)
  // are necessarily lost once auto-fit takes over — trade-off accepted in
  // favor of actual responsiveness.
  const grid = (cols, gap = 16) => {
    const count = String(cols).trim().split(/\s+/).length || 1;
    const base = count >= 5 ? 130 : count === 4 ? 160 : count === 3 ? 190 : 220;
    return {
      display: "grid",
      gridTemplateColumns: `repeat(auto-fit, minmax(${base}px, 1fr))`,
      gap,
    };
  };

  const stepEntity = (
    <div style={card}>
      <h2 style={h2}>Entity details</h2>
      <p style={sub13}>Legal identity of the business under review.</p>

      {/* eKYB OCR pre-fill (docs/65 Step 48) — create mode only; editing an
          existing record already has real data, OCR would only risk
          overwriting it. */}
      {!id && (
        <div style={{ marginBottom: 22, border: `1px dashed ${C.green}`, background: "#f2f8f6", borderRadius: 12, padding: "16px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2">
              <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
            </svg>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.green }}>Start from a document</span>
            <span
              style={{
                background: C.green,
                color: "#fff",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: ".05em",
                textTransform: "uppercase",
                padding: "2px 7px",
                borderRadius: 5,
              }}
            >
              OCR
            </span>
          </div>
          <p style={{ margin: "0 0 14px", fontSize: 12.5, color: C.sub, lineHeight: 1.5 }}>
            Upload an ASIC Company Extract or Form 201 and entity details, directors and beneficial owners below are pre-filled
            automatically. The file is also attached as a register document. Nothing is saved until you submit — review every
            field first.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ minWidth: 240 }}>
              <Fld label="Document type">
                <Select
                  value={ocrDocType}
                  onChange={(e) => setOcrDocType(e.target.value)}
                  options={["ASIC Company Extract", "ASIC Form 201 (Company Registration)"]}
                />
              </Fld>
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <Fld label="Document">
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) => setOcrFile(e.target.files?.[0] || null)}
                  style={{ ...fld, padding: "8px 10px" }}
                />
              </Fld>
            </div>
            <button
              type="button"
              onClick={runOcrExtraction}
              disabled={!ocrFile || ocrLoading}
              style={{
                flexShrink: 0,
                background: !ocrFile || ocrLoading ? "#9db8ae" : C.green,
                color: "#fff",
                border: "none",
                borderRadius: 9,
                padding: "10px 18px",
                fontSize: 13,
                fontWeight: 600,
                cursor: !ocrFile || ocrLoading ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                height: 38,
              }}
            >
              {ocrLoading ? "Extracting…" : "Extract & pre-fill"}
            </button>
          </div>
        </div>
      )}

      <div style={{ ...grid("1fr 1fr"), marginBottom: 16 }}>
        <Fld label="Legal entity name" required>
          <Input value={entity.legal_name} onChange={setE("legal_name")} placeholder="Registered legal name" />
        </Fld>
        <Fld label="Trading name(s)">
          <Input value={entity.trading_names} onChange={setE("trading_names")} placeholder="If different from legal name" />
        </Fld>
      </div>

      <div style={{ ...grid("1fr 1fr"), marginBottom: 16 }}>
        <Fld label="Entity type" required>
          <Select value={entity.entity_type} onChange={setE("entity_type")} options={ENTITY_TYPES} />
        </Fld>
        <Fld label="Jurisdiction" required>
          <Select value={entity.jurisdiction} onChange={setE("jurisdiction")} options={COUNTRY_OPTIONS} />
        </Fld>
      </div>

      <div style={{ ...grid("1fr 1fr"), marginBottom: 16 }}>
        <Fld label="Class">
          <Select value={entity.klass} onChange={setE("klass")} options={CLASSES} />
        </Fld>
        <Fld label="Subclass">
          <Select value={entity.subclass} onChange={setE("subclass")} options={SUBCLASSES} />
        </Fld>
      </div>

      <div style={{ ...grid("1fr 1fr"), marginBottom: 16 }}>
        <Fld label="Registration date" required>
          <Input type="date" value={entity.registration_date} onChange={setE("registration_date")} />
        </Fld>
        <Fld label="Status">
          <Select value={entity.status} onChange={setE("status")} options={STATUSES} />
        </Fld>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Fld label="Primary business activity">
          <Select value={entity.activity} onChange={setE("activity")} options={ACTIVITIES} />
        </Fld>
      </div>

      <div style={{ height: 1, background: "#eef0ec", margin: "22px 0" }} />
      <div style={{ ...upLabel, marginBottom: 14 }}>Business profile</div>

      <div style={{ ...grid("1fr 1fr"), alignItems: "start", marginBottom: 16 }}>
        <MultiField
          label="Phone number"
          values={entity.phone_number}
          onChange={(vals) => setEntity((s) => ({ ...s, phone_number: vals }))}
          placeholder="Contact phone number"
        />
        <MultiField
          label="Contact email"
          type="email"
          values={entity.contact_email}
          onChange={(vals) => setEntity((s) => ({ ...s, contact_email: vals }))}
          placeholder="Contact email address"
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <Fld label="Nature of business">
          <Input value={entity.nature_of_business} onChange={setE("nature_of_business")} placeholder="Brief description of the business" />
        </Fld>
      </div>

      <div style={{ ...grid("1fr 1fr"), marginBottom: 16 }}>
        <Fld label="Annual income">
          <Input value={entity.annual_income} onChange={setE("annual_income")} placeholder="e.g. $500,000 - $1,000,000" />
        </Fld>
        <Fld label="Estimated trading volume">
          <Input value={entity.estimated_trading_volume} onChange={setE("estimated_trading_volume")} placeholder="e.g. $50,000 per month" />
        </Fld>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Fld label="Account purpose">
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
            {[
              ["digital_currency_exchange", "Digital currency exchange"],
              ["peer_to_peer", "Peer-to-peer (P2P)"],
              ["fx", "FX"],
              ["other", "Other"],
            ].map(([key, label]) => (
              <label key={key} style={{ display: "flex", gap: 9, alignItems: "center", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={accountPurpose[key]}
                  onChange={(e) => setAccountPurpose((s) => ({ ...s, [key]: e.target.checked }))}
                  style={{ width: 16, height: 16, accentColor: C.green, flexShrink: 0 }}
                />
                <span style={{ fontSize: 13, color: C.body }}>{label}</span>
              </label>
            ))}
          </div>
        </Fld>
        {accountPurpose.other && (
          <div style={{ marginTop: 12 }}>
            <Fld label="Other purpose details">
              <Input
                value={accountPurpose.other_details}
                onChange={(e) => setAccountPurpose((s) => ({ ...s, other_details: e.target.value }))}
                placeholder="Describe the other account purpose"
              />
            </Fld>
          </div>
        )}
      </div>

      <div style={{ height: 1, background: "#eef0ec", margin: "22px 0" }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={upLabel}>Registry identifiers</div>
        <AddBtn onClick={() => setIdentifiers((rows) => [...rows, { ...emptyIdentifier }])}>Add identifier</AddBtn>
      </div>
      <p style={{ margin: "-8px 0 16px", fontSize: 12, color: C.faint }}>
        ACN (or ARBN for a foreign company) and ABN are required. Add rows for LEI, Register No or other registry identifiers as needed.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {identifiers.map((idf, i) => (
          <div key={i} style={rowCard}>
            <RemoveBtn onClick={() => removeFreely(setIdentifiers)(i)} />
            <div style={{ ...grid("1fr 1.4fr 1fr", 14), paddingRight: 24 }}>
              <Fld label="Type" required>
                <Select value={idf.id_type} onChange={(ev) => pIdent(i, "id_type", ev.target.value)} options={IDENTIFIER_TYPES.map(([l]) => l)} />
              </Fld>
              <Fld label="Value" required>
                <Input mono value={idf.value} onChange={(ev) => pIdent(i, "value", ev.target.value)} placeholder="Identifier value" />
              </Fld>
              <Fld label="Jurisdiction">
                {/* Defaults to Entity details' Jurisdiction, same as
                    buildPayload() already falls back to at submit (docs/65)
                    — shown here too now rather than only applied invisibly,
                    so the row never looks blank when it won't submit blank.
                    Still freely overridable per row; picking a different
                    country writes it straight into idf.jurisdiction. */}
                <Select
                  value={idf.jurisdiction || entity.jurisdiction}
                  onChange={(ev) => pIdent(i, "jurisdiction", ev.target.value)}
                  options={["", ...COUNTRY_OPTIONS]}
                />
              </Fld>
            </div>
          </div>
        ))}
        {identifiers.length === 0 && (
          <div style={{ fontSize: 13, color: C.sub }}>No identifiers added — ACN (or ARBN for a foreign company) and ABN are required to submit.</div>
        )}
      </div>
    </div>
  );

  const stepAddresses = (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
        <h2 style={{ ...h2, margin: 0 }}>Addresses</h2>
        <AddBtn onClick={() => setAddresses((a) => [...a, { ...emptyAddress }])}>Add address</AddBtn>
      </div>
      <p style={sub13}>Registered, principal and mailing addresses on file.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {addresses.map((a, i) => (
          <div key={i} style={rowCard}>
            <RemoveBtn onClick={() => removeRow(setAddresses)(i)} />
            <div style={{ ...grid("200px 1fr", 14), marginBottom: 14 }}>
              <Fld label="Address type">
                <Select value={a.type} onChange={(e) => pAddr(i, "type", e.target.value)} options={ADDRESS_TYPES} />
              </Fld>
              <Fld label="Street">
                <Input value={a.street} onChange={(e) => pAddr(i, "street", e.target.value)} placeholder="Street address" />
              </Fld>
            </div>
            <div style={{ ...grid("1fr 1fr 1fr 1fr", 14), marginBottom: 14 }}>
              <Fld label="Suburb">
                <Input value={a.suburb} onChange={(e) => pAddr(i, "suburb", e.target.value)} />
              </Fld>
              <Fld label="State">
                <Input value={a.state} onChange={(e) => pAddr(i, "state", e.target.value)} />
              </Fld>
              <Fld label="Post code">
                <Input mono value={a.postcode} onChange={(e) => pAddr(i, "postcode", e.target.value)} />
              </Fld>
              <Fld label="Country">
                {/* Defaults to Entity details' Jurisdiction, same as
                    buildPayload()'s addrObj() already falls back to at
                    submit (docs/65 Step 52) — still freely overridable. */}
                <Select
                  value={a.country || entity.jurisdiction}
                  onChange={(e) => pAddr(i, "country", e.target.value)}
                  options={["", ...COUNTRY_OPTIONS]}
                />
              </Fld>
            </div>
            <div style={grid("1fr 1fr", 14)}>
              <Fld label="Effective from">
                <Input type="date" value={a.from} onChange={(e) => pAddr(i, "from", e.target.value)} />
              </Fld>
              <Fld label="Effective to">
                <Input type="date" value={a.to} onChange={(e) => pAddr(i, "to", e.target.value)} />
              </Fld>
            </div>
          </div>
        ))}
      </div>

      <div style={{ height: 1, background: "#eef0ec", margin: "22px 0" }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
        <div style={upLabel}>Local agents</div>
        <AddBtn onClick={() => setAgents((a) => [...a, { ...emptyAgent }])}>Add local agent</AddBtn>
      </div>
      <p style={{ margin: "3px 0 16px", fontSize: 12, color: C.faint }}>
        Registered agents acting for the entity, if any — a foreign company may have one in each jurisdiction it operates in.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {agents.map((a, i) => (
          <div key={i} style={rowCard}>
            <RemoveBtn onClick={() => removeFreely(setAgents)(i)} />
            <div style={{ ...grid("1fr 2fr", 14), marginBottom: 14 }}>
              <Fld label="Agent name">
                <Input value={a.name} onChange={(e) => pAgent(i, "name", e.target.value)} placeholder="Registered agent name" />
              </Fld>
              <Fld label="Street">
                <Input value={a.street} onChange={(e) => pAgent(i, "street", e.target.value)} placeholder="Street address" />
              </Fld>
            </div>
            <div style={grid("1fr 1fr 1fr 1fr", 14)}>
              <Fld label="Suburb">
                <Input value={a.suburb} onChange={(e) => pAgent(i, "suburb", e.target.value)} />
              </Fld>
              <Fld label="State">
                <Input value={a.state} onChange={(e) => pAgent(i, "state", e.target.value)} />
              </Fld>
              <Fld label="Post code">
                <Input mono value={a.postcode} onChange={(e) => pAgent(i, "postcode", e.target.value)} />
              </Fld>
              <Fld label="Country">
                {/* Defaults to Entity details' Jurisdiction, same as
                    buildPayload()'s addrObj() already falls back to at
                    submit (docs/65 Step 52) — still freely overridable
                    (expected to differ often here — a local agent
                    typically represents the entity in a jurisdiction
                    other than its own). */}
                <Select
                  value={a.country || entity.jurisdiction}
                  onChange={(e) => pAgent(i, "country", e.target.value)}
                  options={["", ...COUNTRY_OPTIONS]}
                />
              </Fld>
            </div>
          </div>
        ))}
        {agents.length === 0 && (
          <div style={{ fontSize: 13, color: C.sub }}>No local agents recorded.</div>
        )}
      </div>
    </div>
  );

  const stepOwnership = (
    <>
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
          <h2 style={{ ...h2, margin: 0 }}>Capital</h2>
          <AddBtn onClick={() => setCapital((rows) => [...rows, { ...emptyCapitalRow }])}>Add class</AddBtn>
        </div>
        <p style={{ ...sub13, marginBottom: 18 }}>Issued share capital of the entity — one row per class.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {capital.map((row, i) => {
            const issued = toNum(row.number_issued);
            const held = heldByClass[row.security_class.trim()] || 0;
            const overAllocated = Number.isFinite(issued) && held > issued;
            return (
              <div key={i} style={rowCard}>
                {capital.length > 1 && <RemoveBtn onClick={() => removeRow(setCapital)(i)} />}
                <div style={{ ...grid("1.3fr 1fr 1fr 1fr"), marginBottom: 16, paddingRight: capital.length > 1 ? 24 : 0 }}>
                  <Fld label="Security class">
                    <Select
                      value={row.security_class}
                      onChange={(e) => pCapital(i, "security_class", e.target.value)}
                      options={securityClasses}
                      placeholder="Select or add a class"
                      onAddItem={(name) => {
                        registerSecurityClass(name);
                        pCapital(i, "security_class", name.trim());
                      }}
                    />
                  </Fld>
                  <Fld label="Number issued">
                    <Input mono value={row.number_issued} onChange={(e) => pCapital(i, "number_issued", e.target.value)} />
                  </Fld>
                  <Fld label="Total amount paid">
                    <Input mono value={row.total_paid} onChange={(e) => pCapital(i, "total_paid", e.target.value)} />
                  </Fld>
                  <Fld label="Total amount unpaid">
                    <Input mono value={row.total_unpaid} onChange={(e) => pCapital(i, "total_unpaid", e.target.value)} />
                  </Fld>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <label style={{ ...labelCss, margin: 0 }}>Carries voting rights</label>
                  <Seg value={row.voting} onChange={(v) => pCapital(i, "voting", v)} />
                </div>
                {Number.isFinite(issued) && issued > 0 && (
                  <div style={{ marginTop: 12, fontSize: 12, color: overAllocated ? C.red : C.sub }}>
                    {held.toLocaleString()} of {issued.toLocaleString()} issued units allocated to shareholders
                    {overAllocated ? " — exceeds issued units" : ""}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
          <h2 style={{ ...h2, margin: 0 }}>Shareholders &amp; parent</h2>
          <AddBtn onClick={() => setHolders((h) => [...h, { ...emptyHolder }])}>Add holder</AddBtn>
        </div>
        <p style={{ ...sub13, marginBottom: 18 }}>Registered holders of issued capital.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {holders.map((h, i) => (
            <div key={i} style={rowCard}>
              <RemoveBtn onClick={() => removeRow(setHolders)(i)} />
              <div style={grid("2fr 1fr 1fr 1fr 1fr 1fr", 14)}>
                <Fld label="Registered holder">
                  <Input value={h.name} onChange={(e) => pHolder(i, "name", e.target.value)} placeholder="Person or entity" />
                </Fld>
                <Fld label="Security">
                  <Select
                    value={h.security}
                    onChange={(e) => pHolder(i, "security", e.target.value)}
                    options={securityClasses}
                    placeholder="Select or add a class"
                    onAddItem={(name) => {
                      registerSecurityClass(name);
                      pHolder(i, "security", name.trim());
                    }}
                  />
                </Fld>
                <Fld label="Holding">
                  <Input mono value={h.holding} onChange={(e) => pHolder(i, "holding", e.target.value)} />
                </Fld>
                <Fld label="% of issued">
                  {holderPercent(h) !== null ? (
                    <div
                      title="Calculated from Holding ÷ Capital's number issued for this class"
                      style={{ ...fld, fontFamily: monoFam, display: "flex", alignItems: "center", background: "#f6f7f5", color: C.body }}
                    >
                      {holderPercent(h)}%
                    </div>
                  ) : (
                    <Input
                      mono
                      value={h.percent}
                      onChange={(e) => pHolder(i, "percent", e.target.value)}
                      placeholder="No matching class in Capital"
                    />
                  )}
                </Fld>
                <Fld label="Beneficially held">
                  <Select value={h.beneficially} onChange={(e) => pHolder(i, "beneficially", e.target.value)} options={["No", "Yes"]} />
                </Fld>
                <Fld label="Paid status">
                  <Select value={h.paid} onChange={(e) => pHolder(i, "paid", e.target.value)} options={PAID_STATUSES} />
                </Fld>
              </div>

              {h.beneficially === "No" && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.hair}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <WarnIcon size={14} />
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: C.amberDeep }}>
                      Held on behalf of someone else — who actually benefits?
                    </span>
                  </div>
                  {/* Four tracks rather than three since Step 67: this row
                      can now hold arrangement + person/entity + three name
                      parts + DOB, and auto-fit reflows the rest. */}
                  <div style={{ ...grid("1fr 1fr 1fr 1fr"), marginBottom: h.beneficialType === "Trust" ? 16 : 0 }}>
                    <Fld label="Arrangement" required>
                      <Select
                        value={h.beneficialType}
                        onChange={(e) => pHolder(i, "beneficialType", e.target.value)}
                        options={["", ...BENEFICIAL_ARRANGEMENT_TYPES.map(([l]) => l)]}
                        placeholder="Select type"
                      />
                    </Fld>
                    {/* Person or company (docs/65 Step 66) — a nominee can
                        hold for either, and the answer decides which field
                        the name is stored in. A minor is a person by
                        definition, so the choice isn't offered there. */}
                    {h.beneficialType && h.beneficialType !== "Trust" && h.beneficialType !== "Minor" && (
                      <Fld label="Beneficiary is a">
                        <Select
                          value={h.beneficiaryKind === "entity" ? "Company / entity" : "Person"}
                          onChange={(e) => pHolder(i, "beneficiaryKind", e.target.value === "Company / entity" ? "entity" : "individual")}
                          options={["Person", "Company / entity"]}
                        />
                      </Fld>
                    )}
                    {/* A person's name is captured in parts (docs/65 Step
                        67) — that's the shape the schema stores and what
                        screening matches on. Middle name is optional; first
                        and last are what identify the person. An entity
                        beneficiary has one name and no parts to split. */}
                    {h.beneficialType && h.beneficialType !== "Trust" && isEntityBeneficiary(h) && (
                      <Fld label="Beneficiary entity name" required>
                        <Input
                          value={h.beneficiaryEntityName}
                          onChange={(e) => pHolder(i, "beneficiaryEntityName", e.target.value)}
                          placeholder="Registered name of the company"
                        />
                      </Fld>
                    )}
                    {h.beneficialType && h.beneficialType !== "Trust" && !isEntityBeneficiary(h) && (
                      <>
                        <Fld label={h.beneficialType === "Minor" ? "Minor's first name" : "First name"} required>
                          <Input value={h.beneficiaryFirst} onChange={(e) => pHolder(i, "beneficiaryFirst", e.target.value)} />
                        </Fld>
                        <Fld label="Middle name">
                          <Input
                            value={h.beneficiaryMiddle}
                            onChange={(e) => pHolder(i, "beneficiaryMiddle", e.target.value)}
                            placeholder="If any"
                          />
                        </Fld>
                        <Fld label={h.beneficialType === "Minor" ? "Minor's last name" : "Last name"} required>
                          <Input value={h.beneficiaryLast} onChange={(e) => pHolder(i, "beneficiaryLast", e.target.value)} />
                        </Fld>
                      </>
                    )}
                    {h.beneficialType === "Minor" && (
                      <Fld label="Date of birth">
                        <Input type="date" max={todayISO()} value={h.beneficiaryDob} onChange={(e) => pHolder(i, "beneficiaryDob", e.target.value)} />
                      </Fld>
                    )}
                  </div>
                  {h.beneficialType === "Trust" && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, border: `1px solid ${C.amberLine}`, background: C.amberSoft, borderRadius: 11, padding: "14px 16px" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: C.amberDeep }}>Beneficial trust details</span>
                          {/* Linked = bound to a saved TrustKyc record (docs/65
                              Step 57), so it's visible without opening the modal. */}
                          {h.trust?.id && (
                            <span
                              style={{
                                background: C.greenBg,
                                color: C.greenText,
                                fontSize: 9.5,
                                fontWeight: 700,
                                letterSpacing: ".04em",
                                textTransform: "uppercase",
                                padding: "2px 6px",
                                borderRadius: 4,
                              }}
                            >
                              Linked
                            </span>
                          )}
                        </div>
                        {/* The outstanding count is what makes an incomplete
                            trust visible without opening the modal — the ✕
                            can close it half-finished (docs/65 Step 62). */}
                        <div style={{ fontSize: 12, color: trustIssueCount(h) ? C.red : "#7c6b52", marginTop: 2 }}>
                          {(() => {
                            const n = trustIssueCount(h);
                            const name = h.trust?.full_trust_name?.trim();
                            if (!n) return name;
                            return name
                              ? `${name} — ${n} ${n === 1 ? "field" : "fields"} still to complete.`
                              : `Not yet completed — ${n} ${n === 1 ? "field" : "fields"} required before this file can be submitted.`;
                          })()}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => openTrustModal(i)}
                        style={{
                          flexShrink: 0,
                          background: C.amberDeep,
                          color: "#fff",
                          border: "none",
                          borderRadius: 8,
                          padding: "8px 14px",
                          fontSize: 12.5,
                          fontWeight: 600,
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        {h.trust?.full_trust_name?.trim() ? "Edit trust details" : "Add trust details"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Only the ✕ (or Done) closes this — an outside click or Escape is
            ignored (docs/65 Step 56). The form is long enough that an
            accidental backdrop click could discard a lot of typing, and
            nothing here is auto-saved until the wizard itself is submitted.
            Width: near-full on small screens, capped wide on large ones —
            the field grids inside reflow via auto-fit/minmax. */}
        <Dialog open={trustModalIndex !== null} onOpenChange={(open) => !open && setTrustModalIndex(null)}>
          <DialogContent
            className="w-[96vw] sm:max-w-[min(1180px,94vw)] max-h-[92vh] overflow-y-auto p-5 sm:p-7"
            onInteractOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle>Beneficial trust details</DialogTitle>
              <DialogDescription>
                {trustModalIndex !== null ? holders[trustModalIndex]?.name || "Untitled holder" : ""} holds this position on behalf of a
                trust — complete the trust's own details. Saved as a linked TrustKyc record when this file is submitted.
              </DialogDescription>
            </DialogHeader>
            {trustModalIndex !== null && (
              <TrustFields
                value={holders[trustModalIndex].trust || emptyTrust()}
                onChange={(t) => pHolder(trustModalIndex, "trust", t)}
                showErrors={trustErrorsShown}
              />
            )}
            {/* Done validates before closing (docs/65 Step 62); the ✕ still
                closes unconditionally, so an incomplete trust can be parked
                and come back to — the shareholder row then shows how many
                fields are outstanding, and submit refuses either way. */}
            <DialogFooter>
              <button
                type="button"
                onClick={() => {
                  const n = trustModalIndex === null ? 0 : trustIssueCount(holders[trustModalIndex]);
                  if (n) {
                    setTrustErrorsShown(true);
                    toast.error(`${n} ${n === 1 ? "field needs" : "fields need"} attention before this trust is complete.`);
                    return;
                  }
                  setTrustModalIndex(null);
                }}
                style={{ background: C.green, color: "#fff", border: "none", borderRadius: 9, padding: "9px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
              >
                Done
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {foreignParent && parent.name.trim() && (
          <div style={{ display: "flex", gap: 13, padding: "14px 16px", background: C.amberBg, border: `1px solid ${C.amberLine}`, borderRadius: 11, marginTop: 16 }}>
            <WarnIcon />
            <div style={{ fontSize: 12.5, color: "#7c6b52", lineHeight: 1.5 }}>
              <span style={{ fontWeight: 600, color: C.amberDeep }}>Ownership resolves to a foreign entity.</span>{" "}
              {parent.name.trim()} is registered in {parent.jurisdiction}. Add its members / controllers below to establish the ultimate beneficial owner.
            </div>
          </div>
        )}

        <div style={{ height: 1, background: "#eef0ec", margin: "22px 0" }} />
        <div style={{ ...upLabel, marginBottom: 14 }}>Parent entity</div>
        <div style={grid("2fr 1fr 1fr 1fr", 14)}>
          <Fld label="Parent name">
            <Input value={parent.name} onChange={(e) => setParent((s) => ({ ...s, name: e.target.value }))} placeholder="Holding entity (if any)" />
          </Fld>
          <Fld label="% interest">
            <Input mono value={parent.percent} onChange={(e) => setParent((s) => ({ ...s, percent: e.target.value }))} />
          </Fld>
          <Fld label="Acquired">
            <Input type="date" value={parent.acquired} onChange={(e) => setParent((s) => ({ ...s, acquired: e.target.value }))} />
          </Fld>
          <Fld label="Jurisdiction" required>
            {/* Defaults to Entity details' Jurisdiction (docs/65 Step 53,
                owner decision) — still freely overridable, which is the
                point: change it to flag a genuinely foreign parent. */}
            <Select
              value={parent.jurisdiction || entity.jurisdiction}
              onChange={(e) => setParent((s) => ({ ...s, jurisdiction: e.target.value }))}
              options={["", ...COUNTRY_OPTIONS]}
            />
          </Fld>
        </div>

        {foreignParent && (
          <div style={{ marginTop: 20, border: `1px solid ${C.amberLine}`, background: C.amberSoft, borderRadius: 12, padding: "18px 18px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5, gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.amberIcon} strokeWidth="2">
                  <circle cx="9" cy="8" r="3.2" />
                  <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
                  <path d="M17 5.5a3 3 0 0 1 0 5.5M20 20a5 5 0 0 0-4-4.9" />
                </svg>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: C.amberDeep }}>Ultimate beneficial owners</h3>
                <span style={{ background: C.amberLine, color: C.amberDeep, fontSize: 10.5, fontWeight: 700, letterSpacing: ".04em", padding: "2px 7px", borderRadius: 5, textTransform: "uppercase" }}>
                  Required
                </span>
              </div>
              <AddBtn amber onClick={() => setUbos((u) => [...u, { ...emptyUbo }])}>
                Add UBO
              </AddBtn>
            </div>
            <p style={{ margin: "0 0 16px", fontSize: 12.5, color: "#7c6b52", lineHeight: 1.5 }}>
              A foreign parent (<span style={{ fontWeight: 600 }}>{parent.jurisdiction}</span>) was recorded. Identify each natural person who ultimately owns or controls{" "}
              <span style={{ fontWeight: 600 }}>25% or more</span> — directly or through the chain above.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {ubos.map((u, i) => (
                <div key={i} style={{ border: "1px solid #ecd9b8", background: "#fff", borderRadius: 11, padding: "14px 16px", position: "relative" }}>
                  <RemoveBtn onClick={() => removeRow(setUbos)(i)} />
                  <div style={{ ...grid("1.4fr .8fr 1.4fr", 14), paddingRight: 24 }}>
                    <Fld label="Full name">
                      <Input value={u.full_name} onChange={(e) => pUbo(i, "full_name", e.target.value)} placeholder="Natural person name" />
                    </Fld>
                    <Fld label="% ownership">
                      <Input mono value={u.percent} onChange={(e) => pUbo(i, "percent", e.target.value)} placeholder="0" />
                    </Fld>
                    <Fld label="Nature of control">
                      <Select value={u.control} onChange={(e) => pUbo(i, "control", e.target.value)} options={CONTROL_TYPES.map(([l]) => l)} />
                    </Fld>
                  </div>
                  <div style={{ ...grid("1fr 1fr", 14), marginTop: 12, paddingRight: 24 }}>
                    <Fld label="Country of residence">
                      {/* Defaults to Entity details' Jurisdiction (docs/65
                          Step 54, owner decision) — shown as a placeholder
                          hint rather than a committed value, since this is
                          free text: a pre-filled value would force the user
                          to clear it before typing something else, where a
                          Select just lets them pick a different option. The
                          underlying value stays blank until actually typed,
                          same as buildPayload()'s fallback expects. */}
                      <Input
                        value={u.country}
                        onChange={(e) => pUbo(i, "country", e.target.value)}
                        placeholder={entity.jurisdiction || "Country"}
                      />
                    </Fld>
                    <Fld label="Date of birth">
                      <Input type="date" value={u.dob} onChange={(e) => pUbo(i, "dob", e.target.value)} />
                    </Fld>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <span style={chipPending}>Screening pending</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={upLabel}>Subsidiaries</div>
          <AddBtn onClick={() => setSubsidiaries((s) => [...s, { name: "", percent: "", acquired: "", jurisdiction: "" }])}>Add subsidiary</AddBtn>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {subsidiaries.map((s, i) => (
            <div key={i} style={{ ...rowCard, border: subsidiaries.length > 1 ? rowCard.border : "none", padding: subsidiaries.length > 1 ? rowCard.padding : 0 }}>
              {subsidiaries.length > 1 && <RemoveBtn onClick={() => removeRow(setSubsidiaries)(i)} />}
              <div style={grid("2fr 1fr 1fr 1fr", 14)}>
                <Fld label="Subsidiary">
                  <Input value={s.name} onChange={(e) => pSub(i, "name", e.target.value)} placeholder="Subsidiary or branch (if any)" />
                </Fld>
                <Fld label="% interest">
                  <Input mono value={s.percent} onChange={(e) => pSub(i, "percent", e.target.value)} />
                </Fld>
                <Fld label="Acquired">
                  <Input type="date" value={s.acquired} onChange={(e) => pSub(i, "acquired", e.target.value)} />
                </Fld>
                <Fld label="Jurisdiction">
                  {/* Defaults to Entity details' Jurisdiction (docs/65 Step
                      53, owner decision) — still freely overridable. */}
                  <Select
                    value={s.jurisdiction || entity.jurisdiction}
                    onChange={(e) => pSub(i, "jurisdiction", e.target.value)}
                    options={["", ...COUNTRY_OPTIONS]}
                  />
                </Fld>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  const stepPeople = (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
        <h2 style={{ ...h2, margin: 0 }}>People &amp; appointments</h2>
        <AddBtn onClick={() => setPeople((p) => [...p, { ...emptyPerson }])}>Add person</AddBtn>
      </div>
      <p style={sub13}>
        Directors, officers and authorized signers. Each individual is screened for PEP &amp; sanctions on save.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {people.map((p, i) => (
          <div key={i} style={{ ...rowCard, padding: "14px 16px" }}>
            <RemoveBtn onClick={() => removeRow(setPeople)(i)} />
            <div style={{ ...grid("1.4fr 1.2fr 1fr", 14), paddingRight: 24 }}>
              <Fld label="Full name">
                <Input value={p.full_name} onChange={(e) => pPerson(i, "full_name", e.target.value)} placeholder="Given name Surname" />
              </Fld>
              <Fld label="Appointment">
                <Select value={p.appointment}
                  onChange={(e) => pPerson(i, "appointment", e.target.value)}
                  options={APPOINTMENTS} />
              </Fld>
              <Fld label="Date appointed">
                <Input type="date" value={p.date_appointed} onChange={(e) => pPerson(i, "date_appointed", e.target.value)} />
              </Fld>
            </div>
            <div style={{ ...grid("1fr 1fr", 14), marginTop: 10, paddingRight: 24 }}>
              <Fld label="Date of birth">
                <Input type="date" value={p.dob} onChange={(e) => pPerson(i, "dob", e.target.value)} />
              </Fld>
              <Fld label="Place of birth">
                <Input value={p.birth_place} onChange={(e) => pPerson(i, "birth_place", e.target.value)} placeholder="City, State" />
              </Fld>
            </div>
            <div style={{ marginTop: 10 }}>
              <div style={{ ...upLabel, marginBottom: 8 }}>Residential address</div>
              <div style={{ ...grid("2fr 1fr", 14), marginBottom: 10, paddingRight: 24 }}>
                <Fld label="Street">
                  <Input value={p.residential_address.street} onChange={(e) => pPersonAddr(i, "street", e.target.value)} placeholder="Street address" />
                </Fld>
                <Fld label="Suburb">
                  <Input value={p.residential_address.suburb} onChange={(e) => pPersonAddr(i, "suburb", e.target.value)} />
                </Fld>
              </div>
              <div style={{ ...grid("1fr 1fr 1fr", 14), paddingRight: 24 }}>
                <Fld label="State">
                  <Input value={p.residential_address.state} onChange={(e) => pPersonAddr(i, "state", e.target.value)} />
                </Fld>
                <Fld label="Post code">
                  <Input mono value={p.residential_address.postcode} onChange={(e) => pPersonAddr(i, "postcode", e.target.value)} />
                </Fld>
                <Fld label="Country">
                  {/* Defaults to Entity details' Jurisdiction (docs/65 Step
                      54, owner decision) — still freely overridable. */}
                  <Select
                    value={p.residential_address.country || entity.jurisdiction}
                    onChange={(e) => pPersonAddr(i, "country", e.target.value)}
                    options={["", ...COUNTRY_OPTIONS]}
                  />
                </Fld>
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              <span style={chipPending}>Screening pending</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const stepDocuments = (
    <div style={card}>
      <h2 style={h2}>Charter &amp; formation documents</h2>
      <p style={sub13}>Attach constitutional and registry documents that evidence the captured data.</p>

      <style>{"@keyframes kybSpin{to{transform:rotate(360deg)}}"}</style>

      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onFiles(e.dataTransfer.files);
        }}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 9,
          border: "1.5px dashed #d3d8ce",
          borderRadius: 14,
          padding: "30px 24px",
          textAlign: "center",
          background: "#fafbf9",
          marginBottom: 24,
          cursor: "pointer",
        }}
      >
        <div style={{ width: 42, height: 42, borderRadius: "50%", background: C.greenBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <path d="M7 10l5-5 5 5" />
            <path d="M12 5v12" />
          </svg>
        </div>
        <div style={{ fontSize: 13.5, color: C.body }}>
          Drag files here or <span style={{ color: C.green, fontWeight: 600 }}>browse</span>
        </div>
        <div style={{ fontSize: 11.5, color: C.faint }}>PDF, DOCX up to 25 MB</div>
        <input ref={fileRef} type="file" multiple accept=".pdf,.doc,.docx" style={{ display: "none" }} onChange={(e) => onFiles(e.target.files)} />
      </div>

      <div style={{ ...upLabel, marginBottom: 12 }}>Attached · {docs.length}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 22 }}>
        {docs.length === 0 && (
          <div style={{ fontSize: 13, color: C.sub }}>No documents attached yet.</div>
        )}
        {docs.map((f, i) => {
          const isError = f.status === "error";
          const isUploading = f.status === "uploading";
          const canRetry = isError && !!f._file;
          return (
            <div
              key={f._uploadId || f._id || i}
              style={{
                border: `1px solid ${isError ? C.redLine : C.hair}`,
                background: isError ? C.redSoft : "#fff",
                borderRadius: 12,
                padding: "13px 15px",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 9,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: isError ? C.redLine : isUploading ? C.amberLine : C.blueBg,
                  }}
                >
                  {isUploading ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.amberIcon} strokeWidth="2.2" style={{ animation: "kybSpin .8s linear infinite" }}>
                      <path d="M12 3a9 9 0 1 0 9 9" strokeLinecap="round" />
                    </svg>
                  ) : isError ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="2.2">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 8v5" strokeLinecap="round" />
                      <circle cx="12" cy="16" r=".6" fill={C.red} />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.blueIcon} strokeWidth="1.8">
                      <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                      <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" />
                    </svg>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {f.url ? (
                      <a href={f.url} target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "none" }}>
                        {f.name}
                      </a>
                    ) : (
                      f.name
                    )}
                  </div>
                  <div style={{ fontSize: 11.5, color: isError ? C.redDeep : C.sub, marginTop: 1 }}>
                    {isUploading
                      ? "Uploading…"
                      : isError
                        ? canRetry
                          ? "Upload failed"
                          : "No file on record — remove and re-upload"
                        : `${f.size ? `${(f.size / 1024 / 1024).toFixed(1)} MB · ` : ""}added ${new Date(f.date).toLocaleDateString()}`}
                  </div>
                </div>

                {canRetry && (
                  <button
                    type="button"
                    onClick={() => retryUpload(f)}
                    style={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: C.red,
                      background: "none",
                      border: `1px solid ${C.redLine}`,
                      borderRadius: 7,
                      padding: "5px 10px",
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    Retry
                  </button>
                )}

                <button
                  type="button"
                  title="Remove"
                  onClick={() => setDocs((d) => d.filter((_, idx) => idx !== i))}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#b0b6bd", padding: 2, flexShrink: 0 }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  marginTop: 11,
                  paddingTop: 11,
                  borderTop: `1px solid ${isError ? C.redLine : C.hair}`,
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 600, color: C.subtle, textTransform: "uppercase", letterSpacing: ".03em" }}>
                  Document type
                </span>
                <Select
                  value={f.category}
                  onChange={(e) => setDocs((d) => d.map((x, idx) => (idx === i ? { ...x, category: e.target.value } : x)))}
                  options={DOCUMENT_TYPES}
                  style={{ width: 220, fontSize: 12.5, padding: "7px 30px 7px 10px" }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {docs.length === 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 14px", border: `1px dashed ${C.amberHair}`, background: C.amberSoft, borderRadius: 11 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.amberIcon, flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: 13, color: C.amberDeep, fontWeight: 500 }}>
            No documents attached yet — attach at least one supporting document.
          </span>
        </div>
      )}
    </div>
  );

  const summaryRow = ({ ok, title, detail, to }) => (
    <div
      key={title}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "13px 15px",
        border: `1px solid ${ok ? C.hair : C.amberLine}`,
        background: ok ? "transparent" : C.amberSoft,
        borderRadius: 11,
      }}
    >
      {ok ? <DoneIcon /> : <WarnIcon size={17} />}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: ok ? C.ink : C.amberDeep }}>{title}</div>
        <div style={{ fontSize: 12, color: ok ? C.sub : "#7c6b52" }}>{detail}</div>
      </div>
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          goStep(to);
        }}
        style={{ fontSize: 12.5, fontWeight: 600, color: C.green }}
      >
        Edit
      </a>
    </div>
  );

  const peopleFilled = people.filter((p) => p.full_name.trim());
  const stepReview = (
    <div style={card}>
      <h2 style={h2}>Review &amp; submit</h2>
      <p style={sub13}>Confirm the captured data and attest before sending to KYB review.</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 22 }}>
        {summaryRow({
          ok: Boolean(entity.legal_name.trim() && findRegistrationNumber(identifiers)),
          title: "Entity details",
          detail:
            [
              entity.legal_name.trim() || "No legal name",
              entity.entity_type,
              entity.jurisdiction,
              findIdentifierValue(identifiers, "ACN") && `ACN ${findIdentifierValue(identifiers, "ACN")}`,
              !findIdentifierValue(identifiers, "ACN") &&
                findIdentifierValue(identifiers, "ARBN") &&
                `ARBN ${findIdentifierValue(identifiers, "ARBN")}`,
            ]
              .filter(Boolean)
              .join(" · "),
          to: 0,
        })}
        {summaryRow({
          ok: addresses.some((a) => a.street?.trim()),
          title: "Addresses",
          detail: `${addresses.filter((a) => a.street?.trim()).length} address(es) on file`,
          to: 1,
        })}
        {summaryRow({
          ok: uboResolved && holders.some((h) => h.name.trim()),
          title: "Ownership & control",
          detail: parent.name.trim()
            ? `${parent.percent || "?"}% held by ${parent.name.trim()}${foreignParent ? ` (${parent.jurisdiction})` : ""}${uboResolved ? "" : " · UBO not yet resolved"}`
            : holders.some((h) => h.name.trim())
              ? `${holders.filter((h) => h.name.trim()).length} registered holder(s)`
              : "No holders recorded",
          to: 2,
        })}
        {summaryRow({
          ok: peopleFilled.length > 0,
          title: "People & appointments",
          detail: peopleFilled.length
            ? `${peopleFilled.length} individual(s) · ${peopleFilled.length} screening pending`
            : "No individuals recorded",
          to: 3,
        })}
        {summaryRow({
          ok: docs.length > 0,
          title: "Documents",
          detail: docs.length ? `${docs.length} attached` : "No documents attached yet",
          to: 4,
        })}
      </div>

      <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: "16px 18px", background: "#fbfcfb" }}>
        <label style={{ display: "flex", gap: 11, cursor: "pointer", alignItems: "flex-start", marginBottom: 12 }}>
          <input
            type="checkbox"
            checked={attest.ubo}
            onChange={(e) => setAttest((s) => ({ ...s, ubo: e.target.checked }))}
            style={{ width: 17, height: 17, marginTop: 1, accentColor: C.green, flexShrink: 0 }}
          />
          <span style={{ fontSize: 13, color: C.body, lineHeight: 1.5 }}>
            I confirm the beneficial ownership information is complete to the best of current knowledge, or has been flagged as unresolved for follow-up.
          </span>
        </label>
        <label style={{ display: "flex", gap: 11, cursor: "pointer", alignItems: "flex-start" }}>
          <input
            type="checkbox"
            checked={attest.registry}
            onChange={(e) => setAttest((s) => ({ ...s, registry: e.target.checked }))}
            style={{ width: 17, height: 17, marginTop: 1, accentColor: C.green, flexShrink: 0 }}
          />
          <span style={{ fontSize: 13, color: C.body, lineHeight: 1.5 }}>
            I confirm the registry identifiers entered have been verified against the applicable source records.
          </span>
        </label>
      </div>
    </div>
  );

  const steps = [stepEntity, stepAddresses, stepOwnership, stepPeople, stepDocuments, stepReview];

  if (loadingRecord) {
    return (
      <div style={{ fontFamily: sans, color: C.sub, padding: 60, textAlign: "center" }}>
        Loading company record…
      </div>
    );
  }

  /* ---------------- shell ---------------- */
  return (
    <div
      style={{
        fontFamily: sans,
        color: C.ink,
        background: C.bg,
        borderRadius: 14,
        border: `1px solid ${C.line}`,
        // no overflow:hidden — it would break the sticky stepper/footer
      }}
    >
      <style>{`
        @media (max-width: 860px) {
          .kyb-wizard-head, .kyb-wizard-footer { padding-left: 20px !important; padding-right: 20px !important; }
          .kyb-wizard-body { flex-direction: column !important; padding: 20px 20px 0 !important; }
          .kyb-wizard-stepper { width: 100% !important; position: static !important; }
        }
      `}</style>
      {/* page head */}
      <div className="kyb-wizard-head" style={{ background: "#fff", borderBottom: `1px solid ${C.line}`, padding: "22px 40px", borderRadius: "14px 14px 0 0" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: "-.01em" }}>
                {id ? "Edit business verification intake" : "Business verification intake"}
              </h1>
              <p style={{ margin: "6px 0 0", fontSize: 13.5, color: C.sub }}>
                Capture registration, ownership and control data for KYB review. Fields marked{" "}
                <span style={{ color: C.red }}>*</span> are required to submit.
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, letterSpacing: ".05em", textTransform: "uppercase", color: C.subtle, fontWeight: 600 }}>
                Completion
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>{completion}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* body */}
      <div className="kyb-wizard-body" style={{ maxWidth: 1180, margin: "0 auto", padding: "26px 40px 0", display: "flex", gap: 34, alignItems: "flex-start" }}>
        {/* stepper */}
        <div className="kyb-wizard-stepper" style={{ width: 212, flexShrink: 0, position: "sticky", top: 80 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {STEP_TITLES.map((t, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => goStep(i)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 11,
                    padding: "11px 12px",
                    border: "none",
                    background: active ? C.greenBg : "transparent",
                    borderRadius: 10,
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "inherit",
                    width: "100%",
                  }}
                >
                  <span
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: done || active ? C.green : "#e6ebe9",
                      color: done || active ? "#fff" : C.mid,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    {done ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </span>
                  <span
                    style={{
                      fontSize: 13.5,
                      fontWeight: active ? 600 : 400,
                      color: active ? C.greenDark : done ? C.ink : C.body,
                    }}
                  >
                    {t}
                  </span>
                </button>
              );
            })}
          </div>
          {/* Was unconditional static copy regardless of the entity's actual
              ownership structure; now mirrors the real signal this file
              already computes (foreignParent/uboResolved — the same rule
              gating the Ownership step's UBO card and the Review & Submit
              summary note, docs/65 Step 42). */}
          {foreignParent && !uboResolved && (
            <div style={{ marginTop: 16, padding: "13px 14px", background: C.amberBg, border: `1px solid ${C.amberLine}`, borderRadius: 11 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 600, color: C.amberDeep }}>
                <WarnIcon size={14} />
                UBO required
              </div>
              <div style={{ fontSize: 11.5, color: "#7c6b52", marginTop: 5, lineHeight: 1.45 }}>
                Ownership resolves to a foreign entity — identify a natural person UBO before this file can be approved.
              </div>
            </div>
          )}
        </div>

        {/* form column */}
        <div style={{ flex: 1, minWidth: 0, paddingBottom: 24 }}>{steps[step]}</div>
      </div>

      {/* sticky footer (sticky, not fixed — respects the dashboard sidebar) */}
      <div className="kyb-wizard-footer" style={{ position: "sticky", bottom: 0, height: 64, background: "#fff", borderTop: `1px solid ${C.line}`, display: "flex", alignItems: "center", padding: "0 40px", zIndex: 30, borderRadius: "0 0 14px 14px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", width: "100%", display: "flex", alignItems: "center", gap: 16 }}>
          <button
            type="button"
            onClick={() => goStep(Math.max(step - 1, 0))}
            style={{
              background: "#fff",
              color: C.mid,
              border: "1px solid #d9ddd6",
              borderRadius: 9,
              padding: "10px 18px",
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "inherit",
              cursor: "pointer",
              opacity: step === 0 ? 0.4 : 1,
              pointerEvents: step === 0 ? "none" : "auto",
            }}
          >
            Back
          </button>
          <span style={{ fontSize: 12.5, color: C.sub }}>
            Step {step + 1} of 6 · {STEP_TITLES[step]}
          </span>
          <div style={{ flex: 1 }} />
          {!id && (
            <button
              type="button"
              onClick={saveDraft}
              style={{ background: "#fff", color: C.mid, border: "1px solid #d9ddd6", borderRadius: 9, padding: "10px 18px", fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}
            >
              Save draft
            </button>
          )}
          <button
            type="button"
            disabled={submitting}
            onClick={() => (step === 5 ? submit() : goStep(Math.min(step + 1, 5)))}
            style={{ background: C.green, color: "#fff", border: "none", borderRadius: 9, padding: "10px 22px", fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: submitting ? "wait" : "pointer", opacity: submitting ? 0.6 : 1 }}
          >
            {step === 5 ? (submitting ? (id ? "Saving…" : "Submitting…") : id ? "Save changes" : "Submit for review") : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
