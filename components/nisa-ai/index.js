'use client';
import dynamic from 'next/dynamic';
import React, { useState } from 'react';
import Modal from './Modal';
import { AnimatePresence } from 'framer-motion';
import FlowyDrag from '../FlowyDrag';
const NissaModel = dynamic(
  () => import('@/components/nisa-ai/Nisa', { ssr: false })
);

export default function ChatBotNissa() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-4 right-0 z-50 size-13 rounded-lg  overflow-hidden cursor-pointer "
      >
        <NissaModel />
      </div>
      <AnimatePresence>
        {/* <FlowyDrag> */}
        <Modal isOpen={isOpen} setIsOpen={setIsOpen} />
        {/* </FlowyDrag> */}
      </AnimatePresence>
    </>
  );
}
