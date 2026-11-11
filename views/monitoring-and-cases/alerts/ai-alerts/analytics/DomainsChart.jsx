"use client";

import { useMemo, useState } from "react";
import { IconChevronDown } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { BarList, COLORS, HintRows, Section, formatCount, formatShare } from "./shared";

const LIMIT = 8;

export default function DomainsChart({ domains = {}, total }) {
  const [expanded, setExpanded] = useState(false);

  const all = useMemo(
    () =>
      Object.entries(domains)
        .sort(([, a], [, b]) => b - a)
        .map(([name, count]) => ({
          key: name,
          count,
          label: <span className="truncate text-heading">{name}</span>,
          hint: (
            <HintRows
              title={name}
              rows={[
                ["Detections", formatCount(count)],
                ["Hit rate", `${formatShare(count, total)} of detections`],
              ]}
            />
          ),
        })),
    [domains, total]
  );

  const hidden = all.length - LIMIT;
  // Scale every bar to the overall max so the extra rows stay comparable
  // with the first eight once expanded.
  const max = all[0]?.count || 1;

  return (
    <Section
      title="Detection domains"
      // Domains overlap — one detection can match several — so counts are
      // shown as-is and never as a share of a whole.
      aside="Domains overlap; a detection can match several"
    >
      {all.length ? (
        <>
          <BarList rows={expanded ? all : all.slice(0, LIMIT)} max={max} color={COLORS.primaryLight} labelWidth="15rem" />
          {hidden > 0 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="mt-2 inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium text-primary transition-[background-color,transform] duration-150 ease-out hover:bg-smoke-200/70 active:scale-[0.97]"
            >
              {expanded ? "Show top 8" : `View all ${all.length} domains`}
              <IconChevronDown
                className={cn("size-3.5 transition-transform duration-200 ease-out", expanded && "rotate-180")}
              />
            </button>
          )}
        </>
      ) : (
        <p className="py-6 text-center text-xs text-muted-foreground">No domains recorded.</p>
      )}
    </Section>
  );
}
