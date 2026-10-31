import { cn } from '@/lib/utils';

// NEXT_PUBLIC_APP_ENV is inlined at build time: 'production' shows a green
// Production badge, anything else (or unset) is treated as Sandbox.
const APP_ENV = process.env.NEXT_PUBLIC_APP || 'sandbox';

export function EnvironmentBadge({ className }) {
  const isProduction = APP_ENV.toLowerCase() === 'production';

  return (
    <span
      title={
        isProduction
          ? 'Connected to the live production environment'
          : 'Connected to the sandbox test environment'
      }
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wide select-none',
        isProduction
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-amber-200 bg-amber-50 text-amber-700',
        className
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          isProduction ? 'bg-emerald-500' : 'bg-amber-500'
        )}
      />
      {APP_ENV}
    </span>
  );
}
