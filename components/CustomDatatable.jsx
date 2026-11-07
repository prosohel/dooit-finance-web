"use client";
import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export default function CustomDatatable({
  data = [],
  columns = [],
  onDoubleClick,
}) {
  const handleDoubleClick = (row) => {
    if (onDoubleClick) {
      onDoubleClick(row);
    }
  };
  return (
    <>
      <div className="overflow-hidden rounded-lg border border-dashed border-neutral-200">
        <Table className={"text-xs"}>
          <TableHeader className="bg-neutral-50/70">
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  className={"font-semibold "}
                  key={column.accessorKey}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, rowIndex) => (
              <TableRow
                key={row.id || rowIndex}
                onDoubleClick={() => handleDoubleClick(row)}
              >
                {columns.map((item, itemIndex) => (
                  <TableCell key={item.id || itemIndex}>
                    {item.cell
                      ? item.cell(row, rowIndex)
                      : row[item.accessorKey]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {/* <div className="flex justify-end ">
        <Pagination className={"justify-end"}>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#" />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#">1</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#" isActive>
                2
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#">3</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext href="#" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div> */}
    </>
  );
}
