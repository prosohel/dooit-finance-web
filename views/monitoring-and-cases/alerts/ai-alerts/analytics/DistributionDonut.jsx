"use client";

import { Cell, Pie, PieChart, Tooltip } from "recharts";
import { ChartHint, HintRows, Section, formatCount, formatShare } from "./shared";

const SIZE = 104;

/**
 * Donut for mutually exclusive categories only — every detection carries
 * exactly one risk label and one case type, so the slices form a true whole.
 * Do not reuse it for domains or rules, which overlap.
 */
export default function DistributionDonut({ title, unit = "detections", data }) {
  const slices = data.filter((d) => d.count > 0);
  const whole = slices.reduce((sum, d) => sum + d.count, 0);

  return (
    <Section title={title} aside={`${formatCount(whole)} ${unit}`}>
      {whole === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">No data.</p>
      ) : (
        <div className="flex items-center gap-5">
          <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
            <PieChart width={SIZE} height={SIZE}>
              <Pie
                data={slices}
                dataKey="count"
                nameKey="label"
                innerRadius={34}
                outerRadius={50}
                paddingAngle={slices.length > 1 ? 2 : 0}
                // Keeps a 2-of-975 slice visible. The exact figures sit in the
                // legend, so the small exaggeration never misleads.
                minAngle={4}
                stroke="none"
                startAngle={90}
                endAngle={-270}
                // A dashboard opened many times a day: no entrance sweep.
                isAnimationActive={false}
              >
                {slices.map((d) => (
                  <Cell key={d.key} fill={d.color} />
                ))}
              </Pie>
              <Tooltip
                wrapperStyle={{ zIndex: 20 }}
                content={(props) => (
                  <ChartHint
                    {...props}
                    render={(d) => (
                      <HintRows
                        title={d.label}
                        rows={[
                          ["Count", formatCount(d.count)],
                          ["Share", formatShare(d.count, whole)],
                        ]}
                      />
                    )}
                  />
                )}
              />
            </PieChart>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[15px] font-semibold leading-none text-heading tabular-nums">
                {formatCount(whole)}
              </span>
              <span className="mt-0.5 text-[9px] text-muted-foreground">{unit}</span>
            </div>
          </div>

          <ul className="min-w-0 flex-1 space-y-2">
            {slices.map((d) => (
              <li key={d.key} className="text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="size-2 shrink-0 rounded-sm" style={{ backgroundColor: d.color }} />
                  <span className="truncate text-muted-foreground">{d.label}</span>
                </div>
                <div className="mt-0.5 flex items-baseline gap-1.5 pl-3.5">
                  <span className="text-sm font-semibold tabular-nums text-heading">{formatCount(d.count)}</span>
                  <span className="text-[11px] tabular-nums text-muted-foreground">{formatShare(d.count, whole)}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  );
}
