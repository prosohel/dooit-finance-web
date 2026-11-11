"use client";

import {
  createInstantReport,
  exportCustomersExcel,
  getCustomerById,
  getCustomers,
} from "@/app/dashboard/client/onboarding/customer-queue/actions";
import { useCustomerStore } from "@/app/store/useCustomer";
import CustomPagination from "@/components/CustomPagination";
import { DataTableColumnHeader } from "@/components/DatatableColumnHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getCustomerIdentity } from "@/views/onboarding/customer-queue/customerIdentity";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Label } from "@/components/ui/label";
import ResizableTable from "@/components/ui/Resizabletable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusPill } from "@/components/ui/StatusPill";

import { Textarea } from "@/components/ui/textarea";
import {
  dateShowFormatWithTime,
  formatDateTime,
  objWithValidValues,
  riskLevelVariants,
} from "@/lib/utils";
import {
  IconChevronRight,
  IconDownload,
  IconEye,
  IconGridDots,
  IconList,
  IconPennant,
  IconSearch,
  IconUpload,
  IconUser,
} from "@tabler/icons-react";
import { Filter, Plus, XCircle } from "lucide-react";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { DetailViewModal } from "../details";
import { useRouter } from "next/navigation";
import CustomDropZone from "@/components/ui/DropZone";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { XMarkIcon } from "@heroicons/react/24/outline";
import _, { isObject } from "lodash";
import CustomSelect from "@/components/ui/CustomSelect";
import KycExportButton from "@/components/KycExportButton";
import KycStatusButton from "@/components/KycStatusButton";
import { countriesData } from "@/constants";
import dynamic from "next/dynamic";
import { fileUploadOnCloudinary } from "@/app/actions";
import useGetUser from "@/hooks/useGetUser";
const CustomResizableTable = dynamic(() => import("@/components/ui/CustomResizable"), {
  ssr: false,
});
const statusVariants = {
  pending: "warning",
  rejected: "danger",
  approved: "success",
  in_review: "info",
  closed: "muted",
};

// A Customer's relations[] can mix the person's own individual relation with
// linked entity relations (company/trust). Display the individual relation's
// type when present, else fall back to the first relation / risk virtual.
const getDisplayType = (customer) => {
  const relations = Array.isArray(customer?.relations) ? customer.relations : [];
  const individual = relations.find((r) => r?.type === "individual");
  return (
    individual?.type ||
    relations[0]?.type ||
    customer?.riskAssessment?.customerType?.value ||
    "—"
  );
};

// Avatar that falls back to the name's initial (or a user icon) when there is
// no selfie/photo URL or the image fails to load — never a broken <img>.
const CustomerAvatar = ({ customer, className }) => {
  const { photo, initial } = getCustomerIdentity(customer);
  return (
    <Avatar className={className}>
      {photo && <AvatarImage src={photo} alt="" className="object-cover" />}
      <AvatarFallback className="text-sm font-semibold text-muted-foreground">
        {initial || <IconUser className="size-1/2" />}
      </AvatarFallback>
    </Avatar>
  );
};

