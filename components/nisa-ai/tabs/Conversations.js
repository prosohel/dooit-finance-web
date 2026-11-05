'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  IconArrowRight,
  IconArrowUpRight,
  IconMessagePlus,
} from '@tabler/icons-react';

const CONVERSATIONS = [
  {
    id: 'nisa-4821',
    title: 'SAR filing window for correspondent banks',
    status: 'Waiting on you',
    tone: 'attention',
    updated: '3h',
  },
  {
    id: 'nisa-4710',
    title: 'KYC refresh for high-risk PEPs',
    status: 'Open',
    tone: 'active',
    updated: '1d',
  },
  {
    id: 'nisa-4598',
    title: 'Transaction monitoring threshold review',
    status: 'Submitted',
    tone: 'pending',
    updated: '5d',
  },
  {
    id: 'nisa-4402',
    title: 'Sanctions list match on inbound wire',
    status: 'Resolved',
    tone: 'resolved',
    updated: '2w',
  },
  {
    id: 'nisa-4316',
    title: 'AML policy update — Q3 controls',
    status: 'Closed',
    tone: 'closed',
    updated: '1mo',
  },
  {
    id: 'nisa-4188',
    title: 'Customer onboarding exception request',
    status: 'Closed',
    tone: 'closed',
    updated: '2mo',
  },
];

const TONE_STYLES = {
  attention: {
    rail: 'bg-amber-500',
    chip: 'bg-amber-50 text-amber-800',
  },
  active: {
    rail: 'bg-primary',
    chip: 'bg-primary/8 text-primary',
  },
  pending: {
    rail: 'bg-primary-light',
    chip: 'bg-primary/6 text-primary-light',
  },
  resolved: {
    rail: 'bg-accent',
    chip: 'bg-accent/15 text-emerald-800',
  },
  closed: {
    rail: 'bg-neutral-300',
    chip: 'bg-neutral-100 text-muted-foreground',
  },
};

export default function Conversations({ setOpenChat }) {
  const [selectedId, setSelectedId] = useState(CONVERSATIONS[1].id);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col pt-12">
      {/* <div className="px-4 pb-3">
        <a
          href="#"
          className="group flex items-center gap-3 rounded-xl border border-primary/15 bg-gradient-to-r from-primary/[0.06] to-accent/[0.06] px-3 py-2.5 transition-colors hover:border-primary/25 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none"
        >
          <p className="min-w-0 flex-1 text-[13px] leading-snug text-heading">
            Looking for your organisation&apos;s threads? Open the compliance
            workspace.
          </p>
          <IconArrowUpRight
            size={16}
            className="shrink-0 text-primary transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
        </a>
      </div> */}

      <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-20">
        {CONVERSATIONS.map((item) => {
          const tone = TONE_STYLES[item.tone];
          const selected = item.id === selectedId;

          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={cn(
                  'flex w-full items-stretch gap-3 rounded-lg px-2 py-3 text-left transition-colors',
                  'focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none',
                  selected ? 'bg-primary/[0.07]' : 'hover:bg-smoke-200/60'
                )}
              >
                <span
                  aria-hidden
                  className={cn('w-0.5 shrink-0 rounded-full', tone.rail)}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-heading">
                    {item.title}
                  </span>
                  <span className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="font-mono tracking-tight">#{item.id}</span>
                    <span
                      className={cn(
                        'rounded-md px-1.5 py-0.5 font-medium',
                        tone.chip
                      )}
                    >
                      {item.status}
                    </span>
                  </span>
                </span>
                <time className="shrink-0 pt-0.5 text-[11px] tabular-nums text-muted-foreground">
                  {item.updated}
                </time>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-white via-white/90 to-transparent px-4 pt-8 pb-3">
        <button
          type="button"
          className="pointer-events-auto inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-[0_8px_24px_rgba(0,89,100,0.28)] transition-transform hover:bg-primary-light focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.98]"
          onClick={() => setOpenChat(true)}
        >
          <IconMessagePlus size={16} stroke={1.75} />
          Start a conversation
          <IconArrowRight size={15} stroke={2} />
        </button>
      </div>
    </div>
  );
}
