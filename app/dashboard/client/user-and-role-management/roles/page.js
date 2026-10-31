'use client';

import { useCallback, useEffect, useState } from 'react';
import { IconLoader2, IconPlus, IconShieldCog } from '@tabler/icons-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import CustomResizableTable from '@/components/ui/CustomResizable';
import { PageDescription, PageHeader, PageTitle } from '@/components/common';
import PermissionDrawer from '@/views/privacy/permissions/PermissionDrawer';
import {
  addRole,
  getAllRoles,
} from '@/app/dashboard/client/user-and-role-management/actions';

export default function RolesPage() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [permissionRole, setPermissionRole] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    const res = await getAllRoles().catch(() => null);
    if (res?.success || Array.isArray(res?.data)) {
      setRoles(res.data ?? []);
    } else {
      toast.error(res?.error || 'Failed to load roles');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const handleAddRole = async () => {
    const name = newRoleName.trim();
    if (!name) return;
    setAdding(true);
    const res = await addRole({ name }).catch(() => null);
    if (res?.success) {
      toast.success(`Role "${name}" created`);
      setNewRoleName('');
      setAddOpen(false);
      fetchRoles();
    } else {
      toast.error(res?.error || 'Failed to create role');
    }
    setAdding(false);
  };

  const columns = [
    {
      id: 'name',
      header: 'Role',
      accessorKey: 'name',
      cell: ({ row }) => <span className="font-medium capitalize">{row.original.name}</span>,
    },
    {
      id: 'permissions',
      header: 'Permissions',
      accessorKey: 'permissions',
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setPermissionRole(row.original)}>
            <IconShieldCog className="size-4" /> Manage permissions
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-6">
      <PageHeader className="flex-row items-start justify-between">
        <div>
          <PageTitle>Roles</PageTitle>
          <PageDescription>
            Roles define what people can see and do. Manage each role&apos;s permission grant and
            per-user restrictions.
          </PageDescription>
        </div>
        <Popover open={addOpen} onOpenChange={setAddOpen}>
          <PopoverTrigger asChild>
            <Button>
              <IconPlus className="size-4" /> Add role
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 space-y-3">
            <p className="text-sm font-medium">New role name</p>
            <Input
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              placeholder="e.g. AML Analyst"
              onKeyDown={(e) => e.key === 'Enter' && handleAddRole()}
            />
            <Button size="sm" className="w-full" onClick={handleAddRole} disabled={adding}>
              {adding ? <IconLoader2 className="size-4 animate-spin" /> : 'Create role'}
            </Button>
          </PopoverContent>
        </Popover>
      </PageHeader>

      <CustomResizableTable
        columns={columns}
        data={roles}
        loading={loading}
        mainClass="roles-table"
        tableId="roles-table"
      />

      {permissionRole && (
        <PermissionDrawer
          open={Boolean(permissionRole)}
          role={permissionRole}
          setRole={setPermissionRole}
          onClose={() => setPermissionRole(null)}
        />
      )}
    </div>
  );
}
