"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X, Clock, Loader2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createBranch } from "@/app/dashboard/client/branch/actions";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

const AVAILABLE_SERVICES = [
  "Corporate Banking",
  "Retail Banking",
  "Loans",
  "Investment",
  "Account Opening",
  "Wealth Management",
  "Trade Finance",
];

const DAYS_OF_WEEK = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];
const DAY_LABELS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const TIMEZONES = [
  "Asia/Dhaka",
  "Asia/Kolkata",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
];

const formSchema = z.object({
  name: z.string().min(1),
  branchCode: z.string(),
  branchType: z.string(),
  email: z.string().email(),
  phone: z.string(),
  website: z.string(),
  address: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    state: z.string(),
    country: z.string().min(1),
    zipcode: z.string(),
  }),
  contacts: z.array(z.object({
    name: z.string().optional(),
    title: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
  })),
  manager: z.object({
    name: z.string(),
    employeeId: z.string(),
    email: z.string().email(),
    phone: z.string().min(1),
  }),
  services: z.array(z.string()),
  hasATM: z.boolean().optional(),
  atmDetails: z.object({
    locationDescription: z.string().optional(),
    cashAvailability: z.boolean().optional(),
  }),
  currency: z.string().optional(),
  timezone: z.string().optional(),
  workingHours: z.object({
    monday: z.object({
      closed: z.boolean().optional(),
      open: z.string().min(1).optional(),
      close: z.string().min(1).optional(),
    }),
    tuesday: z.object({
      closed: z.boolean().optional(),
      open: z.string().min(1).optional(),
      close: z.string().min(1).optional(),
    }),
    wednesday: z.object({
      closed: z.boolean().optional(),
      open: z.string().min(1).optional(),
      close: z.string().min(1).optional(),
    }),
    thursday: z.object({
      closed: z.boolean().optional(),
      open: z.string().min(1).optional(),
      close: z.string().min(1).optional(),
    }),
    friday: z.object({
      closed: z.boolean().optional(),
      open: z.string().min(1).optional(),
      close: z.string().min(1).optional(),
    }),
    saturday: z.object({
      closed: z.boolean().optional(),
      open: z.string().min(1).optional(),
    }),
    sunday: z.object({
      closed: z.boolean().optional(),
      open: z.string().min(1).optional(),
      close: z.string().min(1).optional(),
    }),
  }),
});

