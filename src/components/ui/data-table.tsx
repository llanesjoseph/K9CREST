"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Search, Filter, Download, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LoadingSkeleton } from "@/components/ui/loading";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: keyof T;
  title: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  width?: string;
  align?: "left" | "center" | "right";
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  title?: string;
  loading?: boolean;
  searchable?: boolean;
  exportable?: boolean;
  actions?: (row: T) => React.ReactNode;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  className?: string;
}

type SortOrder = "asc" | "desc" | null;

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  title,
  loading = false,
  searchable = true,
  exportable = false,
  actions,
  onRowClick,
  emptyMessage = "No data available",
  className,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<keyof T | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter and sort data
  const processedData = useMemo(() => {
    let filtered = data;

    // Search filtering
    if (searchTerm) {
      filtered = data.filter((row) =>
        columns.some((column) => {
          if (!column.filterable && !searchable) return false;
          const value = row[column.key];
          return String(value).toLowerCase().includes(searchTerm.toLowerCase());
        })
      );
    }

    // Sorting
    if (sortColumn && sortOrder) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortColumn];
        const bValue = b[sortColumn];

        if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
        if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [data, searchTerm, sortColumn, sortOrder, columns, searchable]);

  // Pagination
  const totalPages = Math.ceil(processedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = processedData.slice(startIndex, startIndex + itemsPerPage);

  const handleSort = (column: keyof T) => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : sortOrder === "desc" ? null : "asc");
      if (sortOrder === "desc") setSortColumn(null);
    } else {
      setSortColumn(column);
      setSortOrder("asc");
    }
  };

  const exportToCSV = () => {
    const headers = columns.map((col) => col.title).join(",");
    const rows = processedData
      .map((row) =>
        columns
          .map((col) => {
            const value = row[col.key];
            return typeof value === "string" ? `"${value}"` : String(value);
          })
          .join(",")
      )
      .join("\n");

    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "data"}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Card className={className}>
        {title && (
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <LoadingSkeleton className="h-4 w-8" />
                <LoadingSkeleton className="h-4 flex-1" />
                <LoadingSkeleton className="h-4 w-20" />
                <LoadingSkeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {(title || searchable || exportable) && (
        <CardHeader>
          <div className="flex items-center justify-between">
            {title && <CardTitle>{title}</CardTitle>}
            <div className="flex items-center gap-2">
              {searchable && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
              )}
              {exportable && (
                <Button onClick={exportToCSV} variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      )}

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                {columns.map((column) => (
                  <th
                    key={String(column.key)}
                    className={cn(
                      "px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider",
                      column.align === "center" && "text-center",
                      column.align === "right" && "text-right",
                      column.sortable && "cursor-pointer hover:text-slate-700 dark:hover:text-slate-300"
                    )}
                    style={{ width: column.width }}
                    onClick={() => column.sortable && handleSort(column.key)}
                  >
                    <div className="flex items-center gap-1">
                      {column.title}
                      {column.sortable && sortColumn === column.key && (
                        <span className="text-blue-600">
                          {sortOrder === "asc" ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
                {actions && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (actions ? 1 : 0)}
                    className="px-6 py-12 text-center text-slate-500 dark:text-slate-400"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, index) => (
                  <tr
                    key={index}
                    className={cn(
                      "hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors",
                      onRowClick && "cursor-pointer"
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {columns.map((column) => (
                      <td
                        key={String(column.key)}
                        className={cn(
                          "px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100",
                          column.align === "center" && "text-center",
                          column.align === "right" && "text-right"
                        )}
                      >
                        {column.render ? column.render(row[column.key], row) : String(row[column.key])}
                      </td>
                    ))}
                    {actions && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {actions(row)}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-700 dark:text-slate-300">
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, processedData.length)} of{" "}
              {processedData.length} results
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                variant="outline"
                size="sm"
              >
                Previous
              </Button>
              <span className="text-sm text-slate-700 dark:text-slate-300">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                variant="outline"
                size="sm"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}