'use client';

import {
  createEcdd,
  draftEcddReport,
  updateEcdd,
} from '@/app/dashboard/client/report-compliance/ecdd/actions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Save,
  Upload,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import UILoader from './UILoader';
import { getCaseList } from '@/app/dashboard/client/monitoring-and-cases/case-list/actions';
import { z } from 'zod';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getEcddById } from '@/app/dashboard/client/report-compliance/ecdd/actions';
import SelectCaseList from './ui/SelectCaseList';
import SelectCase from './ui/SelectCase';

/** "2026-08-22T14:21:03.187Z" → "2026-08-22" (what a date input wants). */
const dateOnly = (value) => (value ? String(value).split('T')[0] : '');

/**
 * Drop the parts of a drafted report that belong to the record, not the form:
 * the frozen analysis, the alert snapshots and the AI provenance. They are
 * large, read-only, and would otherwise ride along in every form reset.
 */
const stripHeavyFields = (doc = {}) => {
  // personsOfInterest is read-only here (drafted from the case), so it stays
  // out of the form values and is never written back by a save.
  const { analysisSnapshot, alerts, aiMeta, ipAddresses, settings, metadata, personsOfInterest, ...rest } = doc;
  return rest;
};

const formSchema = z.object({
  caseNumber: z.object({
    label: z.string(),
    value: z.string(),
  }),
  // Investigation hub. Optional: an ECDD raised from an escalated alert already
  // resolves its Case server-side, so this only needs setting when attaching to
  // a Case directly.
  caseId: z
    .object({ label: z.string(), value: z.string() })
    .nullable()
    .optional(),
  analystName: z.string(),
  fullName: z.string(),
  accountPurpose: z.string(),
  onboardingDate: z.string(),
  expectedVolume: z.coerce.number(),
  beneficialOwner: z.string(),
  withdrawalDetails: z.string(),
  accountCreationDate: z.string(),
  totalDepositsAUD: z.string(),
  totalWithdrawalsUSDT: z.string(),
  totalWithdrawalsETH: z.string(),
  totalWithdrawalsBTC: z.string(),
  depositDetails: z.string(),
  ipLocations: z.coerce.number(),
  registeredAddress: z.string(),
  annualIncome: z.coerce.number(),
  additionalInfo: z.string(),
  behavioralAnalysis: z.string(),
  directors: z.string(),
  isPEP: z.string(),
  isSanctioned: z.string(),
  relatedParty: z.string(),
  totalDepositsAUD: z.coerce.number(),
  totalWithdrawalsUSDT: z.coerce.number(),
  totalWithdrawalsETH: z.coerce.number(),
  totalWithdrawalsBTC: z.coerce.number(),
  analysisEndDate: z.string(),
  accountCreationDate: z.string(),
  transactionAnalysis: z.string(),
  abn: z.string(),
  profileSummary: z.string(),
  recommendation: z.string().optional(),
  transaction: z.string().optional(),
  generatedBy: z.string().optional(),
  analyst: z.string().optional(),
  customer: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
});

