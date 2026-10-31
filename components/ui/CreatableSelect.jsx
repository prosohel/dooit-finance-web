'use client';

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Label } from './label';
import { cn } from '@/lib/utils';
import { selectThemeColors } from './CustomSelect';

// react-select/creatable — same library CustomSelect wraps, so themes match.
const Creatable = dynamic(() => import('react-select/creatable'), { ssr: false });

// Accepts options as plain strings, {value,label} objects, or groups
// ({label, options}). Everything is normalised to react-select's shape.
const toOption = (o) =>
  typeof o === 'string' ? { value: o, label: o } : o;

const normalizeOptions = (options) =>
  (options || []).map((o) =>
    o && Array.isArray(o.options)
      ? { label: o.label, options: o.options.map(toOption) }
      : toOption(o),
  );

const flattenOptions = (options) =>
  options.flatMap((o) => (Array.isArray(o.options) ? o.options : [o]));

/**
 * Creatable dropdown bound to a plain string value.
 *
 * Shows known options and lets the user type a brand-new one
 * ("Create …") — the bound form value stays a plain string, so a stored
 * value that isn't in the options list still renders as selected.
 *
 * Props:
 *   value       — plain string ('' = nothing selected)
 *   onChange    — (string) => void
 *   options     — string[] | {value,label}[] | {label, options}[] (groups)
 *   label/error — same contract as CustomSelect
 */
const CreatableSelect = ({
  label,
  error,
  options = [],
  value,
  onChange,
  placeholder = 'Select or type to create…',
  isLoading = false,
  isClearable = true,
  ...props
}) => {
  const selectOptions = useMemo(() => normalizeOptions(options), [options]);

  // Resolve the current string back to an option; fall back to a synthetic
  // option so previously stored free-text values still display.
  const selected = useMemo(() => {
    if (!value) return null;
    return (
      flattenOptions(selectOptions).find((o) => o.value === value) || {
        value,
        label: value,
      }
    );
  }, [value, selectOptions]);

  return (
    <div className="w-full">
      {label && <Label>{label}</Label>}
      <Creatable
        aria-invalid={!!error}
        classNamePrefix="react-select"
        className={cn(
          'dropdown-select border border-transparent !rounded-lg transition-colors',
          { 'border-red-500': error },
        )}
        menuPlacement="auto"
        styles={{ menuPortal: (base) => ({ ...base, zIndex: '9999999' }) }}
        theme={selectThemeColors}
        options={selectOptions}
        value={selected}
        onChange={(option) => onChange(option?.value ?? '')}
        onCreateOption={(inputValue) => onChange(inputValue.trim())}
        formatCreateLabel={(input) => `Create "${input}"`}
        placeholder={placeholder}
        isLoading={isLoading}
        isClearable={isClearable}
        {...props}
      />
      {error && <p className="text-sm text-destructive mt-0.5">{error}</p>}
    </div>
  );
};

export default CreatableSelect;
