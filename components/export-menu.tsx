"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SearchFilters } from "@/lib/types";

interface ExportMenuProps {
  search: string;
  filters: SearchFilters;
  searchId: string | null;
  selectedIds: string[];
}

function buildParams({
  search,
  filters,
  searchId,
  format,
  ids,
}: ExportMenuProps & { format: "csv" | "xlsx"; ids?: string[] }): string {
  const sp = new URLSearchParams();
  sp.set("format", format);
  if (ids && ids.length > 0) {
    sp.set("ids", ids.join(","));
    return sp.toString();
  }
  if (search) sp.set("search", search);
  if (searchId) sp.set("searchId", searchId);
  if (filters.minRating != null) sp.set("minRating", String(filters.minRating));
  if (filters.maxRating != null) sp.set("maxRating", String(filters.maxRating));
  if (filters.minReviews != null)
    sp.set("minReviews", String(filters.minReviews));
  if (filters.maxReviews != null)
    sp.set("maxReviews", String(filters.maxReviews));
  if (filters.hasWebsite != null) sp.set("hasWebsite", String(filters.hasWebsite));
  if (filters.hasEmail != null) sp.set("hasEmail", String(filters.hasEmail));
  if (filters.hasSocial != null) sp.set("hasSocial", String(filters.hasSocial));
  if (filters.hasWhatsapp != null) sp.set("hasWhatsapp", String(filters.hasWhatsapp));
  if (filters.socialPlatforms?.length)
    sp.set("socialPlatforms", filters.socialPlatforms.join(","));
  if (filters.businessStatus?.length)
    sp.set("businessStatus", filters.businessStatus.join(","));
  if (filters.status?.length) sp.set("status", filters.status.join(","));
  if (filters.businessSizeEstimate?.length)
    sp.set("businessSizeEstimate", filters.businessSizeEstimate.join(","));
  if (filters.favourite != null) sp.set("favourite", String(filters.favourite));
  if (filters.archived != null) sp.set("archived", String(filters.archived));
  return sp.toString();
}

export function ExportMenu(props: ExportMenuProps) {
  function download(format: "csv" | "xlsx", selectedOnly: boolean) {
    const params = buildParams({
      ...props,
      format,
      ids: selectedOnly ? props.selectedIds : undefined,
    });
    window.location.href = `/api/leads/export?${params}`;
  }

  const hasSelection = props.selectedIds.length > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Download className="h-3.5 w-3.5" /> Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Filtered view</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => download("csv", false)}>
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => download("xlsx", false)}>
          Export as XLSX
        </DropdownMenuItem>
        {hasSelection && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>
              Selected ({props.selectedIds.length})
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => download("csv", true)}>
              Export selected as CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => download("xlsx", true)}>
              Export selected as XLSX
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