// Decode a base64 payload (returned by the export server action) into a file
// download in the browser.
const downloadBase64File = (base64, filename, mime) => {
  const byteChars = atob(base64);
  const bytes = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const GridView = () => {
  const { customers } = useCustomerStore();
  const [openReporting, setOpenReporting] = useState(false);
  const router = useRouter();
  const [currentItem, setCurrentItem] = useState(null);
  const handleDoubleClick = (item) => {
    setCurrentItem(item);
    setOpenReporting(true);
  };
  const handleViewClick = (item) => {
    setCurrentItem(item);
    router.push(`/dashboard/client/onboarding/customer-queue/details?id=${item?.id}`);
  };
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 xxl:grid-cols-4  mt-4">
      {customers?.map((item) => (
        <Item
          key={item.id}
          onDoubleClick={() => handleDoubleClick(item)}
          className={"p-6 border border-neutral-100 "}
        >
          <ItemMedia className="size-20 rounded-full overflow-hidden">
            <CustomerAvatar customer={item} className="size-full" />
          </ItemMedia>
          <ItemContent className="text-xs gap-2 ">
            <div className="flex items-center justify-between w-full">
              <div className="">
                <ItemDescription className="text-[0.6rem] uppercase">Customer ID</ItemDescription>
                <ItemTitle className={"font-mono"}>#{item.uid}</ItemTitle>
              </div>
              <Badge variant={riskLevelVariants[item.riskLabel]}>{item.riskLabel} Risk</Badge>
            </div>
            <div>
              <ItemDescription className="text-[0.6rem]  uppercase">Customer Name</ItemDescription>
              <ItemTitle className={"text-base font-semibold"}>
                {getCustomerIdentity(item).name || "—"}
              </ItemTitle>
            </div>
          </ItemContent>
          {/* <ItemActions >
              <Button onClick={() => handleViewClick(item)} variant="outline">View</Button>
            </ItemActions> */}
          <ItemFooter className="flex justify-end border-t border-neutral-100 py-4">
            <Button
              className="w-full flex items-center justify-between font-semibold text-xs"
              onClick={() => handleViewClick(item)}
              variant="outline"
            >
              View Details
              <IconChevronRight className="size-4 text-mute-200" />
            </Button>
          </ItemFooter>
        </Item>
      ))}
      <ReportingModal open={openReporting} setOpen={setOpenReporting} currentItem={currentItem} />
      {/* <DetailViewModal open={openDetailView} setOpen={setOpenDetailView} currentId={currentItem?.id} /> */}
    </div>
  );
};

const ListView = ({ onExport, exporting, onRefresh }) => {
  const {
    customers,
    fetching,
    currentPage,
    limit,
    totalItems,
    sort,
    setSort,
    setCurrentPage,
    setLimit,
  } = useCustomerStore();
  const [openReporting, setOpenReporting] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const router = useRouter();

  // Server-side sort — flips the store's sort string and resets to page 1.
  const handleSort = (key, direction) => {
    setSort(direction === "desc" ? `-${key}` : key);
    setCurrentPage(1);
  };

  const columns = [
    {
      id: "actions",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Actions" sortable={false} />
      ),
      accessorKey: "actions",
      size: 20,
      cell: ({ row }) => (
        <div className="flex items-center justify-center gap-1.5">
          <Button variant="outline" size="icon" onClick={() => handleViewClick(row.original.id)}>
            <IconEye />
          </Button>
          <KycStatusButton
            customerId={row.original.id}
            currentStatus={row.original.kycStatus}
            onUpdated={onRefresh}
            iconOnly
          />
          <KycExportButton customerId={row.original.id} iconOnly />
        </div>
      ),
    },
    {
      id: "uid",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Customer ID"
          sortKey="uid"
          sortValue={sort}
          onSort={handleSort}
        />
      ),
      cell: ({ row }) => (
        <div>
          <p className=" text-muted-foreground font-mono">#{row.original?.uid}</p>
        </div>
      ),
      accessorKey: "uid",
    },
    {
      id: "user.name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Customer" sortable={false} />
      ),
      size: 100,
      accessorKey: "user.name",
      cell: ({ row }) => {
        const { name, email } = getCustomerIdentity(row.original);
        return (
          <div className="flex items-center gap-2">
            <CustomerAvatar customer={row.original} className="size-10" />
            <div>
              <p className="font-bold">{name || "—"}</p>
              {email && <p className="text-xs text-muted-foreground">{email}</p>}
            </div>
          </div>
        );
      },
    },

    {
      id: "country",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Country"
          sortKey="country"
          sortValue={sort}
          onSort={handleSort}
        />
      ),
      accessorKey: "country",
      size: 100,
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-muted-foreground">{row.original?.country}</div>
      ),
    },
    {
      id: "kycStatus",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="KYC Status"
          sortKey="kycStatus"
          sortValue={sort}
          onSort={handleSort}
        />
      ),
      accessorKey: "kycStatus",
      size: 100,
      cell: ({ row }) => (
        <StatusPill variant={statusVariants[row.original.kycStatus]}>
          {row.original.kycStatus}
        </StatusPill>
      ),
    },
    {
      id: "type",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Type" sortable={false} />
      ),
      accessorKey: "type",
      cell: ({ row }) => (
        <span className="capitalize text-muted-foreground">
          {getDisplayType(row.original)}
        </span>
      ),
    },
    {
      id: "riskLabel",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Risk Level" sortable={false} />
      ),
      accessorKey: "riskLabel",
      size: 100,
      cell: ({ row }) => (
        <StatusPill icon={<IconPennant />} variant={riskLevelVariants[row.original.riskLabel]}>
          {row.original.riskLabel}
        </StatusPill>
      ),
    },
    {
      id: "createdAt",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Created On"
          sortKey="createdAt"
          sortValue={sort}
          onSort={handleSort}
        />
      ),
      accessorKey: "createdAt",
      size: 100,
      cell: ({ row }) => (
        <div>
          <p className="font-semibold">{formatDateTime(row.original.createdAt)?.date}</p>
          <span className="text-xs text-muted-foreground">
            {formatDateTime(row.original.createdAt)?.time}
          </span>
        </div>
      ),
    },
  ];
  const handleDoubleClick = (item) => {
    setCurrentItem(item);
    setOpenReporting(true);
  };
  const handleViewClick = (id) => {
    router.push(`/dashboard/client/onboarding/customer-queue/details?id=${id}`);
    // setCurrentItem(id);
    // setOpenDetailView(true);
  };
  const handlePageChange = (page) => {
    setCurrentPage(page.selected + 1);
  };
  const handleLimitChange = (limit) => {
    setLimit(limit);
    setCurrentPage(1);
  };

  const Actions = () => {
    return (
      <div className="flex items-center gap-2 ">
        <Button
          className="text-xs"
          size="sm"
          variant="outline"
          onClick={onExport}
          disabled={exporting}
        >
          {exporting ? "Exporting..." : "Export Excel"} <IconDownload className="size-4" />
        </Button>
        <Button className="text-xs" size="sm" variant="outline">
          Import CSV <IconUpload className="size-4" />
        </Button>
      </div>
    );
  };
  return (
    <>
      {/* <div className='flex justify-end'>
        <Button>Send Invite</Button>
      </div> */}
      <CustomResizableTable
        columns={columns}
        data={customers}
        onDoubleClick={handleDoubleClick}
        loading={fetching}
        actions={<Actions />}
        mainClass="customer-queue-table"
        tableId="customer-queue-table"
      />
      <CustomPagination
        currentPage={currentPage}
        onPageChange={handlePageChange}
        totalItems={totalItems}
        limit={limit}
        onChangeLimit={handleLimitChange}
      />
      {/* <CustomDatatable data={data} columns={columns} onDoubleClick={handleDoubleClick} /> */}
      {openReporting && (
        <ReportingModal
          open={openReporting}
          setOpen={setOpenReporting}
          currentItem={currentItem}
          setCurrentItem={setCurrentItem}
        />
      )}
      {/* <DetailViewModal open={openDetailView} setOpen={setOpenDetailView} currentId={currentItem} /> */}
    </>
  );
};

