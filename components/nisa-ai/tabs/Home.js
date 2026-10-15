'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import {
  IconArrowRight,
  IconChevronRight,
  IconMessagePlus,
  IconUser,
} from '@tabler/icons-react';
import { AnimatePresence, motion } from 'framer-motion';

const SUGGESTED_PROMPTS = [
  {
    id: 'aml-policy',
    text: 'What are our current AML policy requirements?',
    tag: 'Policy',
    dot: 'bg-zinc-900',
  },
  {
    id: 'compliance-cases',
    text: 'Summarize open compliance cases from this week',
    tag: 'Cases',
    dot: 'bg-amber-300',
  },
  {
    id: 'kyc-high-risk',
    text: 'Explain KYC requirements for high-risk customers',
    tag: 'KYC',
    dot: 'bg-emerald-400/80',
  },
  // {
  //   id: 'regulatory-thresholds',
  //   text: 'Which transactions exceed regulatory reporting thresholds?',
  //   tag: 'Monitoring',
  //   dot: 'bg-violet-300',
  // },
];

export default function ChatHome({ onPromptSelect, setOpenChat }) {
  return (
    <div className="relative flex flex-1 flex-col overflow-y-auto px-4 pb-4 pt-14">
      {/* Hero */}
      <header className="flex flex-col items-center text-center">
        <div className="mb-6 flex size-[60px] items-center justify-center rounded-full bg-zinc-100">
          <IconUser size={24} stroke={1.5} className="text-zinc-400" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Hi, Nisa Here
        </h1>
      </header>

      {/* Suggested prompts */}
      <section className="mt-10">
        <p className="mb-4 text-center text-[11px] font-medium tracking-[0.12em] text-zinc-400 uppercase">
          Try asking
        </p>

        <AnimatePresence>
          <ul className="space-y-3 max-w-xl mx-auto">
            {SUGGESTED_PROMPTS.map((prompt, index) => (
              <motion.li
                key={prompt.id}
                initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{
                  delay: index * 0.05,
                  ease: 'easeInOut',
                  duration: 0.3,
                }}
              >
                <button
                  type="button"
                  onClick={() => onPromptSelect?.(prompt.text)}
                  className={cn(
                    'group flex w-full items-center gap-3 rounded-2xl bg-zinc-50 px-4 py-4 text-left transition-colors duration-200',
                    'hover:bg-zinc-100',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300'
                  )}
                >
                  <span
                    className={cn(
                      'mt-6 size-1.5 shrink-0 self-start rounded-full',
                      prompt.dot
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10px] font-semibold tracking-wide text-zinc-400 uppercase">
                      {prompt.tag}
                    </span>
                    <span className="mt-1 block text-[13px] leading-snug font-medium text-zinc-900">
                      {prompt.text}
                    </span>
                  </span>
                  <IconChevronRight
                    size={16}
                    className="shrink-0 text-zinc-300 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-zinc-500"
                  />
                </button>
              </motion.li>
            ))}
          </ul>
        </AnimatePresence>
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
      </section>
    </div>
  );
}
