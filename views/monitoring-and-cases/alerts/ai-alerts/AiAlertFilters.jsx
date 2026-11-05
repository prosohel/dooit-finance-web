"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { IconRefresh } from "@tabler/icons-react";
import { CASE_TYPES, DATE_FIELDS, DETECTORS, RISK_LABELS, SORT_OPTIONS } from "./constants";

const ALL = "all";

function FilterSelect({ label, value, onChange, options, allLabel }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      <Select value={value || ALL} onValueChange={(v) => onChange(v === ALL ? "" : v)}>
        <SelectTrigger className="h-9 min-w-32 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {allLabel && <SelectItem value={ALL}>{allLabel}</SelectItem>}
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function FilterInput({ label, className, ...props }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      <Input className={cn("h-9 text-sm", className)} {...props} />
    </div>
  );
}

const toOptions = (values) => values.map((value) => ({ value, label: value }));

export default function AiAlertFilters({ filters, onChange, onReset, error }) {
  const set = (key) => (value) => onChange({ ...filters, [key]: value });
  const setFromEvent = (key) => (e) => set(key)(e.target.value);

  return (
    <div className="rounded-md bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-end gap-3">
        <FilterInput label="From" type="date" value={filters.start} onChange={setFromEvent("start")} />
        <FilterInput label="To" type="date" value={filters.end} onChange={setFromEvent("end")} />
        <FilterSelect label="Date by" value={filters.dateField} onChange={set("dateField")} options={DATE_FIELDS} />
        <FilterSelect
          label="Detector"
          value={filters.detector}
          onChange={set("detector")}
          options={DETECTORS}
          allLabel="All detectors"
        />
        <FilterSelect
          label="Risk"
          value={filters.riskLabel}
          onChange={set("riskLabel")}
          options={toOptions(RISK_LABELS)}
          allLabel="All risk levels"
        />
        <FilterSelect
          label="Case type"
          value={filters.caseType}
          onChange={set("caseType")}
          options={toOptions(CASE_TYPES)}
          allLabel="All case types"
        />
        <FilterInput
          label="Min score"
          type="number"
          min={0}
          max={100}
          placeholder="0–100"
          className="w-24"
          value={filters.minScore}
          onChange={setFromEvent("minScore")}
        />
        <FilterInput
          label="Rule ID"
          placeholder="e.g. R5"
          className="w-28"
          value={filters.ruleId}
          onChange={setFromEvent("ruleId")}
        />
        <FilterInput
          label="Triggered field"
          placeholder="e.g. amount"
          className="w-40"
          value={filters.field}
          onChange={setFromEvent("field")}
        />
        <FilterSelect label="Sort by" value={filters.sort} onChange={set("sort")} options={SORT_OPTIONS} />
        <Button variant="ghost" size="sm" className="h-9" onClick={onReset}>
          <IconRefresh className="size-4" />
          Reset
        </Button>
      </div>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
