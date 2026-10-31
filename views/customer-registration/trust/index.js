'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrustRegistrationFormSchema } from './Schema';
import { FormField } from '../common/FormField';
import IdentificationDocuments from '../common/IdentificationDocuments';
import Declaration from '../common/Declaration';
import { useCustomerRegisterStore } from '@/app/store/useCustomerRegister';
import { customerOnboarding } from '@/app/customer/registration/actions';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function TrustRegistrationForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { country } = useCustomerRegisterStore();

  const form = useForm({
    resolver: zodResolver(TrustRegistrationFormSchema),
    mode: 'onChange',
    defaultValues: {
      kyc: {
        trust_details: {
          full_trust_name: '',
          country_of_establishment: '',
          settlor_name: '',
          industry: '',
          nature_of_business: '',
          annual_income: '',
          principal_address: {
            address: '',
            suburb: '',
            state: '',
            postcode: '',
            country: '',
          },
          postal_address: {
            different_from_principal: false,
            address: '',
            suburb: '',
            state: '',
            postcode: '',
            country: '',
          },
          contact_information: {
            email: '',
            phone: '',
            website: '',
          },
          trust_type: {
            selected_type: '',
            unregulated_trust: {
              type_description: '',
              is_registered: false,
              regulatory_body: '',
              registration_number: '',
            },
          },
          account_purpose: {
            digital_currency_exchange: false,
            peer_to_peer: false,
            fx: false,
            other: false,
          },
          estimated_trading_volume: '',
        },
        beneficiaries: [
          {
            named_beneficiaries: '',
            beneficiary_classes: '',
          },
        ],
        company_trustees: {
          has_company_trustees: false,
          company_details: [
            {
              company_name: '',
              registration_number: '',
            },
          ],
        },
        individual_trustees: {
          trustees: [
            {
              full_name: '',
              date_of_birth: '',
              residential_address: {
                street: '',
                suburb: '',
                state: '',
                postcode: '',
                country: '',
              },
            },
          ],
          has_additional_trustees: false,
        },
      },
      documents: [
        {
          name: '',
          url: '',
          mimeType: '',
          type: '',
          docType: '',
        },
      ],
      declaration: {
        declarations_accepted: false,
        signatory_name: '',
        signature: '',
        date: new Date().toISOString(),
      },
    },
  });

  const onSubmit = async (data) => {
    setIsSubmitting(true);

    const submittedData = {
      ...data,
      token: localStorage.getItem('invite_token'),
      cid: localStorage.getItem('invite_cid'),
      requestedType: 'trust',
      country: country?.value,
    }
    console.log('submittedData', JSON.stringify(submittedData, null, 2))
    try {
      const response = await customerOnboarding(submittedData);
      if (response.success) {
        toast.success('KYC form submitted successfully!');
      } else {
        toast.error('Failed to submit KYC form!');
      }
    } catch (error) {

    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">KYC Form</h1>
          <p className="text-muted-foreground mt-2">Complete all sections to submit your KYC information</p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="trust-details" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="trust-details">Trust Details</TabsTrigger>
              <TabsTrigger value="trustees">Trustees</TabsTrigger>
              <TabsTrigger value="beneficiaries">Beneficiaries</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="declaration">Declaration</TabsTrigger>
            </TabsList>

            {/* Trust Details Tab */}
            <TabsContent value="trust-details" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <FormField
                    form={form}
                    name="kyc.trust_details.full_trust_name"
                    label="Full Trust Name"
                    required
                  />
                  <FormField
                    form={form}
                    name="kyc.trust_details.country_of_establishment"
                    label="Country of Establishment"
                    required
                  />
                  <FormField
                    form={form}
                    name="kyc.trust_details.settlor_name"
                    label="Settlor Name"
                    required
                  />
                  <FormField
                    form={form}
                    name="kyc.trust_details.industry"
                    label="Industry"
                    required
                  />

                  <FormField
                    form={form}
                    name="kyc.trust_details.annual_income"
                    label="Annual Income"
                    required
                  />
                  <FormField
                    form={form}
                    name="kyc.trust_details.estimated_trading_volume"
                    label="Estimated Trading Volume"
                    required
                  />
                  <FormField
                    form={form}
                    name="kyc.trust_details.nature_of_business"
                    label="Nature of Business"
                    type="textarea"
                    required
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Principal Address</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    form={form}
                    name="kyc.trust_details.principal_address.address"
                    label="Address"
                    required
                  />
                  <div className="grid grid-cols-4 gap-4">
                    <FormField
                      form={form}
                      name="kyc.trust_details.principal_address.suburb"
                      label="Suburb"
                      required
                    />
                    <FormField
                      form={form}
                      name="kyc.trust_details.principal_address.state"
                      label="State"
                      required
                    />
                    <FormField
                      form={form}
                      name="kyc.trust_details.principal_address.postcode"
                      label="Postcode"
                      required
                    />
                    <FormField
                      form={form}
                      name="kyc.trust_details.principal_address.country"
                      label="Country"
                      required
                    />
                  </div>

                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Postal Address</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    form={form}
                    name="kyc.trust_details.postal_address.different_from_principal"
                    label="Different from Principal Address"
                    type="checkbox"
                  />
                  {form.watch('kyc.trust_details.postal_address.different_from_principal') && (
                    <>
                      <FormField
                        form={form}
                        name="kyc.trust_details.postal_address.address"
                        label="Address"
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          form={form}
                          name="kyc.trust_details.postal_address.suburb"
                          label="Suburb"
                        />
                        <FormField
                          form={form}
                          name="kyc.trust_details.postal_address.state"
                          label="State"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          form={form}
                          name="kyc.trust_details.postal_address.postcode"
                          label="Postcode"
                        />
                        <FormField
                          form={form}
                          name="kyc.trust_details.postal_address.country"
                          label="Country"
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <FormField
                    form={form}
                    name="kyc.trust_details.contact_information.email"
                    label="Email"
                    type="email"
                    required
                  />
                  <FormField
                    form={form}
                    name="kyc.trust_details.contact_information.phone"
                    label="Phone"
                    type="tel"
                    required
                  />
                  <FormField
                    form={form}
                    name="kyc.trust_details.contact_information.website"
                    label="Website"
                    type="text"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Trust Type & Account Purpose</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    form={form}
                    name="kyc.trust_details.trust_type.selected_type"
                    label="Trust Type"
                    type="select"
                    required
                    options={[
                      { label: 'Family Trust', value: 'family' },
                      { label: 'Unit Trust', value: 'unit' },
                      { label: 'Charitable Trust', value: 'charitable' },
                    ]}
                  />
                  <FormField
                    form={form}
                    name="kyc.trust_details.trust_type.unregulated_trust.type_description"
                    label="Type Description"
                    type="textarea"
                    required
                  />
                  <FormField
                    form={form}
                    name="kyc.trust_details.trust_type.unregulated_trust.is_registered"
                    label="Is Registered"
                    type="checkbox"
                  />
                  {form.watch('kyc.trust_details.trust_type.unregulated_trust.is_registered') && (
                    <>
                      <FormField
                        form={form}
                        name="kyc.trust_details.trust_type.unregulated_trust.regulatory_body"
                        label="Regulatory Body"
                      />
                      <FormField
                        form={form}
                        name="kyc.trust_details.trust_type.unregulated_trust.registration_number"
                        label="Registration Number"
                      />
                    </>
                  )}

                  <div className="mt-6 space-y-3">
                    <p className="font-semibold">Account Purpose <span className={cn('text-foreground', {
                      'text-destructive': form.formState.errors.kyc?.trust_details?.account_purpose?.message,
                    })}>
                      ( {form.formState.errors.kyc?.trust_details?.account_purpose?.message ? form.formState.errors.kyc?.trust_details?.account_purpose?.message : 'Select at least one account purpose'})
                    </span>
                    </p>
                    <FormField
                      form={form}
                      name="kyc.trust_details.account_purpose.digital_currency_exchange"
                      label="Digital Currency Exchange"
                      type="checkbox"

                    />
                    <FormField
                      form={form}
                      name="kyc.trust_details.account_purpose.peer_to_peer"
                      label="Peer to Peer"
                      type="checkbox"
                    />
                    <FormField
                      form={form}
                      name="kyc.trust_details.account_purpose.fx"
                      label="Foreign Exchange"
                      type="checkbox"
                    />
                    <FormField
                      form={form}
                      name="kyc.trust_details.account_purpose.other"
                      label="Other"
                      type="checkbox"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Trustees Tab */}
            <TabsContent value="trustees" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Individual Trustees</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    form={form}
                    name="kyc.individual_trustees.trustees.0.full_name"
                    label="Full Name"
                    required
                  />
                  <FormField
                    form={form}
                    name="kyc.individual_trustees.trustees.0.date_of_birth"
                    label="Date of Birth"
                    type="date"
                    required
                  />
                  <div>
                    <p
                      className="font-semibold mb-4"
                    >
                      Residential Address
                    </p>
                    <FormField
                      form={form}
                      name="kyc.individual_trustees.trustees.0.residential_address.street"
                      label="Street"
                      required
                    />
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <FormField
                        form={form}
                        name="kyc.individual_trustees.trustees.0.residential_address.suburb"
                        label="Suburb"
                        required
                      />
                      <FormField
                        form={form}
                        name="kyc.individual_trustees.trustees.0.residential_address.state"
                        label="State"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <FormField
                        form={form}
                        name="kyc.individual_trustees.trustees.0.residential_address.postcode"
                        label="Postcode"
                        required
                      />
                      <FormField
                        form={form}
                        name="kyc.individual_trustees.trustees.0.residential_address.country"
                        label="Country"
                        required
                      />
                    </div>
                  </div>
                  <FormField
                    form={form}
                    name="kyc.individual_trustees.has_additional_trustees"
                    label="Has Additional Trustees"
                    type="checkbox"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Company Trustees</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    form={form}
                    name="kyc.company_trustees.has_company_trustees"
                    label="Has Company Trustees"
                    type="checkbox"
                  />
                  {form.watch('kyc.company_trustees.has_company_trustees') && (
                    <>
                      <FormField
                        form={form}
                        name="kyc.company_trustees.company_details.0.company_name"
                        label="Company Name"
                      />
                      <FormField
                        form={form}
                        name="kyc.company_trustees.company_details.0.registration_number"
                        label="Registration Number"
                      />
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Beneficiaries Tab */}
            <TabsContent value="beneficiaries" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Beneficiaries</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    form={form}
                    name="kyc.beneficiaries.0.named_beneficiaries"
                    label="Named Beneficiaries"
                    type="textarea"
                    required
                  />
                  <FormField
                    form={form}
                    name="kyc.beneficiaries.0.beneficiary_classes"
                    label="Beneficiary Classes"
                    type="textarea"
                    required
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents" className="space-y-6">
              <Card className='p-6'>
                <IdentificationDocuments control={form.control} errors={form.formState.errors} />
              </Card>
            </TabsContent>

            {/* Declaration Tab */}
            <TabsContent value="declaration" className="space-y-6">
              <Card className='p-6'>
                <Declaration control={form.control} errors={form.formState.errors} setValue={form.setValue} />
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => form.reset()}
            >
              Reset
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit KYC Form'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
