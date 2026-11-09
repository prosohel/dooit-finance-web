"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building2,
  User,
  MapPin,
  Scale,
  FileText,
  Settings,
  Upload,
  Trash2,
  Plus,
  Save,
  Camera,
  Loader2,
} from "lucide-react";
import { useLoggedInUser } from "@/app/store/useLoggedInUser";
import { useFieldArray, useForm } from "react-hook-form";
import { FormField } from "@/components/ui/FormField";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { countriesData } from "@/constants";
import {
  updateBranchProfile,
  updateClientProfile,
  updateProfile,
} from "@/app/dashboard/client/profile/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { fileUploadOnCloudinary, getLoggedInUser } from "@/app/actions";
import { getAllEntityTypes } from "@/app/dashboard/actions";

export function ClientEditForm() {
  const [imgUrl, setImgUrl] = useState(null);
  const imgInputRef = useRef(null);
  const { loggedInUser: formData, setLoggedInUser } = useLoggedInUser();
  const [entityTypes, setEntityTypes] = useState([]);

  const isClient = formData?.userType === "client";
  const isBranch = formData?.userType === "branch";

  useEffect(() => {
    const fetchEntityTypes = async () => {
      const response = await getAllEntityTypes();
      console.log("response", response);
      setEntityTypes(response.data);
    };
    fetchEntityTypes();
  }, []);

  console.log("formData", formData);
  const router = useRouter();
  const formDataByUserType = isClient ? formData : { ...formData, client: formData?.branch };
  const form = useForm({
    defaultValues: formDataByUserType,
    mode: "onChange",
    resolver: zodResolver(
      z.object({
        client: z.object({
          name: z.string().optional(),
          clientType: z.string().optional(),
          clientTypeId: z.string().optional(),
          registrationNumber: z.string().optional(),
          taxId: z.string().optional(),
          email: z.string().email("Invalid email address").optional().or(z.literal("")),
          phone: z.string().optional(),
          website: z.string().url("Invalid website URL").optional().or(z.literal("")),
          contacts: z
            .array(
              z.object({
                name: z.string().optional(),
                title: z.string().optional(),
                email: z.string().email("Invalid email address").optional().or(z.literal("")),
                phone: z.string().optional(),
                primary: z.boolean().optional(),
              }),
            )
            .optional(),
          address: z
            .object({
              street: z.string().optional(),
              city: z.string().optional(),
              state: z.string().optional(),
              country: z.string().optional(),
              zipcode: z.string().optional(),
            })
            .optional(),
          legalRepresentative: z
            .object({
              name: z.string().optional(),
              designation: z.string().optional(),
              email: z.string().email("Invalid email address").optional().or(z.literal("")),
              phone: z.string().optional(),
            })
            .optional(),
          documents: z
            .array(
              z.object({
                name: z.string().optional(),
                url: z.string().url("Invalid URL").optional().or(z.literal("")),
                mimeType: z.string().optional(),
                type: z.string().optional(),
                uploadedAt: z.string().optional(),
              }),
            )
            .optional(),
          settings: z
            .object({
              billingCycle: z.string().optional(),
              currency: z.string().optional(),
              logo: z.string().optional(),
              color: z.string().optional(),
            })
            .optional(),
        }),
      }),
    ),
  });
  useEffect(() => {
    form.reset(formDataByUserType);
  }, [formData]);

  const {
    fields: contactFields,
    append: appendContact,
    remove: removeContact,
  } = useFieldArray({
    control: form.control,
    name: "client.contacts",
  });

  const addContact = () => {
    appendContact({ name: "", title: "", email: "", phone: "", primary: false });
  };
  const removeContactItem = (index) => {
    removeContact(index);
  };

  const {
    fields: documentFields,
    append: appendDocument,
    remove: removeDocument,
  } = useFieldArray({
    control: form.control,
    name: "client.documents",
  });

  const docInputRef = useRef(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const handleDocUploadClick = () => {
    docInputRef.current?.click();
  };

  const handleDocChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoc(true);
    try {
      const res = await fileUploadOnCloudinary(file);
      const publicUrl = res?.file?.publicUrl;
      if (res?.success && publicUrl) {
        appendDocument({
          name: file.name,
          url: publicUrl,
          mimeType: file.type || "application/octet-stream",
          type: "other",
          uploadedAt: new Date().toISOString(),
        });
        toast.success("Document uploaded");
      } else {
        throw new Error(res?.message || "Upload failed");
      }
    } catch (err) {
      toast.error(err?.message || "Document upload failed");
    } finally {
      setUploadingDoc(false);
      // allow re-selecting the same filename
      e.target.value = "";
    }
  };

  const removeDocumentItem = (index) => {
    removeDocument(index);
  };

  const onSubmit = async (data) => {
    const action = isClient ? updateClientProfile : isBranch ? updateBranchProfile : updateProfile;
    const id = isClient ? formData?.client?._id : formData?.id;

    const dataToSend = isClient || isBranch ? { ...data.client } : data;
    console.log("dataToSend", JSON.stringify(dataToSend, null, 2));
    const response = await action(dataToSend, id);
    if (response.success) {
      toast.success("Profile updated successfully");
      const response = await getLoggedInUser();
      if (response.success) {
        // Same shape as useGetUser — the lock button reads isDataEncrypted.
        setLoggedInUser({ ...response.data, isDataEncrypted: response.encryptionStatus });
      }
      router.push("/dashboard/client/profile");
    } else {
      toast.error("Failed to update profile");
    }
  };

  const handleImgClick = () => {
    imgInputRef.current.click();
  };

  const handleImgChange = async (e) => {
    // setImgFile(e.target.files[0]);
    console.log("img file", e.target.files[0]);
    const res = await fileUploadOnCloudinary(e.target.files[0]);
    console.log("img res", res);
    if (res.success) {
      setImgUrl(res.file.publicUrl);
      form.setValue("client.settings.logo", res.file.publicUrl);
    }
    // const imgUrl=await
  };

  return (
    <div className="flex min-h-screen relative">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b border-border bg-card px-6 py-4 sticky top-10 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <Avatar className="h-14 w-14 border-2 border-border bg-gray-100">
                  <AvatarImage
                    src={imgUrl || formData?.client?.settings?.logo || "/placeholder.svg"}
                    alt={formData?.client?.name}
                    className="object-contain "
                  />
                  <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                    {formData?.client?.name?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  ref={imgInputRef}
                  onChange={handleImgChange}
                />

                <button
                  className="absolute inset-0 flex items-center justify-center bg-foreground/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={handleImgClick}
                >
                  <Camera className="h-5 w-5 text-background" />
                </button>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">{formData?.client?.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {formData?.client?.clientType}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {formData?.client?.registrationNumber}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/dashboard/client/profile")}
              >
                Cancel
              </Button>
              <Button className="gap-2" onClick={form.handleSubmit(onSubmit)}>
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </div>
        </header>

        {/* Mobile Tab Navigation */}
        {/* <div className="lg:hidden border-b border-border bg-card px-4 py-2 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${activeTab === item.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                  }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </div>
        </div> */}

        {/* Form Content */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Company Info Section */}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Company Information
                </CardTitle>
                <CardDescription>Basic details about the company</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <FormField name="client.name" label="Company Name" form={form} />
                  {/* brand color */}
                  <FormField
                    name="client.settings.color"
                    label="Brand Color"
                    form={form}
                    type="color"
                  />
                  <FormField
                    name="client.clientType"
                    label="Client Type"
                    form={form}
                    disabled={true}
                    type="select"
                    options={entityTypes?.map((t) => ({ label: t.label, value: t.label }))}
                  />
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <FormField
                    name="client.registrationNumber"
                    label="Registration Number"
                    form={form}
                  />
                  <FormField name="client.taxId" label="Tax ID" form={form} />
                </div>

                <Separator />

                <div className="grid gap-6 sm:grid-cols-2">
                  <FormField name="client.email" label="Email" form={form} type="email" />
                  <FormField name="client.phone" label="Phone" form={form} type="phone" />
                </div>

                <FormField name="client.website" label="Website" form={form} type="url" />
              </CardContent>
            </Card>

            {/* Contacts Section */}

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" />
                      Contacts
                    </CardTitle>
                    <CardDescription>Manage company contact persons</CardDescription>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2 bg-transparent"
                    onClick={addContact}
                  >
                    <Plus className="h-4 w-4" />
                    Add Contact
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {contactFields.map((contact, index) => (
                  <div key={index} className="p-4 rounded-lg border border-border bg-muted/30">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {(contact?.name || "")
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">{contact?.name}</p>
                          <p className="text-sm text-muted-foreground">{contact?.title}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {contact?.primary && (
                          <Badge variant="default" className="text-xs">
                            Primary
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => removeContactItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField name={`client.contacts[${index}].name`} label="Name" form={form} />
                      <FormField
                        name={`client.contacts[${index}].title`}
                        label="Title"
                        form={form}
                      />

                      <FormField
                        name={`client.contacts[${index}].email`}
                        label="Email"
                        form={form}
                        type="email"
                      />
                      <FormField
                        name={`client.contacts[${index}].phone`}
                        label="Phone"
                        form={form}
                        type="phone"
                      />
                      {/* <FormField
                        name={`client.contacts[${index}].primary`}
                        label="Primary"
                        form={form}
                        type="checkbox"
                      /> */}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Address Section */}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Address
                </CardTitle>
                <CardDescription>Company location and mailing address</CardDescription>
              </CardHeader>
              <CardContent className=" grid gap-6 sm:grid-cols-2">
                <FormField name="client.address.street" label="Street Address" form={form} />
                <FormField name="client.address.city" label="City" form={form} />
                <FormField name="client.address.state" label="State / Province" form={form} />
                <FormField name="client.address.zipcode" label="Zip / Postal Code" form={form} />
                <FormField
                  name="client.address.country"
                  label="Country"
                  form={form}
                  type="select"
                  options={countriesData}
                />
              </CardContent>
            </Card>

            {/* Legal Representative Section */}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-5 w-5 text-primary" />
                  Legal Representative
                </CardTitle>
                <CardDescription>Company legal contact information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <FormField name="client.legalRepresentative.name" label="Full Name" form={form} />
                  <FormField
                    name="client.legalRepresentative.designation"
                    label="Designation"
                    form={form}
                  />
                </div>
                <div className="grid gap-6 sm:grid-cols-2">
                  <FormField
                    name="client.legalRepresentative.email"
                    label="Email"
                    form={form}
                    type="email"
                  />
                  <FormField
                    name="client.legalRepresentative.phone"
                    label="Phone"
                    form={form}
                    type="phone"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Documents Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Documents
                    </CardTitle>
                    <CardDescription>Manage company documents and files</CardDescription>
                  </div>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
                    hidden
                    ref={docInputRef}
                    onChange={handleDocChange}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2 bg-transparent"
                    onClick={handleDocUploadClick}
                    disabled={uploadingDoc}
                  >
                    {uploadingDoc ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    {uploadingDoc ? "Uploading…" : "Upload Document"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {documentFields.length === 0 && (
                    <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
                  )}
                  {documentFields.map((doc, index) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {doc.name || "Untitled document"}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {doc.type && (
                              <Badge variant="outline" className="text-xs">
                                {doc.type}
                              </Badge>
                            )}
                            {doc.uploadedAt && (
                              <span className="text-xs text-muted-foreground">
                                Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={!doc.url}
                          onClick={() => window.open(doc.url, "_blank", "noopener,noreferrer")}
                        >
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => removeDocumentItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Upload Zone */}
                <button
                  type="button"
                  onClick={handleDocUploadClick}
                  disabled={uploadingDoc}
                  className="mt-4 w-full border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 hover:bg-muted/30 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {uploadingDoc ? (
                    <Loader2 className="h-8 w-8 mx-auto text-muted-foreground mb-2 animate-spin" />
                  ) : (
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  )}
                  <p className="text-sm font-medium text-foreground">
                    {uploadingDoc ? "Uploading…" : "Click to upload a document"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, DOC, or images up to 10MB
                  </p>
                </button>
              </CardContent>
            </Card>

            {/* Settings Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  Settings
                </CardTitle>
                <CardDescription>Billing and preferences configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    {/* <Label htmlFor="billingCycle">Billing Cycle</Label>
                      <Select
                        value={formData?.client?.settings?.billingCycle}
                        onValueChange={(value) => updateField("client.settings.billingCycle", value)}
                      >
                        <SelectTrigger id="billingCycle">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="annually">Annually</SelectItem>
                        </SelectContent>
                      </Select> */}
                    <FormField
                      name="client.settings.billingCycle"
                      label="Billing Cycle"
                      form={form}
                      type="select"
                      options={[
                        { label: "Monthly", value: "monthly" },
                        { label: "Quarterly", value: "quarterly" },
                        { label: "Annually", value: "annually" },
                      ]}
                    />
                  </div>
                  <div className="space-y-2">
                    <FormField
                      name="client.settings.currency"
                      label="Currency"
                      form={form}
                      type="select"
                      options={[
                        { label: "USD", value: "USD" },
                        { label: "EUR", value: "EUR" },
                        { label: "GBP", value: "GBP" },
                        { label: "BDT", value: "BDT" },
                      ]}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
