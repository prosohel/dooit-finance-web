'use client';
import { cn, getFileKind, randomIdGenerator } from '@/lib/utils';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import {
  ArrowLeft,
  BadgeQuestionMark,
  Forward,
  House,
  Mail,
  Maximize2,
  Mic,
  Minimize,
  Paperclip,
  Ticket,
  X,
} from 'lucide-react';
import useOutsideClick from '@/hooks/useOutsideClick';
import { chatWithNissa } from '@/app/actions';
import Convos from './Convos';
import {
  IconHelpOctagon,
  IconHelpOctagonFilled,
  IconHome,
  IconHome2,
  IconHomeFilled,
  IconMail,
  IconMailFilled,
  IconTicket,
  // IconTicketFilled,
} from '@tabler/icons-react';
import ChatHome from './tabs/Home';
import Conversations from './tabs/Conversations';
import Help from './tabs/Help';
import Chat from './Chat';
import {
  motion,
  useDragControls,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  useVelocity,
} from 'framer-motion';

// how the panel trails the pointer: high mass = slow to start and slow to stop,
// damping just under critical gives a tiny, natural settle without wobble
const heavySpring = { stiffness: 180, damping: 30, mass: 1.4 };

const IconTicketFilled = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="icon icon-tabler icons-tabler-filled icon-tabler-ticket"
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M14 4v2a1 1 0 0 0 2 0v-2h3a3 3 0 0 1 3 3v3a1 1 0 0 1 -.883 .993l-.117 .007a1 1 0 0 0 -.117 1.993l.117 .007a1 1 0 0 1 1 1v3a3 3 0 0 1 -3 3h-3v-2a1 1 0 0 0 -.883 -.993l-.117 -.007a1 1 0 0 0 -1 1v2h-9a3 3 0 0 1 -3 -3v-3a1 1 0 0 1 .883 -.993l.117 -.007a1 1 0 0 0 .117 -1.993l-.117 -.007a1 1 0 0 1 -1 -1v-3a2.995 2.995 0 0 1 2.727 -2.985l.222 -.014zm1 6a1 1 0 0 0 -1 1v2a1 1 0 0 0 2 0v-2a1 1 0 0 0 -1 -1" />
    </svg>
  );
};
const tabs = [
  {
    name: 'Home',
    icon: <IconHome size={20} />,
    fillIcon: <IconHomeFilled size={20} />,
    component: <div>Home</div>,
    title: '',
  },
  {
    name: 'Convos',
    icon: <IconMail size={20} />,
    fillIcon: <IconMailFilled size={20} />,
    component: <div />,
    title: 'Conversations',
  },
  {
    name: 'Tickets',
    icon: <IconTicket size={20} />,
    fillIcon: <IconTicketFilled size={20} />,
    component: <div />,
    title: 'Tickets',
  },
  // {
  //   name: 'Help',
  //   icon: <IconHelpOctagon size={20} />,
  //   fillIcon: <IconHelpOctagonFilled size={20} />,
  //   component: <div />,
  //   title: 'Help',
  // },
];

