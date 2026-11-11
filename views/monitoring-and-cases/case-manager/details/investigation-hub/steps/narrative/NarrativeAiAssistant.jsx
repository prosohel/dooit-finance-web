"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { IconArrowUp, IconArrowRight, IconSparkles, IconX } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

/**
 * Floating "Ask AI" composer for the narrative editor. DEMO ONLY: the
 * "AI" is a local rule-based rewriter (see `runAssistant`) — no network call.
 *
 * It never writes into the form. Every rewrite is handed to `onSuggest`, which
 * shows it as the editor's usual "Suggested → Use this / Dismiss" card, so the
 * analyst stays in control and autosave only fires when they accept.
 */

// Feels like a model thinking, without making the demo tedious.
const THINK_MS = [700, 1300];

const STARTERS = [
  "Make the summary more concise",
  "Rewrite in a formal tone for the regulator",
  "Expand the narrative with more detail",
  "What's missing from this narrative?",
];

export default function NarrativeAiAssistant({ type, label, sections, values, onSuggest }) {
  const [open, setOpen] = useState(false);
  const [instant, setInstant] = useState(false); // keyboard close → no animation
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [messages, setMessages] = useState([]);

  const inputRef = useRef(null);
  const triggerRef = useRef(null);
  const listRef = useRef(null);
  const thinkTimer = useRef(null);

  const fields = useMemo(() => sections.flatMap((s) => s.fields), [sections]);

  useEffect(() => () => clearTimeout(thinkTimer.current), []);

  // Keep the newest message in view.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, thinking]);

  const openPanel = () => {
    setInstant(false);
    setOpen(true);
    // The panel is `visibility: hidden` until this frame; focus after it shows.
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const closePanel = ({ viaKeyboard = false } = {}) => {
    setInstant(viaKeyboard);
    setOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
  };

  const send = (text = input) => {
    const prompt = text.trim();
    if (!prompt || thinking) return;
    setMessages((m) => [...m, { id: Date.now(), role: "user", text: prompt }]);
    setInput("");
    setThinking(true);

    const delay = THINK_MS[0] + Math.random() * (THINK_MS[1] - THINK_MS[0]);
    thinkTimer.current = setTimeout(() => {
      const { reply, changes } = runAssistant(prompt, fields, values);
      const offered = Object.keys(changes).length ? onSuggest(changes) : [];
      setMessages((m) => [
        ...m,
        {
          id: Date.now() + 1,
          role: "ai",
          text: Object.keys(changes).length && !offered.length
            ? "Those sections already read that way — nothing new to suggest."
            : reply,
          fields: offered.map((k) => fields.find((f) => f.key === k)).filter(Boolean),
        },
      ]);
      setThinking(false);
    }, delay);
  };

  const jumpTo = (key) => {
    const el = document.getElementById(`${type}-${key}`);
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 grid justify-items-center px-4">
      {/* Collapsed pill */}
      <button
        ref={triggerRef}
        type="button"
        onClick={openPanel}
        aria-expanded={open}
        aria-controls="narrative-ai-panel"
        data-open={open}
        data-instant={instant}
        className={cn(
          "nai-trigger pointer-events-auto col-start-1 row-start-1 self-end",
          "flex items-center gap-2.5 rounded-full border border-violet-200/80 bg-white/95 py-2 pl-2 pr-4",
          "text-[13px] font-medium text-muted-foreground shadow-[0_10px_30px_-10px_rgba(109,40,217,0.45)] backdrop-blur",
          "[@media(hover:hover)_and_(pointer:fine)]:hover:border-violet-300 [@media(hover:hover)_and_(pointer:fine)]:hover:text-heading",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300",
        )}
      >
        <span className="grid size-7 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
          <IconSparkles className="size-3.5" />
        </span>
        Ask AI to rewrite or review the {label} narrative…
      </button>

      {/* Expanded composer */}
      <div
        id="narrative-ai-panel"
        role="dialog"
        aria-label={`${label} narrative assistant`}
        aria-hidden={!open}
        data-open={open}
        data-instant={instant}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            closePanel({ viaKeyboard: true });
          }
        }}
        className={cn(
          "nai-panel pointer-events-auto col-start-1 row-start-1 self-end",
          "flex max-h-[min(560px,70vh)] w-full max-w-[460px] flex-col overflow-hidden rounded-2xl",
          "border border-violet-200/70 bg-white/95 shadow-[0_24px_60px_-16px_rgba(76,29,149,0.4)] backdrop-blur",
        )}
      >
        <div className="flex items-center gap-2 border-b border-border/70 px-4 py-2.5">
          <span className="grid size-6 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
            <IconSparkles className="size-3" />
          </span>
          <span className="text-[13px] font-semibold text-heading">Narrative assistant</span>
          <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">
            {label}
          </span>
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
            Demo
          </span>
          <button
            type="button"
            onClick={() => closePanel()}
            aria-label="Close assistant"
            className="nai-press ml-auto grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-heading"
          >
            <IconX className="size-4" />
          </button>
        </div>

        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {messages.length === 0 ? (
            <div>
              <p className="mb-3 text-[12.5px] leading-relaxed text-muted-foreground">
                Tell me how to change the narrative, paste a summary for me to tidy up, or ask
                what to improve. Rewrites appear as suggestions beside each field — nothing changes
                until you click <span className="font-semibold text-heading">Use this</span>.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {/* The stagger is tied to [data-open], so it replays on every open. */}
                {STARTERS.map((s, i) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    style={{ "--nai-delay": `${60 + i * 40}ms` }}
                    className="nai-chip nai-press rounded-full border border-violet-200 bg-violet-50/60 px-2.5 py-1 text-[11.5px] font-medium text-violet-800 hover:border-violet-300 hover:bg-violet-100"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {messages.map((m) => (
                <Message key={m.id} message={m} onJump={jumpTo} />
              ))}
              {thinking && (
                <div className="nai-msg flex items-center gap-1.5 self-start rounded-2xl rounded-bl-md bg-violet-50 px-3 py-2.5">
                  <span className="sr-only">Thinking</span>
                  <span className="nai-dot" />
                  <span className="nai-dot" style={{ animationDelay: "150ms" }} />
                  <span className="nai-dot" style={{ animationDelay: "300ms" }} />
                </div>
              )}
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex items-end gap-2 border-t border-border/70 px-3 py-2.5"
        >
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="e.g. Make the profile summary shorter and more formal"
            className="field-sizing-content max-h-32 min-h-9 flex-1 resize-none bg-transparent px-1 py-2 text-[13px] text-heading outline-none placeholder:text-muted-foreground/70"
          />
          <button
            type="submit"
            disabled={!input.trim() || thinking}
            aria-label="Send"
            className="nai-press grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white transition-opacity duration-150 disabled:opacity-40"
          >
            <IconArrowUp className="size-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

function Message({ message, onJump }) {
  if (message.role === "user") {
    return (
      <div className="nai-msg max-w-[85%] self-end whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-3 py-2 text-[12.5px] text-white">
        {message.text}
      </div>
    );
  }
  return (
    <div className="nai-msg max-w-[92%] self-start rounded-2xl rounded-bl-md bg-violet-50 px-3 py-2 text-[12.5px] leading-relaxed text-violet-950">
      <p className="whitespace-pre-wrap">{message.text}</p>
      {message.fields?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {message.fields.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => onJump(f.key)}
              className="nai-press flex items-center gap-1 rounded-full border border-violet-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-violet-700 hover:border-violet-300"
            >
              {f.label}
              <IconArrowRight className="size-3" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Demo "AI" ─────────────────────────
 * A deterministic stand-in for a model call. Replace `runAssistant` with a
 * server action returning the same `{ reply, changes }` shape to go live.
 */

const PROSE_TYPES = new Set(["textarea"]);

const INTENTS = [
  ["shorten", /\b(concise|shorter|shorten|trim|brief|tighten|condense|cut)\b/],
  ["bullets", /\b(bullet|bullets|bullet points|points|list it)\b/],
  ["expand", /\b(expand|detail|detailed|longer|elaborate|more context|flesh)\b/],
  ["plain", /\b(plain|simpler|simplify|simple|easier|clearer)\b/],
  ["formal", /\b(formal|professional|regulator|austrac|objective|neutral|tone)\b/],
  ["draft", /\b(write|draft|generate|compose|create)\b/],
];

const QUESTION = /\?\s*$|^(what|how|why|which|should|can|could|is|are|any|suggest|tips|review|check|missing)\b/;

function runAssistant(prompt, fields, values) {
  const text = prompt.toLowerCase();
  const prose = fields.filter((f) => PROSE_TYPES.has(f.type));
  const subject = values.fullName || values.customerName || values.companyName || "The customer";

  // Which fields? Those named in the prompt, else the AI-drafted ones.
  const named = prose.filter((f) => mentions(text, f));
  const intent = INTENTS.find(([, re]) => re.test(text))?.[0];

  // A pasted summary: long, and not an instruction we recognise.
  if (!intent && !QUESTION.test(text) && prompt.length > 120) {
    const target = named[0] || prose.find((f) => f.ai) || prose[0];
    return {
      reply: `Tidied your text and staged it for “${target.label}”. Review it in the form.`,
      changes: { [target.key]: formalise(tidy(prompt)) },
    };
  }

  if (!intent && QUESTION.test(text)) return { reply: review(fields, values), changes: {} };

  const targets = named.length ? named : prose.filter((f) => f.ai);
  const changes = {};
  for (const f of targets) {
    const current = String(values[f.key] ?? "").trim();
    const next = transform(intent || "formal", current, f, subject);
    if (next && next !== current) changes[f.key] = next;
  }

  const n = Object.keys(changes).length;
  const count = n === 1 ? `“${targets.find((f) => changes[f.key]).label}”` : `${n} sections`;
  const what = {
    shorten: `tightened ${count}`,
    bullets: `turned ${count} into bullet points`,
    expand: `expanded ${count}`,
    plain: `simplified ${count}`,
    formal: `rewritten ${count} in a formal, regulator-ready tone`,
    draft: `drafted ${count}`,
  }[intent || "formal"];

  return {
    reply: n
      ? `I've ${what}. The suggestion${n === 1 ? " is" : "s are"} waiting beside the field${n === 1 ? "" : "s"} — take what you like.`
      : "I couldn't find text to work on there. Try naming a section, e.g. “shorten the profile summary”.",
    changes,
  };
}

function mentions(text, field) {
  const label = field.label.toLowerCase();
  if (text.includes(label)) return true;
  // "profile summary" → "profile", "summary"; match when every meaningful word appears.
  const words = label.split(/[^a-z]+/).filter((w) => w.length > 3);
  return words.length > 0 && words.every((w) => text.includes(w));
}

function transform(intent, current, field, subject) {
  if (!current || intent === "draft") return draftFor(field, subject, current);
  switch (intent) {
    case "shorten": {
      const s = sentences(tidy(current));
      return s.slice(0, Math.max(1, Math.min(2, Math.ceil(s.length / 2)))).join(" ");
    }
    case "bullets":
      return sentences(current)
        .map((s) => `• ${s.replace(/[.;]\s*$/, "")}`)
        .join("\n");
    case "expand":
      return `${current.replace(/\s*$/, "")} ${expansion(field, subject)}`;
    case "plain":
      return simplify(current);
    default:
      return formalise(current);
  }
}

function draftFor(field, subject, current) {
  const base = current ? `${current.replace(/\s*$/, "")} ` : "";
  const label = field.label.toLowerCase();
  if (label.includes("profile"))
    return `${base}${subject} was onboarded following standard KYC verification. The account purpose and expected trading volume were declared at onboarding, and activity has been reviewed against that profile as part of this enhanced due diligence.`;
  if (label.includes("suspicion"))
    return `${base}Activity on the account of ${subject} is inconsistent with the customer's declared profile. Funds were received and moved on within a short period, a pattern indicative of pass-through behaviour. The matter is reported on the basis of reasonable grounds for suspicion.`;
  if (label.includes("transaction"))
    return `${base}Over the analysis period, deposits and withdrawals were reviewed for volume, frequency and counterparties. The observed activity was compared with the expected trading volume declared by ${subject}.`;
  return `${base}${subject}: ${field.label} reviewed by the analyst. The information recorded is consistent with the case records available at the time of review.`;
}

function expansion(field, subject) {
  const label = field.label.toLowerCase();
  if (label.includes("transaction"))
    return `The velocity and value of these movements were assessed against the customer's declared purpose, and counterparties were screened where available. Continued monitoring is recommended to confirm whether the pattern persists.`;
  if (label.includes("suspicion"))
    return `The timing, value and counterparties involved are not consistent with the customer's stated occupation or account purpose. No satisfactory explanation has been identified at the time of reporting.`;
  return `This assessment draws on ${subject === "The customer" ? "the customer's" : `${subject}'s`} KYC records and transaction history available at the time of review. Further information will be obtained where gaps remain.`;
}

function review(fields, values) {
  const empty = fields.filter((f) => isBlank(values[f.key]));
  const thin = fields.filter(
    (f) => PROSE_TYPES.has(f.type) && !isBlank(values[f.key]) && String(values[f.key]).length < 160,
  );
  const lines = [];
  if (empty.length)
    lines.push(
      `• ${empty.length} field${empty.length === 1 ? " is" : "s are"} still empty: ${empty
        .slice(0, 4)
        .map((f) => f.label)
        .join(", ")}${empty.length > 4 ? ", …" : ""}.`,
    );
  if (thin.length)
    lines.push(`• ${thin.map((f) => f.label).join(", ")} read${thin.length === 1 ? "s" : ""} thin — ask me to expand ${thin.length === 1 ? "it" : "them"}.`);
  lines.push("• State the grounds for suspicion plainly and tie each claim to a figure or date.");
  lines.push("• Avoid speculation; regulators favour objective, factual language.");
  return `Here's what I'd look at:\n${lines.join("\n")}`;
}

const isBlank = (v) => (Array.isArray(v) ? v.length === 0 : v == null || String(v).trim() === "");

function sentences(text) {
  return (text.match(/[^.!?\n]+[.!?]*/g) || []).map((s) => s.trim()).filter(Boolean);
}

// Upper-case the first letter of every sentence (after `tidy` drops a lead word).
const capitalise = (text) => text.replace(/(^\s*|[.!?]\s+|•\s*)([a-z])/g, (_, p, c) => p + c.toUpperCase());

function tidy(text) {
  return capitalise(
    text
      .replace(/\b(very|really|basically|actually|just|quite)\s+/gi, "")
      .replace(/\bin order to\b/gi, "to")
      .replace(/\s{2,}/g, " ")
      .trim(),
  );
}

const FORMAL = [
  [/\bdon't\b/gi, "do not"],
  [/\bdoesn't\b/gi, "does not"],
  [/\bdidn't\b/gi, "did not"],
  [/\bcan't\b/gi, "cannot"],
  [/\bwon't\b/gi, "will not"],
  [/\bisn't\b/gi, "is not"],
  [/\bwasn't\b/gi, "was not"],
  [/\bit's\b/gi, "it is"],
  [/\ba lot of\b|\blots of\b/gi, "a substantial amount of"],
  [/\bseem(s?)\b/gi, "appear$1"],
  [/\bkind of\b|\bsort of\b/gi, "somewhat"],
  [/\bbig\b/gi, "substantial"],
  [/\bgot\b/gi, "received"],
  [/\bsent\b/gi, "transferred"],
];

function formalise(text) {
  let out = tidy(FORMAL.reduce((t, [re, to]) => t.replace(re, to), text));
  out = capitalise(out);
  if (!/[.!?]$/.test(out)) out += ".";
  return out;
}

const PLAIN = [
  [/\butili[sz]e[sd]?\b/gi, "use"],
  [/\bcommence[sd]?\b/gi, "start"],
  [/\bsubsequently\b/gi, "then"],
  [/\bprior to\b/gi, "before"],
  [/\bin excess of\b/gi, "over"],
  [/\bapproximately\b/gi, "about"],
  [/\bindicative of\b/gi, "a sign of"],
  [/\bin relation to\b/gi, "about"],
];

function simplify(text) {
  return tidy(PLAIN.reduce((t, [re, to]) => t.replace(re, to), text));
}
