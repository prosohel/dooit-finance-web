"use client";
import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CustomSelect from "@/components/AsyncPaginatedSelect";
import { getAllUsers } from "@/app/dashboard/client/user-and-role-management/actions";
import { Button } from "@/components/ui/button";
import { IconLoader2, IconUserPlus } from "@tabler/icons-react";
import { assignAnalyst } from "@/app/dashboard/client/monitoring-and-cases/case-list/actions";
import { toast } from "sonner";

// `onAssigned(alert)` lets a parent (the alert-details header) refresh itself
// without a full reload; the list page doesn't pass it.
export default function AssignAnalystForm({ open, setOpen, id, setId, onAssigned }) {
  const [analyst, setAnalyst] = useState(null);
  const [userOptions, setUserOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchUsers = async () => {
    const response = await getAllUsers();
    setUserOptions(
      response.data.map((user) => ({
        label: user.name,
        value: user._id,
      })),
    );
  };
  useEffect(() => {
    fetchUsers();
  }, []);
  const handleAssign = async () => {
    setLoading(true);
    // The API contract is { analystId } (PUT /alert/:id/assign-analyst).
    const payload = {
      analystId: analyst,
    };
    try {
      const response = await assignAnalyst(payload, id);
      if (response.succeed) {
        toast.success("Analyst assigned successfully");
        onAssigned?.(response.data);
        setId?.(null);
        setOpen(false);
      } else {
        toast.error(response?.error || "Failed to assign analyst");
      }
    } catch (error) {
      console.error("Failed to assign analyst", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (open) => {
    setOpen(open);
    if (!open) {
      setId?.(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Analyst</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <CustomSelect
            label="Analyst"
            placeholder="Select Analyst"
            value={analyst}
            onChange={(e) => setAnalyst(e.target.value)}
            options={userOptions}
          />
          <Button disabled={loading} onClick={handleAssign} className="w-full">
            {loading ? (
              <IconLoader2 className="size-4 animate-spin" />
            ) : (
              <IconUserPlus className="size-4" />
            )}
            {loading ? "Assigning..." : "Assign"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
