"use client";

import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { COLORS, ChartHint, HintRows, SCORE_BAND_COLORS, Section, formatCount, formatShare } from "./shared";

/** "40-69" → 40, so bands sort numerically whatever order the API sends. */
const bandStart = (band) => Number.parseFloat(String(band)) || 0;

export default function ScoreBandsChart({ bands = {} }) {
  const data = Object.entries(bands)
    .sort(([a], [b]) => bandStart(a) - bandStart(b))
    .map(([band, count], i, arr) => ({
      band: band.replace("-", "–"),
      count,
      // Darkest shade for the highest band, whatever the band count.
      color: SCORE_BAND_COLORS[Math.max(0, SCORE_BAND_COLORS.length - arr.length + i)] || COLORS.primary,
    }));
  const whole = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <Section title="Detection score distribution" aside="Detections per score band">
      {data.length ? (
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={data} margin={{ top: 18, right: 4, bottom: 0, left: 4 }} barCategoryGap="28%">
            <XAxis
              dataKey="band"
              tickLine={false}
              axisLine={{ stroke: COLORS.grid }}
              tick={{ fontSize: 11, fill: "#696969" }}
            />
            <Tooltip
              cursor={{ fill: "#f5f5f5" }}
              content={(props) => (
                <ChartHint
                  {...props}
                  render={(d) => (
                    <HintRows
                      title={`Score ${d.band}`}
                      rows={[
                        ["Detections", formatCount(d.count)],
                        ["Share", formatShare(d.count, whole)],
                      ]}
                    />
                  )}
                />
              )}
            />
            <Bar dataKey="count" radius={[3, 3, 0, 0]} isAnimationActive={false} maxBarSize={56}>
              {data.map((d) => (
                <Cell key={d.band} fill={d.color} />
              ))}
              <LabelList
                dataKey="count"
                position="top"
                formatter={formatCount}
                style={{ fontSize: 11, fontWeight: 600, fill: "#313132" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="py-6 text-center text-xs text-muted-foreground">No scores recorded.</p>
      )}
    </Section>
  );
}
