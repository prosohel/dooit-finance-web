"use client"

import { useState } from "react"
import { ChevronDown, Check, Plus, Trash } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

import { businessFormSchema, generalInformationSchema } from "./schema"
import { Controller, useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import Directors from "./Directors"
import IdentificationDocuments from "../../common/IdentificationDocuments"
import Declaration from "../../common/Declaration"

import { countriesData } from "@/constants"
import { useCustomerRegisterStore } from "@/app/store/useCustomerRegister"
import { toast } from "sonner"
import { customerOnboarding } from "@/app/customer/registration/actions"
import { Checkbox } from "@/components/ui/checkbox"
import dynamic from "next/dynamic"
const CustomSelect = dynamic(() => import("@/components/ui/CustomSelect"), { ssr: false })

const formData = {
  general_information: {
    legal_name: "",
    trading_names: "",
    phone_number: "",
    registration_number: "",
    country_of_incorporation: "",
    contact_email: "",
    industry: "",
    nature_of_business: "",
    annual_income: "",
    local_agents: [],
    registered_addresses: [
      {
        street: "",
        suburb: "",
        state: "",
        postcode: "",
        country: ""
      }
    ],
    business_addresses: [],
    entity_type: "",
    account_purpose: {
      digital_currency_exchange: false,
      peer_to_peer: false,
      fx: false,
      other: false,
      other_details: ""
    },
    estimated_trading_volume: ""
  },
  directors_beneficial_owner: {
    directors: [
      {
        given_name: "",
        surname: ""
      }
    ],
    beneficial_owners: [
      {
        full_name: "",
        date_of_birth: "",
        residential_address: {
          street: "",
          suburb: "",
          state: "",
          postcode: "",
          country: ""
        }
      }
    ]
  },
  documents: [],
  declaration: {
    declarations_accepted: false,
    signatory_name: "",
    signature: "",
    date: ""
  }
};

export default function KYCCompanyForm() {
  const [expandedSections, setExpandedSections] = useState({
    general: true,
    directors: false,
    documents: false,
    declaration: false,
  })
  const [formLoading, setFormLoading] = useState(false)

  const { registerType, country } = useCustomerRegisterStore()

  const { handleSubmit, formState: { errors }, control, setValue } = useForm({
    resolver: zodResolver(businessFormSchema),
    defaultValues: formData,
  })

  const {
    fields: registeredAddressFields,
    append: appendRegisteredAddress,
    remove: removeRegisteredAddress,
  } = useFieldArray({ control, name: "general_information.registered_addresses" })
  const {
    fields: businessAddressFields,
    append: appendBusinessAddress,
    remove: removeBusinessAddress,
  } = useFieldArray({ control, name: "general_information.business_addresses" })
  const {
    fields: localAgentFields,
    append: appendLocalAgent,
    remove: removeLocalAgent,
  } = useFieldArray({ control, name: "general_information.local_agents" })
  const emptyAddress = { street: "", suburb: "", state: "", postcode: "", country: "" }

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const onSubmit = async (data) => {
    const token = localStorage.getItem('invite_token');
    const cid = localStorage.getItem('invite_cid');
    setFormLoading(true)
    const submittedData = {
      token: token,
      cid: cid,
      requestedType: 'company',
      country: country?.value,
      kyc: {
        general_information: {
          ...data.general_information,
          entity_type: data.general_information.entity_type,
          country_of_incorporation: data.general_information.country_of_incorporation?.value,
          local_agents: (data.general_information.local_agents || []).map((agent) => ({
            ...agent,
            address: {
              ...agent.address,
              country: agent.address?.country?.value ?? agent.address?.country,
            },
          })),
          registered_addresses: (data.general_information.registered_addresses || []).map((addr) => ({
            ...addr,
            country: addr.country?.value ?? addr.country,
          })),
          business_addresses: (data.general_information.business_addresses || []).map((addr) => ({
            ...addr,
            country: addr.country?.value ?? addr.country,
          })),
          directors_beneficial_owner: {
            ...data.directors_beneficial_owner,
            directors: data.directors_beneficial_owner.directors,
            beneficial_owners: data.directors_beneficial_owner.beneficial_owners.map(beneficialOwner => ({
              ...beneficialOwner,
              residential_address: {
                ...beneficialOwner.residential_address,
                country: beneficialOwner.residential_address.country.value
              }
            })),
          },
        }
      },
      documents: data.documents,
      declaration: data.declaration,
    }
    // console.log("submittedData", submittedData);
    console.log('submittedData', JSON.stringify(submittedData, null, 2))
    const response = await customerOnboarding(submittedData);
    setFormLoading(false)
    console.log("response", response);
    if (response.success) {
      router.push('/customer/dashboard');
      localStorage.removeItem('invite_token');
      localStorage.removeItem('invite_cid');
      toast.success('Welcome onboard!');
    }

  }

  return (
    <div className="min-h-screen ">
      {/* Header */}
      <div className="">
        <div className="container  pt-10">
          <div>
            <h1 className="text-3xl font-semibold text-foreground tracking-tight">KYC Company Registration</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Complete company verification and beneficial ownership information
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container pt-8  pb-12">
        {/* General Information Section */}
        <div className="mb-2">
          <button
            onClick={() => toggleSection("general")}
            className="w-full flex items-center justify-between p-4 rounded-lg bg-card/50 border border-border/40 hover:border-border/60 hover:bg-card/80 transition-all duration-200 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-semibold text-primary">1</span>
              </div>
              <h2 className="text-lg font-semibold text-foreground">General Information</h2>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${expandedSections.general ? "rotate-180" : ""
                }`}
            />
          </button>


          <div className="mt-4 space-y-6 p-6 rounded-lg  border ">
            {/* Company Details Grid */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-foreground">Company Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label>Legal Name</Label>
                  <Controller
                    control={control}
                    name="general_information.legal_name"
                    render={({ field }) => (
                      <Input
                        type="text"
                        {...field}
                        error={errors.general_information?.legal_name?.message}
                      />
                    )}
                  />
                </div>
                <div>
                  <Label>Trading Name</Label>
                  <Controller
                    control={control}
                    name="general_information.trading_names"
                    render={({ field }) => (
                      <Input
                        type="text"
                        {...field}
                        error={errors.general_information?.trading_names?.message}
                      />
                    )}
                  />
                </div>
                <div>
                  <Label >Registration Number</Label>
                  <Controller
                    control={control}
                    name="general_information.registration_number"
                    render={({ field }) => (
                      <Input
                        type="text"
                        {...field}
                        error={errors.general_information?.registration_number?.message}
                      />
                    )}
                  />
                </div>
                <div>
                  <Label >
                    Country of Incorporation
                  </Label>
                  <Controller
                    control={control}
                    name="general_information.country_of_incorporation"
                    render={({ field }) => (
                      <CustomSelect
                        {...field}
                        error={errors.general_information?.country_of_incorporation?.message}
                        options={countriesData}
                        onChange={(data) => field.onChange(data)}
                      />
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4 pt-4 border-t ">
              <h3 className="font-semibold text-sm text-foreground">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label >Email</Label>
                  <Controller
                    control={control}
                    name="general_information.contact_email"
                    render={({ field }) => (
                      <Input
                        type="email"
                        {...field}
                        error={errors.general_information?.contact_email?.message}
                      />
                    )}
                  />
                </div>
                <div>
                  <Label >Phone</Label>
                  <Controller
                    control={control}
                    name="general_information.phone_number"
                    render={({ field }) => (
                      <Input
                        type="tel"
                        {...field}
                        error={errors.general_information?.phone_number?.message}
                      />
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Business Information */}
            <div className="space-y-4 pt-4 border-t ">
              <h3 className="font-semibold text-sm text-foreground">Business Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label >Industry</Label>
                  <Controller
                    control={control}
                    name="general_information.industry"
                    render={({ field }) => (
                      <Input
                        type="text"
                        {...field}
                        error={errors.general_information?.industry?.message}
                      />
                    )}
                  />
                </div>
                <div>
                  <Label >Annual Income</Label>
                  <Controller
                    control={control}
                    name="general_information.annual_income"
                    render={({ field }) => (
                      <Input
                        type="text"
                        {...field}
                        error={errors.general_information?.annual_income?.message}
                      />
                    )}
                  />
                </div>
                <div className="">
                  <Label >Nature of Business</Label>
                  <Controller
                    control={control}
                    name="general_information.nature_of_business"
                    render={({ field }) => (
                      <Input
                        type="text"
                        {...field}
                        error={errors.general_information?.nature_of_business?.message}
                      />
                    )}
                  />
                </div>
                <div>
                  <Label >Company Type</Label>
                  <Controller
                    control={control}
                    name="general_information.entity_type"
                    render={({ field }) => (
                      <CustomSelect
                        {...field}
                        options={[
                          {
                            label: 'Private Company',
                            value: 'proprietary_limited'
                          },
                          {
                            label: 'Public Company',
                            value: 'public_company'
                          }
                        ]}
                        value={
                          field.value
                            ? { label: field.value === 'proprietary_limited' ? 'Private Company' : 'Public Company', value: field.value }
                            : null
                        }
                        error={errors.general_information?.entity_type?.message}
                        onChange={(opt) => field.onChange(opt?.value ?? opt)}
                      />
                    )}
                  />

                </div>
                <div>
                  <h3>Account Purpose</h3>
                  <div className="flex flex-col gap-4 py-4">
                    <div className="flex items-center gap-2">
                      <Controller
                        control={control}
                        name="general_information.account_purpose.digital_currency_exchange"
                        render={({ field }) => (
                          <Checkbox {...field} id="general_information.account_purpose.digital_currency_exchange" onCheckedChange={field.onChange} />
                        )}
                      />
                      <Label htmlFor="general_information.account_purpose.digital_currency_exchange" className={'mb-0'} >Digital Currency Exchange?</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Controller
                        control={control}

                        name="general_information.account_purpose.peer_to_peer"
                        render={({ field }) => (
                          <Checkbox id="general_information.account_purpose.peer_to_peer" {...field} onCheckedChange={field.onChange} />
                        )}
                      />
                      <Label htmlFor="general_information.account_purpose.peer_to_peer" className={'mb-0'} >Peer-to-Peer (P2P)?</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Controller
                        control={control}
                        name="general_information.account_purpose.fx"
                        render={({ field }) => (
                          <Checkbox id="general_information.account_purpose.fx" {...field} onCheckedChange={field.onChange} />
                        )}
                      />
                      <Label htmlFor="general_information.account_purpose.fx" className={'mb-0'} >FX?</Label>
                    </div>
                  </div>



                  <div className="lg:col-span-4">
                    <Label  >Other Details</Label>

                    <Controller
                      control={control}
                      name="general_information.account_purpose.other_details"
                      render={({ field }) => (
                        <Input type="textarea" {...field} error={errors.general_information?.account_purpose?.other_details?.message} />
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Addresses */}
            <div className="space-y-4 pt-4 border-t ">
              <h3 className="font-semibold text-sm text-foreground">Addresses</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-medium text-foreground/80">Registered Address(es)</h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendRegisteredAddress({ ...emptyAddress })}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {registeredAddressFields.map((field, index) => (
                    <div key={field.id} className="p-3 rounded-lg grid grid-cols-4 gap-4 border mb-3">
                      <div>
                        <Label>Street</Label>
                        <Controller
                          control={control}
                          name={`general_information.registered_addresses.${index}.street`}
                          render={({ field }) => (
                            <Input
                              type="text"
                              {...field}
                              error={errors.general_information?.registered_addresses?.[index]?.street?.message}
                            />
                          )}
                        />
                      </div>
                      <div>
                        <Label>Suburb</Label>
                        <Controller
                          control={control}
                          name={`general_information.registered_addresses.${index}.suburb`}
                          render={({ field }) => (
                            <Input
                              type="text"
                              {...field}
                              error={errors.general_information?.registered_addresses?.[index]?.suburb?.message}
                            />
                          )}
                        />
                      </div>
                      <div>
                        <Label>State</Label>
                        <Controller
                          control={control}
                          name={`general_information.registered_addresses.${index}.state`}
                          render={({ field }) => (
                            <Input
                              type="text"
                              {...field}
                              error={errors.general_information?.registered_addresses?.[index]?.state?.message}
                            />
                          )}
                        />
                      </div>
                      <div>
                        <Label>Postcode</Label>
                        <Controller
                          control={control}
                          name={`general_information.registered_addresses.${index}.postcode`}
                          render={({ field }) => (
                            <Input
                              type="text"
                              {...field}
                              error={errors.general_information?.registered_addresses?.[index]?.postcode?.message}
                            />
                          )}
                        />
                      </div>
                      <div>
                        <Label>Country</Label>
                        <Controller
                          control={control}
                          name={`general_information.registered_addresses.${index}.country`}
                          render={({ field }) => (
                            <CustomSelect
                              {...field}
                              error={errors.general_information?.registered_addresses?.[index]?.country?.message}
                              options={countriesData}
                              onChange={(data) => field.onChange(data)}
                            />
                          )}
                        />
                      </div>
                      <div className="flex items-end">
                        <Button type="button" variant="outline" size="sm" onClick={() => removeRegisteredAddress(index)}>
                          <Trash className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-medium text-foreground/80">Business Address(es) (if different from registered)</h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendBusinessAddress({ ...emptyAddress })}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {businessAddressFields.map((field, index) => (
                    <div key={field.id} className="p-3 rounded-lg grid grid-cols-4 gap-4 border mb-3">
                      <div>
                        <Label>Street</Label>
                        <Controller
                          control={control}
                          name={`general_information.business_addresses.${index}.street`}
                          render={({ field }) => (
                            <Input
                              type="text"
                              {...field}
                              error={errors.general_information?.business_addresses?.[index]?.street?.message}
                            />
                          )}
                        />
                      </div>
                      <div>
                        <Label>Suburb</Label>
                        <Controller
                          control={control}
                          name={`general_information.business_addresses.${index}.suburb`}
                          render={({ field }) => (
                            <Input
                              type="text"
                              {...field}
                              error={errors.general_information?.business_addresses?.[index]?.suburb?.message}
                            />
                          )}
                        />
                      </div>
                      <div>
                        <Label>State</Label>
                        <Controller
                          control={control}
                          name={`general_information.business_addresses.${index}.state`}
                          render={({ field }) => (
                            <Input
                              type="text"
                              {...field}
                              error={errors.general_information?.business_addresses?.[index]?.state?.message}
                            />
                          )}
                        />
                      </div>
                      <div>
                        <Label>Postcode</Label>
                        <Controller
                          control={control}
                          name={`general_information.business_addresses.${index}.postcode`}
                          render={({ field }) => (
                            <Input
                              type="text"
                              {...field}
                              error={errors.general_information?.business_addresses?.[index]?.postcode?.message}
                            />
                          )}
                        />
                      </div>
                      <div>
                        <Label>Country</Label>
                        <Controller
                          control={control}
                          name={`general_information.business_addresses.${index}.country`}
                          render={({ field }) => (
                            <CustomSelect
                              {...field}
                              error={errors.general_information?.business_addresses?.[index]?.country?.message}
                              options={countriesData}
                              onChange={(data) => field.onChange(data)}
                            />
                          )}
                        />
                      </div>
                      <div className="flex items-end">
                        <Button type="button" variant="outline" size="sm" onClick={() => removeBusinessAddress(index)}>
                          <Trash className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-medium text-foreground/80">Local Agent(s)</h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendLocalAgent({ name: "", address: { ...emptyAddress } })}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {localAgentFields.map((field, index) => (
                    <div key={field.id} className="p-3 rounded-lg grid grid-cols-4 gap-4 border mb-3">
                      <div>
                        <Label>Name</Label>
                        <Controller
                          control={control}
                          name={`general_information.local_agents.${index}.name`}
                          render={({ field }) => (
                            <Input
                              type="text"
                              {...field}
                              error={errors.general_information?.local_agents?.[index]?.name?.message}
                            />
                          )}
                        />
                      </div>
                      <div>
                        <Label>Street</Label>
                        <Controller
                          control={control}
                          name={`general_information.local_agents.${index}.address.street`}
                          render={({ field }) => (
                            <Input
                              type="text"
                              {...field}
                              error={errors.general_information?.local_agents?.[index]?.address?.street?.message}
                            />
                          )}
                        />
                      </div>
                      <div>
                        <Label>Suburb</Label>
                        <Controller
                          control={control}
                          name={`general_information.local_agents.${index}.address.suburb`}
                          render={({ field }) => (
                            <Input
                              type="text"
                              {...field}
                              error={errors.general_information?.local_agents?.[index]?.address?.suburb?.message}
                            />
                          )}
                        />
                      </div>
                      <div>
                        <Label>State</Label>
                        <Controller
                          control={control}
                          name={`general_information.local_agents.${index}.address.state`}
                          render={({ field }) => (
                            <Input
                              type="text"
                              {...field}
                              error={errors.general_information?.local_agents?.[index]?.address?.state?.message}
                            />
                          )}
                        />
                      </div>
                      <div>
                        <Label>Postcode</Label>
                        <Controller
                          control={control}
                          name={`general_information.local_agents.${index}.address.postcode`}
                          render={({ field }) => (
                            <Input
                              type="text"
                              {...field}
                              error={errors.general_information?.local_agents?.[index]?.address?.postcode?.message}
                            />
                          )}
                        />
                      </div>
                      <div>
                        <Label>Country</Label>
                        <Controller
                          control={control}
                          name={`general_information.local_agents.${index}.address.country`}
                          render={({ field }) => (
                            <CustomSelect
                              {...field}
                              options={countriesData}
                              onChange={(data) => field.onChange(data)}
                              error={errors.general_information?.local_agents?.[index]?.address?.country?.message}
                            />
                          )}
                        />
                      </div>
                      <div className="flex items-end">
                        <Button type="button" variant="outline" size="sm" onClick={() => removeLocalAgent(index)}>
                          <Trash className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Directors & Beneficial Owners Section */}
        <div className="mb-6">
          <button
            onClick={() => toggleSection("directors")}
            className="w-full flex items-center justify-between p-4 rounded-lg bg-card/50 border border-border/40 hover:border-border/60 hover:bg-card/80 transition-all duration-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-semibold text-primary">2</span>
              </div>
              <h2 className="text-lg font-semibold text-foreground">Directors & Beneficial Owners</h2>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${expandedSections.directors ? "rotate-180" : ""
                }`}
            />
          </button>

          {expandedSections.directors && (
            <div className="mt-4 p-6 rounded-lg  border ">

              <div className="">
                <Directors control={control} errors={errors} />
              </div>
            </div>
          )}
        </div>

        {/* Documents Section */}
        <div className="mb-6">
          <button
            onClick={() => toggleSection("documents")}
            className="w-full flex items-center justify-between p-4 rounded-lg bg-card/50 border border-border/40 hover:border-border/60 hover:bg-card/80 transition-all duration-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-semibold text-primary">3</span>
              </div>
              <h2 className="text-lg font-semibold text-foreground">Documents</h2>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${expandedSections.documents ? "rotate-180" : ""
                }`}
            />
          </button>

          {expandedSections.documents && (
            <div className="mt-4 p-6 rounded-lg  border ">
              <IdentificationDocuments control={control} errors={errors} />
            </div>
          )}
        </div>

        {/* Declaration Section */}
        <div className="mb-6">
          <button
            onClick={() => toggleSection("declaration")}
            className="w-full flex items-center justify-between p-4 rounded-lg bg-card/50 border border-border/40 hover:border-border/60 hover:bg-card/80 transition-all duration-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-semibold text-primary">4</span>
              </div>
              <h2 className="text-lg font-semibold text-foreground">Declaration</h2>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${expandedSections.declaration ? "rotate-180" : ""
                }`}
            />
          </button>

          {expandedSections.declaration && (
            <div className="mt-4 p-6 rounded-lg  border  space-y-4">
              <Declaration control={control} errors={errors} setValue={setValue} />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 justify-end mt-12 pt-8 border-t ">
          <button className="px-6 py-2.5 rounded-lg border border-border/50 text-foreground hover:bg-muted transition-colors text-sm font-medium">
            Cancel
          </button>
          <button className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium" onClick={handleSubmit(onSubmit)} disabled={formLoading}>
            {formLoading ? 'Submitting...' : 'Submit KYC'}
          </button>
        </div>
      </div>
    </div>
  )
}
