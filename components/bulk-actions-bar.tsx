"use client";

import * as React from "react";
import { Archive, Loader2, Sparkles, Star, Tag as TagIcon, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/types";
import {
  useBulkDeleteLeads,
  useBulkUpdateLeads,
  useRunEnrichment,
} from "@/hooks/use-leads";

interface BulkActionsBarProps {
  selectedIds: string[];
  onExportSelected: () => void;
  onClearSelection: () => void;
}

export function BulkActionsBar({
  selectedIds,
  onExportSelected,
  onClearSelection,
}: BulkActionsBarProps) {
  const bulkUpdate = useBulkUpdateLeads();
  const bulkDelete = useBulkDeleteLeads();
  const runEnrichment = useRunEnrichment();
  const [assignValue, setAssignValue] = React.useState("");
  const [tagValue, setTagValue] = React.useState("");

  if (selectedIds.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2">
      <span className="text-sm font-medium">
        {selectedIds.length} selected
      </span>

      <Select
        onValueChange={(status) =>
          bulkUpdate.mutate({ ids: selectedIds, status: status as LeadStatus })
        }
      >
        <SelectTrigger className="h-8 w-[150px] text-xs">
          <SelectValue placeholder="Set status…" />
        </SelectTrigger>
        <SelectContent>
          {LEAD_STATUSES.map((s) => (
            <SelectItem key={s} value={s} className="capitalize">
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        disabled={bulkUpdate.isPending}
        onClick={() => bulkUpdate.mutate({ ids: selectedIds, favourite: true })}
      >
        <Star className="h-3.5 w-3.5" /> Favourite
      </Button>

      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        disabled={bulkUpdate.isPending}
        onClick={() => {
          if (confirm(`Archive ${selectedIds.length} lead(s)? They'll be hidden from the default view.`)) {
            bulkUpdate.mutate({ ids: selectedIds, archived: true }, { onSuccess: onClearSelection });
          }
        }}
      >
        <Archive className="h-3.5 w-3.5" /> Archive
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <UserPlus className="h-3.5 w-3.5" /> Assign
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 space-y-2">
          <Input
            placeholder="Salesperson name"
            value={assignValue}
            onChange={(e) => setAssignValue(e.target.value)}
          />
          <Button
            size="sm"
            className="w-full"
            disabled={!assignValue.trim() || bulkUpdate.isPending}
            onClick={() =>
              bulkUpdate.mutate({ ids: selectedIds, assignedTo: assignValue.trim() })
            }
          >
            Assign
          </Button>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <TagIcon className="h-3.5 w-3.5" /> Tag
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 space-y-2">
          <Input
            placeholder="tag1, tag2"
            value={tagValue}
            onChange={(e) => setTagValue(e.target.value)}
          />
          <Button
            size="sm"
            className="w-full"
            disabled={!tagValue.trim() || bulkUpdate.isPending}
            onClick={() =>
              bulkUpdate.mutate({
                ids: selectedIds,
                addTags: tagValue.split(",").map((t) => t.trim()).filter(Boolean),
              })
            }
          >
            Add tags
          </Button>
        </PopoverContent>
      </Popover>

      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        disabled={runEnrichment.isPending}
        onClick={() =>
          runEnrichment.mutate({ leadIds: selectedIds, force: true })
        }
      >
        {runEnrichment.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" />
        )}
        Re-scrape
      </Button>

      <Button variant="outline" size="sm" onClick={onExportSelected}>
        Export selected
      </Button>

      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-destructive hover:text-destructive"
        disabled={bulkDelete.isPending}
        onClick={() => {
          if (confirm(`Delete ${selectedIds.length} lead(s)? This cannot be undone.`)) {
            bulkDelete.mutate(selectedIds, { onSuccess: onClearSelection });
          }
        }}
      >
        {bulkDelete.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
        Delete
      </Button>

      <Button variant="ghost" size="sm" onClick={onClearSelection}>
        Clear
      </Button>
    </div>
  );
}
