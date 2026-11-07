'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "inline-flex relative items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[color,background-color,border-color,box-shadow,opacity,scale] duration-150 ease-snappy motion-safe:active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50  [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive overflow-hidden ",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90 ',
        destructive:
          'bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        outline:
          'border border-neutral-200/80 bg-background hover:bg-neutral-50 hover:border-neutral-300/80 hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost:
          'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3 text-xs',
        sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5 text-xs',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        icon: 'size-9',
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

function Button({
  className,
  variant = 'default',
  size,
  asChild = false,
  lit = false,
  ...props
}) {
  const [isClient, setIsClient] = React.useState(false);
  const [brandColor, setBrandColor] = React.useState(null);
  React.useEffect(() => {
    setIsClient(true);
  }, []);

  React.useEffect(() => {
    if (isClient) {
      const brandColor = localStorage.getItem('brandColor');
      if (brandColor) {
        setBrandColor(brandColor ?? '#000000');
      }
    }
  }, [isClient]);

  const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      data-slot="button"
      data-lit={lit}
      data-brand-color={brandColor}
      className={cn(buttonVariants({ variant, size, className, brandColor }), {
        'bg-[var(--brand-color)] hover:bg-[var(--brand-color)]/90':
          brandColor && variant === 'onboarding',
      })}
      style={{ '--brand-color': brandColor }}
      {...props}
    />
  );
}

export { Button, buttonVariants };
