"use client";
import React, { useState } from "react";
import IdentificationDocuments from "@/views/company-registration/IdentificationDocuments";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import GeneralForm from "@/views/company-registration/GeneralForm";
import { Button } from "@/components/ui/button";
import { companyRegistrationFormSchema } from "@/views/company-registration/formSchema";

const initialValues = {
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
    company_type: {
      type: "",
      is_listed: false,
    },
    account_purpose: {
      digital_currency_exchange: false,
      peer_to_peer: false,
      fx: false,
      other: false,
      other_details: "",
    },
    estimated_trading_volume: "",
    local_agent: {
      name: "",
      address: {
        street: "",
        suburb: "",
        state: "",
        postcode: "",
        country: "",
      },
    },
    registered_address: {
      street: "",
      suburb: "",
      state: "",
      postcode: "",
      country: "",
    },
    business_address: {
      different_from_registered: false,
      street: "",
      suburb: "",
      state: "",
      postcode: "",
      country: "",
    },
  },
  directors: [
    {
      given_name: "",
      surname: "",
    },
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
        country: "",
      },
    },
  ],
  declaration: {
    declarations_accepted: false,
    signatory_name: "",
    signature: "",
    date: new Date().toISOString(),
  },
};
const CompanyRegistration = () => {
  const TOTAL_STEPS = 2;
  const [currentStep, setCurrentStep] = useState(1);
  const [verifyingStatus, setVerifyingStatus] = useState("idle");
  const form = useForm({
    defaultValues: initialValues,
    resolver: zodResolver(companyRegistrationFormSchema),
    mode: "onChange",
  });

  const onSubmit = (data) => {
    const payload = {
      token: "",
      cid: "",
      requestedType: "company",
      kyc: {
        general_information: data.general_information,
        directors_beneficial_owner: {
          directors: data.directors,
          beneficial_owners: data.beneficial_owners,
        },
      },
      declaration: data.declaration,
      documents: data.documents,
    };
    console.log("payload", payload);
  };
  return (
    <div className="container">
      {verifyingStatus === "idle" && (
        <div>
          <IdentificationDocuments form={form} />
        </div>
      )}

      <GeneralForm form={form} />
      <div className="flex justify-end my-10">
        <Button type="submit" onClick={form.handleSubmit(onSubmit)}>
          Submit
        </Button>
      </div>
    </div>
  );
};

export default CompanyRegistration;
