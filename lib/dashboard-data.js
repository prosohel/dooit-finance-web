// Dashboard Data based on the metrics calculation document

export const executiveMetrics = {
  totalCustomers: {
    value: 1055000,
    change: 12.5,
    trend: "up",
  },
  riskExposure: {
    value: 28000000, // BDT — 2.8 crore
    change: -12,
    trend: "down",
  },
  openAlerts: {
    value: 31,
    change: 5.1,
    trend: "up",
  },
  smrCases: {
    value: 15,
    change: 8.4,
    trend: "up",
  },
};

export const riskAssessmentData = {
  totalAssessed: 10054,
  period: "Last 30 days",
  breakdown: {
    unacceptable: { count: 125, percentage: 1.2 },
    high: { count: 856, percentage: 8.5 },
    medium: { count: 3219, percentage: 32.0 },
    low: { count: 5854, percentage: 58.3 },
  },
};

export const riskTrendData = [
  { month: "Aug", low: 4200, medium: 2800, high: 650, critical: 90 },
  { month: "Sep", low: 4500, medium: 2900, high: 720, critical: 100 },
  { month: "Oct", low: 4800, medium: 3000, high: 780, critical: 110 },
  { month: "Nov", low: 5100, medium: 3100, high: 810, critical: 115 },
  { month: "Dec", low: 5400, medium: 3150, high: 840, critical: 120 },
  { month: "Jan", low: 5600, medium: 3180, high: 850, critical: 122 },
  { month: "Feb", low: 5750, medium: 3200, high: 855, critical: 124 },
  { month: "Mar", low: 5854, medium: 3219, high: 856, critical: 125 },
];

export const kycStatusData = {
  pending: 317,
  approved: 9502,
  rejected: 235,
  inReview: 189,
  completionRate: 94.7,
  avgProcessingTime: "24.5 hours",
};

export const alertsData = {
  total: 317,
  slaMet: 94,
  avgResolution: "36h",
  falsePositiveRate: 12,
  byPriority: {
    p1: { open: 12, slaMet: 98, target: "24h" },
    p2: { open: 45, slaMet: 92, target: "48h" },
    p3: { open: 89, slaMet: 88, target: "72h" },
    p4: { open: 171, slaMet: 95, target: "120h" },
  },
  byType: [
    { name: "Transaction Monitoring", value: 45, count: 143 },
    { name: "Customer Screening", value: 30, count: 95 },
    { name: "Behavioral", value: 15, count: 48 },
    { name: "Document", value: 10, count: 31 },
  ],
};

export const alertsTrendData = [
  { date: "Week 1", opened: 45, closed: 42, pending: 18 },
  { date: "Week 2", opened: 52, closed: 48, pending: 22 },
  { date: "Week 3", opened: 38, closed: 45, pending: 15 },
  { date: "Week 4", opened: 61, closed: 55, pending: 21 },
  { date: "Week 5", opened: 48, closed: 52, pending: 17 },
  { date: "Week 6", opened: 55, closed: 58, pending: 14 },
  { date: "Week 7", opened: 42, closed: 47, pending: 9 },
  { date: "Week 8", opened: 38, closed: 41, pending: 6 },
];

export const smrData = {
  totalCases: 15,
  compliance: 98.7,
  avgFilingTime: "55 hours",
  withinSla: 14,
  urgencyLevels: {
    safe: { count: 8, percentage: 53.3 },
    moderate: { count: 5, percentage: 33.3 },
    high: { count: 2, percentage: 13.4 },
  },
  suspicionReasons: [
    { reason: "Structuring transactions", percentage: 45, count: 7 },
    { reason: "Identity theft concerns", percentage: 25, count: 4 },
    { reason: "Unusual account activity", percentage: 15, count: 2 },
    { reason: "High-risk jurisdiction", percentage: 10, count: 1 },
    { reason: "False documentation", percentage: 5, count: 1 },
  ],
  likelyOffences: [
    { offence: "Money Laundering", percentage: 60 },
    { offence: "Fraud", percentage: 25 },
    { offence: "Terrorism Financing", percentage: 10 },
    { offence: "Tax Evasion", percentage: 5 },
  ],
};

export const complianceMetrics = {
  smrCompliance: { value: 98.7, change: 1.5 },
  ecddOnTime: { value: 92, change: -3 },
  trainingRate: { value: 85, change: 12 },
  auditReady: { status: "READY", lastAudit: "Jul 2024" },
};

export const keyRiskIndicators = [
  { name: "PEP Coverage", value: 98, status: "success" },
  { name: "Sanctions Hits", value: 12, status: "warning", isCount: true },
  { name: "Expiring Docs", value: 45, status: "warning", isCount: true },
  { name: "QA Pass Rate", value: 94, status: "success" },
];

export const trainingData = {
  completionRate: 85,
  avgCompletionTime: "14 days",
  learnerProgress: {
    notStarted: 45,
    inProgress: 120,
    passed: 680,
    failed: 25,
  },
  passRate: 96.4,
};

export const transactionChannelData = [
  { channel: "Online", count: 245000, percentage: 42 },
  { channel: "Mobile", count: 187000, percentage: 32 },
  { channel: "ATM", count: 88000, percentage: 15 },
  { channel: "Branch", count: 47000, percentage: 8 },
  { channel: "Agent", count: 18000, percentage: 3 },
];

export const controlEffectiveness = {
  automated: 98,
  manual: 85,
  documentation: 92,
  overall: 91.7,
};

export const regulatoryCalendar = [
  { name: "AUSTRAC Quarterly Report", dueDate: "2024-10-15", daysLeft: 14, status: "pending" },
  { name: "ECDD Reviews", overdue: 8, status: "overdue" },
  { name: "SMR Filings", completed: 3, month: "This month", status: "complete" },
];
