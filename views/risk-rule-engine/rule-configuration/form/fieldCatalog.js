// Known condition fields for the visual builder dropdown.
//
// Mirrors FIELD_ALIASES in api/services/ruleEvaluation.js — every value here
// resolves against transaction data during backtest/evaluation, so rules built
// from this list never produce "field never resolved" misses. The dropdown is
// creatable: analysts can still type any raw schema path (e.g. `crypto.network`
// or `customer.country`) when they need something off-catalogue.

export const CONDITION_FIELD_OPTIONS = [
  {
    label: 'Transaction',
    options: [
      { value: 'amount',                label: 'amount' },                // AUD-converted when available
      { value: 'convertedAmountAUD',    label: 'convertedAmountAUD' },
      { value: 'currency',              label: 'currency' },
      { value: 'type',                  label: 'type' },
      { value: 'subtype',               label: 'subtype' },
      { value: 'channel',               label: 'channel' },
      { value: 'status',                label: 'status' },
      { value: 'purpose',               label: 'purpose' },
      { value: 'remittancePurposeCode', label: 'remittancePurposeCode' },
      { value: 'reference',             label: 'reference' },
      { value: 'narrative',             label: 'narrative' },
      { value: 'riskScore',             label: 'riskScore' },
      { value: 'riskFlags',             label: 'riskFlags' },
      { value: 'relatedPartyFlag',      label: 'relatedPartyFlag' },
    ],
  },
  {
    label: 'Parties (any of sender / receiver / beneficiary / intermediary)',
    options: [
      { value: 'country',            label: 'country' },            // institution country of any party
      { value: 'institutionCountry', label: 'institutionCountry' },
      { value: 'institution',        label: 'institution' },
      { value: 'bic',                label: 'bic' },
    ],
  },
  {
    label: 'Customer (any populated party customer)',
    options: [
      { value: 'pep',       label: 'pep' },
      { value: 'sanction',  label: 'sanction' },
      { value: 'amlStatus', label: 'amlStatus' },
      { value: 'kycStatus', label: 'kycStatus' },
    ],
  },
  {
    label: 'Crypto / Forensics',
    options: [
      { value: 'hops',             label: 'hops' },             // crypto.hops
      { value: 'chainalysisScore', label: 'chainalysisScore' }, // forensic.chainalysisScore
    ],
  },
];
