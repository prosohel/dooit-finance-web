"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IconSearch } from "@tabler/icons-react";
import { XCircle } from "lucide-react";

// Radix Select has no "empty" item value, so "all" is the sentinel for
// "no filter" and is translated to "" on the way out (docs/65 Step 68).
const ALL = "all";

/**
 * Shared filter bar for the Companies and Trusts tabs. `facets` is a list of
 * { name, label, options: [[value, label], …] } so the two tabs differ only in
 * data, not in behaviour.
 */
export default function ListToolbar({
  search,
  onSearch,
  facets = [],
  filters,
  onFilterChange,
  onClear,
  activeFilters = [],
  searchPlaceholder = "Search…",
  right = null,
}) {
  const labelFor = (name, value) => {
    const facet = facets.find((f) => f.name === name);
    const opt = facet?.options.find(([v]) => v === value);
    return { facet: facet?.label || name, value: opt?.[1] || value };
  };

  return (
    <div className="mb-3 space-y-2 bg-white p-4 rounded">
      <div className="flex flex-wrap items-center gap-2">
        <InputGroup className="w-full max-w-xs">
          <InputGroupAddon>
            <IconSearch className="size-4" />
          </InputGroupAddon>
          <InputGroupInput
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={searchPlaceholder}
          />
        </InputGroup>

        {facets.map((facet) => (
          <Select
            key={facet.name}
            value={filters[facet.name] || ALL}
            onValueChange={(v) => onFilterChange(facet.name, v === ALL ? "" : v)}
          >
            <SelectTrigger className="w-[180px] text-xs">
              <SelectValue placeholder={facet.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{`All ${facet.label.toLowerCase()}`}</SelectItem>
              {facet.options.map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}

        <div className="ml-auto flex items-center gap-2">{right}</div>
      </div>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {activeFilters.map(([name, value]) => {
            const { facet, value: shown } = labelFor(name, value);
            return (
              <button
                key={name}
                type="button"
                onClick={() => onFilterChange(name, "")}
                className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-0.5 text-xs hover:bg-muted"
              >
                <span className="text-muted-foreground">
                  {name === "search" ? "Search" : facet}:
                </span>
                {shown}
                <XCircle className="size-3" />
              </button>
            );
          })}
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={onClear}>
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}
