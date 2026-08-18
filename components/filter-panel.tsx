"use client";

import * as React from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BUSINESS_SIZE_ESTIMATES,
  BUSINESS_STATUSES,
  LEAD_STATUSES,
  SOCIAL_PLATFORMS,
  type BusinessSizeEstimate,
  type SearchFilters,
  type SocialPlatform,
} from "@/lib/types";

const TRI_STATE_OPTIONS = [
  { value: "any", label: "Any" },
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
] as const;

function triState(value: boolean | undefined): string {
  if (value === true) return "true";
  if (value === false) return "false";
  return "any";
}

function fromTriState(value: string): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

interface FilterPanelProps {
  search: string;
  onSearchChange: (value: string) => void;
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  resultCount: number;
}

export function FilterPanel({
  search,
  onSearchChange,
  filters,
  onFiltersChange,
  resultCount,
}: FilterPanelProps) {
  const activeCount = countActiveFilters(filters);

  function update<K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) {
    onFiltersChange({ ...filters, [key]: value });
  }

  function toggleArrayValue<T extends string>(
    key: keyof SearchFilters,
    value: T
  ) {
    const current = (filters[key] as T[] | undefined) ?? [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    update(key, (next.length > 0 ? next : undefined) as SearchFilters[typeof key]);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Search name, address, phone, website…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="h-9 max-w-xs"
      />

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Filter className="h-3.5 w-3.5" />
            Filters
            {activeCount > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
                {activeCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Min rating</Label>
              <Input
                type="number"
                min={0}
                max={5}
                step={0.5}
                placeholder="e.g. 4"
                value={filters.minRating ?? ""}
                onChange={(e) =>
                  update(
                    "minRating",
                    e.target.value === "" ? undefined : Number(e.target.value)
                  )
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Max rating</Label>
              <Input
                type="number"
                min={0}
                max={5}
                step={0.5}
                placeholder="e.g. 5"
                value={filters.maxRating ?? ""}
                onChange={(e) =>
                  update(
                    "maxRating",
                    e.target.value === "" ? undefined : Number(e.target.value)
                  )
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Min reviews</Label>
              <Input
                type="number"
                min={0}
                placeholder="e.g. 10"
                value={filters.minReviews ?? ""}
                onChange={(e) =>
                  update(
                    "minReviews",
                    e.target.value === "" ? undefined : Number(e.target.value)
                  )
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Max reviews</Label>
              <Input
                type="number"
                min={0}
                placeholder="e.g. 500"
                value={filters.maxReviews ?? ""}
                onChange={(e) =>
                  update(
                    "maxReviews",
                    e.target.value === "" ? undefined : Number(e.target.value)
                  )
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <TriStateField
              label="Website"
              value={triState(filters.hasWebsite)}
              onChange={(v) => update("hasWebsite", fromTriState(v))}
            />
            <TriStateField
              label="Email found"
              value={triState(filters.hasEmail)}
              onChange={(v) => update("hasEmail", fromTriState(v))}
            />
            <TriStateField
              label="Social"
              value={triState(filters.hasSocial)}
              onChange={(v) => update("hasSocial", fromTriState(v))}
            />
            <TriStateField
              label="WhatsApp"
              value={triState(filters.hasWhatsapp)}
              onChange={(v) => update("hasWhatsapp", fromTriState(v))}
            />
          </div>

          {filters.hasSocial !== false && (
            <div className="space-y-1.5">
              <Label className="text-xs">Social platforms</Label>
              <div className="flex flex-wrap gap-2">
                {SOCIAL_PLATFORMS.map((platform) => (
                  <label
                    key={platform}
                    className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs capitalize"
                  >
                    <Checkbox
                      checked={(filters.socialPlatforms ?? []).includes(
                        platform
                      )}
                      onCheckedChange={() =>
                        toggleArrayValue<SocialPlatform>(
                          "socialPlatforms",
                          platform
                        )
                      }
                    />
                    {platform}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Business status</Label>
            <div className="flex flex-wrap gap-2">
              {BUSINESS_STATUSES.map((s) => (
                <label
                  key={s}
                  className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs"
                >
                  <Checkbox
                    checked={(filters.businessStatus ?? []).includes(s)}
                    onCheckedChange={() =>
                      toggleArrayValue("businessStatus", s)
                    }
                  />
                  {s.replaceAll("_", " ").toLowerCase()}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Lead status</Label>
            <div className="flex flex-wrap gap-2">
              {LEAD_STATUSES.map((s) => (
                <label
                  key={s}
                  className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs capitalize"
                >
                  <Checkbox
                    checked={(filters.status ?? []).includes(s)}
                    onCheckedChange={() => toggleArrayValue("status", s)}
                  />
                  {s}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Business size (estimate)</Label>
            <div className="flex flex-wrap gap-2">
              {BUSINESS_SIZE_ESTIMATES.map((s) => (
                <label
                  key={s}
                  className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs capitalize"
                >
                  <Checkbox
                    checked={(filters.businessSizeEstimate ?? []).includes(s)}
                    onCheckedChange={() =>
                      toggleArrayValue<BusinessSizeEstimate>("businessSizeEstimate", s)
                    }
                  />
                  {s}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <TriStateField
              label="Favourite"
              value={triState(filters.favourite)}
              onChange={(v) => update("favourite", fromTriState(v))}
            />
            <TriStateField
              label="Archived"
              value={triState(filters.archived)}
              onChange={(v) => update("archived", fromTriState(v))}
            />
          </div>

          {activeCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full gap-1.5"
              onClick={() => onFiltersChange({})}
            >
              <X className="h-3.5 w-3.5" /> Clear all filters
            </Button>
          )}
        </PopoverContent>
      </Popover>

      <span className="text-sm text-muted-foreground">
        {resultCount.toLocaleString()} result{resultCount === 1 ? "" : "s"}
      </span>
    </div>
  );
}

function TriStateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TRI_STATE_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function countActiveFilters(filters: SearchFilters): number {
  let count = 0;
  if (filters.minRating != null) count++;
  if (filters.maxRating != null) count++;
  if (filters.minReviews != null) count++;
  if (filters.maxReviews != null) count++;
  if (filters.hasWebsite != null) count++;
  if (filters.hasEmail != null) count++;
  if (filters.hasSocial != null) count++;
  if (filters.hasWhatsapp != null) count++;
  if (filters.socialPlatforms?.length) count++;
  if (filters.businessStatus?.length) count++;
  if (filters.status?.length) count++;
  if (filters.enrichmentStatus?.length) count++;
  if (filters.businessSizeEstimate?.length) count++;
  if (filters.favourite != null) count++;
  if (filters.archived != null) count++;
  return count;
}
