'use client';

import { useCallback, useEffect, useState } from 'react';
import { IconDotsVertical, IconEdit, IconLoader2, IconPlus, IconTrash, IconUserCircle } from '@tabler/icons-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusPill } from '@/components/ui/StatusPill';
import CustomResizableTable from '@/components/ui/CustomResizable';
import CustomPagination from '@/components/CustomPagination';
import { PageDescription, PageHeader, PageTitle } from '@/components/common';
import UserForm from '@/views/user-and-role/form';
import {
  deleteUser,
  getAllRoles,
  getAllUsers,
} from '@/app/dashboard/client/user-and-role-management/actions';

const roleLabel = (user) =>
  user?.role?.name || (typeof user?.role === 'string' ? user.role : null) || user?.userType || '—';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setFetching(true);
    const res = await getAllUsers({ page: currentPage, limit }).catch(() => null);
    if (res?.success) {
      setUsers(res.data ?? []);
      setTotalItems(res.totalRecords ?? 0);
    } else {
      toast.error(res?.error || 'Failed to load users');
    }
    setFetching(false);
  }, [currentPage, limit]);

  const fetchRoles = useCallback(async () => {
    const res = await getAllRoles().catch(() => null);
    if (res?.success || Array.isArray(res?.data)) setRoles(res.data ?? []);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await deleteUser(deleteTarget._id).catch(() => null);
    if (res?.success) {
      toast.success(`User "${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
      fetchUsers();
    } else {
      toast.error(res?.error || 'Failed to delete user');
    }
    setDeleting(false);
  };

  const columns = [
    {
      id: 'actions',
      header: 'Actions',
      accessorKey: 'actions',
      size: 90,
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <IconDotsVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => {
                  setEditId(row.original._id);
                  setFormOpen(true);
                }}
              >
                <IconEdit className="size-3 text-muted-foreground/70" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(row.original)}>
                <IconTrash className="size-3" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
    {
      id: 'name',
      header: 'Name',
      accessorKey: 'name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <IconUserCircle className="size-5 text-muted-foreground" />
          <div>
            <p className="font-bold text-gray-700">{row.original.name || '—'}</p>
            <p className="text-sm text-muted-foreground">{row.original.email || '—'}</p>
          </div>
        </div>
      ),
    },
    {
      id: 'role',
      header: 'Role',
      accessorKey: 'role',
      cell: ({ row }) => <span className="text-sm capitalize">{roleLabel(row.original)}</span>,
    },
    {
      id: 'status',
      header: 'Status',
      accessorKey: 'isActive',
      cell: ({ row }) =>
        row.original.isActive !== false ? (
          <StatusPill variant="success">Active</StatusPill>
        ) : (
          <StatusPill variant="muted">Inactive</StatusPill>
        ),
    },
  ];

  return (
    <div className="p-4 md:p-6">
      <PageHeader className="flex-row items-start justify-between">
        <div>
          <PageTitle>Users</PageTitle>
          <PageDescription>
            People who can sign in to this workspace and the role each holds.
          </PageDescription>
        </div>
        <Button
          onClick={() => {
            setEditId(null);
            setFormOpen(true);
          }}
        >
          <IconPlus className="size-4" /> Add user
        </Button>
      </PageHeader>

      <CustomResizableTable
        columns={columns}
        data={users}
        loading={fetching}
        mainClass="users-table"
        tableId="users-table"
      />

      <CustomPagination
        currentPage={currentPage}
        totalItems={totalItems}
        limit={limit}
        onPageChange={(p) => setCurrentPage((p?.selected ?? 0) + 1)}
        onChangeLimit={(value) => {
          setLimit(Number(value) || 10);
          setCurrentPage(1);
        }}
      />

      <UserForm
        open={formOpen}
        setOpen={setFormOpen}
        allRoles={roles}
        fetchUsers={fetchUsers}
        fetchRoles={fetchRoles}
        id={editId}
        setId={setEditId}
      />

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes {deleteTarget?.name || 'this user'} and all their role
              memberships. The action is recorded in the audit trail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleting}
              className="bg-danger text-white hover:bg-danger/90"
            >
              {deleting ? <IconLoader2 className="size-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
