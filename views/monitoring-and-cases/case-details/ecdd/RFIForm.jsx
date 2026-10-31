"use client";

import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { z } from "zod";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import useAlertStore from "@/app/store/alerts";
import {
  draftRfiReport,
  createRFI,
  getRFIById,
} from "@/app/dashboard/client/monitoring-and-cases/case-list/actions";
import { useEffect, useState } from "react";
import { toast } from "sonner";
export const requestedItemSchema = z.object({
  text: z.string().min(1, "Item description is required"),
});

export const caseRequestSchema = z.object({
  primaryContactName: z.string().min(2, "Primary contact name must be at least 2 characters"),
  replyToEmail: z.string().email("Invalid email address"),
  requestedItems: z.array(requestedItemSchema).min(1, "At least one requested item is required"),
});

const defaultValues = {
  primaryContactName: "",
  replyToEmail: "",
  requestedItems: [],
};

export function CaseRequestForm({ open, setOpen, getRFI, caseNumber, setCaseNumber }) {
  const { details } = useAlertStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  // console.log("in rfi form details", details);
  const {
    handleSubmit,
    control,
    formState: { errors },
    setValue,
  } = useForm({
    resolver: zodResolver(caseRequestSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "requestedItems",
  });

  /**
   * Draft the RFI for this alert's case. The AI proposes what to ask for and
   * drafts the covering letter; the addressee, the reply-to mailbox, the
   * deadlines and the tipping-off check are ours (docs/74 §4.4).
   */
  const getData = async () => {
    try {
      const response = await draftRfiReport(details?.uid);
      const doc = response?.succeed ? response.data : null;
      if (!doc) {
        console.error("Failed to draft RFI", response?.message);
        return;
      }

      setValue("primaryContactName", doc.primaryContactName || "");
      setValue("replyToEmail", doc.replyToEmail || "");
      setValue(
        "requestedItems",
        (doc.requestedItems || []).map((item) => ({ text: item.text })),
      );

      // Sending an RFI can tip off the subject of a suspicious matter report,
      // so the API blocks delivery while one is live on the case.
      if (doc.deliveryBlocked) {
        toast.warning(doc.deliveryBlockReason || "Sending is blocked for this case.");
      }
    } catch (error) {
      console.error("Failed to draft RFI", error);
    }
  };

  useEffect(() => {
    if (details?.uid) {
      getData();
    }
  }, [details?.uid]);

  const onSubmit = async (data) => {
    const submiitedData = {
      ...data,
      caseNumber: details?.uid || caseNumber,
      caseId: details?._id,
      clientId: details?.transaction?.client,
      customerId: details?.customer?._id,
      branchId: details?.transaction?.branch,
      metadata: {
        caseNumber: details?.uid,
      },
    };

    try {
      setIsSubmitting(true);
      const response = await createRFI(submiitedData);
      if (response.success || response.succeed) {
        toast.success("RFI created successfully");
        setIsSubmitting(false);
        setOpen(false);
        if (getRFI) {
          getRFI();
        }
      } else {
        toast.error("Failed to create RFI");
      }
    } catch (error) {
      console.error("Failed to create RFI", error);
      setIsSubmitting(false);
    }

    // Handle form submission here
  };

  const handleOpenChange = (open) => {
    setOpen(open);
    if (!open) {
      setCaseNumber(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="sm:max-w-2xl w-full p-4 overflow-y-auto ">
        <SheetHeader>
          <SheetTitle>New RFI</SheetTitle>
          <SheetDescription>Create a new RFI for the case</SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Case</CardTitle>
              <CardDescription>Additional case metadata</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="metadata.caseNumber">Case Number</Label>
                <Input
                  id="metadata.caseNumber"
                  placeholder="CASE-2025-0001"
                  value={details?.uid || caseNumber}
                  disabled
                />
                {errors.metadata?.caseNumber && (
                  <p className="text-sm text-destructive">{errors.metadata.caseNumber.message}</p>
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Contact Details</CardTitle>
              <CardDescription>Primary contact information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="primaryContactName">Primary Contact Name</Label>
                  {/* <Input
                    onChange={(e) => setValue("primaryContactName", e.target.value)}
                    id="primaryContactName"
                    name="primaryContactName"
                    placeholder="Enter contact name"
                    value={watch("primaryContactName")}
                  />
                  {errors.primaryContactName && (
                    <p className="text-sm text-destructive">{errors.primaryContactName.message}</p>
                  )} */}
                  <Controller
                    name="primaryContactName"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field} // contains value and onChange
                        placeholder="Enter contact name"
                      />
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="replyToEmail">Reply To Email</Label>
                  <Controller
                    name="replyToEmail"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field} // contains value and onChange
                        placeholder="Enter contact name"
                      />
                    )}
                  />
                  {/* <Input
                    id="replyToEmail"
                    type="email"
                    onChange={(e) => setValue("replyToEmail", e.target.value)}
                    value={watch("replyToEmail")}
                    placeholder="contact@example.com"
                  />
                  {errors.replyToEmail && (
                    <p className="text-sm text-destructive">{errors.replyToEmail.message}</p>
                  )} */}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Requested Items</CardTitle>
              <CardDescription>Documents and information requested for this case</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-end">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor={`requestedItems.${index}.text`}>Item {index + 1}</Label>
                    <Controller
                      name={`requestedItems.${index}.text`}
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field} // contains value and onChange
                          placeholder="Enter item description"
                        />
                      )}
                    />
                    {/* <Input
                      id={`requestedItems.${index}.text`}
                      {...register(`requestedItems.${index}.text`)}
                      placeholder="Enter item description"
                    /> */}
                    {errors.requestedItems?.[index]?.text && (
                      <p className="text-sm text-destructive">
                        {errors.requestedItems[index]?.text?.message}
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className=" bg-transparent"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Remove item</span>
                  </Button>
                </div>
              ))}

              {errors.requestedItems && (
                <p className="text-sm text-destructive">{errors.requestedItems.message}</p>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ text: "" })}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </CardContent>
          </Card>

          <div className="flex ">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Case Request"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
