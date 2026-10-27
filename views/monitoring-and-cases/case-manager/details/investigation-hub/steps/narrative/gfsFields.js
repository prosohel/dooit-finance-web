// The GFS narrative as the Investigation Hub edits it: each field is a key
// on the case's GFS draft (see EDITABLE_FIELDS.gfs in
// api/services/reportDrafts.js — keep the two in step).
//
// `ai: true` marks prose the AI service drafts; those fields can take a
// suggestion from "Suggest narrative".

export const GFS_SECTIONS = [
  {
    heading: "1. Suspicion",
    fields: [
      { key: "suspicionType", label: "Suspicion type", type: "text", placeholder: "e.g. Scam / fraud, structuring" },
      { key: "suspicionReason", label: "Reason for suspicion", type: "text", placeholder: "e.g. Person is not who they claim to be" },
      { key: "suspicionDates", label: "Dates of suspicious activity", type: "text", placeholder: "e.g. 3–17 Aug 2026" },
      { key: "suspicionIntensity", label: "Intensity", type: "text", placeholder: "e.g. escalating over the period" },
      { key: "suspicionBehaviour", label: "Behaviour observed", type: "text", placeholder: "e.g. pass-through within hours" },
      { key: "suspicionSummary", label: "Suspicion summary", type: "textarea", ai: true, full: true },
    ],
  },
  {
    heading: "2. Customer Profile",
    fields: [
      { key: "customerName", label: "Customer name", type: "text" },
      { key: "customerUID", label: "Customer UID", type: "text" },
      { key: "companyName", label: "Company / account name", type: "text" },
      { key: "customerAge", label: "Age", type: "number" },
      { key: "accountOpeningDate", label: "Account opening date", type: "date" },
      { key: "occupation", label: "Occupation", type: "text" },
      { key: "customerCountry", label: "Country", type: "text" },
      { key: "residentialAddress", label: "Residential address", type: "text", full: true },
      { key: "expectedTradingVolume", label: "Expected trading volume", type: "text", placeholder: "e.g. $1,000 – $5,000 per month" },
      { key: "sourceOfFunds", label: "Source of funds", type: "text" },
      { key: "sourceOfWealth", label: "Source of wealth", type: "text" },
      { key: "accountOpeningPurpose", label: "Account opening purpose", type: "text" },
    ],
  },
  {
    heading: "3. Review Period & Totals",
    fields: [
      { key: "reviewStartDate", label: "Review period — from", type: "date" },
      { key: "reviewEndDate", label: "Review period — to", type: "date" },
      { key: "totalDeposited", label: "Total deposited (AUD)", type: "number" },
      { key: "totalWithdrawn", label: "Total withdrawn (AUD)", type: "number" },
      { key: "totalSuspicionAmount", label: "Total suspicion amount (AUD)", type: "number" },
    ],
  },
  {
    heading: "4. Behavioural Change",
    fields: [
      { key: "behavioralChangeDescription", label: "Behavioural change description", type: "textarea", ai: true, full: true },
    ],
  },
  {
    heading: "5. Additional Notes",
    fields: [
      { key: "additionalNotes", label: "Additional notes", type: "textarea", full: true },
    ],
  },
];
