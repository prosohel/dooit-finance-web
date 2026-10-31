"use client";
import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/button";
import { CheckCircle2, FileText, Loader2, Plus, Trash } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PageDescription, PageHeader, PageTitle } from "@/components/common";
import {
  createPolicyHub,
  generatePolicy,
  getAllTemplates,
} from "@/app/dashboard/client/knowledge-hub/policy-hub/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import DocumentTypeSelect from "@/components/ui/DocumentTypeSelect";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
const EditorForm = dynamic(() => import("./Editor"), { ssr: false });
const schema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  compliance_officer: z.string().min(1, "Compliance Officer is required"),
  industry: z.string().min(1, "Industry is required"),
  document_type: z.string().min(1, "Document type is required"),
  registration_date: z.string().min(1, "Registration Date is required"),
  services: z.array(z.string()).min(1, "Services is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email("Invalid email"),
  llm_model: z.string().min(1, "LLM Model is required"),
});
export default function PolicyForm() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [allTemplates, setAllTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  useEffect(() => {
    const fetchAllTemplates = async () => {
      try {
        const response = await getAllTemplates();
        console.log("tempresponse", response);
        setAllTemplates(response.data);
      } finally {
        setTemplatesLoading(false);
      }
    };
    fetchAllTemplates();
  }, []);
  const initialData = {
    name: "",
    address: "",
    compliance_officer: "",
    industry: "",
    document_type: "",
    registration_date: "",
    services: ["Payment Processing"],
    phone: "",
    email: "",
    llm_model: "",
  };
  const form = useForm({
    defaultValues: initialData,
    mode: "onChange",
    resolver: zodResolver(schema),
  });

  const llmModelOptions = [
    {
      label: "PHI4:Latest",
      value: "phi4:latest",
    },
    {
      label: "LLama:Latest",
      value: "llama:latest",
    },
    {
      label: "DeepSeek:7B",
      value: "deepseek-r1:7b",
    },
  ];
  const industryOptions = [
    {
      label: "Fintech",
      value: "fintech",
    },
    {
      label: "Accounting",
      value: "accounting",
    },
    {
      label: "Legal",
      value: "legal",
    },
    {
      label: "Real Estate",
      value: "real_estate",
    },
    {
      label: "Precious Metals",
      value: "precious_metals",
    },
    {
      label: "VASP",
      value: "vasp",
    },
  ];
  const services = useFieldArray({
    control: form.control,
    name: "services",
  });

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      const templatePayload = {
        docs: selectedTemplate?.docs,
        metadata: {
          ...data,
        },
        is_active: true,
      };
      console.log("templatePayload", JSON.stringify(templatePayload, null, 2));
      const action = selectedTemplate ? createPolicyHub(templatePayload) : generatePolicy(data);

      const response = await action;
      if (response.success) {
        toast.success("Policy generated successfully!");
        router.push("/dashboard/client/knowledge-hub/policy-hub");
      } else {
        toast.error("Failed to generate policy!");
      }
      console.log("response", response);
    } catch (error) {
      console.error("error", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(selectedTemplate?.id === template.id ? null : template);
  };

  return (
    <div className="pb-10">
      <PageHeader>
        <PageTitle>Policy Form</PageTitle>
        <PageDescription>Create a new policy using AI</PageDescription>
      </PageHeader>

      <div className="space-y-8 max-w-5xl">
        {/* Template Selection */}
        {(templatesLoading || allTemplates.length > 0) && (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold">Choose a Template</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Select a template or leave blank to generate from scratch
                </p>
              </div>
              {selectedTemplate && (
                <button
                  type="button"
                  onClick={() => setSelectedTemplate(null)}
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 mt-1 shrink-0"
                >
                  Clear selection
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {templatesLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="rounded-xl overflow-hidden border border-border">
                      <div className="h-[88px] bg-muted/50 flex items-center justify-center">
                        <Skeleton className="w-9 h-9 rounded-lg" />
                      </div>
                      <div className="p-3 space-y-2">
                        <Skeleton className="h-3.5 w-3/4 rounded" />
                        <Skeleton className="h-3 w-full rounded" />
                        <Skeleton className="h-3 w-2/3 rounded" />
                      </div>
                    </div>
                  ))
                : allTemplates.map((template) => {
                    const isSelected = selectedTemplate?.id === template.id;
                    return (
                      <div
                        key={template.id}
                        onClick={() => handleSelectTemplate(template)}
                        className={cn(
                          "relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-300 group flex gap-2 px-4",
                          "hover:-translate-y-1.5 hover:shadow-lg",
                          isSelected ? "border-primary shadow-md -translate-y-1.5" : "border-border",
                        )}
                      >
                        <div className="h-[88px] flex pt-4 justify-center transition-colors duration-300">
                          <FileText
                            className={cn(
                              "size-6 transition-colors duration-300",
                              isSelected ? "text-primary" : "text-muted-foreground",
                            )}
                          />
                          {isSelected && (
                            <div className="absolute top-2 right-2">
                              <CheckCircle2 className="w-4 h-4 text-primary" />
                            </div>
                          )}
                        </div>
                        <div className="p-3 transition-colors duration-300">
                          <p className="font-semibold text-sm leading-snug truncate">{template.name}</p>
                          {template.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                              {template.description}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
            </div>
          </div>
        )}

        {/* Two-column form layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          {/* Left column — 3/5 */}
          <div className="lg:col-span-3 space-y-5">
            {/* Company Info */}
            <div className="rounded-xl border bg-card p-5 space-y-4">
              <p className="text-sm font-semibold">Company Information</p>
              <FormField
                form={form}
                name="name"
                label="Company Name"
                placeholder="Enter company name"
              />
              <FormField
                form={form}
                name="address"
                label="Address"
                type="textarea"
                placeholder="Enter full address"
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  form={form}
                  name="compliance_officer"
                  label="Compliance Officer"
                  placeholder="Full name"
                />
                <FormField
                  form={form}
                  name="registration_date"
                  label="Registration Date"
                  type="date"
                />
              </div>
            </div>

            {/* Services */}
            <div className="rounded-xl border bg-card p-5 space-y-3">
              <p className="text-sm font-semibold">Services</p>
              <div className="space-y-2">
                {services.fields.map((service, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Controller
                      control={form.control}
                      name={`services.${index}`}
                      render={({ field }) => (
                        <Input {...field} className="flex-1" placeholder={`Service ${index + 1}`} />
                      )}
                    />
                    {index !== 0 && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => services.remove(index)}
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => services.append("")}
              >
                <Plus size={14} />
                Add Service
              </Button>
            </div>
          </div>

          {/* Right column — 2/5 */}
          <div className="lg:col-span-2 space-y-5">
            {/* Contact & Config */}
            <div className="rounded-xl border bg-card p-5 space-y-4">
              <p className="text-sm font-semibold">Contact & Configuration</p>
              <FormField form={form} name="phone" label="Phone" placeholder="+1 (555) 000-0000" />
              <FormField form={form} name="email" label="Email" placeholder="contact@example.com" />
              <FormField
                form={form}
                name="industry"
                type="select"
                options={industryOptions}
                label="Industry"
              />
              <FormField
                form={form}
                name="llm_model"
                type="select"
                options={llmModelOptions}
                label="LLM Model"
              />
            </div>

            {/* Document Type */}
            <div className="rounded-xl border bg-card p-5 space-y-3">
              <p className="text-sm font-semibold">Document Type</p>
              <Controller
                control={form.control}
                name="document_type"
                render={({ field, fieldState }) => (
                  <>
                    <DocumentTypeSelect
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                    {fieldState.error && (
                      <p className="text-xs text-destructive mt-1">{fieldState.error.message}</p>
                    )}
                  </>
                )}
              />
            </div>

            {/* Submit */}
            <Button
              disabled={loading}
              type="submit"
              className="w-full gap-2"
              onClick={form.handleSubmit(onSubmit)}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating…
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
