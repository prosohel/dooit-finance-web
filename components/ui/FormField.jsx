'use client';

import { Controller } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { get } from 'react-hook-form';
import { cn } from '@/lib/utils';
import CustomSelect from '../AsyncPaginatedSelect';
import CreatableSelect from './CreatableSelect';

export function FormField({
  form,
  name,
  label,
  type = 'text',
  placeholder,
  required,
  options,
  description,
  loading = false,
  onChange,
  ...props
}) {
  const {
    control,
    formState: { errors },
  } = form;
  const error = get(errors, name)?.message;
  if (type === 'checkbox') {
    return (
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <div className="flex items-center gap-2">
            <Checkbox
              id={name}
              checked={field.value || false}
              onCheckedChange={(value) => {
                field.onChange(value);
                onChange?.(value);
              }}
              {...props}
            />
            {label && (
              <Label
                errors={errors[name]?.message}
                className="mb-0"
                htmlFor={name}
              >
                {label}
              </Label>
            )}
          </div>
        )}
      />
    );
  }

  if (type === 'select') {
    return (
      <div className={cn('flex flex-col ', { 'animate-pulse': loading })}>
        {label && (
          <Label htmlFor={name}>
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
        )}
        <Controller
          control={control}
          name={name}
          render={({ field }) => (
            <CustomSelect
              options={options}
              value={field.value}
              onChange={(value) => {
                field.onChange(value);
                onChange?.(value);
              }}
              placeholder={placeholder}
              {...props}
            />
          )}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    );
  }

  // Dropdown of known options that also lets the user type a new one.
  // Bound value stays a plain string — options: string[] | {value,label}[].
  if (type === 'creatable') {
    return (
      <div className={cn('flex flex-col ', { 'animate-pulse': loading })}>
        {label && (
          <Label htmlFor={name}>
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
        )}
        <Controller
          control={control}
          name={name}
          render={({ field }) => (
            <CreatableSelect
              options={options}
              value={field.value}
              onChange={(value) => {
                field.onChange(value);
                onChange?.(value);
              }}
              placeholder={placeholder}
              error={error}
              {...props}
            />
          )}
        />
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    );
  }

  if (type === 'textarea') {
    return (
      <div className={cn('flex flex-col ', { 'animate-pulse': loading })}>
        {label && (
          <Label htmlFor={name}>
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
        )}
        <Controller
          control={control}
          name={name}
          render={({ field }) => (
            <Textarea
              id={name}
              placeholder={placeholder}
              {...field}
              value={field.value || ''}
              onChange={(e) => {
                field.onChange(e.target.value);
                onChange?.(e.target.value);
              }}
              {...props}
            />
          )}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    );
  }
  return (
    <div className={cn('flex flex-col ', { 'animate-pulse': loading })}>
      {label && (
        <Label htmlFor={name}>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Input
            id={name}
            type={type}
            placeholder={placeholder}
            {...field}
            value={field.value || ''}
            error={error}
            onChange={(e) => {
              field.onChange(e.target.value);
              onChange?.(e.target.value);
            }}
            {...props}
          />
        )}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
