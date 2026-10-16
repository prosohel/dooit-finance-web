"use client";

import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, ExternalLink, Loader2, RefreshCw, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { getXeroSettings, saveXeroSettings } from "@/app/dashboard/client/system-settings/xero/actions";

// How Dooit bills land in the client's Xero. Xero certification requires the
// user to pick accounts and tax rates from their own chart of accounts (never a
// typed code, never an assumed default), so every field is a dropdown fed by
// the API's live read of the organisation, and the API re-validates on save.

const BILL_STATUS_LABELS = {
  DRAFT: "Draft — you review and approve in Xero",
  SUBMITTED: "Awaiting approval",
  AUTHORISED: "Approved (awaiting payment)",
};

const EMPTY = {
  billAccountCode: "",
  taxType: "",
  billStatus: "DRAFT",
  syncPayments: false,
  paymentAccountId: "",
  syncCustomers: false,
};

const formFrom = (settings, options) => ({
  billAccountCode: settings?.billAccountCode || options?.suggested?.billAccountCode || "",
  taxType: settings?.taxType || "",
  billStatus: settings?.billStatus || "DRAFT",
  syncPayments: !!settings?.syncPayments,
  paymentAccountId: settings?.paymentAccountId || "",
  syncCustomers: !!settings?.syncCustomers,
});

function Field({ id, label, hint, children }) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ExternalXeroLink({ href, children }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
    >
      {children}
      <ExternalLink className="size-3.5" aria-hidden="true" />
      <span className="sr-only">(opens Xero in a new tab)</span>
    </a>
  );
}

