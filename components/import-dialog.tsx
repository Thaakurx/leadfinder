"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  commitImport,
  previewImportFile,
  type ImportRow,
} from "@/lib/api-client";

const TARGET_FIELDS: { key: keyof ImportRow; label: string; required?: boolean }[] = [
  { key: "name", label: "Business name", required: true },
  { key: "phone", label: "Phone" },
  { key: "website", label: "Website" },
  { key: "email", label: "Email" },
  { key: "category", label: "Category" },
  { key: "rating", label: "Rating" },
  { key: "reviewCount", label: "Review count" },
  { key: "address", label: "Address" },
  { key: "notes", label: "Notes" },
  { key: "placeId", label: "Place ID (Google, optional)" },
];
// Auto-map fields in this priority order rather than TARGET_FIELDS' display
// order: narrower, less ambiguous signals (email, website, phone) should
// claim their header before broader ones (address, notes) get a chance —
// otherwise "Email Address" satisfies the substring match for "address"
// before "email" ever looks at it.
const AUTO_MAP_PRIORITY: (keyof ImportRow)[] = [
  "placeId",
  "email",
  "website",
  "phone",
  "reviewCount",
  "rating",
  "name",
  "category",
  "address",
  "notes",
];

const NONE = "__none__";

export function ImportDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<"upload" | "map" | "result">("upload");
  const [loading, setLoading] = React.useState(false);
  const [headers, setHeaders] = React.useState<string[]>([]);
  const [rows, setRows] = React.useState<Record<string, string>[]>([]);
  const [truncated, setTruncated] = React.useState(false);
  const [mapping, setMapping] = React.useState<Record<string, string>>({});
  const [result, setResult] = React.useState<{
    created: number;
    updated: number;
    skipped: number;
    errors: string[];
  } | null>(null);

  function reset() {
    setStep("upload");
    setHeaders([]);
    setRows([]);
    setMapping({});
    setResult(null);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const preview = await previewImportFile(file);
      setHeaders(preview.headers);
      setRows(preview.rows);
      setTruncated(preview.truncated);

      // Best-effort auto-mapping by header name. Each header can only be
      // claimed by one field, and priority order matters — see
      // AUTO_MAP_PRIORITY's comment for why (e.g. "Email Address" shouldn't
      // be grabbed by "address" before "email" gets a look).
      const auto: Record<string, string> = {};
      const usedHeaders = new Set<string>();
      for (const key of AUTO_MAP_PRIORITY) {
        const match = preview.headers.find(
          (h) =>
            !usedHeaders.has(h) &&
            h.toLowerCase().replace(/[^a-z]/g, "").includes(key.toLowerCase())
        );
        if (match) {
          auto[key] = match;
          usedHeaders.add(match);
        }
      }
      setMapping(auto);
      setStep("map");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to read file");
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  }

  function mapRow(row: Record<string, string>): ImportRow | null {
    const nameCol = mapping.name;
    const name = nameCol ? row[nameCol]?.trim() : "";
    if (!name) return null;

    const get = (key: string) => (mapping[key] ? row[mapping[key]]?.trim() : "");
    const ratingStr = get("rating");
    const reviewCountStr = get("reviewCount");

    return {
      name,
      placeId: get("placeId") || undefined,
      phone: get("phone") || undefined,
      website: get("website") || undefined,
      address: get("address") || undefined,
      category: get("category") || undefined,
      email: get("email") || undefined,
      notes: get("notes") || undefined,
      rating: ratingStr ? Number(ratingStr) : undefined,
      reviewCount: reviewCountStr ? Number(reviewCountStr) : undefined,
    };
  }

  async function handleCommit() {
    const mapped = rows.map(mapRow).filter((r): r is ImportRow => r !== null);
    if (mapped.length === 0) {
      toast.error("Map at least the business name column, and ensure rows have a name.");
      return;
    }
    setLoading(true);
    try {
      const res = await commitImport(mapped);
      setResult(res);
      setStep("result");
      qc.invalidateQueries({ queryKey: ["leads"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }

  const previewRows = rows.slice(0, 5);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Upload className="h-3.5 w-3.5" /> Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import leads</DialogTitle>
          <DialogDescription>
            Upload a CSV or XLSX file of existing leads. They&apos;ll be
            merged with your current leads, deduplicated by Place ID, phone,
            or website domain.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-3">
            <Label htmlFor="import-file">CSV or XLSX file</Label>
            <Input
              id="import-file"
              type="file"
              accept=".csv,.xlsx,.xlsm"
              onChange={handleFile}
              disabled={loading}
            />
            {loading && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        )}

        {step === "map" && (
          <div className="space-y-4">
            {truncated && (
              <p className="text-xs text-amber-600">
                File has more than 5,000 rows — only the first 5,000 will be
                imported.
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              {TARGET_FIELDS.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <Label className="text-xs">
                    {field.label}
                    {field.required && " *"}
                  </Label>
                  <Select
                    value={mapping[field.key] ?? NONE}
                    onValueChange={(v) =>
                      setMapping((m) => ({
                        ...m,
                        [field.key]: v === NONE ? "" : v,
                      }))
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Not mapped" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Not mapped</SelectItem>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Preview ({rows.length} row(s) detected)
              </Label>
              <div className="max-h-56 overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {TARGET_FIELDS.filter((f) => mapping[f.key]).map((f) => (
                        <TableHead key={f.key}>{f.label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.map((row, i) => {
                      const mapped = mapRow(row);
                      return (
                        <TableRow key={i}>
                          {TARGET_FIELDS.filter((f) => mapping[f.key]).map(
                            (f) => (
                              <TableCell key={f.key} className="text-xs">
                                {mapped ? String(mapped[f.key] ?? "") : ""}
                              </TableCell>
                            )
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}

        {step === "result" && result && (
          <div className="space-y-2 text-sm">
            <p>Created: {result.created}</p>
            <p>Updated: {result.updated}</p>
            <p>Skipped: {result.skipped}</p>
            {result.errors.length > 0 && (
              <div className="max-h-32 overflow-auto rounded-md border bg-muted/40 p-2 text-xs text-muted-foreground">
                {result.errors.map((e, i) => (
                  <p key={i}>{e}</p>
                ))}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {step === "map" && (
            <>
              <Button variant="outline" onClick={reset} disabled={loading}>
                Back
              </Button>
              <Button
                onClick={handleCommit}
                disabled={loading || !mapping.name}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  `Import ${rows.length} row(s)`
                )}
              </Button>
            </>
          )}
          {step === "result" && (
            <Button onClick={() => setOpen(false)}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
