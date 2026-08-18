"use client";

import * as React from "react";
import { Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useDuplicates, useMergeLeads } from "@/hooks/use-leads";

export function DuplicatesDialog() {
  const [open, setOpen] = React.useState(false);
  const { data, isLoading } = useDuplicates();
  const merge = useMergeLeads();

  const groups = data?.groups ?? [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Copy className="h-3.5 w-3.5" /> Duplicates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Possible duplicate leads</DialogTitle>
          <DialogDescription>
            Grouped by matching phone number or website domain. Pick which
            record to keep — the others merge into it (unioning emails,
            social links, and tags) and are deleted.
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
        )}

        {!isLoading && groups.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No duplicates found.
          </p>
        )}

        <div className="max-h-[60vh] space-y-4 overflow-y-auto">
          {groups.map((group) => (
            <div key={group.key} className="space-y-2 rounded-lg border p-3">
              <Badge variant="outline" className="text-[10px]">
                matched on {group.matchedOn}
              </Badge>
              {group.leads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{lead.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {lead.phone ?? lead.website ?? lead.address ?? ""}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={merge.isPending}
                    onClick={() =>
                      merge.mutate({
                        primaryId: lead.id,
                        duplicateIds: group.leads
                          .map((l) => l.id)
                          .filter((id) => id !== lead.id),
                      })
                    }
                  >
                    Keep this one
                  </Button>
                </div>
              ))}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
