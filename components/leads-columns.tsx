"use client";

import type { ReactNode } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Contact,
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  MessageCircle,
  Star,
  Youtube,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LEAD_STATUSES, type LeadDTO, type LeadStatus } from "@/lib/types";
import { cn, formatPriceLevel, whatsappLink } from "@/lib/utils";

const ENRICHMENT_BADGE: Record<
  LeadDTO["enrichmentStatus"],
  { label: string; variant: "secondary" | "outline" | "success" | "warning" | "destructive" }
> = {
  pending: { label: "Pending", variant: "outline" },
  running: { label: "Crawling…", variant: "secondary" },
  found: { label: "Found", variant: "success" },
  not_found: { label: "Not found", variant: "warning" },
  failed: { label: "Failed", variant: "destructive" },
};

const STATUS_BADGE: Record<string, string> = {
  OPERATIONAL: "text-emerald-700 bg-emerald-50 border-emerald-200",
  CLOSED_TEMPORARILY: "text-amber-700 bg-amber-50 border-amber-200",
  CLOSED_PERMANENTLY: "text-red-700 bg-red-50 border-red-200",
};

export function buildLeadColumns(
  onStatusChange: (id: string, status: LeadStatus) => void,
  onToggleFavourite: (id: string, next: boolean) => void,
  pageOffset: number = 0
): ColumnDef<LeadDTO>[] {
  return [
    {
      id: "serial",
      header: "#",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {pageOffset + row.index + 1}
        </span>
      ),
      enableSorting: false,
      enableHiding: false,
      size: 40,
    },
    {
      id: "favourite",
      header: "",
      cell: ({ row }) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavourite(row.original.id, !row.original.favourite);
          }}
          aria-label="Toggle favourite"
          className="text-muted-foreground hover:text-amber-500"
        >
          <Star
            className={cn(
              "h-4 w-4",
              row.original.favourite && "fill-amber-400 text-amber-400"
            )}
          />
        </button>
      ),
      enableSorting: false,
      size: 32,
    },
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(v) => row.toggleSelected(!!v)}
          onClick={(e) => e.stopPropagation()}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 32,
    },
    {
      accessorKey: "name",
      header: "Business",
      cell: ({ row }) => (
        <div className="max-w-[220px]">
          <div className="truncate font-medium">{row.original.name}</div>
          {row.original.primaryType && (
            <div className="truncate text-xs text-muted-foreground">
              {row.original.primaryType.replaceAll("_", " ")}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: "address",
      header: "Address",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="max-w-[220px] truncate text-sm">
          {row.original.address ?? "—"}
        </div>
      ),
    },
    {
      accessorKey: "phone",
      header: "Phone",
      enableSorting: false,
      cell: ({ row }) => {
        const { phone, hasWhatsapp } = row.original;
        if (!phone) return "—";
        const noWhatsapp = hasWhatsapp === false;
        return (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(phone);
                toast.success("Number copied");
              }}
              title="Click to copy"
              className="truncate text-left hover:underline"
            >
              {phone}
            </button>
            <a
              href={noWhatsapp ? `tel:${phone}` : whatsappLink(phone)}
              target={noWhatsapp ? undefined : "_blank"}
              rel={noWhatsapp ? undefined : "noopener noreferrer"}
              onClick={(e) => e.stopPropagation()}
              aria-label={noWhatsapp ? "Call (no WhatsApp)" : "Message on WhatsApp"}
              title={noWhatsapp ? "Marked as no WhatsApp — call instead" : "Message on WhatsApp"}
              className={cn(
                "shrink-0",
                noWhatsapp
                  ? "text-muted-foreground hover:text-foreground"
                  : "text-emerald-600 hover:text-emerald-700"
              )}
            >
              {noWhatsapp ? (
                <Contact className="h-3.5 w-3.5" />
              ) : (
                <MessageCircle className="h-3.5 w-3.5" />
              )}
            </a>
          </div>
        );
      },
    },
    {
      accessorKey: "website",
      header: "Website",
      enableSorting: false,
      cell: ({ row }) =>
        row.original.website ? (
          <a
            href={row.original.website}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="max-w-[160px] truncate text-blue-600 hover:underline block"
          >
            {row.original.website.replace(/^https?:\/\//, "")}
          </a>
        ) : (
          "—"
        ),
    },
    {
      accessorKey: "rating",
      header: "Rating",
      cell: ({ row }) => {
        const { rating, reviewCount } = row.original;
        if (rating == null) return "—";
        return (
          <div className="flex items-center gap-1 text-sm">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            {rating.toFixed(1)}
            <span className="text-muted-foreground">
              ({reviewCount ?? 0})
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "priceLevel",
      header: "Price",
      enableSorting: false,
      cell: ({ row }) => formatPriceLevel(row.original.priceLevel) ?? "—",
    },
    {
      id: "openingHours",
      header: "Hours",
      enableSorting: false,
      cell: ({ row }) => {
        const hours = row.original.openingHours;
        if (!hours || hours.length === 0) return "—";
        return (
          <span
            className="block max-w-[160px] truncate text-sm"
            title={hours.join("\n")}
          >
            {hours[0]}
          </span>
        );
      },
    },
    {
      accessorKey: "businessStatus",
      header: "Status (Google)",
      cell: ({ row }) => {
        const status = row.original.businessStatus;
        if (!status) return "—";
        return (
          <span
            className={cn(
              "inline-flex rounded-full border px-2 py-0.5 text-xs",
              STATUS_BADGE[status]
            )}
          >
            {status.replaceAll("_", " ").toLowerCase()}
          </span>
        );
      },
    },
    {
      accessorKey: "emails",
      header: "Email",
      enableSorting: false,
      cell: ({ row }) => {
        const emails = row.original.emails;
        if (emails.length === 0) return "—";
        return (
          <div className="flex items-center gap-1 text-sm">
            <a
              href={`mailto:${emails[0]}`}
              onClick={(e) => e.stopPropagation()}
              title="Send email"
              className="flex min-w-0 items-center gap-1 text-blue-600 hover:underline"
            >
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="max-w-[160px] truncate">{emails[0]}</span>
            </a>
            {emails.length > 1 && (
              <span className="text-xs text-muted-foreground">
                +{emails.length - 1}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "socialLinks",
      header: "Social",
      enableSorting: false,
      cell: ({ row }) => {
        const s = row.original.socialLinks;
        const icons: ReactNode[] = [];
        if (s.facebook) icons.push(<Facebook key="fb" className="h-3.5 w-3.5" />);
        if (s.instagram)
          icons.push(<Instagram key="ig" className="h-3.5 w-3.5" />);
        if (s.linkedin)
          icons.push(<Linkedin key="li" className="h-3.5 w-3.5" />);
        if (s.youtube) icons.push(<Youtube key="yt" className="h-3.5 w-3.5" />);
        if (s.whatsapp)
          icons.push(<MessageCircle key="wa" className="h-3.5 w-3.5" />);
        if (icons.length === 0) return "—";
        return <div className="flex items-center gap-1.5">{icons}</div>;
      },
    },
    {
      id: "tags",
      header: "Tags",
      enableSorting: false,
      cell: ({ row }) => {
        const tags = row.original.tags;
        if (tags.length === 0) return "—";
        return (
          <div className="flex max-w-[160px] flex-wrap gap-1">
            {tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px]">
                {tag}
              </Badge>
            ))}
            {tags.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{tags.length - 3}
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "businessSizeEstimate",
      header: "Size (est.)",
      enableSorting: false,
      cell: ({ row }) => row.original.businessSizeEstimate ?? "—",
    },
    {
      accessorKey: "assignedTo",
      header: "Assigned To",
      enableSorting: false,
      cell: ({ row }) => row.original.assignedTo ?? "—",
    },
    {
      accessorKey: "enrichmentStatus",
      header: "Enrichment",
      cell: ({ row }) => {
        const badge = ENRICHMENT_BADGE[row.original.enrichmentStatus];
        return <Badge variant={badge.variant}>{badge.label}</Badge>;
      },
    },
    {
      accessorKey: "status",
      header: "Lead status",
      cell: ({ row }) => (
        <Select
          value={row.original.status}
          onValueChange={(v) => onStatusChange(row.original.id, v as LeadStatus)}
        >
          <SelectTrigger
            className="h-7 w-[110px] text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent onClick={(e) => e.stopPropagation()}>
            {LEAD_STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Date added",
      cell: ({ row }) => format(new Date(row.original.createdAt), "MMM d, yyyy"),
    },
  ];
}
