'use client';
import { cn, getFileKind, randomIdGenerator } from '@/lib/utils';
import React, { useEffect, useRef, useState } from 'react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { ArrowUp, Mic, Paperclip, X } from 'lucide-react';
// import { getChatStreams } from '@/services/nisaStream';
import Convos from './Convos';
import useStickToBottom from './useStickToBottom';
import { useLoggedInUser } from '@/app/store/useLoggedInUser';
import { getChatStreams } from '@/services/nisaStream';
// import { getChatStreams } from '@/app/actions';

const getGreetingBasedOnTime = (name) => {
  const firstName = name?.split(' ')[0] || 'there';
  const hour = new Date().getHours();
  if (hour < 12) {
    return `Good morning, ${firstName}!`;
  } else if (hour < 18) {
    return `Good afternoon, ${firstName}!`;
  } else {
    return `Good evening, ${firstName}!`;
  }
};

const NisaIntro = () => {
  const { loggedInUser } = useLoggedInUser();
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 text-center">
      <p className="font-regular text-2xl">
        {getGreetingBasedOnTime(loggedInUser?.name)}
      </p>
    </div>
  );
};

export default function Chat({ prompt }) {
  const [chat, setChat] = useState([]);
  const fileInputRef = useRef(null);
  const [fileInput, setFileInput] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const streamAbortRef = useRef(null);
  const { scrollRef, contentRef, stickToBottom } = useStickToBottom();
  const { loggedInUser } = useLoggedInUser();

  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let kind = 'file';

    kind = getFileKind(file);

    setFileInput({
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      kind,
      preview: URL.createObjectURL(file),
    });

    e.target.value = null;
  };
  useEffect(() => {
    if (prompt) {
      // setMessage(prompt);
      handleSendMessage(prompt);
    }
  }, [prompt]);

  //onenter the message should send
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };
  // useEffect(() => {
  //   if (!isOpen) return;
  //   document.addEventListener('keydown', handleKeyDown);
  //   return () => {
  //     document.removeEventListener('keydown', handleKeyDown);
  //   };
  // }, [isOpen]);

  const handleSendMessage = async (msg) => {
    if (!message.trim() && !msg) return;
    setMessage('');
    const myMsg = {
      msg: msg || message,
      type: 'me',
      id: randomIdGenerator(),
      timeStamp: new Date(),
    };

    setChat((prev) => [...prev, myMsg]);
    // Sending always re-engages auto-follow, even if the user had scrolled up.
    stickToBottom();

    const aiId = randomIdGenerator();
    const updateAiMsg = (updater) =>
      setChat((prev) =>
        prev.map((m) => (m.id === aiId ? { ...m, ...updater(m) } : m))
      );

    streamAbortRef.current?.abort();
    const controller = new AbortController();
    streamAbortRef.current = controller;

    let started = false;
    try {
      setLoading(true);
      await getChatStreams(
        {
          question: myMsg.msg,
          email: loggedInUser?.email,
        },
        (chunk) => {
          if (chunk?.type === 'done') {
            const { sources, features, language } = chunk;
            if (started)
              updateAiMsg(() => ({
                sources,
                features,
                language,
                streaming: false,
              }));
            return;
          }
          if (chunk?.type !== 'chunk' || !chunk.text) return;
          if (!started) {
            started = true;
            setLoading(false);
            setChat((prev) => [
              ...prev,
              {
                msg: chunk.text,
                type: 'ai',
                id: aiId,
                timeStamp: new Date(),
                streaming: true,
              },
            ]);
            return;
          }
          updateAiMsg((m) => ({ msg: m.msg + chunk.text }));
        },
        controller.signal
      );
    } catch (err) {
      if (err?.name === 'AbortError') return;
      console.log(err);
      const errorMsg = { msg: 'Something went wrong', error: true };
      if (started) {
        updateAiMsg(() => errorMsg);
      } else {
        setChat((prev) => [
          ...prev,
          { ...errorMsg, type: 'ai', id: aiId, timeStamp: new Date() },
        ]);
      }
    } finally {
      if (streamAbortRef.current === controller) streamAbortRef.current = null;
      if (started) updateAiMsg(() => ({ streaming: false }));
      setLoading(false);
    }
  };

  useEffect(() => () => streamAbortRef.current?.abort(), []);

  const canSend = Boolean(message.trim());

  return (
    <div className="relative flex h-full flex-col bg-gradient-to-b from-smoke-200/40 via-white to-white">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 overflow-hidden"
      >
        <div className="absolute -top-10 left-1/2 h-36 w-36 -translate-x-1/2 rounded-full bg-primary/8 blur-3xl" />
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="relative z-10 min-h-0 flex-1 overflow-y-auto px-3 pt-14 pb-3 [overflow-anchor:none]"
      >
        {chat.length === 0 ? (
          <NisaIntro />
        ) : (
          <div ref={contentRef} className="mx-auto w-full max-w-2xl">
            <Convos chat={chat} />
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="relative z-10 shrink-0 px-3 pb-3">
        <div
          className={cn(
            'overflow-hidden rounded-2xl border border-border/80 bg-white shadow-[0_8px_30px_rgba(0,89,100,0.08)]',
            'focus-within:border-primary/30 focus-within:shadow-[0_8px_30px_rgba(0,89,100,0.12)]',
            'transition-shadow duration-200'
          )}
        >
          {fileInput && (
            <div className="border-b border-border/60 px-3 pt-3 pb-2">
              <div className="relative w-max">
                <button
                  type="button"
                  aria-label="Remove attachment"
                  className="absolute -top-1.5 -right-1.5 z-10 flex size-5 items-center justify-center rounded-full border border-border bg-white text-muted-foreground shadow-sm transition-colors hover:bg-smoke-200 hover:text-foreground"
                  onClick={() => setFileInput(null)}
                >
                  <X size={11} strokeWidth={2.5} />
                </button>

                <div
                  hidden={
                    fileInput?.kind === 'doc' ||
                    fileInput?.kind === 'excel' ||
                    fileInput?.kind === 'file'
                  }
                  className="size-20 overflow-hidden rounded-xl border border-border/70 bg-smoke-200"
                >
                  {fileInput?.kind === 'image' && (
                    <img
                      src={fileInput?.preview}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                  {fileInput?.kind === 'pdf' && (
                    <iframe
                      src={fileInput?.preview}
                      className="h-full w-full object-contain"
                    />
                  )}
                </div>

                {(fileInput.kind === 'doc' ||
                  fileInput.kind === 'excel' ||
                  fileInput.kind === 'file') && (
                  <div className="flex w-44 items-center gap-2 rounded-xl border border-border/70 bg-smoke-200/50 px-2.5 py-2">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-sm shadow-sm">
                      {fileInput.kind === 'doc' && '📄'}
                      {fileInput.kind === 'excel' && '📊'}
                      {fileInput.kind === 'file' && '📁'}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-heading">
                        {fileInput.name}
                      </p>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {fileInput.kind}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <Textarea
            name="message"
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Ask Nisa anything…"
            className="min-h-[52px] max-h-40 resize-none border-0 bg-transparent px-3.5 pt-3 pb-1 text-[14px] leading-relaxed shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-0 focus-visible:ring-offset-0"
          />

          <div className="flex items-center justify-between gap-2 px-2.5 pb-2.5">
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-8 rounded-lg text-muted-foreground hover:bg-primary/8 hover:text-primary"
                onClick={() => fileInputRef.current.click()}
                aria-label="Attach file"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileInput}
                  hidden
                />
                <Paperclip size={16} strokeWidth={1.75} />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-8 rounded-lg text-muted-foreground hover:bg-primary/8 hover:text-primary"
                aria-label="Voice input"
              >
                <Mic size={16} strokeWidth={1.75} />
              </Button>
            </div>

            <Button
              type="button"
              size="icon"
              disabled={!canSend}
              onClick={() => handleSendMessage()}
              aria-label="Send message"
              className={cn(
                'size-8 rounded-xl shadow-none transition-all',
                canSend
                  ? 'bg-primary text-white hover:bg-primary-light shadow-[0_4px_14px_rgba(0,89,100,0.3)]'
                  : 'bg-smoke-300 text-muted-foreground opacity-60'
              )}
            >
              <ArrowUp size={16} strokeWidth={2.25} />
            </Button>
          </div>
        </div>
        <p className="mt-2 text-center text-[10px] tracking-wide text-muted-foreground/80">
          Nisa can make mistakes. Verify critical compliance guidance.
        </p>
      </div>
    </div>
  );
}
