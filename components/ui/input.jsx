'use client';
import * as React from 'react';

import { cn } from '@/lib/utils';
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { Button } from './button';

function Input({
  className,
  type = 'text',
  error,
  rows,
  value,
  onChange = () => {},
  ...props
}) {
  const [showPassword, setShowPassword] = React.useState(false);
  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };
  return (
    <div className="relative">
      {type === 'textarea' ? (
        <textarea
          rows={rows}
          data-slot="textarea"
          className={cn(
            'file:text-foreground selection:bg-primary selection:text-primary-foreground text-xs  dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border px-3 py-1  transition-[color,border-color,box-shadow] duration-150 ease-snappy hover:border-neutral-300 outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 bg-white',
            'focus-visible:border-ring focus-visible:ring-primary/50 focus-visible:ring-[1px] min-h-20',
            'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
            className,
            {
              'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive':
                error,
            }
          )}
          onChange={onChange}
          value={value ?? ''}
          aria-invalid={error ? true : false}
          {...props}
        />
      ) : (
        <>
          <div className="relative">
            <input
              type={showPassword ? 'text' : type}
              data-slot="input"
              className={cn(
                'file:text-foreground placeholder:text-gray-500 selection:bg-primary selection:text-primary-foreground text-xs  dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border  px-3 py-1  transition-[color,border-color,box-shadow] duration-150 ease-snappy hover:border-neutral-300 outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50  bg-white',
                'focus-visible:border-ring focus-visible:ring-primary/50 focus-visible:ring-[1px] ',
                'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive ',
                className,
                {
                  'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive':
                    error,
                }
              )}
              value={value ?? ''}
              onChange={onChange}
              aria-invalid={error ? true : false}
              {...props}
            />
            {type === 'password' && (
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute right-2 top-1/2 -translate-y-1/2"
              >
                {showPassword ? (
                  <EyeOffIcon className="size-4" />
                ) : (
                  <EyeIcon className="size-4" />
                )}
              </Button>
            )}
          </div>
          {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </>
      )}
    </div>
  );
}

export { Input };
