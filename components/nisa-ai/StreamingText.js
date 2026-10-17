'use client';
import { cn } from '@/lib/utils';
import React, { memo, useEffect, useLayoutEffect, useRef } from 'react';

// How long a freshly revealed word takes to fade/sharpen in (keep in sync with CSS).
const REVEAL_MS = 420;
// Reveal pacing: drain whatever is buffered over roughly this long…
const DRAIN_MS_STREAMING = 450;
const DRAIN_MS_FINISHED = 220;
// …but never slower/faster than this many characters per second.
const MIN_CPS = 45;
const MAX_CPS = 5000;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const collectTextNodes = (root) => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  return nodes;
};

// Last index we can safely cut at while more text is still coming: the end of
// the last complete word or tag, so a half-received word never flashes in.
const lastBoundary = (s) => {
  for (let i = s.length - 1; i >= 0; i--) {
    if (s[i] === '>' || /\s/.test(s[i])) return i + 1;
  }
  return 0;
};

// Moves a cut index so it never lands inside a tag or an HTML entity.
const settleCut = (s, i, streaming) => {
  const lt = s.lastIndexOf('<', i - 1);
  if (lt > s.lastIndexOf('>', i - 1)) {
    const close = s.indexOf('>', lt);
    i = close === -1 ? lt : close + 1;
  }
  const amp = s.lastIndexOf('&', i - 1);
  if (amp !== -1 && i - amp <= 10 && s.lastIndexOf(';', i - 1) < amp) {
    const semi = s.indexOf(';', amp);
    if (semi !== -1 && semi - amp <= 10) i = semi + 1;
    else if (streaming && semi === -1) i = amp;
  }
  return i;
};

/**
 * Renders streamed HTML at a smooth, steady pace. Incoming chunks are buffered
 * and released word by word on animation frames (no React re-renders), with
 * the release rate adapting to the backlog so bursts don't jump and trickles
 * don't stall. Newly revealed words fade/sharpen in via CSS; their delays are
 * offset by age, so re-rendering never restarts an in-progress fade.
 */
function StreamingText({ html, streaming, className }) {
  const ref = useRef(null);
  const targetRef = useRef(html || '');
  const streamingRef = useRef(streaming);
  const shownRef = useRef(-1); // chars of `html` currently rendered; -1 = never
  const carryRef = useRef(0);
  const caretRef = useRef(false);
  const caretBornRef = useRef(null);
  const textLenRef = useRef(0);
  const revealsRef = useRef([]); // { start, end, t } in text-content offsets
  const rafRef = useRef(0);
  const lastTimeRef = useRef(0);

  const paint = (len, caret, animate) => {
    const el = ref.current;
    if (!el) return;
    const now = performance.now();
    el.innerHTML = targetRef.current.slice(0, len);
    shownRef.current = len;
    caretRef.current = caret;

    const textNodes = collectTextNodes(el);
    const total = textNodes.reduce((n, t) => n + t.data.length, 0);
    if (animate && total > textLenRef.current) {
      revealsRef.current.push({ start: textLenRef.current, end: total, t: now });
    }
    textLenRef.current = total;
    revealsRef.current = revealsRef.current.filter(
      (r) => now - r.t < REVEAL_MS && r.start < total
    );

    const reveals = revealsRef.current;
    if (reveals.length) {
      let offset = 0;
      for (const node of textNodes) {
        const nodeStart = offset;
        const nodeEnd = (offset += node.data.length);
        if (!reveals.some((r) => r.end > nodeStart && r.start < nodeEnd)) {
          continue;
        }
        const frag = document.createDocumentFragment();
        let pos = nodeStart;
        // Whitespace stays as plain text so line wrapping is unaffected.
        for (const part of node.data.split(/(\s+)/)) {
          if (!part) continue;
          const reveal = /\S/.test(part)
            ? reveals.find((r) => pos + part.length > r.start && pos < r.end)
            : null;
          if (reveal) {
            const span = document.createElement('span');
            span.className = 'nisa-reveal';
            span.style.animationDelay = `${Math.round(reveal.t - now)}ms`;
            span.textContent = part;
            frag.appendChild(span);
          } else {
            frag.appendChild(document.createTextNode(part));
          }
          pos += part.length;
        }
        node.parentNode.replaceChild(frag, node);
      }
    }

    if (caret) {
      // Trail the last character inside its own block, not after a </p>.
      const dot = document.createElement('span');
      dot.className = 'nisa-caret';
      dot.setAttribute('aria-hidden', 'true');
      // The caret is rebuilt each paint; offsetting by its age keeps the pulse
      // continuous instead of restarting on every word.
      caretBornRef.current ??= now;
      dot.style.animationDelay = `${Math.round(caretBornRef.current - now)}ms`;
      const last = collectTextNodes(el).pop();
      const anchor = last?.parentNode?.classList?.contains('nisa-reveal')
        ? last.parentNode
        : last;
      if (anchor) anchor.parentNode.insertBefore(dot, anchor.nextSibling);
      else el.appendChild(dot);
    }
  };

  const tick = (now) => {
    rafRef.current = 0;
    const target = targetRef.current;
    const isStreaming = streamingRef.current;
    const shown = shownRef.current;
    const limit = isStreaming ? lastBoundary(target) : target.length;

    if (shown >= limit) {
      // Caught up: drop the caret once the stream has really ended.
      if (!isStreaming && caretRef.current) paint(shown, false, false);
      return;
    }

    const dt = Math.min(now - (lastTimeRef.current || now - 16), 64);
    lastTimeRef.current = now;
    const backlog = target.length - shown;
    const drain = isStreaming ? DRAIN_MS_STREAMING : DRAIN_MS_FINISHED;
    const cps = Math.min(Math.max((backlog * 1000) / drain, MIN_CPS), MAX_CPS);
    carryRef.current += (cps * dt) / 1000;

    if (carryRef.current >= 1) {
      let next = Math.min(shown + Math.floor(carryRef.current), limit);
      // Finish the current word so text always appears in whole words.
      while (next < limit && !/[\s<]/.test(target[next])) next++;
      next = Math.min(settleCut(target, next, isStreaming), target.length);
      if (next <= shown) {
        // Waiting on the rest of a tag/entity; resume when more text arrives.
        // If the stream already ended, just flush whatever is left.
        carryRef.current = 0;
        if (!isStreaming) paint(target.length, false, true);
        return;
      }
      carryRef.current = Math.max(carryRef.current - (next - shown), 0);
      paint(next, true, true);
    }
    rafRef.current = requestAnimationFrame(tick);
  };

  const start = () => {
    if (rafRef.current) return;
    lastTimeRef.current = 0;
    rafRef.current = requestAnimationFrame(tick);
  };

  useLayoutEffect(() => {
    targetRef.current = html || '';
    streamingRef.current = streaming;

    // A message that's already complete when it mounts (history) or with
    // reduced motion enabled renders instantly.
    if ((shownRef.current === -1 && !streaming) || prefersReducedMotion()) {
      paint(targetRef.current.length, false, false);
      return;
    }
    if (shownRef.current === -1) paint(0, true, false);
    if (shownRef.current > targetRef.current.length) {
      paint(targetRef.current.length, streaming, false);
    }
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html, streaming]);

  useEffect(() => {
    // Re-arm after Strict Mode's simulated unmount/remount.
    if (shownRef.current < targetRef.current.length || caretRef.current) start();
    return () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={ref}
      aria-live={streaming ? 'polite' : undefined}
      aria-busy={streaming || undefined}
      className={cn('nisa-stream', className)}
    />
  );
}

export default memo(StreamingText);
