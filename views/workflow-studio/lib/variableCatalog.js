// Variable namespaces and operators offered in the condition editor.
//
// Operators mirror api/models/RuleEngine.js ConditionLeafSchema exactly — a
// workflow condition and a rule condition are the same leaf, so the vocabulary
// must not fork. The field list extends
// views/risk-rule-engine/rule-configuration/form/fieldCatalog.js with the
// applicant/check/device namespaces a workflow can also read.
//
// The field input stays free-text: an analyst can type any schema path.

export const OPERATORS = [
  { value: 'eq',         label: 'is' },
  { value: 'ne',         label: 'is not' },
  { value: 'gt',         label: 'is more than' },
  { value: 'gte',        label: 'is at least' },
  { value: 'lt',         label: 'is less than' },
  { value: 'lte',        label: 'is at most' },
  { value: 'in',         label: 'is in' },
  { value: 'nin',        label: 'is not in' },
  { value: 'between',    label: 'is between' },
  { value: 'contains',   label: 'contains' },
  { value: 'startsWith', label: 'starts with' },
  { value: 'endsWith',   label: 'ends with' },
  { value: 'exists',     label: 'is present' },
  { value: 'regex',      label: 'matches' },
]

export const operatorLabel = (value) =>
  OPERATORS.find((o) => o.value === value)?.label ?? value

export const VARIABLE_NAMESPACES = [
  { ns: 'applicant',      fields: 'type, fullName, country, review.reviewAnswer, review.rejectLabels, riskLabels.aml, riskLabels.device, assessment.scores, tags' },
  { ns: 'poi / poa',      fields: 'country, idDocType, dob.ageInYears, validUntil, nationality, address.country, fullMrz' },
  { ns: 'device',         fields: 'ipCountry, ipStateCode' },
  { ns: 'deviceStats',    fields: 'minutes5.deviceCount, days1.sameDeviceApplicantCount, days7.riskLabels' },
  { ns: 'checks',         fields: 'ip.vpn, ip.tor, ip.riskLevel, personWatchlist.matchStatuses, company.info.status, email.blacklisted' },
  { ns: 'questionnaires', fields: 'questionnaire["kyc"]["employment"]["employmentType"]' },
  { ns: 'clientLists',    fields: 'risky_countries, internal_denylist, approved_introducers' },
  { ns: 'transaction',    fields: 'physicalCurrencyAmount, isInternationalTransfer, convertedAmountAUD, channel' },
  { ns: 'case',           fields: 'groundsToSuspect, explanation, priority' },
  { ns: 'date / random',  fields: 'timestamp, year, ageInYears, ageInDays, random 0.0 to 1.0' },
]