export function ECDDForm({ caseNumber, id }) {
  const [formData, setFormData] = useState({
    isPEP: 'No',
    isSanctioned: 'No',
    relatedParty: 'N/A',
    abn: '',

    position: 'Compliance Officer',
    date: new Date().toISOString().split('T')[0],
    analystName: '',
    analysisEndDate: '',
    fullName: '',
    accountPurpose: '',
    onboardingDate: '',
    expectedVolume: 0,
    beneficialOwner: '',
    withdrawalDetails: '',
    accountCreationDate: '',
    totalDepositsAUD: 0,
    totalWithdrawalsUSDT: 0,
    totalWithdrawalsETH: 0,
    totalWithdrawalsBTC: 0,
    depositDetails: '',
    ipLocations: '',
    registeredAddress: '',
    annualIncome: 0,
    additionalInfo: '',
    behavioralAnalysis: '',
    directors: '',
    isPEP: 'No',
    isSanctioned: 'No',
    relatedParty: 'N/A',
    transaction: '',
    generatedBy: '',
    analyst: '',
    customer: '',
    profileSummary: '',
    transactionAnalysis: '',
    recommendation: '',
    ipLocations: '',
    registeredAddress: '',
    behavioralAnalysis: '',
    recommendation: '',
    additionalInfo: '',
    behavioralAnalysis: '',
    directors: '',
    isPEP: 'No',
    isSanctioned: 'No',
    relatedParty: 'N/A',
    transaction: '',
    generatedBy: '',

    customer: '',
    profileSummary: '',
    transactionAnalysis: '',
    recommendation: '',
    ipLocations: '',
    registeredAddress: '',
    behavioralAnalysis: '',
    recommendation: '',
    additionalInfo: '',
    behavioralAnalysis: '',
    directors: '',
    isPEP: 'No',
    isSanctioned: 'No',
    relatedParty: 'N/A',
  });

  const [lastSaved, setLastSaved] = useState(null);
  // Who the ECDD covers, as drafted from the case's persons of interest.
  const [personsOfInterest, setPersonsOfInterest] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  const [caseNumbers, setCaseNumbers] = useState([]);
  const [fetchingCaseNumbers, setFetchingCaseNumbers] = useState(false);

  const router = useRouter();
  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: formData,
  });

  useEffect(() => {
    if (id) {
      // Editing a saved report. This was disabled, so opening the form from the
      // register (which navigates with ?id=) showed an empty form and a save
      // would have written blanks over the stored record.
      getDataById();
    } else if (caseNumber) {
      // New report — draft it from the case.
      prefillFromDraft();
    }
  }, [id, caseNumber]);

  /**
   * Draft this case's ECDD and load it into the form.
   *
   * Every figure and identity is computed by our API from our own models; the
   * AI service contributes only the narrative sections (docs/74 §6.3). This
   * replaced two older paths that both read AI-shaped payloads in the browser —
   * one posting to a third-party host, one reading an alert's stored ECDD blob
   * that was copied from an unrelated alert when the alert had none of its own.
   */
  const prefillFromDraft = async () => {
    setFetching(true);
    try {
      const response = await draftEcddReport(caseNumber);
      if (response?.succeed && response.data) {
        reset(mapReportToForm(response.data));
        setPersonsOfInterest(response.data.personsOfInterest || []);
      } else {
        setValue('caseNumber', caseNumber);
        toast.error(response?.message || 'Could not draft this ECDD');
      }
    } catch (error) {
      setValue('caseNumber', caseNumber);
      console.error('Failed to draft ECDD', error);
      toast.error('Could not draft this ECDD');
    } finally {
      setFetching(false);
    }
  };

  const getDataById = async () => {
    setFetching(true);
    try {
      const response = await getEcddById(id);
      setPersonsOfInterest(response?.data?.personsOfInterest || []);
      const {
        caseNumber,
        caseId,
        transaction,
        analyst,
        customer,
        customerName,
        ...data
      } = response?.data;
      const formattedData = {
        ...stripHeavyFields(data),
        caseNumber: {
          label: caseNumber,
          value: caseNumber,
        },
        // caseId may arrive populated or as a bare ObjectId.
        caseId: caseId
          ? {
              label: caseId.uid
                ? `${caseId.uid} — ${caseId.title || 'Untitled'}`
                : String(caseId._id || caseId),
              value: String(caseId._id || caseId),
            }
          : null,
        transaction: transaction?._id,
        analyst: analyst?._id,
        customer: customer?._id,
        // customerName is a stored column in its own right — destructuring it
        // out of `data` dropped it from the form entirely, so reopening a saved
        // report lost it. Put it back.
        customerName,
        // The report's own onboardingDate is authoritative. Reading the
        // customer's createdAt unconditionally overwrote whatever was saved, so
        // the stored value could never round-trip.
        onboardingDate: (data?.onboardingDate || customer?.createdAt)?.split('T')[0] ?? '',
        // Likewise, a hardcoded position discarded the preparing officer's own
        // title every time the report was reopened.
        position: data?.position || 'Compliance Officer',
        accountCreationDate: data?.accountCreationDate?.split('T')[0] ?? '',
        analysisEndDate: data?.analysisEndDate?.split('T')[0] ?? '',
        date: data?.date ? data?.date?.split('T')[0] : '',
        generatedBy: data?.generatedBy?._id,
      };
      reset(formattedData);
    } catch (error) {
      console.error('Failed to get data', error);
      // toast.error("Failed to get data");
    } finally {
      setFetching(false);
    }
  };

  /**
   * Our EcddReport document → the form's values.
   *
   * The form and the model share field names, so this is mostly date
   * normalisation plus unwrapping the populated refs. It replaced a mapper
   * that translated the AI service's snake_case payload — the form no longer
   * reads anything the AI computed.
   */
  const mapReportToForm = (doc = {}) => {
    const {
      caseNumber: docCaseNumber,
      caseId,
      transaction,
      analyst,
      customer,
      generatedBy,
      ...rest
    } = doc;

    return {
      ...stripHeavyFields(rest),
      caseNumber: {
        label: docCaseNumber || caseNumber,
        value: docCaseNumber || caseNumber,
      },
      caseId: caseId
        ? {
            label: caseId.uid
              ? `${caseId.uid} — ${caseId.title || 'Untitled'}`
              : String(caseId._id || caseId),
            value: String(caseId._id || caseId),
          }
        : null,
      transaction: transaction?._id || transaction || undefined,
      analyst: analyst?._id || analyst || undefined,
      customer: customer?._id || customer || undefined,
      generatedBy: generatedBy?._id || generatedBy || undefined,
      position: doc.position || 'Compliance Officer',
      onboardingDate: dateOnly(doc.onboardingDate),
      accountCreationDate: dateOnly(doc.accountCreationDate),
      analysisEndDate: dateOnly(doc.analysisEndDate),
      date: dateOnly(doc.date) || new Date().toISOString().split('T')[0],
    };
  };

  const handleSave = async (data) => {
    setLastSaved(new Date());
    setLoading(true);
    // const {} = formData;
    const submittedData = {
      ...data,
      caseNumber: data?.caseNumber?.value,
      // Send the Case _id only when one was picked — omitting it lets the API
      // fall back to deriving the Case from the alert.
      ...(data?.caseId?.value ? { caseId: data.caseId.value } : {}),
      ...(id ? { id: id } : {}),
    };

    const action = id ? updateEcdd : createEcdd;
    const response = await action(submittedData);
    if (response.success) {
      localStorage.setItem('newId', response.data._id);
      toast.success(
        id ? 'Case updated successfully' : 'Case created successfully'
      );
      router.push(`/dashboard/client/report-compliance/ecdd`);
    } else {
      console.log('submittedData', JSON.stringify(submittedData, null, 2));
      toast.error(response?.error || 'Failed to create case');
    }
    console.log('[v0] ECDD response', response);
    setLoading(false);
  };

  const fetchCaseNumbers = async () => {
    setFetchingCaseNumbers(true);
    try {
      const response = await getCaseList();
      const options = response.data.map((item) => ({
        ...item,
        label: item.uid,
        value: item.uid,
      }));

      setCaseNumbers(options);
    } catch (error) {
      console.error('Failed to get case numbers', error);
    } finally {
      setFetchingCaseNumbers(false);
    }
  };

  const handleCaseNumberChange = (value) => {
    const kycData = value?.customer?.personalKyc;

    setValue('caseNumber', value, { shouldValidate: true });
    if (value?.new) {
      setValue(
        'caseNumber',
        {
          label: value.label,
          value: value.value,
        },
        { shouldValidate: true }
      );
    } else {
      setValue('analystName', value?.analyst?.name, {
        shouldValidate: true,
      });
      setValue(
        'fullName',
        `${kycData?.personal_form?.customer_details?.given_name} ${kycData?.personal_form?.customer_details?.surname}`,
        { shouldValidate: true }
      );
      setValue('accountPurpose', kycData?.funds_wealth?.account_purpose, {
        shouldValidate: true,
      });
      setValue('onboardingDate', value?.customer?.createdAt?.split('T')[0], {
        shouldValidate: true,
      });
      setValue(
        'expectedVolume',
        kycData?.funds_wealth?.estimated_trading_volume,
        {
          shouldValidate: true,
        }
      );
      setValue('beneficialOwner', value?.transaction?.beneficiary?.name, {
        shouldValidate: true,
      });
      setValue('transaction', value?.transaction?._id, {
        shouldValidate: true,
      });
      setValue('generatedBy', value?.analyst?._id, {
        shouldValidate: true,
      });
      setValue('analyst', value?.analyst?._id, { shouldValidate: true });
      setValue('customer', value?.customer?._id, {
        shouldValidate: true,
      });
      setValue('isPEP', value?.customer?.isPep ? 'Yes' : 'No', {
        shouldValidate: true,
      });
      setValue('isSanctioned', value?.customer?.sanction ? 'Yes' : 'No', {
        shouldValidate: true,
      });
      setValue(
        'registeredAddress',
        kycData?.personal_form?.residential_address?.address,
        {
          shouldValidate: true,
        }
      );
    }
  };

  return (
    <UILoader loading={fetching} type="page">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold  text-zinc-700 mb-2">
            Enhanced Customer Due Diligence
          </h1>
          <p className="text-muted-foreground">
            Upload data or manually complete the ECDD report
          </p>
          {lastSaved && (
            <p className="text-sm text-muted-foreground mt-2">
              Last saved: {lastSaved.toLocaleString()}
            </p>
          )}
        </div>
        {/* Section 1: Analysis and Review */}
        <Card className="border   p-6 mb-6">
          <h2 className="text-2xl font-bold  text-zinc-700 mb-6">
            1. Analysis and Review
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Controller
                control={control}
                name="analystName"
                render={({ field }) => (
                  <div>
                    <Label htmlFor="analystName">Analyst Name</Label>
                    <Input
                      id="analystName"
                      {...field}
                      placeholder="Enter analyst name"
                      error={errors.analystName?.message}
                    />
                  </div>
                )}
              />
              <Controller
                control={control}
                name="position"
                render={({ field }) => (
                  <div>
                    <Label htmlFor="position">Position</Label>
                    <Input
                      id="position"
                      {...field}
                      placeholder="Enter position"
                    />
                  </div>
                )}
              />

              <Controller
                control={control}
                name="date"
                render={({ field }) => (
                  <div>
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      {...field}
                      placeholder="Enter date"
                      type="date"
                    />
                  </div>
                )}
              />

              <div>
                <Controller
                  control={control}
                  name="caseNumber"
                  render={({ field }) => (
                    <SelectCaseList
                      label="Alert / Case Number"
                      options={caseNumbers}
                      value={field.value || null}
                      onChange={(value) => handleCaseNumberChange(value)}
                      onFocus={fetchCaseNumbers}
                      isLoading={fetchingCaseNumbers}
                      error={errors.caseNumber?.message}
                      // isDisabled={fetchingCaseNumbers}
                    />
                  )}
                />
              </div>

              <div>
                <Controller
                  control={control}
                  name="caseId"
                  render={({ field }) => (
                    <SelectCase
                      label="Case (investigation hub)"
                      value={field.value || null}
                      onChange={field.onChange}
                      error={errors.caseId?.message}
                    />
                  )}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Optional — leave blank to inherit the Case from the selected
                  alert once it has been escalated.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Section 2: Customer Profile */}
        <Card className="border   p-6 mb-6">
          <h2 className="text-2xl font-bold  text-zinc-700 mb-6">
            2. Customer Profile
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Controller
                control={control}
                name="fullName"
                render={({ field }) => (
                  <div>
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      {...field}
                      placeholder="Enter full name"
                      error={errors.fullName?.message}
                    />
                  </div>
                )}
              />

              <Controller
                control={control}
                name="abn"
                render={({ field }) => (
                  <div>
                    <Label htmlFor="abn">ABN</Label>
                    <Input
                      id="abn"
                      {...field}
                      placeholder="Enter ABN"
                      error={errors.abn?.message}
                    />
                  </div>
                )}
              />

              <Controller
                control={control}
                name="onboardingDate"
                render={({ field }) => (
                  <div>
                    <Label htmlFor="onboardingDate">Onboarding Date</Label>
                    <Input
                      id="onboardingDate"
                      type="date"
                      {...field}
                      placeholder="Enter onboarding date"
                      error={errors.onboardingDate?.message}
                    />
                  </div>
                )}
              />
              <Controller
                control={control}
                name="accountPurpose"
                render={({ field }) => (
                  <div>
                    <Label htmlFor="accountPurpose">Account Purpose</Label>
                    <Input
                      id="accountPurpose"
                      {...field}
                      placeholder="Enter account purpose"
                      error={errors.accountPurpose?.message}
                    />
                  </div>
                )}
              />
              <Controller
                control={control}
                name="expectedVolume"
                type="number"
                render={({ field }) => (
                  <div>
                    <Label htmlFor="expectedVolume">
                      Expected Trading Volume (AUD)
                    </Label>
                    <Input
                      id="expectedVolume"
                      {...field}
                      type="number"
                      placeholder="Enter expected trading volume"
                      error={errors.expectedVolume?.message}
                    />
                  </div>
                )}
              />
              <Controller
                control={control}
                name="annualIncome"
                render={({ field }) => (
                  <div>
                    <Label htmlFor="annualIncome">
                      Annual Income (Million AUD)
                    </Label>
                    <Input
                      id="annualIncome"
                      type="number"
                      {...field}
                      placeholder="Enter annual income"
                      error={errors.annualIncome?.message}
                    />
                  </div>
                )}
              />
              <Controller
                control={control}
                name="beneficialOwner"
                render={({ field }) => (
                  <div>
                    <Label htmlFor="beneficialOwner">Beneficial Owner</Label>
                    <Input
                      id="beneficialOwner"
                      {...field}
                      placeholder="Enter beneficial owner"
                      error={errors.beneficialOwner?.message}
                    />
                  </div>
                )}
              />
              <Controller
                control={control}
                name="directors"
                render={({ field }) => (
                  <div className="md:col-span-2">
                    <Label htmlFor="directors">Directors</Label>
                    <Input
                      id="directors"
                      {...field}
                      placeholder="Enter directors"
                      error={errors.directors?.message}
                    />
                  </div>
                )}
              />
            </div>
            <Controller
              control={control}
              name="profileSummary"
              render={({ field }) => (
                <div>
                  <Label htmlFor="profileSummary">Profile Summary</Label>
                  <Textarea
                    id="profileSummary"
                    {...field}
                    placeholder="Enter profile summary"
                    error={errors.profileSummary?.message}
                  />
                </div>
              )}
            />
          </div>
        </Card>

        {/* Section 3-5: PEP, Sanctioned, Related Party */}
        <Card className="border   p-6 mb-6">
          <div className="space-y-6">
            <Controller
              control={control}
              name="isPEP"
              render={({ field }) => (
                <div>
                  <Label htmlFor="isPEP">Customer is PEP (Y/N)</Label>
                  <Select
                    value={field.value || 'No'}
                    onValueChange={(value) => field.onChange(value)}
                  >
                    <SelectTrigger id="isPEP">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            />
            <Controller
              control={control}
              name="isSanctioned"
              render={({ field }) => (
                <div>
                  <Label htmlFor="isSanctioned">
                    Sanctioned Customer (Y/N)
                  </Label>
                  <Select
                    value={field.value || 'No'}
                    onValueChange={(value) => field.onChange(value)}
                  >
                    <SelectTrigger id="isSanctioned">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            />
            <Controller
              control={control}
              name="relatedParty"
              render={({ field }) => (
                <div>
                  <Label htmlFor="relatedParty">Related Party</Label>
                  <Input
                    id="relatedParty"
                    {...field}
                    placeholder="Enter related party"
                    error={errors.relatedParty?.message}
                  />
                </div>
              )}
            />
            <PersonsOfInterestTable persons={personsOfInterest} />
          </div>
        </Card>

        {/* Section 6: Transaction Analysis */}
        <Card className="border   p-6 mb-6">
          <h2 className="text-2xl font-bold  text-zinc-700 mb-6">
            6. Transaction Analysis
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Controller
                control={control}
                name="accountCreationDate"
                render={({ field }) => (
                  <div>
                    <Label htmlFor="accountCreationDate">
                      Account Creation Date
                    </Label>
                    <Input
                      id="accountCreationDate"
                      type="date"
                      {...field}
                      placeholder="Enter account creation date"
                      error={errors.accountCreationDate?.message}
                    />
                  </div>
                )}
              />

              <Controller
                control={control}
                name="analysisEndDate"
                render={({ field }) => (
                  <div>
                    <Label htmlFor="analysisEndDate">Analysis End Date</Label>
                    <Input
                      id="analysisEndDate"
                      type="date"
                      {...field}
                      placeholder="Enter analysis end date"
                      error={errors.analysisEndDate?.message}
                    />
                  </div>
                )}
              />
              <Controller
                control={control}
                name="totalDepositsAUD"
                render={({ field }) => (
                  <div>
                    <Label htmlFor="totalDepositsAUD">
                      Total Deposits (AUD)
                    </Label>
                    <Input
                      id="totalDepositsAUD"
                      {...field}
                      placeholder="Enter total deposits"
                      error={errors.totalDepositsAUD?.message}
                    />
                  </div>
                )}
              />
              <Controller
                control={control}
                name="totalWithdrawalsUSDT"
                render={({ field }) => (
                  <div>
                    <Label htmlFor="totalWithdrawalsUSDT">
                      Total Withdrawals (USDT)
                    </Label>
                    <Input
                      id="totalWithdrawalsUSDT"
                      {...field}
                      placeholder="Enter total withdrawals"
                      error={errors.totalWithdrawalsUSDT?.message}
                    />
                  </div>
                )}
              />

              <Controller
                control={control}
                name="totalWithdrawalsETH"
                render={({ field }) => (
                  <div>
                    <Label htmlFor="totalWithdrawalsETH">
                      Total Withdrawals (ETH)
                    </Label>
                    <Input
                      id="totalWithdrawalsETH"
                      {...field}
                      placeholder="Enter total withdrawals"
                      error={errors.totalWithdrawalsETH?.message}
                    />
                  </div>
                )}
              />

              <Controller
                control={control}
                name="totalWithdrawalsBTC"
                render={({ field }) => (
                  <div>
                    <Label htmlFor="totalWithdrawalsBTC">
                      Total Withdrawals (BTC)
                    </Label>
                    <Input
                      id="totalWithdrawalsBTC"
                      {...field}
                      placeholder="Enter total withdrawals"
                      error={errors.totalWithdrawalsBTC?.message}
                    />
                  </div>
                )}
              />
            </div>
            <Controller
              control={control}
              name="depositDetails"
              render={({ field }) => (
                <div>
                  <Label htmlFor="depositDetails">Deposit Details</Label>
                  <Textarea
                    id="depositDetails"
                    {...field}
                    placeholder="Enter deposit details"
                    error={errors.depositDetails?.message}
                  />
                </div>
              )}
            />
            <Controller
              control={control}
              name="withdrawalDetails"
              render={({ field }) => (
                <div>
                  <Label htmlFor="withdrawalDetails">Withdrawal Details</Label>
                  <Textarea
                    id="withdrawalDetails"
                    {...field}
                    placeholder="Enter withdrawal details"
                    error={errors.withdrawalDetails?.message}
                  />
                </div>
              )}
            />

            <Controller
              control={control}
              name="transactionAnalysis"
              render={({ field }) => (
                <div>
                  <Label htmlFor="transactionAnalysis">
                    Transaction Analysis
                  </Label>
                  <Textarea
                    id="transactionAnalysis"
                    {...field}
                    placeholder="Enter transaction analysis"
                    error={errors.transactionAnalysis?.message}
                  />
                </div>
              )}
            />

            <Controller
              control={control}
              name="additionalInfo"
              render={({ field }) => (
                <div>
                  <Label htmlFor="additionalInfo">Additional Information</Label>
                  <Textarea
                    id="additionalInfo"
                    {...field}
                    placeholder="Enter additional information"
                    error={errors.additionalInfo?.message}
                  />
                </div>
              )}
            />
          </div>
        </Card>

        {/* Section 7: Behavioral Analysis */}
        <Card className="border   p-6 mb-6">
          <h2 className="text-2xl font-bold  text-zinc-700 mb-6">
            7. Behavioral Analysis
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Controller
                control={control}
                name="ipLocations"
                render={({ field }) => (
                  <div>
                    <Label htmlFor="ipLocations">Number of IP Locations</Label>
                    <Input
                      id="ipLocations"
                      type="number"
                      {...field}
                      placeholder="Enter number of IP locations"
                      error={errors.ipLocations?.message}
                    />
                  </div>
                )}
              />

              <Controller
                control={control}
                name="registeredAddress"
                render={({ field }) => (
                  <div>
                    <Label htmlFor="registeredAddress">
                      Registered Address
                    </Label>
                    <Input
                      id="registeredAddress"
                      {...field}
                      placeholder="Enter registered address"
                      error={errors.registeredAddress?.message}
                    />
                  </div>
                )}
              />
            </div>
            <Controller
              control={control}
              name="behavioralAnalysis"
              render={({ field }) => (
                <div>
                  <Label htmlFor="behavioralAnalysis">
                    Behavioral Analysis
                  </Label>
                  <Textarea
                    id="behavioralAnalysis"
                    {...field}
                    placeholder="Enter behavioral analysis"
                    error={errors.behavioralAnalysis?.message}
                  />
                </div>
              )}
            />
          </div>
        </Card>

        {/* Section 8: Recommendation */}
        <Card className="border   p-6 mb-6">
          <h2 className="text-2xl font-bold  text-zinc-700 mb-6">
            8. Recommendation
          </h2>
          <Controller
            control={control}
            name="recommendation"
            render={({ field }) => (
              <div>
                <Label htmlFor="recommendation">Recommendation</Label>
                <Textarea
                  id="recommendation"
                  {...field}
                  placeholder="Enter recommendation"
                  error={errors.recommendation?.message}
                />
              </div>
            )}
          />
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mb-8">
          <Button
            onClick={handleSubmit(handleSave)}
            size="lg"
            variant="outline"
            className="border   bg-transparent"
            disabled={loading}
          >
            <Save className="w-5 h-5 mr-2" />
            {loading ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              'Save Progress'
            )}
          </Button>
          {/* <Button
          onClick={handleExport}
          size="lg"
          variant="outline"
          className="border   bg-transparent"
        >
          <Download className="w-5 h-5 mr-2" />
          Export JSON
        </Button> */}
          {/* <Button
            onClick={handleGenerateReport}
            size="lg"
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            <FileSpreadsheet className="w-5 h-5 mr-2" />
            Generate Report
          </Button> */}
          {caseNumber ? (
            <>
              <Button
                variant="outline"
                size="lg"
                className={'border bg-transparent'}
                onClick={() =>
                  router.push(
                    `/dashboard/client/report-compliance/smr-filing/smr/form?caseNumber=${caseNumber}`
                  )
                }
              >
                <FileText className="w-5 h-5 mr-2 text-destructive" />
                SMR
              </Button>
              <Button
                variant="outline"
                size="lg"
                className={'border bg-transparent'}
              >
                <FileText className="w-5 h-5 mr-2 text-destructive" /> RFI
              </Button>
              <Button
                variant="outline"
                size="lg"
                className={'border bg-transparent'}
              >
                <FileSpreadsheet className="w-5 h-5 mr-2 text-destructive" />{' '}
                GFS
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </UILoader>
  );
}

/**
 * The persons of interest drafted from the case — its customers and the
 * non-customer POIs recorded in the Investigation Hub. Read-only: they are
 * managed on the case, and a redraft picks up any change.
 */
function PersonsOfInterestTable({ persons = [] }) {
  if (!persons.length) return null;
  return (
    <div>
      <Label>Persons of Interest</Label>
      <p className="mb-2 text-xs text-muted-foreground">
        From the case. Add or edit persons of interest in the case&apos;s Investigation Hub, then redraft.
      </p>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Role</th>
              <th className="px-3 py-2 font-medium">Relationship</th>
              <th className="px-3 py-2 font-medium">Nationality / country</th>
              <th className="px-3 py-2 font-medium">Source</th>
            </tr>
          </thead>
          <tbody>
            {persons.map((p, i) => (
              <tr key={p.poi || p.customer || i} className="border-t">
                <td className="px-3 py-2 font-medium">
                  {p.name || '—'}
                  {p.kind === 'entity' && <span className="ml-1 text-xs text-muted-foreground">(entity)</span>}
                </td>
                <td className="px-3 py-2">{p.role || '—'}</td>
                <td className="px-3 py-2">{p.relationship || '—'}</td>
                <td className="px-3 py-2">{[p.nationality, p.country].filter(Boolean).join(' / ') || '—'}</td>
                <td className="px-3 py-2 capitalize">{p.source === 'alert' ? 'Alert party' : p.source || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
