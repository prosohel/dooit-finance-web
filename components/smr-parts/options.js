/**
 * Canonical Part A option lists for the AUSTRAC suspicious matter report.
 *
 * Shared by the form (where they are checkboxes) and the detail view (where
 * they are a read-only checklist). Kept in one place because the two surfaces
 * must agree: if the detail view carried its own copy, a label edited on the
 * form would silently stop matching and the item would render unticked.
 */

export const DESIGNATED_SERVICES = [
  'AFSL holder arranging a designated service',
  'Account/deposit taking services',
  'Chequebook access facilities',
  'Currency exchange services',
  'Custodial/depository services',
  'Debit card access facilities',
  'Debt instruments',
  'Digital currency exchange services',
  'Electronic funds transfers',
  'Lease/hire purchase services',
  'Life insurance services',
  'Loan services',
  'Money/postal orders',
  'Payroll services',
  'Pension/annuity services',
  'Remittance services (money transfers)',
  'Retirement savings accounts',
  'Securities market/investment services',
  'Stored value cards',
  'Superannuation/approved deposit funds',
  "Traveller's cheque exchange services",
  'Bullion dealing',
  'Betting',
  'Betting accounts',
  'Chips/currency exchange',
  'Games of chance or skill',
  'Gaming machines',
];

export const SUSPICION_REASONS = [
  'ATM/cheque fraud',
  'Advanced fee/scam',
  'Avoiding reporting obligations',
  'Corporate/investment fraud',
  'Counterfeit currency',
  'Country/jurisdiction risk',
  'Credit card fraud',
  'Credit/loan facility fraud',
  'Currency not declared at border',
  'DFAT watch list',
  'False name/identity or documents',
  'Immigration related issue',
  'Inconsistent with customer profile',
  'Internet fraud',
  'National security concern',
  'Other watch list',
  'Phishing',
  'Refusal to show identification',
  'Social security issue',
  'Suspected/known criminal',
  'Suspicious behaviour',
  'Unauthorised account transactions',
  'Unusual account activity',
  'Unusual financial instrument',
  'Unusual gambling activity',
  'Unusual use/exchange of cash',
  'Unusually large FX transaction',
  'Unusually large cash transaction',
  'Unusually large transfer',
];

/** Part G — likely offence checklist. */
export const OFFENCE_TYPES = [
  'Financing of terrorism',
  'Money laundering',
  'Offence against a Commonwealth, State or Territory law',
  'Person/agent is not who they claim to be',
  'Proceeds of crime',
  'Tax evasion',
];

export const SERVICE_STATUSES = [
  { value: 'provided', label: 'Provided' },
  { value: 'requested', label: 'Requested' },
  { value: 'enquired', label: 'Enquired about' },
];

/**
 * Splits stored values into the canonical options that were ticked and any
 * values that are not on the list at all.
 *
 * Records written by the rule engine and by earlier form versions carry values
 * such as "Item 1 - account and deposit taking" that do not match the current
 * labels. Rendering only the canonical list would show them as unticked and the
 * recorded value would disappear from the report — so they are returned
 * separately and displayed as ticked extras rather than dropped.
 */
export const splitAgainstOptions = (options, values = []) => {
  const stored = Array.isArray(values) ? values.filter(Boolean) : [];
  const normalise = (s) => String(s).trim().toLowerCase();
  const optionByKey = new Map(options.map((o) => [normalise(o), o]));

  const selected = new Set();
  const extras = [];

  for (const value of stored) {
    const match = optionByKey.get(normalise(value));
    if (match) selected.add(match);
    else extras.push(value);
  }

  return { selected, extras };
};
