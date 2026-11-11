"use client";

import { useMemo, useState } from "react";
import { BarList, CASE_COLORS, HintRows, Section, Segmented, formatCount, formatShare } from "./shared";

const LIMIT = 10;

function CaseTag({ type }) {
  return (
    <span
      className="shrink-0 rounded px-1 py-px text-[9.5px] font-semibold uppercase tracking-wide"
      style={{ color: CASE_COLORS[type] || "#5b5b5b", backgroundColor: `${CASE_COLORS[type] || "#5b5b5b"}12` }}
    >
      {type}
    </span>
  );
}

export default function TopRulesChart({ rules = [], total }) {
  const [caseType, setCaseType] = useState("all");

  const caseTypes = useMemo(() => [...new Set(rules.map((r) => r.caseType).filter(Boolean))], [rules]);

  const rows = useMemo(
    () =>
      rules
        .filter((r) => caseType === "all" || r.caseType === caseType)
        .sort((a, b) => b.count - a.count)
        .slice(0, LIMIT)
        .map((rule) => ({
          key: rule.ruleId,
          count: rule.count,
          label: (
            <>
              <span className="truncate font-medium text-heading">{rule.ruleName}</span>
              <CaseTag type={rule.caseType} />
            </>
          ),
          hint: (
            <HintRows
              title={rule.ruleName}
              rows={[
                ["Rule ID", rule.ruleId],
                ["Case type", rule.caseType],
                ["Triggers", formatCount(rule.count)],
                // A detection can trigger several rules, so this is a hit rate,
                // not a slice of a whole — the rows don't add up to 100%.
                ["Hit rate", `${formatShare(rule.count, total)} of detections`],
              ]}
            />
          ),
        })),
    [rules, caseType, total]
  );

  const options = [
    { value: "all", label: "All" },
    ...caseTypes.map((type) => ({ value: type, label: type })),
  ];

  // The API returns a fixed top-N, so a filtered view can be shorter than 10.
  const aside =
    caseType === "all"
      ? `Top ${Math.min(LIMIT, rules.length)} by trigger count`
      : `${rows.length} ${caseType} rule${rows.length === 1 ? "" : "s"} in the top ${rules.length}`;

  return (
    <Section
      title="Top detection rules"
      aside={aside}
      action={caseTypes.length > 1 && (
        <Segmented label="Filter rules by case type" value={caseType} options={options} onChange={setCaseType} />
      )}
    >
      {rows.length ? (
        <BarList rows={rows} labelWidth="15rem" />
      ) : (
        <p className="py-6 text-center text-xs text-muted-foreground">No rules triggered.</p>
      )}
    </Section>
  );
}
