'use client'
import { PageDescription, PageHeader, PageTitle } from '@/components/common'
import { Button } from '@/components/ui/button'
import ResizableTable from '@/components/ui/Resizabletable'
import { useRouter } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import { getSMRList } from './actions'
import { formatDateTime } from '@/lib/utils'
import { DownloadIcon, EyeIcon, Loader2, PencilIcon } from 'lucide-react'
import { downloadReportPdf } from '@/lib/downloadReportPdf'
import { SMRDashboard } from './Dashboard'
import SMRHeatmap from './HeatMap'
import CustomPagination from '@/components/CustomPagination'

export default function SMRPage() {
  const router = useRouter()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const handleView = (id) => {
    router.push(`/dashboard/client/report-compliance/smr-filing/smr/form/detail?id=${id}`)
  }

  const handleEdit = (id) => {
    router.push(`/dashboard/client/report-compliance/smr-filing/smr/form?id=${id}`)
  }

  // Tracks the row being exported rather than a single boolean, so only the
  // clicked row shows a spinner while the PDF renders.
  const [exportingId, setExportingId] = useState(null)

  const handleExport = async (row) => {
    setExportingId(row._id)
    try {
      await downloadReportPdf({ kind: 'smr', id: row._id, label: row.uid })
    } finally {
      setExportingId(null)
    }
  }

  const columns = [
    {
      header: 'Action',
      accessorKey: 'action',
      size: 40,
      cell: ({ row }) => {
        return (
          <div className='flex items-center justify-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => handleEdit(row.original._id)}>
              <PencilIcon />
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={() => handleView(row.original._id)}>
              <EyeIcon />
            </Button>
            <Button
              variant='outline'
              size='sm'
              title='Export PDF'
              aria-label='Export PDF'
              disabled={exportingId === row.original._id}
              onClick={() => handleExport(row.original)}>
              {exportingId === row.original._id ? (
                <Loader2 className='animate-spin' />
              ) : (
                <DownloadIcon />
              )}
            </Button>
          </div>
        )
      }
    },
    {
      header: 'Case ID',
      accessorKey: 'uid',
      size: 100,
    },
    {
      header: 'Customer Name',
      accessorKey: 'partC.personOrganisation.name',
    },
    // {
    //   header: 'Customer ID',
    //   accessorKey: 'partC.personOrganisation.id',
    // },
    {
      header: 'Suspicion Date',
      accessorKey: 'updatedAt',
      cell: ({ row }) => {
        return (
          <div>
            <p>{formatDateTime(row?.updatedAt)?.date}</p>
            <span className='text-muted-foreground'>{formatDateTime(row.updatedAt)?.time}</span>
          </div>
        )
      }
    },
    {
      header: 'Analyst',
      accessorKey: 'analyst',
      size: 100,
    },
    {
      header: 'Suspicious Activity',
      accessorKey: 'partB.groundsForSuspicion',
      // size: 200
      cell: ({ row }) => {
        return (
          <div className=' '>
            <p className='max-w-[200px] text-wrap break-words line-clamp-2 text-ellipsis overflow-hidden'>{row.original.partB.groundsForSuspicion}</p>
          </div>
        )
      }
    },
    {
      header: 'Status',
      accessorKey: 'status',
      size: 100,
    },
    {
      header: 'Verified',
      accessorKey: 'verified',
      size: 100,
    },
  ]

  const getSmr = async () => {
    setLoading(true)
    try {
      const response = await getSMRList({
        page: currentPage,
        limit: limit,
      });
      console.log('response', response)
      if (response.success) {
        setData(response.data)
        setTotalItems(response.totalRecords)
      }
    } catch (error) {
      console.log('error', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    getSmr()
  }, [currentPage, limit])

  const handleNewSMR = () => {
    router.push('/dashboard/client/report-compliance/smr-filing/smr/form')
  }
  const handlePageChange = (page) => {
    setCurrentPage(page.selected + 1);
  };
  const handleLimitChange = (limit) => {
    setLimit(limit);
    setCurrentPage(1);
  };

  return (
    <div className='  rounded-lg space-y-4'>
      <PageHeader>
        <PageTitle>Suspicious Matter Report</PageTitle>
        <PageDescription>Manage and track all Suspicious Matter Reports</PageDescription>
      </PageHeader>
      <div className='grid grid-cols-3 gap-4'>
        <div>
          <SMRHeatmap />
        </div>
        <div className='col-span-2'>
          <SMRDashboard />
        </div>
      </div>
      <ResizableTable
        loading={loading}
        columns={columns}
        data={data}
        actions={<Button size='sm' onClick={handleNewSMR}>Add New</Button>}
      />
      <CustomPagination
        currentPage={currentPage}
        onPageChange={handlePageChange}
        totalItems={totalItems}
        limit={limit}
        onChangeLimit={handleLimitChange}
      />
    </div>
  )
}