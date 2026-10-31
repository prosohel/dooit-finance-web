'use client';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { HelpCircle } from 'lucide-react';
import { useState } from 'react';

import { useEffect } from 'react';

export function PartB({ data, updateData }) {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2">
        <Label htmlFor="grounds" className="text-base font-bold ">
          3. Provide details of the nature and circumstances surrounding the
          matter
        </Label>
        <HelpCircle className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
      </div>
      <p className="text-sm text-muted-foreground italic">
        Note: Do not provide account or transaction details as these will be
        required in Parts C - F.
      </p>
      <Textarea
        id="grounds"
        value={data?.groundsForSuspicion || ''}
        onChange={(e) => {
          // setGrounds(e.target.value);
          updateData({ groundsForSuspicion: e.target.value });
        }}
        isLoading={isLoading}
        placeholder="Describe the nature and circumstances of the suspicious matter..."
        className="min-h-[300px] border"
      />
    </div>
  );
}
