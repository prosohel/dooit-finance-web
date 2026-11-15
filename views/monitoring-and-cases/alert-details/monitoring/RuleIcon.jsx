"use client";

// A small coloured icon that describes what a rule detects (pass-through,
// sudden spike, structuring, sanctions hit…), so analysts can recognise a rule
// at a glance. Picked by keyword from the rule's name/id, then its
// explanation; first match wins, so specific patterns come before generic ones.

import {
  IconTransfer,
  IconStack2,
  IconTrendingUp,
  IconTrendingDown,
  IconBolt,
  IconCoins,
  IconShieldX,
  IconAlertOctagon,
  IconCurrencyBitcoin,
  IconCash,
  IconWorld,
  IconMapPin,
  IconDeviceMobile,
  IconMail,
  IconFileText,
  IconMoon,
  IconDice,
  IconHeartHandshake,
  IconUserPlus,
  IconUser,
  IconLock,
  IconBuildingBank,
  IconEyeOff,
  IconQuestionMark,
  IconLink,
  IconCurrencyDollar,
  IconListCheck,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

const RULE_ICONS = [
  { test: /pass[\s_-]?through|layering/i, icon: IconTransfer, tone: "bg-violet-100 text-violet-700" },
  { test: /structur|smurf/i, icon: IconStack2, tone: "bg-amber-100 text-amber-800" },
  { test: /(sudden|spike).*(increase|rise|spike)|amt[\s_]increase/i, icon: IconTrendingUp, tone: "bg-rose-100 text-rose-700" },
  { test: /(sudden).*(drop|decrease)/i, icon: IconTrendingDown, tone: "bg-sky-100 text-sky-700" },
  { test: /ofac|sanction|pep\b/i, icon: IconShieldX, tone: "bg-red-100 text-red-700" },
  { test: /fraud/i, icon: IconAlertOctagon, tone: "bg-red-100 text-red-700" },
  { test: /freq|velocity|rapid|burst/i, icon: IconBolt, tone: "bg-orange-100 text-orange-700" },
  { test: /round/i, icon: IconCoins, tone: "bg-yellow-100 text-yellow-800" },
  { test: /crypto|defi|\bdex\b|bridge|\bl2\b|wallet|blockchain|hops|mining/i, icon: IconCurrencyBitcoin, tone: "bg-orange-100 text-orange-700" },
  { test: /hidden/i, icon: IconEyeOff, tone: "bg-slate-200 text-slate-700" },
  { test: /cash|\batm\b/i, icon: IconCash, tone: "bg-emerald-100 text-emerald-700" },
  { test: /cross[\s_-]?border|\bintl\b|international|\bfx\b|forex|remit|wire|travel/i, icon: IconWorld, tone: "bg-teal-100 text-teal-700" },
  { test: /\bhr\b|high[\s_-]?risk|country|region|geo/i, icon: IconMapPin, tone: "bg-pink-100 text-pink-700" },
  { test: /device|\bip\b|datacenter|login|session/i, icon: IconDeviceMobile, tone: "bg-indigo-100 text-indigo-700" },
  { test: /email|phone/i, icon: IconMail, tone: "bg-indigo-100 text-indigo-700" },
  { test: /document|ocr|invoice/i, icon: IconFileText, tone: "bg-yellow-100 text-yellow-800" },
  { test: /night|weekend/i, icon: IconMoon, tone: "bg-slate-200 text-slate-700" },
  { test: /gambl|gamble|casino/i, icon: IconDice, tone: "bg-fuchsia-100 text-fuchsia-700" },
  { test: /charity|\bngo\b|donation/i, icon: IconHeartHandshake, tone: "bg-pink-100 text-pink-700" },
  { test: /new(ly)?[\s_]|new account/i, icon: IconUserPlus, tone: "bg-cyan-100 text-cyan-800" },
  { test: /linkage|shared|link/i, icon: IconLink, tone: "bg-cyan-100 text-cyan-800" },
  { test: /elderly|minor|jobless|self[\s_]employed/i, icon: IconUser, tone: "bg-blue-100 text-blue-700" },
  { test: /breach|exposure|privacy/i, icon: IconLock, tone: "bg-slate-200 text-slate-700" },
  { test: /loan|bank/i, icon: IconBuildingBank, tone: "bg-lime-100 text-lime-800" },
  { test: /\bsof\b|\bsow\b|unclear|unknown|without[\s_]ref|purpose/i, icon: IconQuestionMark, tone: "bg-amber-100 text-amber-800" },
  { test: /large|amount|amt|high|extreme/i, icon: IconCurrencyDollar, tone: "bg-emerald-100 text-emerald-700" },
];

const FALLBACK = { icon: IconListCheck, tone: "bg-muted text-muted-foreground" };

export function ruleIconFor(rule) {
  const primary = [rule?.name, rule?.ruleId].filter(Boolean).join(" ");
  return (
    RULE_ICONS.find((r) => r.test.test(primary)) ||
    (rule?.explanation && RULE_ICONS.find((r) => r.test.test(rule.explanation))) ||
    FALLBACK
  );
}

export default function RuleIcon({ rule, className }) {
  const { icon: Icon, tone } = ruleIconFor(rule);
  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex size-6 shrink-0 items-center justify-center rounded-md", tone, className)}
    >
      <Icon className="size-3.5" stroke={2} />
    </span>
  );
}
