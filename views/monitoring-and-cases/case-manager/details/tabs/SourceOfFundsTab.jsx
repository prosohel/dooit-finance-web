"use client";
// Source of Funds tab on the case detail page.
//
// Reuses the reviewer-side SOF panel from the onboarding customer queue rather
// than duplicating it — the SOF session is keyed on the customer, not the case,
// so a document requested here is the same record the onboarding tab shows.
//
// A case can link several customers (joint accounts, related parties). The
// primary one is shown first; when there is more than one, a switcher lets the
// investigator request or review SOF for any of them.

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconUserOff } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import SofVerification from "@/views/onboarding/customer-queue/details/SofVerification";

const customerLabel = (customer) => {
  const details = customer?.personalKyc?.personal_form?.customer_details || {};
  const name = [details.given_name, details.surname].filter(Boolean).join(" ").trim();
  return name || customer?.user?.name || customer?.uid || "Customer";
};

export default function SourceOfFundsTab({ caseData, onUpdated }) {
  const customers = caseData?.linkedCustomers || [];
  const [activeIndex, setActiveIndex] = useState(0);

  if (!customers.length) {
    return (
      <Card className="border-border/50">
        <div className="p-10 text-center">
          <IconUserOff className="size-8 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            No customer is linked to this case, so there is no source of funds
            record to request or review.
          </p>
        </div>
      </Card>
    );
  }

  const active = customers[activeIndex] || customers[0];

  return (
    <div className="space-y-4">
      {customers.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Linked customer:</span>
          {customers.map((customer, i) => (
            <Button
              key={customer?._id || i}
              variant={i === activeIndex ? "default" : "outline"}
              size="sm"
              className={cn("text-xs", i === activeIndex && "pointer-events-none")}
              onClick={() => setActiveIndex(i)}
            >
              {customerLabel(customer)}
              {i === 0 && <span className="opacity-70">· primary</span>}
            </Button>
          ))}
        </div>
      )}

      {/* Remount on customer switch so the panel refetches that customer's
          session instead of showing the previous one's documents. */}
      <SofVerification
        key={active?._id}
        details={active}
        caseId={caseData?._id}
        onUpdated={onUpdated}
      />
    </div>
  );
}
