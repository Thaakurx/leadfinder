"use client";

import * as React from "react";
import { ChevronDown, Loader2, Search as SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { estimateSearchCost } from "@/lib/api-client";
import type { CostEstimate } from "@/lib/cost";
import { KNOWN_PLACE_TYPES } from "@/lib/google-place-types";
import {
  OPTIONAL_PLACE_FIELDS,
  type OpenClosedFilter,
  type OptionalPlaceField,
  type SearchMode,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { useCreateSearch } from "@/hooks/use-searches";

// Google's Places API (New) rejects any locationBias/locationRestriction
// circle above 50km, for every search mode — confirmed against the live API.
const MAX_RADIUS_KM = 50;
const RADIUS_PRESETS_KM = [1, 2, 5, 10, 20, 50] as const;
const MAX_LEADS_PRESETS = [10, 50, 100, 500, 1000, 5000] as const;
const UNLIMITED_CAP = 5000; // Practical cap — see README on Places API pagination limits.

const LANGUAGE_OPTIONS = [
  { value: "", label: "Default" },
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "pt", label: "Portuguese" },
  { value: "ar", label: "Arabic" },
  { value: "zh-CN", label: "Chinese" },
  { value: "ja", label: "Japanese" },
];

const SEARCH_MODE_LABELS: Record<SearchMode, string> = {
  category: "Category",
  keyword: "Keyword",
};

const FIELD_LABELS: Record<OptionalPlaceField, string> = {
  phone: "Phone number",
  website: "Website",
  rating: "Rating & reviews",
  hours: "Opening hours",
  priceLevel: "Price level",
};

export function SearchForm() {
  const [searchMode, setSearchMode] = React.useState<SearchMode>("keyword");
  const [category, setCategory] = React.useState("");
  const [keyword, setKeyword] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [radiusPreset, setRadiusPreset] = React.useState<string>("10");
  const [customRadiusKm, setCustomRadiusKm] = React.useState(10);
  const [maxLeadsPreset, setMaxLeadsPreset] = React.useState<string>("50");
  const [customMaxLeads, setCustomMaxLeads] = React.useState(50);
  const [language, setLanguage] = React.useState("");
  const [openClosed, setOpenClosed] = React.useState<OpenClosedFilter>("any");
  const [fields, setFields] = React.useState<OptionalPlaceField[]>([
    ...OPTIONAL_PLACE_FIELDS,
  ]);

  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [estimate, setEstimate] = React.useState<CostEstimate | null>(null);
  const [estimating, setEstimating] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);

  const createSearch = useCreateSearch();

  const effectiveKeyword = searchMode === "category" ? category : keyword;
  const radiusKm = radiusPreset === "custom" ? customRadiusKm : Number(radiusPreset);
  const maxLeads =
    maxLeadsPreset === "unlimited"
      ? UNLIMITED_CAP
      : maxLeadsPreset === "custom"
        ? customMaxLeads
        : Number(maxLeadsPreset);

  const canSubmit = effectiveKeyword.trim().length > 0 && location.trim().length > 0;
  const missingContactFields =
    !fields.includes("phone") || !fields.includes("website");

  function toggleField(field: OptionalPlaceField) {
    setFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  }

  async function handlePreview(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setEstimating(true);
    try {
      const result = await estimateSearchCost(
        effectiveKeyword.trim(),
        maxLeads,
        searchMode,
        fields
      );
      setEstimate(result);
      setConfirmOpen(true);
    } catch {
      setEstimate(null);
    } finally {
      setEstimating(false);
    }
  }

  function handleConfirm() {
    createSearch.mutate(
      {
        searchMode,
        keyword: effectiveKeyword.trim(),
        location: location.trim(),
        radiusKm,
        maxLeads,
        language: language || undefined,
        openClosed,
        fields,
      },
      {
        onSuccess: () => {
          setConfirmOpen(false);
          setCollapsed(true);
        },
      }
    );
  }

  return (
    <>
      <Card>
        <CardHeader
          className="flex-row items-start justify-between gap-2 space-y-0 cursor-pointer"
          onClick={() => setCollapsed((c) => !c)}
        >
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2 text-base">
              <SearchIcon className="h-4 w-4" /> New search
            </CardTitle>
            {!collapsed && (
              <CardDescription>
                Discover businesses via Google Places, then enrich them with
                emails and social links.
              </CardDescription>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            aria-label={collapsed ? "Expand new search" : "Collapse new search"}
            onClick={(e) => {
              e.stopPropagation();
              setCollapsed((c) => !c);
            }}
          >
            <ChevronDown
              className={cn("h-4 w-4 transition-transform", collapsed && "-rotate-90")}
            />
          </Button>
        </CardHeader>
        {!collapsed && (
          <CardContent>
            <form onSubmit={handlePreview} className="space-y-4">
              <Tabs value={searchMode} onValueChange={(v) => setSearchMode(v as SearchMode)}>
                <TabsList className="grid w-full grid-cols-2">
                  {(Object.keys(SEARCH_MODE_LABELS) as SearchMode[]).map((mode) => (
                    <TabsTrigger key={mode} value={mode} className="text-xs">
                      {SEARCH_MODE_LABELS[mode]}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              {searchMode === "category" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="category" className="text-xs text-muted-foreground">
                    Business category
                  </Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="e.g. dentist, restaurant, gym" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {KNOWN_PLACE_TYPES.map((type) => (
                        <SelectItem key={type} value={type} className="capitalize">
                          {type.replaceAll("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Uses Nearby Search — precise, but capped at 20 results and
                    50 km radius per run.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="keyword" className="text-xs text-muted-foreground">
                    Keyword
                  </Label>
                  <Input
                    id="keyword"
                    placeholder="e.g. emergency dentist, Joe's Pizza"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="location" className="text-xs text-muted-foreground">
                  Location
                </Label>
                <Input
                  id="location"
                  placeholder="Address, city, state, or zip code"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Radius</Label>
                  <Select value={radiusPreset} onValueChange={setRadiusPreset}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RADIUS_PRESETS_KM.map((km) => (
                        <SelectItem key={km} value={String(km)}>
                          {km} km
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  {radiusPreset === "custom" && (
                    <Input
                      type="number"
                      min={0.1}
                      max={MAX_RADIUS_KM}
                      step={0.5}
                      className="mt-1"
                      value={customRadiusKm}
                      onChange={(e) =>
                        setCustomRadiusKm(
                          Math.min(MAX_RADIUS_KM, Number(e.target.value) || 1)
                        )
                      }
                    />
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    Google Places API caps radius at 50 km.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Max leads</Label>
                  <Select value={maxLeadsPreset} onValueChange={setMaxLeadsPreset}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MAX_LEADS_PRESETS.map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}
                        </SelectItem>
                      ))}
                      <SelectItem value="unlimited">Unlimited</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  {maxLeadsPreset === "custom" && (
                    <Input
                      type="number"
                      min={1}
                      max={5000}
                      className="mt-1"
                      value={customMaxLeads}
                      onChange={(e) =>
                        setCustomMaxLeads(
                          Math.max(1, Math.min(5000, Number(e.target.value) || 1))
                        )
                      }
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Language</Label>
                  <Select
                    value={language || "default"}
                    onValueChange={(v) => setLanguage(v === "default" ? "" : v)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value || "default"} value={opt.value || "default"}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Business status</Label>
                  <Select
                    value={openClosed}
                    onValueChange={(v) => setOpenClosed(v as OpenClosedFilter)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Both</SelectItem>
                      <SelectItem value="open">Only Open</SelectItem>
                      <SelectItem value="closed">Only Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">
                    Fields to fetch
                  </Label>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-medium",
                      fields.length > 0
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-800"
                    )}
                  >
                    {fields.length > 0 ? "Enterprise rate" : "Essentials rate"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-md border p-3">
                  {OPTIONAL_PLACE_FIELDS.map((field) => (
                    <label
                      key={field}
                      className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={fields.includes(field)}
                        onCheckedChange={() => toggleField(field)}
                      />
                      {FIELD_LABELS[field]}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Name, address, location & category are always included, free.
                  Checking any field above bills the whole search at the
                  higher Enterprise rate — uncheck all of them to stay at the
                  cheaper Essentials rate.
                </p>
                {missingContactFields && (
                  <p className="text-xs text-amber-700">
                    Phone and/or website is unchecked — leads from this search
                    won't have WhatsApp messaging or website enrichment
                    (emails/social links) available.
                  </p>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Places API is billed per request — Max Leads limits request
                count, and the fields above determine the per-request rate.
              </p>

              <Button
                type="submit"
                className="w-full"
                disabled={!canSubmit || estimating}
              >
                {estimating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Preview cost & run search"
                )}
              </Button>
            </form>
          </CardContent>
        )}
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm search</DialogTitle>
            <DialogDescription>
              Review the estimated Google Places API cost before running
              this search.
            </DialogDescription>
          </DialogHeader>

          {estimate && (
            <div className="space-y-3 rounded-lg border bg-muted/40 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {SEARCH_MODE_LABELS[searchMode]}
                </span>
                <span className="font-medium">{effectiveKeyword}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Location</span>
                <span className="font-medium">
                  {location} ({radiusKm} km)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max leads</span>
                <span className="font-medium">
                  {maxLeadsPreset === "unlimited" ? "Unlimited (capped)" : maxLeads}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="shrink-0 text-muted-foreground">Fields</span>
                <span className="text-right font-medium">
                  {fields.length > 0
                    ? fields.map((f) => FIELD_LABELS[f]).join(", ")
                    : "Essentials only"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estimated requests</span>
                <span className="font-medium">{estimate.estimatedRequests}</span>
              </div>
              <div className="flex justify-between text-base">
                <span className="text-muted-foreground">Estimated cost</span>
                <span className="font-semibold">
                  ~${estimate.estimatedCostUsd.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{estimate.note}</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={createSearch.isPending}>
              {createSearch.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Run search"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
