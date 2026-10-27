"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Trash2, HelpCircle } from "lucide-react";

// The API returns ISO strings; <input type="date"> wants yyyy-mm-dd.
const toDateInput = (value) => (value ? String(value).slice(0, 10) : "");

export function PersonOrganisationForm({
  data,
  onUpdate,
  showCustomerQuestion,
  showAuthorisedAgentQuestion,
}) {
  const [formData, setFormData] = useState(
    data || {
      name: "",
      // otherNames: [],
      businessAddress: {
        street: "",
        city: "",
        state: "",
        postcode: "",
        country: "",
      },
      phoneNumbers: [""],
      emails: [""],
      isCustomer: false,
      dateOfBirth: "",
      citizenship: "",
    }
  );

  const handleChange = (field, value) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    onUpdate(updated);
  };

  const handleAddressChange = (field, value) => {
    const updated = {
      ...formData,
      businessAddress: { ...formData.businessAddress, [field]: value },
    };
    setFormData(updated);
    onUpdate(updated);
  };

  const handlePersonDetailsChange = (field, value) => {
    // Drop the legacy top-level keys once the real ones are written.
    const { dateOfBirth, citizenship, ...rest } = formData;
    const updated = {
      ...rest,
      personDetails: {
        dateOfBirth: formData.personDetails?.dateOfBirth ?? dateOfBirth ?? null,
        nationality: formData.personDetails?.nationality ?? citizenship ?? "",
        [field]: value,
      },
    };
    setFormData(updated);
    onUpdate(updated);
  };

  const setDocuments = (documents) =>
    handleChange("identityVerification", { ...(formData.identityVerification || {}), documents });
  const addDocument = () =>
    setDocuments([...(formData.identityVerification?.documents || []), { type: "", number: "", country: "" }]);
  const removeDocument = (index) =>
    setDocuments((formData.identityVerification?.documents || []).filter((_, i) => i !== index));
  const handleDocumentChange = (index, field, value) =>
    setDocuments(
      (formData.identityVerification?.documents || []).map((d, i) => (i === index ? { ...d, [field]: value } : d))
    );

  const addArrayItem = (field, defaultValue = "") => {
    const current = formData[field] || [];
    handleChange(field, [...current, defaultValue]);
  };

  const updateArrayItem = (field, index, value) => {
    const current = [...(formData[field] || [] || [])];
    current[index] = value;
    handleChange(field, current);
  };

  const removeArrayItem = (field, index) => {
    const current = (formData[field] || [] || []).filter((_, i) => i !== index);
    handleChange(field, current);
  };

  return (
    <div className="space-y-6">
      {/* Name */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label className="font-semibold">
            4. Name of person/organisation
          </Label>
          <HelpCircle className="w-4 h-4 text-muted-foreground" />
        </div>
        <Input
          value={formData.name}
          onChange={(e) => handleChange("name", e.target.value)}
          placeholder="Full name or organisation name"
          className="border"
        />
        {/* <div className="space-y-2 mt-3">
          <Label className="text-sm">
            If known by any other name, please specify
          </Label>
          {(formData.otherNames || []).map((name, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={name}
                onChange={(e) =>
                  updateArrayItem("otherNames", index, e.target.value)
                }
                placeholder="Other name"
                className="border"
              />
              <Button
                type="button"
                onClick={() => removeArrayItem("otherNames", index)}
                variant="outline"
                size="icon"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            onClick={() => addArrayItem("otherNames", "")}
            variant="outline"
            size="sm"
            className="border-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add another name
          </Button>
        </div> */}
      </div>

      {/* Individual details */}
      <div className="space-y-3 pt-4 border-t border-muted">
        <Label className="font-semibold">
          5. If this person is an individual, please specify
        </Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm">Date of birth</Label>
            {/* Stored as personDetails.{dateOfBirth,nationality} (SMR model).
                The old top-level dateOfBirth / citizenship keys were not in
                the schema, so drafted values never showed and edits were lost. */}
            <Input
              type="date"
              value={toDateInput(formData.personDetails?.dateOfBirth ?? formData.dateOfBirth)}
              onChange={(e) => handlePersonDetailsChange("dateOfBirth", e.target.value || null)}
              className="mt-1 border"
            />
          </div>
          <div>
            <Label className="text-sm">Country of citizenship</Label>
            <Input
              value={formData.personDetails?.nationality ?? formData.citizenship ?? ""}
              onChange={(e) => handlePersonDetailsChange("nationality", e.target.value)}
              className="mt-1 border"
            />
          </div>
        </div>
      </div>

      {/* Identity documents */}
      <div className="space-y-3 pt-4 border-t border-muted">
        <Label className="font-semibold">Identity documents</Label>
        {(formData.identityVerification?.documents || []).map((doc, i) => (
          <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-2">
            <Input
              placeholder="Type (e.g. passport)"
              value={doc.type || ""}
              onChange={(e) => handleDocumentChange(i, "type", e.target.value)}
              className="border"
            />
            <Input
              placeholder="Number"
              value={doc.number || ""}
              onChange={(e) => handleDocumentChange(i, "number", e.target.value)}
              className="border"
            />
            <Input
              placeholder="Issuing country"
              value={doc.country || ""}
              onChange={(e) => handleDocumentChange(i, "country", e.target.value)}
              className="border"
            />
            <Button type="button" variant="outline" size="icon" onClick={() => removeDocument(i)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addDocument}>
          <Plus className="h-4 w-4 mr-1" /> Add document
        </Button>
      </div>

      {/* Contact details */}
      <div className="space-y-3 pt-4 border-t border-muted">
        <Label className="font-semibold">6. Contact details</Label>
        <div className="space-y-3">
          <Label className="text-sm">Business/residential address</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <Input
                value={formData.businessAddress?.street}
                onChange={(e) => handleAddressChange("street", e.target.value)}
                placeholder="Full street address"
                className="border"
              />
            </div>
            <Input
              value={formData.businessAddress?.city}
              onChange={(e) => handleAddressChange("city", e.target.value)}
              placeholder="City/town/suburb"
              className="border"
            />
            <Input
              value={formData.businessAddress?.state}
              onChange={(e) => handleAddressChange("state", e.target.value)}
              placeholder="State"
              className="border"
            />
            <Input
              value={formData.businessAddress?.postcode}
              onChange={(e) => handleAddressChange("postcode", e.target.value)}
              placeholder="Postcode"
              className="border"
            />
            <Input
              value={formData.businessAddress?.country}
              onChange={(e) => handleAddressChange("country", e.target.value)}
              placeholder="Country"
              className="border"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Phone numbers</Label>
          {(formData.phoneNumbers || [""]).map((phone, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={phone}
                onChange={(e) =>
                  updateArrayItem("phoneNumbers", index, e.target.value)
                }
                placeholder="Phone number"
                className="border"
              />
              {(formData.phoneNumbers?.length || 0) > 1 && (
                <Button
                  type="button"
                  onClick={() => removeArrayItem("phoneNumbers", index)}
                  variant="outline"
                  size="icon"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
          <Button
            type="button"
            onClick={() => addArrayItem("phoneNumbers", "")}
            variant="outline"
            size="sm"
            className="border-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add another phone number
          </Button>
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Email addresses</Label>
          {(formData.emails || [""]).map((email, index) => (
            <div key={index} className="flex gap-2">
              <Input
                type="email"
                value={email}
                onChange={(e) =>
                  updateArrayItem("emails", index, e.target.value)
                }
                placeholder="Email address"
                className="border"
              />
              {(formData.emails?.length || 0) > 1 && (
                <Button
                  type="button"
                  onClick={() => removeArrayItem("emails", index)}
                  variant="outline"
                  size="icon"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
          <Button
            type="button"
            onClick={() => addArrayItem("emails", "")}
            variant="outline"
            size="sm"
            className="border-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add another email address
          </Button>
        </div>
      </div>

      {/* Occupation */}
      {/* <div className="space-y-2 pt-4 border-t border-muted">
        <Label className="font-semibold">
          8. Occupation, business or principal activity
        </Label>
        <Input
          value={formData.occupation}
          onChange={(e) => handleChange("occupation", e.target.value)}
          className="border"
        />
      </div> */}

      {/* Documentation — drafts record the POI's role, relationship and
          where they were identified here. */}
      <div className="space-y-2 pt-4 border-t border-muted">
        <Label className="font-semibold">Notes on this person / organisation</Label>
        <Input
          value={formData.documentation || ""}
          onChange={(e) => handleChange("documentation", e.target.value)}
          placeholder="Role in the matter, relationship to the subject, how identified"
          className="border"
        />
      </div>

      {/* Customer question */}
      {showCustomerQuestion && (
        <div className="space-y-2 pt-4 border-t border-muted">
          <Label className="font-semibold">
            12. Is the person/organisation your customer?
          </Label>
          <RadioGroup
            value={formData.isCustomer ? "yes" : "no"}
            onValueChange={(value) =>
              handleChange("isCustomer", value === "yes")
            }
          >
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="yes" id="customer-yes" />
                <Label htmlFor="customer-yes" className="cursor-pointer">
                  Yes
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="no" id="customer-no" />
                <Label htmlFor="customer-no" className="cursor-pointer">
                  No
                </Label>
              </div>
            </div>
          </RadioGroup>
        </div>
      )}

      {/* Authorised agent question */}
      {showAuthorisedAgentQuestion && (
        <div className="space-y-2 pt-4 border-t border-muted">
          <Label className="font-semibold">
            23. Is this party an authorised agent of the person/organisation
            listed in Part C?
          </Label>
          <RadioGroup
            value={formData.isAuthorisedAgent ? "yes" : "no"}
            onValueChange={(value) =>
              handleChange("isAuthorisedAgent", value === "yes")
            }
          >
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="yes" id="agent-yes" />
                <Label htmlFor="agent-yes" className="cursor-pointer">
                  Yes
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="no" id="agent-no" />
                <Label htmlFor="agent-no" className="cursor-pointer">
                  No
                </Label>
              </div>
            </div>
          </RadioGroup>
        </div>
      )}
    </div>
  );
}
