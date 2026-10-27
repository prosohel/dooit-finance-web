'use client'

import { getEcdds } from '@/app/dashboard/client/report-compliance/ecdd/actions';
import { Button } from '@/components/ui/button';
import ResizableTable from '@/components/ui/Resizabletable';
import { ArrowRight, Download, Edit, Eye, FileText, Loader2, Trash } from 'lucide-react';
import { downloadReportPdf } from '@/lib/downloadReportPdf';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { deleteEcdd } from '@/app/dashboard/client/report-compliance/ecdd/actions';
import { toast } from 'sonner';
import { formatDateTime, riskLevelVariants } from '@/lib/utils';
import CustomPagination from '@/components/CustomPagination';
import { StatusPill, statusPillVariants } from '@/components/ui/StatusPill';
import { Badge } from '@/components/ui/badge';
import dynamic from 'next/dynamic';
const CustomResizableTable = dynamic(() => import('@/components/ui/CustomResizable'), { ssr: false });

const EcddList = () => {
    const router = useRouter();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false)
    const [deleteId, setDeleteId] = useState(null);
    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const getData = async () => {
        setLoading(true)
        try {
            const queryParams = {
                page: currentPage,
                limit: limit,
            };
            const res = await getEcdds(queryParams);
            setData(res?.data)
            setTotalItems(res?.totalRecords)
        } catch (error) {
            console.log('error', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        getData()

    }, [currentPage, limit])

    const idOf = (ref) => (ref && typeof ref === 'object' ? ref._id : ref) || null;

    // Opens the report by its own id, so alert-origin, case-origin and
    // standalone ECDDs all land on the same review page.
    const handleView = (row) => {
        router.push(`/dashboard/client/report-compliance/ecdd/${row?._id}`);
    }
    const handleEdit = (id) => {
        // router.push(`/dashboard/client/report-compliance/ecdd/form?caseNumber=${caseNumber}`);
        router.push(`/dashboard/client/report-compliance/ecdd/form?id=${id}`)
    }
    const handleDelete = (id) => {
        setDeleteId(id);
        setOpenDeleteModal(true);
    }
    // Tracks the row being exported rather than a single boolean, so only the
    // clicked row shows progress while the PDF renders.
    const [exportingId, setExportingId] = useState(null);

    const handleExport = async (row) => {
        setExportingId(row?._id);
        try {
            await downloadReportPdf({ kind: 'ecdd', id: row?._id, label: row?.uid });
        } finally {
            setExportingId(null);
        }
    }
    const handleGenerateEcdd = (row) => {
        const alertId = idOf(row?.alert);
        if (!alertId) {
            toast.error('No originating alert on this ECDD to generate from.');
            return;
        }
        router.push(`/dashboard/client/monitoring-and-cases/alerts/${alertId}`);
    }
    const columns = [
        {
            id: 'actions',
            // Five inline buttons, not one kebab — the column has to be wide
            // enough or the last actions clip.
            size: 220,
            header: 'Action',
            accessorKey: 'id',
            // Actions are inline icon buttons rather than a kebab menu: the
            // register is a working queue, and burying Export/Generate behind a
            // menu cost a click on the two things an officer does most. Matches
            // the SMR register.
            cell: ({ row }) => {
                const record = row?.original;
                const isExporting = exportingId === record?._id;
                return (
                    <div className='flex items-center justify-center gap-1'>
                        <Button
                            size='sm'
                            variant='outline'
                            title='View'
                            aria-label='View'
                            onClick={() => handleView(record)}>
                            <Eye />
                        </Button>
                        <Button
                            size='sm'
                            variant='outline'
                            title='Edit'
                            aria-label='Edit'
                            onClick={() => handleEdit(record?._id)}>
                            <Edit />
                        </Button>
                        <Button
                            size='sm'
                            variant='outline'
                            title='Generate ECDD'
                            aria-label='Generate ECDD'
                            onClick={() => handleGenerateEcdd(record)}>
                            <FileText />
                        </Button>
                        <Button
                            size='sm'
                            variant='outline'
                            title='Export PDF'
                            aria-label='Export PDF'
                            disabled={isExporting}
                            onClick={() => handleExport(record)}>
                            {isExporting ? <Loader2 className='animate-spin' /> : <Download />}
                        </Button>
                        <Button
                            size='sm'
                            variant='outline'
                            title='Delete'
                            aria-label='Delete'
                            className='text-destructive hover:text-destructive'
                            onClick={() => handleDelete(record?._id)}>
                            <Trash />
                        </Button>
                    </div>
                );
            },
        },
        {
            id: 'uid',
            header: 'UID',
            cell: ({ row }) => <div>
                <p className="font-mono">#{row?.original?.uid}</p>
            </div>
        },
        {
            id: 'caseId',
            header: 'Case ID',
            accessorKey: 'caseNumber',
            cell: ({ row }) => <div>
                <h5 className="text-heading font-semibold capitalize flex justify-between" >
                    <span className='text-md'>
                        {row?.original?.fullName}
                    </span>
                    <StatusPill
                        className={'text-xs ml-2'}
                        variant={riskLevelVariants[row?.original?.customer?.kycStatus]}>
                        {row?.original?.customer?.kycStatus}
                    </StatusPill>
                </h5>
                <p className="font-mono text-neutral-500">#{row?.original?.caseNumber}</p>
            </div>
        },

        {
            id: 'suspicionDate',
            header: 'Suspicion Date',
            accessorKey: 'createdAt',
            cell: ({ row }) => <div>
                <p className=" text-heading">
                    {formatDateTime(row?.original?.createdAt)?.date}</p>
                <p className="font-mono text-neutral-500">  {formatDateTime(row?.original?.createdAt)?.time}</p>
            </div>
        },
        {
            id: 'analyst',
            header: 'Analyst',
            accessorKey: 'analystName',
        },
        {
            id: 'transaction',
            header: 'Transaction',
            accessorKey: 'transaction.amount',
            cell: ({ row }) => <div hidden={!row?.original?.transaction}>

                <div className="flex items-center gap-2">

                    <div>
                        <p className="text-heading font-semibold capitalize" >{row?.original?.transaction?.sender?.name}</p>
                        <p className="font-mono text-neutral-500">#{row?.original?.transaction?.sender?.account}</p>
                    </div>
                    <div>
                        <ArrowRight className="size-4 text-green-500" />
                    </div>
                    <div>
                        <p className="text-heading font-semibold capitalize" >{row?.original?.transaction?.receiver?.name}</p>
                        <p className="font-mono text-neutral-500">#{row?.original?.transaction?.receiver?.account}</p>
                    </div>
                </div>
                <div className='bg-accent/10'>
                    <p className="text-heading font-semibold capitalize text-center" >
                        (${row?.original?.transaction?.amount})
                    </p>
                </div>
            </div>
        },
        {
            id: 'status',
            header: 'Status',
            accessorKey: 'status',
        },
    ]

    const Actions = () => {
        return (
            <Button size='sm' onClick={() => router.push('/dashboard/client/report-compliance/ecdd/form')}>Add new</Button>
        )
    }
    const handlePageChange = (page) => {
        setCurrentPage(page.selected + 1);
    };
    const handleLimitChange = (limit) => {
        setLimit(limit);
        setCurrentPage(1);
    };


    return (
        <div>
            <CustomResizableTable
                columns={columns}
                data={data}
                loading={loading}
                actions={<Actions />}
                tableId="ecdd-list"
                mainClass="ecdd-list"
            />
            <CustomPagination
                currentPage={currentPage}
                onPageChange={handlePageChange}
                totalItems={totalItems}
                limit={limit}
                onChangeLimit={handleLimitChange}
            />
            <DeleteModal open={openDeleteModal} setOpen={setOpenDeleteModal} id={deleteId} getData={getData} />
        </div>
    );
};

export default EcddList;

const DeleteModal = ({ open, setOpen, id, getData }) => {
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        setDeleting(true);
        try {
            const res = await deleteEcdd(id);
            if (res.success) {
                setOpen(false);
                getData();
                toast.success('ECDD deleted successfully');
            }
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to delete ECDD');
        } finally {
            setDeleting(false);
        }
    }
    return (
        <AlertDialog open={open} onOpenChange={setOpen}>

            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the ECDD and remove the data from our servers.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={deleting}>{deleting ? <Loader2 className="size-4 animate-spin" /> : 'Continue'}</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

    )
}