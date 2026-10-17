import { cn } from '@/lib/utils';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';
import React from 'react';

export default function Convos({ chat, loading }) {
  return (
    <div className="space-y-4">
      {chat.map((msg) => {
        const isMe = msg.type === 'me';
        const isAi = msg.type === 'ai';

        return (
          <div
            key={msg.id}
            className={cn('flex gap-2.5', {
              'justify-start': isAi,
              'justify-end': isMe,
            })}
          >
            {isAi && (
              <div
                aria-hidden
                className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-gradient-to-br from-white to-primary/5 shadow-sm"
              >
                <span className="bg-gradient-to-br from-primary to-accent bg-clip-text text-[11px] font-bold text-transparent">
                  N
                </span>
              </div>
            )}

            <div
              className={cn('max-w-[85%] min-w-0', {
                'order-first': isMe,
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
                {isAi ? (
                  <p dangerouslySetInnerHTML={{ __html: msg.msg }}></p>
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
          </div>
        );
      })}
      {/*
      {loading ? (
        <div className="flex items-start gap-2.5">
          <div
            aria-hidden
            className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-gradient-to-br from-white to-primary/5 shadow-sm"
          >
            <span className="bg-gradient-to-br from-primary to-accent bg-clip-text text-[11px] font-bold text-transparent">
              N
            </span>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-border/70 bg-white px-3.5 py-3 shadow-sm">
            <span className="size-1.5 animate-bounce rounded-full bg-primary/50 [animation-delay:-0.3s] motion-reduce:animate-none" />
            <span className="size-1.5 animate-bounce rounded-full bg-primary/50 [animation-delay:-0.15s] motion-reduce:animate-none" />
            <span className="size-1.5 animate-bounce rounded-full bg-primary/50 motion-reduce:animate-none" />
            <span className="sr-only">Thinking…</span>
          </div>
        </div>
      ) : null} */}
    </div>
  );
}