export default function XeroMappingCard({ setupComplete, onSaved }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [options, setOptions] = useState(null);
  const [problems, setProblems] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState(null);

  // keepForm: "Refresh lists" after creating an account in Xero must not drop
  // the user's unsaved choices.
  const load = useCallback(async ({ keepForm = false } = {}) => {
    const res = await getXeroSettings();
    if (!res.ok) {
      setError(res.error || "Could not load your Xero accounts and tax rates");
      return;
    }
    setOptions(res.data.options);
    setProblems(res.data.problems || []);
    setError(null);
    if (!keepForm) setForm(formFrom(res.data.settings, res.data.options));
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const handleRefresh = async () => {
    setRefreshing(true);
    await load({ keepForm: true });
    setRefreshing(false);
  };

  const incomplete =
    !form.billAccountCode || !form.taxType || (form.syncPayments && !form.paymentAccountId);

  const handleSave = async () => {
    if (incomplete || saving) return;
    setSaving(true);
    const res = await saveXeroSettings({
      billAccountCode: form.billAccountCode,
      taxType: form.taxType,
      billStatus: form.billStatus,
      syncPayments: form.syncPayments,
      paymentAccountId: form.syncPayments ? form.paymentAccountId : null,
      syncCustomers: form.syncCustomers,
    });
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error || "Could not save the Xero settings");
      return;
    }
    toast.success(res.data?.firstSetup ? "Saved — sending your Dooit bills to Xero now" : "Xero settings saved");
    setProblems([]);
    onSaved?.();
  };

  if (loading) {
    return (
      <Card className="max-w-3xl">
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`max-w-3xl ${setupComplete ? "" : "border-amber-300"}`}>
      <CardHeader>
        <CardTitle>{setupComplete ? "Bill settings" : "Finish setup"}</CardTitle>
        <CardDescription>
          Dooit invoices are added to Xero as bills from Dooit, coded to the account and tax rate you choose.
          {!setupComplete && " Nothing is sent to Xero until you save these settings."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {problems.length > 0 && (
          <div role="alert" className="space-y-1 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
            <p className="flex items-center gap-2 font-medium">
              <AlertTriangle className="size-4" aria-hidden="true" />
              Bills are paused until these are fixed:
            </p>
            <ul className="list-disc pl-6">
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        )}

        {options && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="xero-bill-account"
                label="Expense account"
                hint="Active expense accounts from your Xero chart of accounts."
              >
                <Select value={form.billAccountCode} onValueChange={set("billAccountCode")}>
                  <SelectTrigger id="xero-bill-account" className="w-full">
                    <SelectValue placeholder="Choose an account" />
                  </SelectTrigger>
                  <SelectContent>
                    {options.billAccounts.map((a) => (
                      <SelectItem key={a.code} value={a.code}>
                        {a.code} — {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field
                id="xero-tax-rate"
                label="Tax rate"
                hint="Use the rate that matches the GST on your Dooit invoices. Xero calculates the tax."
              >
                <Select value={form.taxType} onValueChange={set("taxType")}>
                  <SelectTrigger id="xero-tax-rate" className="w-full">
                    <SelectValue placeholder="Choose a tax rate" />
                  </SelectTrigger>
                  <SelectContent>
                    {options.taxRates.map((t) => (
                      <SelectItem key={t.taxType} value={t.taxType}>
                        {t.name} ({t.rate}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field id="xero-bill-status" label="New bills are added as">
                <Select value={form.billStatus} onValueChange={set("billStatus")}>
                  <SelectTrigger id="xero-bill-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {options.billStatuses.map((s) => (
                      <SelectItem key={s} value={s}>
                        {BILL_STATUS_LABELS[s] || s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Button type="button" variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
                <RefreshCw className={refreshing ? "animate-spin" : ""} aria-hidden="true" />
                Refresh lists
              </Button>
              <ExternalXeroLink href={options.links?.chartOfAccounts}>Chart of accounts in Xero</ExternalXeroLink>
              <ExternalXeroLink href={options.links?.taxRates}>Tax rates in Xero</ExternalXeroLink>
            </div>
            <p className="text-xs text-muted-foreground">
              Missing an account? Create it in Xero, then choose <span className="font-medium">Refresh lists</span>.
              {options.baseCurrency && ` Your Xero base currency is ${options.baseCurrency}; bills in other currencies need that currency enabled in Xero.`}
            </p>

            <div className="space-y-4 border-t pt-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <Label htmlFor="xero-sync-payments">Record payments Dooit has received</Label>
                  <p className="text-xs text-muted-foreground">
                    Applied to the bill once it is approved in Xero, from the account below.
                  </p>
                </div>
                <Switch id="xero-sync-payments" checked={form.syncPayments} onCheckedChange={set("syncPayments")} />
              </div>

              {form.syncPayments && (
                <Field
                  id="xero-payment-account"
                  label="Paid from"
                  hint="Bank accounts and accounts with payments enabled."
                >
                  <Select value={form.paymentAccountId} onValueChange={set("paymentAccountId")}>
                    <SelectTrigger id="xero-payment-account" className="w-full sm:w-1/2">
                      <SelectValue placeholder="Choose an account" />
                    </SelectTrigger>
                    <SelectContent>
                      {options.paymentAccounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.code ? `${a.code} — ` : ""}
                          {a.name}
                          {a.currency ? ` (${a.currency})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}

              <div className="flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <Label htmlFor="xero-sync-customers">Send KYC-verified customers to Xero as contacts</Label>
                  <p className="text-xs text-muted-foreground">
                    Shares each verified customer&apos;s name, email, phone and address with your Xero organisation.
                    Customers who are pending, rejected, offboarded or have a sanctions or screening flag are never
                    sent, and a contact is archived in Xero if its customer stops qualifying. Off unless you turn it
                    on. Changes made in Xero never alter your KYC records.
                  </p>
                </div>
                <Switch id="xero-sync-customers" checked={form.syncCustomers} onCheckedChange={set("syncCustomers")} />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={handleSave} disabled={incomplete || saving}>
                {saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Save aria-hidden="true" />}
                {setupComplete ? "Save settings" : "Save and start sending bills"}
              </Button>
              {incomplete && (
                <span className="text-xs text-muted-foreground">
                  Choose an expense account, a tax rate{form.syncPayments ? " and a payment account" : ""}.
                </span>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