export function BranchDialog({ open, onOpenChange }) {
  const session = useSession();
  const clientId = session.data?.user?.id;
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    branchCode: "",
    branchType: "Corporate",
    phone: "",
    website: "",
    address: {
      street: "",
      city: "",
      state: "",
      country: "Bangladesh",
      zipcode: "",
    },
    contacts: [
      {
        name: "",
        title: "Branch Manager",
        email: "",
        phone: "",
        primary: true,
      },
    ],
    manager: {
      name: "",
      email: "",
      phone: "",
      employeeId: "",
    },
    services: [],
    hasATM: false,
    atmDetails: {
      locationDescription: "",
      cashAvailability: true,
    },
    currency: "BDT",
    timezone: "Asia/Dhaka",
    workingHours: {
      monday: { open: "09:00", close: "17:00", closed: false },
      tuesday: { open: "09:00", close: "17:00", closed: false },
      wednesday: { open: "09:00", close: "17:00", closed: false },
      thursday: { open: "09:00", close: "17:00", closed: false },
      friday: { open: "09:00", close: "13:00", closed: false },
      saturday: { closed: true },
      sunday: { closed: true },
    },
  });

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: formData,
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleService = (service) => {
    setFormData((prev) => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter((s) => s !== service)
        : [...prev.services, service],
    }));
  };

  const handleWorkingHoursChange = (day, field, value) => {
    setFormData((prev) => ({
      ...prev,
      workingHours: {
        ...prev.workingHours,
        [day]: {
          ...prev.workingHours[day],
          [field]: value,
        },
      },
    }));
  };

  const toggleDayClose = (day) => {
    setFormData((prev) => ({
      ...prev,
      workingHours: {
        ...prev.workingHours,
        [day]: {
          ...prev.workingHours[day],
          closed: !prev.workingHours[day].closed,
        },
      },
    }));
  };

  const onSubmit = async (data) => {
    setLoading(true);
    const submittedData = {
      ...data,
      client: clientId,
      autoCreateUserForBranch: true,
    }
    console.log('submittedData', JSON.stringify(submittedData, null, 2))
    const response = await createBranch(submittedData);
    console.log("response", response);
    setLoading(false);
    if (response.success || response.succeed) {
      toast.success('Branch created successfully');
      onOpenChange(false);
    } else {
      toast.error('Failed to create branch');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-4xl !max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Branch</DialogTitle>
          <DialogDescription>
            Create a new branch location with comprehensive details
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Branch Information */}
          <Card className=" shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Branch Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Controller
                  control={control}
                  name="name"
                  render={({ field }) => (
                    <div className="space-y-2">
                      <Label htmlFor="name">Branch Name *</Label>
                      <Input
                        id="name"
                        name="name"
                        {...field}

                        placeholder="e.g., Main Corporate Branch"
                        error={errors.name?.message}
                      />
                    </div>
                  )}
                />
                <Controller
                  control={control}
                  name="branchCode"
                  render={({ field }) => (
                    <div className="space-y-2">
                      <Label htmlFor="branchCode">Branch Code *</Label>
                      <Input
                        id="branchCode"
                        name="branchCode"
                        {...field}
                        placeholder="e.g., BR001"
                      />
                    </div>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Controller
                  control={control}
                  name="branchType"
                  render={({ field }) => (
                    <div className="space-y-2">
                      <Label htmlFor="branchType">Branch Type *</Label>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Corporate">Corporate</SelectItem>
                          <SelectItem value="Retail">Retail</SelectItem>
                          <SelectItem value="Regional">Regional</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                />
                <Controller
                  control={control}
                  name="email"
                  render={({ field }) => (
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        {...field}
                        placeholder="branch@company.com"
                        error={errors.email?.message}
                      />
                    </div>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Controller
                  control={control}
                  name="phone"
                  render={({ field }) => (
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        name="phone"
                        {...field}
                        placeholder="+880..."
                      />
                    </div>
                  )}
                />
                <Controller
                  control={control}
                  name="website"
                  render={({ field }) => (
                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        name="website"
                        {...field}
                        placeholder="https://..."
                      />
                    </div>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card className=" shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Address Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Controller
                control={control}
                name="address.street"
                render={({ field }) => (
                  <div className="space-y-2">
                    <Label htmlFor="street">Street Address *</Label>
                    <Input
                      id="street"
                      name="address.street"
                      {...field}
                      placeholder="House number, Road, Area"
                      error={errors.address?.street?.message}
                    />
                  </div>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <Controller
                  control={control}
                  name="address.city"
                  render={({ field }) => (
                    <div className="space-y-2">
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        name="address.city"
                        {...field}
                        placeholder="e.g., Dhaka"
                        error={errors.address?.city?.message}
                      />
                    </div>
                  )}
                />
                <Controller
                  control={control}
                  name="address.state"
                  render={({ field }) => (
                    <div className="space-y-2">
                      <Label htmlFor="state">State/Division *</Label>
                      <Input
                        id="state"
                        name="address.state"
                        {...field}
                        placeholder="e.g., Dhaka Division"
                        error={errors.address?.state?.message}
                      />
                    </div>
                  )}
                />
                <Controller
                  control={control}
                  name="address.zipcode"
                  render={({ field }) => (
                    <div className="space-y-2">
                      <Label htmlFor="zipcode">Zip Code *</Label>
                      <Input
                        id="zipcode"
                        name="address.zipcode"
                        {...field}
                        placeholder="e.g., 1212"
                      />
                    </div>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Manager Information */}
          <Card className=" shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Branch Manager</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Controller
                  control={control}
                  name="manager.name"
                  render={({ field }) => (
                    <div className="space-y-2">
                      <Label htmlFor="managerName">Manager Name *</Label>
                      <Input
                        id="managerName"
                        name="manager.name"
                        {...field}
                        placeholder="Full name"
                      />
                    </div>
                  )}
                />
                <Controller
                  control={control}
                  name="manager.employeeId"
                  render={({ field }) => (
                    <div className="space-y-2">
                      <Label htmlFor="managerEmployeeId">Employee ID *</Label>
                      <Input
                        id="managerEmployeeId"
                        name="manager.employeeId"
                        {...field}
                        placeholder="e.g., EMP-BR001"
                      />
                    </div>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Controller
                  control={control}
                  name="manager.email"
                  render={({ field }) => (
                    <div className="space-y-2">
                      <Label htmlFor="managerEmail">Manager Email *</Label>
                      <Input
                        id="managerEmail"
                        name="manager.email"
                        type="email"
                        {...field}
                        placeholder="manager@company.com"
                      />
                    </div>
                  )}
                />
                <Controller
                  control={control}
                  name="manager.phone"
                  render={({ field }) => (
                    <div className="space-y-2">
                      <Label htmlFor="managerPhone">Manager Phone *</Label>
                      <Input
                        id="managerPhone"
                        name="manager.phone"
                        {...field}
                        placeholder="+880..."
                      />
                    </div>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Services */}
          <Card className=" shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Services Provided</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_SERVICES.map((service) => (
                  <Controller
                    key={service}
                    control={control}
                    name="services"
                    render={({ field }) => (
                      <Badge
                        key={service}
                        variant={
                          field.value.includes(service)
                            ? "default"
                            : "outline"
                        }
                        className="cursor-pointer px-3 py-1.5 text-xs"
                        onClick={() => field.onChange([...field.value, service])}
                      >
                        {field.value.includes(service) ? (
                          <>
                            <X className="h-3 w-3 mr-1" />
                            {service}
                          </>
                        ) : (
                          <>
                            <Plus className="h-3 w-3 mr-1" />
                            {service}
                          </>
                        )}
                      </Badge>
                    )}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ATM Details */}
          {/* <Card className=" shadow-none">
            <CardHeader>
              <CardTitle className="text-base">ATM & Facilities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Controller
                control={control}
                name="hasATM"
                render={({ field }) => (
                  <>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hasATM"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                      <Label htmlFor="hasATM" className="cursor-pointer">
                        Branch has ATM
                      </Label>
                    </div>
                  </>
                )}
              />

              {watch("hasATM") && (
                <div className="space-y-4 ml-6 border-l-2 border-gray-200 pl-4">
                  <Controller
                    control={control}
                    name="atmDetails.locationDescription"
                    render={({ field }) => (
                      <div className="space-y-2">
                        <Label htmlFor="atmLocationDescription">
                          ATM Location Description
                        </Label>
                        <Textarea
                          id="atmLocationDescription"
                          name="atmDetails.locationDescription"
                          {...field}
                          placeholder="e.g., Inside the branch building, ground floor"
                          rows={2}
                        />
                      </div>
                    )}
                  />
                  <Controller
                    control={control}
                    name="atmDetails.cashAvailability"
                    render={({ field }) => (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="atmCashAvailability"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                        <Label
                          htmlFor="atmCashAvailability"
                          className="text-sm cursor-pointer"
                        >
                          Cash Availability - 24/7
                        </Label>
                      </div>
                    )}
                  />
                </div>
              )}
            </CardContent>
          </Card> */}

          {/* Working Hours */}
          <Card className=" shadow-none">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Working Hours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* {DAYS_OF_WEEK.map((day, index) => (
                  <div
                    key={day}
                    className="flex items-center gap-4 pb-3 border-b last:border-b-0"
                  >
                    <Label className="min-w-20 font-medium">
                      {DAY_LABELS[index]}
                    </Label>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`closed-${day}`}
                        checked={formData.workingHours[day].closed}
                        onCheckedChange={() => toggleDayClose(day)}
                      />
                      <Label
                        htmlFor={`closed-${day}`}
                        className="text-sm cursor-pointer"
                      >
                        Closed
                      </Label>
                    </div>
                    {!formData.workingHours[day].closed && (
                      <div className="flex gap-2 ml-auto">
                        <div className="flex items-center gap-1">
                          <Label className="text-xs">Open:</Label>
                          <Input
                            type="time"
                            value={formData.workingHours[day].open || "09:00"}
                            onChange={(e) =>
                              handleWorkingHoursChange(
                                day,
                                "open",
                                e.target.value
                              )
                            }
                            className="w-24 h-8"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <Label className="text-xs">Close:</Label>
                          <Input
                            type="time"
                            value={formData.workingHours[day].close || "17:00"}
                            onChange={(e) =>
                              handleWorkingHoursChange(
                                day,
                                "close",
                                e.target.value
                              )
                            }
                            className="w-24 h-8"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))} */}
                {DAYS_OF_WEEK.map((day, index) => (
                  <div key={day} className="flex items-center gap-4 pb-3 border-b last:border-b-0">
                    <Label className="min-w-20 font-medium">{DAY_LABELS[index]}</Label>

                    {/* Closed Checkbox */}
                    <Controller
                      name={`workingHours.${day}.closed`}
                      control={control}
                      render={({ field }) => (
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                          />
                          <Label className="text-sm cursor-pointer">Closed</Label>
                        </div>
                      )}
                    />

                    {/* Time Inputs (only if NOT closed) */}
                    {!watch(`workingHours.${day}.closed`) && (
                      <div className="flex gap-2 ml-auto">

                        {/* Open Time */}
                        <Controller
                          name={`workingHours.${day}.open`}
                          control={control}
                          render={({ field }) => (
                            <div className="flex items-center gap-1">
                              <Label className="text-xs">Open:</Label>
                              <Input
                                type="time"
                                className="w-24 h-8"
                                value={field.value}
                                onChange={field.onChange}
                              />
                            </div>
                          )}
                        />

                        {/* Close Time */}
                        <Controller
                          name={`workingHours.${day}.close`}
                          control={control}
                          render={({ field }) => (
                            <div className="flex items-center gap-1">
                              <Label className="text-xs">Close:</Label>
                              <Input
                                type="time"
                                className="w-24 h-8"
                                value={field.value}
                                onChange={field.onChange}
                              />
                            </div>
                          )}
                        />

                      </div>
                    )}
                  </div>
                ))}

              </div>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card className=" shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) =>
                      handleSelectChange("currency", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BDT">
                        BDT - Bangladeshi Taka
                      </SelectItem>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                      <SelectItem value="GBP">GBP - British Pound</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={formData.timezone}
                    onValueChange={(value) =>
                      handleSelectChange("timezone", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz} value={tz}>
                          {tz}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit(onSubmit)}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Creating...
                </>
              ) : (
                "Create Branch"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
