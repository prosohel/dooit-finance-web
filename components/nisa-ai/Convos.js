import { cn } from '@/lib/utils';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { MotionConfig, motion } from 'framer-motion';
import React, { memo } from 'react';
import StreamingText from './StreamingText';

const entrance = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { type: 'spring', stiffness: 380, damping: 32, mass: 0.7 },
};

// Memoized so only the message being streamed re-renders on each chunk.
const MessageRow = memo(function MessageRow({ msg }) {
  const isMe = msg.type === 'me';
  const isAi = msg.type === 'ai';

  return (
    <motion.div
      {...entrance}
      className={cn('flex gap-2.5', {
        'justify-start': isAi,
        'justify-end': isMe,
      })}
    >
      {/* {isAi && (
        <div
          aria-hidden
          className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-gradient-to-br from-white to-primary/5 shadow-sm"
        >
          <span className="bg-gradient-to-br from-primary to-accent bg-clip-text text-[11px] font-bold text-transparent">
            N
          </span>
        </div>
      )} */}

      <div
        className={cn(' min-w-0', {
          'order-first max-w-[85%]': isMe,
          'max-w-full': isAi,
        })}
      >
        <div
          className={cn(
            'rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed',
            {
              'rounded-br-md bg-zinc-100 text-zinc-800 ': isMe,
              'rounded-bl-md  text-foreground p-0': isAi && !msg.error,
              'rounded-bl-md border border-danger/20 bg-red-50 text-foreground':
                isAi && msg.error,
            }
          )}
        >
          {isAi && !msg.error ? (
            <StreamingText html={msg.msg} streaming={msg.streaming} />
          ) : (
            <p className="flex items-start gap-2">
              {msg.error && (
                <span className="mt-0.5 shrink-0">
                  <ExclamationCircleIcon className="size-4 text-danger" />
                </span>
              )}
              <span className="min-w-0 whitespace-pre-wrap break-words">
                {msg.msg}
              </span>
            </p>
          )}
        </div>

        {isAi && msg.is_relevant ? (
          <p className="mt-1.5 px-1 text-[11px] leading-snug text-muted-foreground italic">
            The response is AI generated, for reference only
          </p>
        ) : null}
      </div>
    </motion.div>
  );
});

export default function Convos({ chat }) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="space-y-4 px-4">
        {chat.map((msg) => (
          <MessageRow key={msg.id} msg={msg} />
        ))}
      </div>
    </MotionConfig>
  );
}
