"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Upload } from "lucide-react";

// Shared with the detail view and mirrored by the seeder — a value written
// outside this list renders as an unticked box and drops out of the report.
import { OFFENCE_TYPES } from "./options";

export function PartG({ data, updateData }) {
  const [selectedOffences, setSelectedOffences] = useState(
    data.likelyOffence || []
  );
  const [previousReports, setPreviousReports] = useState(
    data.previousReports || []
  );
  const [governmentBodies, setGovernmentBodies] = useState(
    data.otherGovernmentBodies || []
  );

  const handleOffenceToggle = (offence) => {
    const updated = selectedOffences.includes(offence)
      ? selectedOffences.filter((o) => o !== offence)
      : [...selectedOffences, offence];
    setSelectedOffences(updated);
    updateData({ likelyOffence: updated });
  };

  return (
    <div className="space-y-8">
      {/* Question 43 */}
      <div className="space-y-4">
        <Label className="text-base font-bold ">
          43. Provide the most likely offence to which the suspicious matter
          relates
        </Label>
        <div className="space-y-2 p-4 bg-secondary/50 rounded-md border border-muted">
          {OFFENCE_TYPES.map((offence) => (
            <div key={offence} className="flex items-center gap-2">
              <Checkbox
                id={offence}
                checked={selectedOffences.includes(offence)}
                onCheckedChange={() => handleOffenceToggle(offence)}
              />
              <label htmlFor={offence} className="text-sm cursor-pointer">
                {offence}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Question 44 */}
      <div className="space-y-4 pt-6 border-t-2 ">
        <Label className="text-base font-bold ">
          44. If a suspicious matter relating to the person/organisation has
          previously been reported to AUSTRAC, please specify
        </Label>
        {previousReports.map((report, index) => (
          <div
            key={index}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-secondary/30 rounded-md border border-muted"
          >
            <div>
              <Label className="text-sm">Date reported to AUSTRAC</Label>
              <Input
                type="date"
                value={report.date}
                onChange={(e) => {
                  const updated = [...previousReports];
                  updated[index].date = e.target.value;
                  setPreviousReports(updated);
                  updateData({ previousReports: updated });
                }}
                className="mt-1 border"
              />
            </div>
            <div>
              <Label className="text-sm">Internal reference number</Label>
              <Input
                value={report.referenceNumber}
                onChange={(e) => {
                  const updated = [...previousReports];
                  updated[index].referenceNumber = e.target.value;
                  setPreviousReports(updated);
                  updateData({ previousReports: updated });
                }}
                className="mt-1 border"
              />
            </div>
            {previousReports.length > 1 && (
              <Button
                type="button"
                onClick={() => {
                  const updated = previousReports.filter((_, i) => i !== index);
                  setPreviousReports(updated);
                  updateData({ previousReports: updated });
                }}
                variant="destructive"
                size="sm"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Remove
              </Button>
            )}
          </div>
        ))}
        <Button
          type="button"
          onClick={() => {
            const updated = [
              ...previousReports,
              { date: "", referenceNumber: "" },
            ];
            setPreviousReports(updated);
            updateData({ previousReports: updated });
          }}
          variant="outline"
          size="sm"
          className="border-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add previous report
        </Button>
      </div>

      {/* Question 45 */}
      <div className="space-y-4 pt-6 border-t/20">
        <Label className="text-base font-bold ">
          45. If the details of the matter have been, or are to be, reported to
          another Australian government body, please specify
        </Label>
        {governmentBodies.map((body, index) => (
          <div
            key={index}
            className="p-4 bg-secondary/30 rounded-md border border-muted space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Name</Label>
                <Input
                  value={body.name}
                  onChange={(e) => {
                    const updated = [...governmentBodies];
                    updated[index].name = e.target.value;
                    setGovernmentBodies(updated);
                    updateData({ otherGovernmentBodies: updated });
                  }}
                  className="mt-1 border"
                />
              </div>
              <div>
                <Label className="text-sm">Date reported</Label>
                <Input
                  type="date"
                  value={body.dateReported}
                  onChange={(e) => {
                    const updated = [...governmentBodies];
                    updated[index].dateReported = e.target.value;
                    setGovernmentBodies(updated);
                    updateData({ otherGovernmentBodies: updated });
                  }}
                  className="mt-1 border"
                />
              </div>
            </div>
            <div>
              <Label className="text-sm">Information provided</Label>
              <Textarea
                value={body.informationProvided}
                onChange={(e) => {
                  const updated = [...governmentBodies];
                  updated[index].informationProvided = e.target.value;
                  setGovernmentBodies(updated);
                  updateData({ otherGovernmentBodies: updated });
                }}
                className="mt-1 border"
              />
            </div>
            {governmentBodies.length > 1 && (
              <Button
                type="button"
                onClick={() => {
                  const updated = governmentBodies.filter(
                    (_, i) => i !== index
                  );
                  setGovernmentBodies(updated);
                  updateData({ otherGovernmentBodies: updated });
                }}
                variant="destructive"
                size="sm"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Remove
              </Button>
            )}
          </div>
        ))}
        <Button
          type="button"
          onClick={() => {
            const updated = [
              ...governmentBodies,
              {
                name: "",
                address: {
                  street: "",
                  city: "",
                  state: "",
                  postcode: "",
                  country: "",
                },
                dateReported: "",
                informationProvided: "",
              },
            ];
            setGovernmentBodies(updated);
            updateData({ otherGovernmentBodies: updated });
          }}
          variant="outline"
          size="sm"
          className="border-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add government body
        </Button>
      </div>

      {/* Attachments */}
      <div className="space-y-4 pt-6 border-t/20">
        <Label className="text-base font-bold ">
          Additional information or supporting documentation
        </Label>
        <p className="text-sm text-muted-foreground">
          Attach images, audio, copies of applications or other correspondence
        </p>
        <div className="border-2 border-dashed border-primary rounded-lg p-8 text-center">
          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <Button variant="outline" className="border bg-transparent">
            <Upload className="w-4 h-4 mr-2" />
            Add file
          </Button>
          <p className="text-sm text-muted-foreground mt-2">
            Available size: 50.00MB
          </p>
        </div>
      </div>
    </div>
  );
}
