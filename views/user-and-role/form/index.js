import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormField } from "@/components/ui/FormField";
import { Loader2, Plus } from "lucide-react";
import {
  addRole,
  createUser,
  getUserById,
  updateUser,
} from "@/app/dashboard/client/user-and-role-management/actions";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const initialState = {
  name: "",
  email: "",
  role: "",
  isActive: true,
};

export default function UserForm({
  open,
  setOpen,
  allRoles,
  fetchUsers,
  id,
  setId,
  fetchRoles,
  isSelf = false,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [newRole, setNewRole] = useState("");
  const [openAddRolePopover, setOpenAddRolePopover] = useState(false);
  const schema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    role: z.string().min(1, "Role is required"),
    isActive: z.boolean(),
  });

  const form = useForm({
    defaultValues: initialState,
    resolver: zodResolver(schema),
  });
  useEffect(() => {
    if (id) {
      const fetchUser = async () => {
        setIsLoadingUser(true);
        try {
          const response = await getUserById(id);
          form.reset(response.data);
        } catch (error) {
          console.error("error", error);
          toast.error("Failed to load user!");
        } finally {
          setIsLoadingUser(false);
        }
      };
      fetchUser();
    }
  }, [id]);
  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      const action = id ? updateUser(id, data) : createUser(data);
      const response = await action;
      console.log("response", response);
      if (response.succeed || response.success) {
        fetchUsers();
        toast.success(id ? "User updated successfully!" : "User created successfully!");
        setOpen(false);
      } else {
        toast.error(id ? "Failed to update user!" : "Failed to create user!");
      }
    } catch (error) {
      console.error("error", error);
      toast.error(id ? "Failed to update user!" : "Failed to create user!");
    } finally {
      setIsSubmitting(false);
    }
  };
  const roleOptions = allRoles.map((role) => ({
    label: role.name,
    value: role.name.toLowerCase(),
  }));

  const handleAddRole = async () => {
    const toastId = toast.loading("Adding role...");
    if (newRole.trim()) {
      const payload = {
        name: newRole,
        permissions: [],
      };
      const response = await addRole(payload);
      toast.dismiss(toastId);
      if (response.succeed) {
        fetchRoles();
        setOpenAddRolePopover(false);
        toast.success("Role added successfully!", { id: toastId });
        setNewRole("");
      } else {
        toast.error("Failed to add role!", { id: toastId });
      }
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>User</SheetTitle>
          <SheetDescription>Add a new user</SheetDescription>
        </SheetHeader>
        {isLoadingUser ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 px-4.5">
            <FormField form={form} name="name" label="Name" type="text" placeholder="Name" />
            <FormField form={form} name="email" label="Email" type="email" placeholder="Email" />
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <FormField
                  form={form}
                  name="role"
                  label="Role"
                  type="select"
                  placeholder="Select Role"
                  options={roleOptions}
                  // You can't change your own role — the API rejects it with 403.
                  disabled={isSelf}
                  description={
                    isSelf ? "You cannot change your own role." : undefined
                  }
                />
              </div>

              <Popover open={openAddRolePopover} onOpenChange={setOpenAddRolePopover}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={isSelf}
                    onClick={() => setOpenAddRolePopover(true)}
                  >
                    <Plus />
                  </Button>
                </PopoverTrigger>
                <PopoverContent>
                  <div>
                    <Label>Role</Label>
                    <Input
                      type="text"
                      placeholder="Enter Role"
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                    />
                  </div>
                  <div>
                    <Button variant="outline" className="w-full mt-2" onClick={handleAddRole}>
                      Add Role
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <FormField form={form} name="isActive" label="Is Active" type="checkbox" />
            <Button
              type="submit"
              className={"w-full"}
              onClick={form.handleSubmit(onSubmit)}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