const getFilterLabel = (key) => {
  switch (key) {
    case "q":
      return "Search";
    case "uid":
      return "Customer ID";
    case "email":
      return "Email";
    case "type":
      return "Type";
    case "riskLabel":
      return "Risk Level";
    case "country":
      return "Country";
    default:
      return key;
  }
};

export default function CustomerQueueList({ data, kycStatus }) {
  const [view, setView] = useState("list");
  const {
    currentPage,
    limit,
    sort,
    customers,
    setCustomers,
    setFetching,
    setTotalItems,
    setCurrentPage,
  } = useCustomerStore();
  const initialState = {
    q: "",
    uid: "",
    type: "",
    email: "",
    riskLabel: "",
    country: null,
  };
  const [filters, setFilters] = useState(initialState);
  const [exporting, setExporting] = useState(false);

  // Reset to the first page (used by every filter change).
  const resetPage = () => {
    if (currentPage !== 1) setCurrentPage(1);
  };

  // Normalize current filters + kycStatus into API query params (mirrors fetchData).
  const buildQueryParams = (extra = {}) => {
    const queryParams = objWithValidValues({ kycStatus, ...filters, ...extra });
    for (const [key, value] of Object.entries(queryParams)) {
      if (value && isObject(value)) queryParams[key] = value?.value;
    }
    return queryParams;
  };

  // Server-side professional Excel export of all records matching current
  // filters (the API streams a fully-populated .xlsx).
  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const res = await exportCustomersExcel(buildQueryParams());
      if (res?.success && res.base64) {
        downloadBase64File(
          res.base64,
          res.filename || `customers-${new Date().toISOString().slice(0, 10)}.xlsx`,
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );
        toast.success("Export downloaded");
      } else {
        toast.error(res?.error || "Export failed");
      }
    } catch (error) {
      console.error("Customer export failed", error);
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  // Single source of truth for the fetch. Reads current page/limit/sort/filters
  // (proper deps — no stale closure) so pagination + sorting actually work.
  const fetchData = useCallback(async () => {
    setFetching(true);
    try {
      const queryParams = objWithValidValues({
        page: currentPage,
        limit,
        kycStatus,
        sort,
        ...filters,
      });
      for (const [key, value] of Object.entries(queryParams)) {
        if (value && isObject(value)) queryParams[key] = value?.value;
      }
      const response = await getCustomers(queryParams);
      setCustomers(response?.data ?? []);
      setTotalItems(response?.totalRecords ?? 0);
    } catch (error) {
      console.error("Failed to fetch customers", error);
      setCustomers([]);
      setTotalItems(0);
    } finally {
      setFetching(false);
    }
  }, [currentPage, limit, kycStatus, sort, filters, setCustomers, setFetching, setTotalItems]);

  // Debounce all query changes (filter typing, page, limit, sort, tab) through
  // one effect — fires once per settled change.
  useEffect(() => {
    const timer = setTimeout(fetchData, 300);
    return () => clearTimeout(timer);
  }, [fetchData]);

  // currentPage/limit/sort live in a shared store across tabs — start each tab
  // on page 1 so a stale page number can't land on an empty result set.
  useEffect(() => {
    setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kycStatus]);

  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    resetPage();
  };
  const handleReset = () => {
    setFilters(initialState);
    resetPage();
  };
  const handleRemoveFilter = (key) => {
    setFilters((prev) => ({ ...prev, [key]: key === "country" ? null : "" }));
    resetPage();
  };
  return (
    <div className="my-2">
      {/* <CustomerDashboard /> */}
      <div className="flex items-center justify-between  py-4 bg-sidebar-bg rounded-md px-4 ">
        {/* Search and Filter */}
        <div className="flex items-center gap-2 flex-shrink-0 flex-grow  flex-wrap">
          <InputGroup className={"w-64 flex-shrink-0"}>
            <InputGroupInput
              placeholder="Search name / ID..."
              value={filters.q}
              onChange={(e) => handleFilterChange("q", e.target.value)}
            />
            <InputGroupAddon>
              <IconSearch />
            </InputGroupAddon>
          </InputGroup>

          <Input
            name="uid"
            placeholder="Customer ID"
            className="w-40 flex-shrink-0"
            value={filters.uid}
            onChange={(e) => handleFilterChange("uid", e.target.value?.replace(/^#/, ""))}
          />
          <Input
            name="email"
            placeholder="Email"
            className="w-40 flex-shrink-0"
            value={filters.email}
            onChange={(e) => handleFilterChange("email", e.target.value)}
          />
          {/* <Select>
            <SelectTrigger>
              <SelectValue placeholder="KYC Status" />
            </SelectTrigger>
          </Select> */}
          <Select value={filters.type} onValueChange={(value) => handleFilterChange("type", value)}>
            <SelectTrigger className="max-w-40 flex-shrink-0">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="individual">Individual</SelectItem>
              <SelectItem value="company">Company</SelectItem>
              <SelectItem value="partnership">Partnership</SelectItem>
              <SelectItem value="government_body">Government Body</SelectItem>
              <SelectItem value="association">Association</SelectItem>
              <SelectItem value="cooperative">Cooperative</SelectItem>
              <SelectItem value="trust">Trust</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.riskLabel}
            onValueChange={(value) => handleFilterChange("riskLabel", value)}
          >
            <SelectTrigger className="max-w-40 flex-shrink-0">
              <SelectValue placeholder="Risk Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Unacceptable">Unacceptable</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>

          <div className="w-44 flex-shrink-0">
            <CustomSelect
              placeholder="Select a country"
              options={countriesData}
              value={filters.country}
              onChange={(value) => handleFilterChange("country", value)}
            />
          </div>
          <Button size="icon" variant="outline">
            <Plus className="size-4" />
          </Button>
          {/* <Button onClick={handleSearch} lit={!!filters.uid || !!filters.email || !!filters.type || !!filters.riskLabel}>
            <MagnifyingGlassIcon className='size-4' />Search
          </Button>
          <Button onClick={handleReset} variant='outline' > <XMarkIcon className='size-4' /> Reset</Button> */}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ">
          {/* <Button size={'sm'} className={'text-xs'}><IconBrandTelegram />  Send Invite </Button> */}

          <ButtonGroup>
            <Button
              onClick={() => setView("grid")}
              variant={view === "grid" ? "default" : "outline"}
            >
              <IconGridDots />
            </Button>
            <Button
              variant={view === "list" ? "default" : "outline"}
              onClick={() => setView("list")}
            >
              <IconList />
            </Button>
          </ButtonGroup>
        </div>
      </div>
      <div className=" flex flex-wrap gap-2 py-2">
        {Object.entries(filters).map(([key, value]) => {
          if (value) {
            return (
              <Badge key={key} variant="outline" className="py-1 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-primary">{getFilterLabel(key)}</span>:{" "}
                  <span className="py-1 px-3 text-[0.65rem] rounded-full bg-primary text-white capitalize ">
                    {value?.label || value}
                  </span>
                </div>
                <Button
                  className={"size-6"}
                  size="icon"
                  variant="outline"
                  onClick={() => handleRemoveFilter(key)}
                >
                  <XMarkIcon className="size-3" />
                </Button>
              </Badge>
            );
          }
          return null;
        })}
        {Object.entries(filters).some(([key, value]) => value) && (
          <Button variant="outline" onClick={handleReset} className="text-xs py-1 h-8">
            <XCircle className="size-4" /> Clear
          </Button>
        )}
      </div>
      <div className="">
        {view === "grid" ? (
          <GridView data={data} />
        ) : (
          <ListView
            data={data}
            onExport={handleExport}
            exporting={exporting}
            onRefresh={fetchData}
          />
        )}
      </div>
    </div>
  );
}

export const ReportingModal = ({ open, setOpen, currentItem, setCurrentItem }) => {
  const [formData, setFormData] = useState({
    riskLevel: currentItem?.riskLabel ?? "",
    insights: "",
    file: null,
  });
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleFileChange = (file) => {
    setFile(file);
  };
  const onSubmit = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        notifyFor: "Customer",
        notes: formData?.insights,
        resourceType: "Customer",
        resourceId: currentItem?.id,
        isActive: true,
        metadata: {
          priority: "high",
          origin: "automated-rule",
        },
        documents: [
          // {
          //   name: file?.name,
          //   url: fileUrl,
          //   mimeType: file?.type,
          //   type: "invoice",
          //   docType: "billing"
          // }
        ],
      };
      console.log("payload", JSON.stringify(payload, null, 2));
      const response = await createInstantReport(payload);
      if (response.succeed) {
        setOpen(false);
        toast.success("Reporting submitted successfully");
      } else {
        toast.error("Failed to submit report");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to submit report");
    } finally {
      setIsSubmitting(false);
      setCurrentItem(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="md:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Reporting</DialogTitle>
          {/* <DialogDescription>
            <div className='bg-smoke-200 border w-max p-2 rounded-md'>
              Risk Level: <Badge variant={riskLevelVariants[currentItem?.riskLabel ?? '']}>{currentItem?.riskLabel}</Badge>
            </div>
          </DialogDescription> */}
        </DialogHeader>
        <div className="flex items-center gap-2">
          <Label className="font-bold">Risk Level</Label>
          <Badge variant={riskLevelVariants[currentItem?.riskLabel ?? ""]}>
            {currentItem?.riskLabel}
          </Badge>
        </div>
        <div className="flex flex-col ">
          <Label className={"font-bold"}>Share your insights</Label>
          <Textarea
            placeholder="Share your insights"
            className="min-h-40"
            onChange={(e) => setFormData({ ...formData, insights: e.target.value })}
          />
        </div>
        <div>
          <CustomDropZone
            fileTypes={["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx"]}
            className=""
            handleChange={handleFileChange}
            file={file}
            loading={uploading}
            disabled={uploading}
            url={fileUrl}
            setFile={setFile}
          />
        </div>
        <DialogFooter>
          <Button className={"w-full"} onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