export default function Modal({ isOpen, setIsOpen }) {
  const chatRef = useRef(null);
  const [activeTab, setActiveTab] = useState('Home');
  const [openChat, setOpenChat] = useState(false);
  const [prompt, setPrompt] = useState('');
  const constraintsRef = useRef(null);
  const dragControls = useDragControls();
  const reduceMotion = useReducedMotion();
  const [isDragging, setIsDragging] = useState(false);

  // the pointer drives dragX/dragY; the panel itself trails behind on a heavy
  // spring so it feels like it has mass instead of being glued to the cursor
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  const x = useSpring(dragX, heavySpring);
  const y = useSpring(dragY, heavySpring);
  // a subtle tilt that follows how fast the panel is actually moving
  const xVelocity = useVelocity(x);
  const rawTilt = useTransform(xVelocity, [-2000, 0, 2000], [-2, 0, 2]);
  const rotate = useSpring(rawTilt, { stiffness: 120, damping: 24, mass: 1.2 });

  // useOutsideClick(chatRef, () => setIsOpen(false));

  const [maximize, setMaximize] = useState(false);

  const currentTab = tabs.find((tab) => tab.name === activeTab);

  const resetPosition = useCallback(() => {
    // the visible x/y springs follow these, so this glides home with weight
    dragX.set(0);
    dragY.set(0);
  }, [dragX, dragY]);

  // re-dock the panel each time it is opened
  useEffect(() => {
    if (isOpen) {
      [dragX, dragY, x, y].forEach((v) => v.jump(0));
    }
  }, [isOpen, dragX, dragY, x, y]);

  const startDrag = (e) => {
    // let header buttons keep their normal click behaviour
    if (e.target.closest('button')) return;
    dragControls.start(e);
  };

  const toggleMaximize = () => {
    setMaximize((prev) => !prev);
    // the size change could push it off-screen, so glide back home
    resetPosition();
  };

  const handlePromptSelect = useCallback((prompt) => {
    // console.log('prompt', prompt);
    setOpenChat(true);
    setPrompt(prompt);
  }, []);

  return (
    <>
      {/* invisible viewport-sized box the panel is allowed to roam inside */}
      <div
        ref={constraintsRef}
        aria-hidden
        className="fixed inset-2 pointer-events-none"
      />
      <motion.div
        ref={chatRef}
        drag
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={constraintsRef}
        _dragX={dragX}
        _dragY={dragY}
        dragElastic={0.09}
        dragMomentum
        // a hard flick only carries it a short way before friction wins
        dragTransition={{
          power: 0.05,
          timeConstant: 140,
          bounceStiffness: 220,
          bounceDamping: 32,
        }}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={() => setIsDragging(false)}
        style={{ x, y, rotate: reduceMotion ? 0 : rotate }}
        initial={false}
        animate={
          isOpen
            ? { opacity: 1, scale: 1, filter: 'blur(0px)' }
            : { opacity: 0, scale: 0.85, filter: 'blur(12px)' }
        }
        whileDrag={{
          scale: reduceMotion ? 1 : 1.01,
          boxShadow:
            '0 30px 60px -12px rgba(15, 23, 42, 0.28), 0 18px 36px -18px rgba(15, 23, 42, 0.3)',
        }}
        transition={{ type: 'spring', stiffness: 320, damping: 30, mass: 0.8 }}
        className={cn(
          'fixed bottom-2 -right-1 z-50 origin-bottom-right transition-[height,width] duration-300 ease-in-out rounded-xl bg-white shadow-xl border-t will-change-transform',
          {
            'pointer-events-auto': isOpen,
            'pointer-events-none': !isOpen,
            'h-[80vh] w-[60vw] max-w-[850px]': maximize,
            'h-[700px] w-full max-w-[450px] ': !maximize,
          }
        )}
      >
        {/* drag handle: grab the header to move, double-click to re-dock */}
        <div
          onPointerDown={startDrag}
          onDoubleClick={(e) => !e.target.closest('button') && resetPosition()}
          className={cn(
            'absolute py-2 top-0 left-0 flex items-center justify-between w-full gap-2 px-2 z-[99] select-none touch-none',
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          )}
        >
          <span
            aria-hidden
            className={cn(
              'absolute top-1 left-1/2 -translate-x-1/2 h-1 rounded-full transition-all duration-300',
              isDragging ? 'w-12 bg-zinc-300' : 'w-8 bg-zinc-200'
            )}
          />
          {openChat && (
            <div>
              <Button
                variant="ghost"
                // size="icon"
                onClick={() => setOpenChat(false)}
              >
                {' '}
                <ArrowLeft size={12} /> Back
              </Button>
            </div>
          )}
          {!openChat && (
            <div className="flex-1  ">
              <p className="text-lg font-medium text-center ">
                {currentTab.title}
              </p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              className="  size-7 cursor-pointer"
              onClick={toggleMaximize}
            >
              {maximize ? <Minimize /> : <Maximize2 size={12} />}
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="  size-7 cursor-pointer"
              onClick={() => setIsOpen(false)}
            >
              <X size={12} />
            </Button>
          </div>
        </div>
        {/* chat */}

        <div className="h-full flex flex-col">
          {openChat ? (
            <Chat prompt={prompt} />
          ) : (
            <>
              {activeTab === 'Home' && (
                <ChatHome
                  onPromptSelect={handlePromptSelect}
                  setOpenChat={setOpenChat}
                />
              )}
              {activeTab === 'Convos' && (
                <Conversations setOpenChat={setOpenChat} />
              )}
              {activeTab === 'Tickets' && (
                <Conversations setOpenChat={setOpenChat} />
              )}
              {/* {activeTab === 'Tickets' && <Tickets />} */}
              {activeTab === 'Help' && <Help />}
              <div className="flex mt-auto  pt-2  border-t border-zinc-100 rounded-md justify-center">
                {tabs.map((tab) => (
                  <button
                    key={tab.name}
                    variant="ghost"
                    className={cn(
                      'p-6 flex flex-col items-center gap-1 py-2 text-zinc-300 rounded-md ',
                      {
                        'text-primary  ': activeTab === tab.name,
                      }
                    )}
                    onClick={() => setActiveTab(tab.name)}
                  >
                    <span
                      className={cn({
                        'text-primary ': activeTab === tab.name,
                      })}
                    >
                      {activeTab === tab.name ? tab.fillIcon : tab.icon}
                    </span>
                    <span>{tab.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </motion.div>
    </>
  );
}
