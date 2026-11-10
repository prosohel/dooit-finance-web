"use client";

// AI monitoring read-out for the Overview tab. Rendered only when the alert
// carries a `monitoringResult` (AI-based alerts); takes the place of the
// rule-snapshot "Why this alert fired" block so nothing is shown twice.

import { IconActivity, IconListCheck } from "@tabler/icons-react";
import CollapsibleSection from "@/views/monitoring-and-cases/case-manager/details/components/CollapsibleSection";
import TriggeredRules from "./TriggeredRules";
import BehavioralAnalysis from "./BehavioralAnalysis";

export default function MonitoringResult({ monitoring }) {
  return (
    <>
      <CollapsibleSection id="triggered-rules" title="Triggered rules" icon={IconListCheck} badge={monitoring.rules.length || null}>
        <TriggeredRules rules={monitoring.rules} summary={monitoring.summary} />
      </CollapsibleSection>
      <CollapsibleSection id="behavioral-analysis" title="Behavioral analysis" icon={IconActivity}>
        <BehavioralAnalysis behavior={monitoring.behavior} />
      </CollapsibleSection>
    </>
  );
}
