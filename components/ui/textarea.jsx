import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, error, isLoading = false, ...props }) {
  return (
    <>
      <textarea
        data-slot="textarea"
        className={cn(
          "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base transition-[color,border-color,box-shadow] duration-150 ease-snappy hover:border-neutral-300 outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
          {
            "border-red-500": error,
            "opacity-70 animate-pulse cursor-not-allowed": isLoading,
          }
        )}
        {...props}
        value={isLoading ? "Thinking..." : props.value}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </>
  );
}

export { Textarea };
