import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-md border border-transparent px-2 py-0.5 text-[0.6rem] font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden bg-primary/5 text-primary',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90',
        secondary:
          'border-transparent bg-accent/10 font-bold text-accent  [a&]:hover:bg-secondary/90',
        destructive:
          'border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        outline:
          'border-dashed border-neutral-300 bg-transparent text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
        warning:
          'border-transparent bg-yellow-600 text-white [a&]:hover:bg-warning/90',
        success:
          'border-transparent bg-success text-white [a&]:hover:bg-success/90',
        info: 'border-transparent bg-info text-white [a&]:hover:bg-info/90',
        danger:
          'border-transparent bg-danger text-white [a&]:hover:bg-danger/90',
        light: 'border-transparent bg-light text-white [a&]:hover:bg-light/90',
        dark: 'border-transparent bg-dark text-white [a&]:hover:bg-dark/90',
        muted: 'border-transparent bg-muted text-white [a&]:hover:bg-muted/90',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

function Badge({ className, variant, asChild = false, ...props }) {
  const Comp = asChild ? Slot : 'span';

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
