// The ECDD narrative as the Investigation Hub edits it: each field is a key
// on the case's EcddReport draft (see EDITABLE_FIELDS.ecdd in
// api/services/reportDrafts.js — keep the two in step).
//
// `ai: true` marks prose the AI service drafts; those fields can take a
// suggestion from "Suggest narrative".

export const ECDD_SECTIONS = [
  {
    heading: "1. Analysis & Review",
    fields: [
      { key: "analystName", label: "Analysed by — name", type: "text" },
      { key: "position", label: "Position", type: "text", placeholder: "e.g. Compliance Officer" },
      { key: "date", label: "Date", type: "date" },
    ],
  },
  {
    heading: "2. Customer Profile",
    persons: true, // the persons-of-interest table renders in this section
    fields: [
      { key: "userId", label: "User ID", type: "text" },
      { key: "fullName", label: "Full / company name", type: "text" },
      { key: "abn", label: "ABN", type: "text" },
      { key: "onboardingDate", label: "Onboarding date", type: "date" },
      { key: "accountPurpose", label: "Account purpose", type: "text" },
      { key: "expectedVolumeText", label: "Expected trading volume", type: "text", placeholder: "e.g. $1,000 – $5,000 per month" },
      { key: "annualIncome", label: "Annual income (AUD)", type: "number" },
      { key: "beneficialOwner", label: "Beneficial owner", type: "text" },
      { key: "directors", label: "Directors", type: "text" },
      { key: "profileSummary", label: "Profile summary", type: "textarea", ai: true, full: true },
    ],
  },
  {
    heading: "3. Risk Flags",
    fields: [
      { key: "isPEP", label: "Customer is PEP", type: "select", options: ["No", "Yes"] },
      { key: "isSanctioned", label: "Sanctioned customer", type: "select", options: ["No", "Yes"] },
      { key: "relatedParty", label: "Related party", type: "textarea", full: true },
    ],
  },
  {
    heading: "4. Transaction Analysis",
    fields: [
      { key: "accountCreationDate", label: "Account creation date", type: "date" },
      { key: "analysisStartDate", label: "Analysis start date", type: "date" },
      { key: "analysisEndDate", label: "Analysis end date", type: "date" },
      { key: "totalDepositsAUD", label: "Total deposits (AUD)", type: "number" },
      { key: "totalWithdrawalsAUD", label: "Total withdrawals (AUD)", type: "number" },
      { key: "totalWithdrawalsUSDT", label: "Total withdrawals (USDT)", type: "number" },
      { key: "totalWithdrawalsETH", label: "Total withdrawals (ETH)", type: "number" },
      { key: "totalWithdrawalsBTC", label: "Total withdrawals (BTC)", type: "number" },
      { key: "depositDetails", label: "Deposit details", type: "textarea", full: true },
      { key: "withdrawalDetails", label: "Withdrawal details", type: "textarea", full: true },
      { key: "transactionAnalysis", label: "Transaction analysis", type: "textarea", ai: true, full: true },
      { key: "additionalInfo", label: "Additional information", type: "textarea", full: true },
    ],
  },
  {
    heading: "5. Behavioural Analysis",
    fields: [
      { key: "ipLocations", label: "Number of IP locations", type: "number" },
      { key: "registeredAddress", label: "Registered address", type: "text" },
      { key: "behavioralAnalysis", label: "Behavioural analysis", type: "textarea", ai: true, full: true },
    ],
  },
  {
    heading: "6. Recommendation",
    fields: [
      {
        key: "recommendationType",
        label: "Recommended action",
        type: "select",
        ai: true,
        options: ["SMR", "RFI", "ECDD", "monitor", "offboard", "no_action"],
        optionLabels: { monitor: "Ongoing monitoring", offboard: "Offboard", no_action: "No further action" },
      },
      { key: "recommendation", label: "Recommendation", type: "textarea", ai: true, full: true },
      { key: "decisionRationale", label: "Decision rationale", type: "textarea", ai: true, full: true },
      { key: "keyIndicators", label: "Key indicators", type: "list", ai: true, full: true },
      { key: "typologies", label: "Typologies identified", type: "list", ai: true, full: true },
      { key: "immediateActions", label: "Immediate actions", type: "list", ai: true, full: true },
    ],
  },
];

