"use client";

import { Layers, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { FolderCard } from "@/components/folder-card";
import { useSearches } from "@/hooks/use-searches";

interface FoldersGridProps {
  onOpenFolder: (searchId: string) => void;
  onOpenAllLeads: () => void;
}

export function FoldersGrid({ onOpenFolder, onOpenAllLeads }: FoldersGridProps) {
  const { data, isLoading } = useSearches();
  const searches = data?.searches ?? [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Card
        className="cursor-pointer border-dashed transition-colors hover:border-primary/50"
        onClick={onOpenAllLeads}
      >
        <CardContent className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
          <Layers className="h-6 w-6 text-muted-foreground" />
          <p className="font-medium">All Leads</p>
          <p className="text-xs text-muted-foreground">
            Browse every lead across all searches and imports
          </p>
        </CardContent>
      </Card>

      {searches.map((search) => (
        <FolderCard key={search.id} search={search} onOpen={onOpenFolder} />
      ))}

      {searches.length === 0 && (
        <p className="col-span-full py-6 text-center text-sm text-muted-foreground">
          No searches yet — run one from the panel on the left to create your
          first folder.
        </p>
      )}
    </div>
  );
}
