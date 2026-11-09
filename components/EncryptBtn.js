'use client';

import { toggleEncryption } from '@/app/dashboard/client/action';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import useGetUser from '@/hooks/useGetUser';
import { Lock, Unlock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export function EncryptDecryptFAB() {
  const [isAnimating, setIsAnimating] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { loggedInUser, getUser } = useGetUser();
  const [isEncrypted, setIsEncrypted] = useState(
    loggedInUser?.isDataEncrypted || false
  );

  useEffect(() => {
    setIsEncrypted(loggedInUser?.isDataEncrypted || false);
  }, [loggedInUser?.isDataEncrypted]);

  // Only shown to users who may perform the action it offers — the API
  // refuses anyone else (PRIVACY.ENCRYPT / PRIVACY.DECRYPT). Hidden until the
  // logged-in user (with its permissions) has loaded.
  const permissions = loggedInUser?.permissions ?? [];
  if (!permissions.includes(isEncrypted ? 'PRIVACY.DECRYPT' : 'PRIVACY.ENCRYPT')) {
    return null;
  }

  // This rewrites the stored PII of every customer (and linked portal user) in
  // the tenant, for all staff — not a per-viewer toggle — so confirm first.
  const handleToggle = async () => {
    setConfirmOpen(false);
    setIsAnimating(true);
    try {
      const res = await toggleEncryption({ encrypted: !isEncrypted });
      if (res?.success) {
        setIsEncrypted((prev) => !prev);
        window.location.reload();
        return;
      }
      toast.error(res?.error || res?.message || 'Could not change encryption');
    } catch (err) {
      console.error('Encryption toggle failed', err);
      toast.error('Could not change encryption');
    }
    setIsAnimating(false);
  };

  return (
    <>
    <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isEncrypted ? 'Decrypt all customer data?' : 'Encrypt all customer data?'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isEncrypted
              ? 'Names, emails, phone numbers and ID numbers of every customer you manage (and their portal accounts) will be stored in plain text again. This changes the data for all staff, not only your view.'
              : 'Names, emails, phone numbers and ID numbers of every customer you manage (and their portal accounts) will be encrypted. Staff without the "View Decrypted" permission will see *** instead. This changes the data for all staff, not only your view.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleToggle}>
            {isEncrypted ? 'Decrypt data' : 'Encrypt data'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <button
      onClick={() => setConfirmOpen(true)}
      disabled={isAnimating}
      className={`
        group fixed bottom-18 right-0 z-40 flex items-center  size-13
        rounded-md justify-center transition-all duration-300 ease-out overflow-hidden
        ${
          isEncrypted
            ? 'bg-emerald-600 shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:bg-emerald-500'
            : 'bg-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:bg-indigo-500'
        }
        hover:scale-110 active:scale-95 text-white border border-white/20
      `}
      aria-label={isEncrypted ? 'Decrypt data' : 'Encrypt data'}
      title={isEncrypted ? 'Data is encrypted — click to decrypt' : 'Data is not encrypted — click to encrypt'}
    >
      {/* Background Shimmer Effect */}
      <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      {/* Icon Container */}
      <div
        className={`transition-all duration-300 ${isAnimating ? 'scale-60 opacity-0 rotate-12' : 'scale-100 opacity-100'}`}
      >
        {isEncrypted ? (
          <Lock className="h-5 w-5" strokeWidth={2.5} />
        ) : (
          <Unlock className="h-5 w-5" strokeWidth={2.5} />
        )}
      </div>

      {/* Label Text */}
      {/* <span className="text-sm font-bold tracking-wide uppercase">
        {isEncrypted ? 'Secure' : 'Unlock'}
      </span> */}

      {/* Subtle Bottom Glow Ring */}
      <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/30 group-hover:ring-white/50" />
    </button>
    </>
  );
}
