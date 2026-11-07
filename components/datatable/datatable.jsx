"use client";

import React, {
  useMemo,
  useCallback,
  useRef,
  useEffect,
  useState,
} from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  useReactTable,
} from "@tanstack/react-table";
import { AlertCircle } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// import { DataTablePagination } from "./pagination";
// import { DataTableToolbar } from "./toolbar";
import { useTableConfig } from "./utils/table-config";
import { DataTableResizer } from "./data-table-resizer";
// import {
//   createColumnFiltersHandler,
//   createColumnVisibilityHandler,
//   // createSortingState,
// } from "./utils/table-state-handlers";
import {
  initializeColumnSizes,
  trackColumnResizing,
  cleanupColumnResizing,
} from "./utils/column-sizing";
// import { createKeyboardNavigationHandler } from "./utils/keyboard-navigation";
import { useTableColumnResize } from "../hooks/use-table-column.resize";

export default function DataTable2({
  config = {},
  columns: initialColumns = [],
  exportConfig,
  idField = "id",
  data = [],
  pagination: paginationInfo,
  pageSizeOptions,
  renderToolbarContent,
  onRowClick,
}) {
  const tableConfig = useTableConfig(config);
  const tableId = tableConfig.columnResizingTableId || "data-table-default";
  const { columnSizing, setColumnSizing, resetColumnSizing } =
    useTableColumnResize(tableId, true);

  const [sorting, setSorting] = useState();
  // createSortingState(
  //   tableConfig.defaultSortBy || "id",
  //   tableConfig.defaultSortOrder || "desc"
  // )
  const [columnVisibility, setColumnVisibility] = useState({});
  const [columnFilters, setColumnFilters] = useState([]);
  const [columnOrder, setColumnOrder] = useState([]);
  const [rowSelection, setRowSelection] = useState({});
  const [pageSize, setPageSize] = useState(paginationInfo?.limit || 10);
  const [pageIndex, setPageIndex] = useState((paginationInfo?.page || 1) - 1);
  const [selectedItemIds, setSelectedItemIds] = useState({});
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState(null);

  const tableContainerRef = useRef(null);

  const columns = useMemo(() => {
    return initialColumns;
  }, [initialColumns]);

  const handleSortingChange = useCallback(
    (updaterOrValue) => {
      const newSorting =
        typeof updaterOrValue === "function"
          ? updaterOrValue(sorting)
          : updaterOrValue;
      setSorting(newSorting);
    },
    [sorting]
  );

  const handleColumnFiltersChange = useCallback(
    // createColumnFiltersHandler(setColumnFilters),
    []
  );

  const handleColumnVisibilityChange = useCallback(
    // createColumnVisibilityHandler(setColumnVisibility),
    []
  );

  const handlePaginationChange = useCallback(
    (updaterOrValue) => {
      const newPagination =
        typeof updaterOrValue === "function"
          ? updaterOrValue({ pageIndex, pageSize })
          : updaterOrValue;
      setPageIndex(newPagination.pageIndex);
      setPageSize(newPagination.pageSize);
    },
    [pageIndex, pageSize]
  );

  const handleColumnSizingChange = useCallback(
    (updaterOrValue) => {
      console.log("updaterOrValue", updaterOrValue);
      if (typeof updaterOrValue === "function") {
        setColumnSizing((current) => updaterOrValue(current));
      } else {
        setColumnSizing(updaterOrValue);
      }
    },
    [setColumnSizing]
  );

  const handleColumnOrderChange = useCallback(
    (updaterOrValue) => {
      const newOrder =
        typeof updaterOrValue === "function"
          ? updaterOrValue(columnOrder)
          : updaterOrValue;
      setColumnOrder(newOrder);
    },
    [columnOrder]
  );

  const pagination = useMemo(
    () => ({
      pageIndex,
      pageSize,
    }),
    [pageIndex, pageSize]
  );

  const tableOptions = useMemo(
    () => ({
      data,
      columns,
      state: {
        sorting,
        columnVisibility,
        rowSelection,
        columnFilters,
        pagination,
        columnSizing,
        columnOrder,
      },
      columnResizeMode: "onChange",
      onColumnSizingChange: handleColumnSizingChange,
      onColumnOrderChange: handleColumnOrderChange,
      onRowSelectionChange: setRowSelection,
      onSortingChange: handleSortingChange,
      onColumnFiltersChange: handleColumnFiltersChange,
      onColumnVisibilityChange: handleColumnVisibilityChange,
      onPaginationChange: handlePaginationChange,
      getCoreRowModel: getCoreRowModel(),
      getFilteredRowModel: getFilteredRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      getSortedRowModel: getSortedRowModel(),
      getFacetedRowModel: getFacetedRowModel(),
      getFacetedUniqueValues: getFacetedUniqueValues(),
      manualPagination: true,
      manualSorting: true,
      pageCount: paginationInfo?.total_pages || 0,
    }),
    [
      data,
      columns,
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
      columnSizing,
      columnOrder,
      handleColumnSizingChange,
      handleColumnOrderChange,
      handleSortingChange,
      handleColumnFiltersChange,
      handleColumnVisibilityChange,
      handlePaginationChange,
      paginationInfo?.total_pages,
    ]
  );

  const table = useReactTable(tableOptions);

  const handleRowClickWrapper = useCallback(
    (e, rowData, rowIndex) => {
      const target = e.target;
      const isInteractive = target.closest(
        "button, a, input, select, textarea, [role='button'], [role='link']"
      );
      if (!isInteractive && onRowClick) onRowClick(rowData, rowIndex);
    },
    [onRowClick]
  );

  const handleKeyDown = useCallback(
    // createKeyboardNavigationHandler(table, onRowClick),
    [onRowClick]
  );

  useEffect(() => {
    initializeColumnSizes(columns, tableId, setColumnSizing);
  }, [columns, tableId, setColumnSizing]);

  // useEffect(() => {
  //   const isResizing = table
  //     .getHeaderGroups()
  //     .some((g) => g.headers.some((h) => h.column.getIsResizing()));
  //   trackColumnResizing(isResizing);
  //   return cleanupColumnResizing;
  // }, [table]);
  useEffect(() => {
    const isResizingAny = table
      .getHeaderGroups()
      .some((headerGroup) =>
        headerGroup.headers.some((header) => header.column.getIsResizing())
      );
    console.log("isResizingAny", isResizingAny);

    trackColumnResizing(isResizingAny);

    // Cleanup on unmount
    return () => {
      cleanupColumnResizing();
    };
  }, [table]);

  if (isError) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error?.message || "Unknown error"}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* {tableConfig.enableToolbar && (
        <DataTableToolbar
          table={table}
          config={tableConfig}
          resetColumnSizing={resetColumnSizing}
          entityName={exportConfig.entityName}
          columnMapping={exportConfig.columnMapping}
          columnWidths={exportConfig.columnWidths}
          headers={exportConfig.headers}
          transformFunction={exportConfig.transformFunction}
          customToolbarComponent={renderToolbarContent?.({})}
        />
      )} */}

      <div
        ref={tableContainerRef}
        className="overflow-y-auto rounded-lg border border-dashed border-neutral-200 table-container"
        onKeyDown={
          tableConfig.enableKeyboardNavigation ? handleKeyDown : undefined
        }
      >
        <Table
          className={tableConfig.enableColumnResizing ? "resizable-table" : ""}
        >
          <TableHeader className="bg-neutral-50/70">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{ width: header.getSize() }}
                    className="px-2 py-2 relative text-left group/th"
                    data-column-resizing={
                      header.column.getIsResizing() ? "true" : undefined
                    }
                    scope="col"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    {tableConfig.enableColumnResizing &&
                      header.column.getCanResize() && (
                        <DataTableResizer header={header} table={table} />
                      )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center py-8"
                >
                  No data available
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={(e) =>
                    handleRowClickWrapper(e, row.original, row.index)
                  }
                  tabIndex={0}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* <DataTablePagination table={table} pageSizeOptions={pageSizeOptions} /> */}
    </div>
  );
}
