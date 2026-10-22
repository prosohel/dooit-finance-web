'use client';
import { useCallback, useEffect, useRef } from 'react';

// Distance from the bottom (px) within which the view counts as "following".
const PIN_THRESHOLD = 64;
// Time constant of the follow easing; lower = snappier.
const FOLLOW_MS = 110;

/**
 * Keeps a scroll container glued to the bottom while its content grows, using
 * one frame-driven ease instead of stacking `scrollIntoView({behavior:'smooth'})`
 * calls (which restart on every chunk and judder). Scrolling up releases the
 * lock; scrolling back near the bottom re-engages it.
 */
export default function useStickToBottom() {
  const scrollElRef = useRef(null);
  const pinnedRef = useRef(true);
  const rafRef = useRef(0);
  const lastTimeRef = useRef(0);
  const lastSetTopRef = useRef(null);
  const observerRef = useRef(null);

  const tick = useCallback((now) => {
    const el = scrollElRef.current;
    rafRef.current = 0;
    if (!el || !pinnedRef.current) return;

    const target = el.scrollHeight - el.clientHeight;
    const diff = target - el.scrollTop;
    if (diff <= 0.5) return;

    const dt = Math.min(now - (lastTimeRef.current || now - 16), 64);
    lastTimeRef.current = now;
    const step = diff * (1 - Math.exp(-dt / FOLLOW_MS));
    el.scrollTop += Math.min(diff, Math.max(step, 1));
    lastSetTopRef.current = el.scrollTop;
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const kick = useCallback(() => {
    if (rafRef.current || !pinnedRef.current) return;
    lastTimeRef.current = 0;
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const stickToBottom = useCallback(() => {
    pinnedRef.current = true;
    kick();
  }, [kick]);

  const scrollRef = useCallback(
    (el) => {
      const prev = scrollElRef.current;
      if (prev?._stickCleanup) prev._stickCleanup();
      scrollElRef.current = el;
      if (!el) return;

      const onScroll = () => {
        // Ignore the scroll events our own easing produces.
        if (
          lastSetTopRef.current !== null &&
          Math.abs(el.scrollTop - lastSetTopRef.current) < 2
        ) {
          return;
        }
        lastSetTopRef.current = null;
        const distance = el.scrollHeight - el.clientHeight - el.scrollTop;
        pinnedRef.current = distance < PIN_THRESHOLD;
        if (pinnedRef.current) kick();
      };
      // Release immediately on upward intent, before the scroll event lands.
      const onWheel = (e) => {
        if (e.deltaY < 0) pinnedRef.current = false;
      };
      let touchY = 0;
      const onTouchStart = (e) => (touchY = e.touches[0]?.clientY ?? 0);
      const onTouchMove = (e) => {
        if ((e.touches[0]?.clientY ?? 0) > touchY) pinnedRef.current = false;
      };

      el.addEventListener('scroll', onScroll, { passive: true });
      el.addEventListener('wheel', onWheel, { passive: true });
      el.addEventListener('touchstart', onTouchStart, { passive: true });
      el.addEventListener('touchmove', onTouchMove, { passive: true });
      el._stickCleanup = () => {
        el.removeEventListener('scroll', onScroll);
        el.removeEventListener('wheel', onWheel);
        el.removeEventListener('touchstart', onTouchStart);
        el.removeEventListener('touchmove', onTouchMove);
      };
    },
    [kick]
  );

  // Attach to the growing content; every size change nudges the follower.
  const contentRef = useCallback(
    (el) => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      if (!el || typeof ResizeObserver === 'undefined') return;
      observerRef.current = new ResizeObserver(kick);
      observerRef.current.observe(el);
    },
    [kick]
  );

  // The ResizeObserver is owned by `contentRef` (torn down when it gets null);
  // here we only stop the loop, resetting the id so `kick` can restart it.
  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    },
    []
  );

  return { scrollRef, contentRef, stickToBottom };
}
