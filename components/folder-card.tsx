"use client";

import { formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  Folder,
  Pause,
  Play,
  RotateCw,
  Square,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import {
  useCancelSearch,
  useDeleteSearch,
  usePauseSearch,
  useRerunSearch,
  useResumeSearch,
} from "@/hooks/use-searches";
import type { SearchDTO } from "@/lib/types";

const STATUS_VARIANT: Record<
  SearchDTO["jobStatus"],
  "outline" | "secondary" | "success" | "destructive" | "warning"
> = {
  pending: "outline",
  running: "secondary",
  paused: "warning",
  completed: "success",
  failed: "destructive",
  cancelled: "outline",
};

const SEARCH_MODE_LABELS: Record<string, string> = {
  category: "Category",
  keyword: "Keyword",
};

function formatDuration(ms: number | null): string {
  if (ms == null) return "";
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}m ${rest}s`;
}

interface FolderCardProps {
  search: SearchDTO;
  onOpen: (searchId: string) => void;
}

export function FolderCard({ search, onOpen }: FolderCardProps) {
  const rerun = useRerunSearch();
  const del = useDeleteSearch();
  const pause = usePauseSearch();
  const resume = useResumeSearch();
  const cancel = useCancelSearch();

  const isRunning = search.jobStatus === "running";
  const isPaused = search.jobStatus === "paused";

  return (
    <Card
      className="cursor-pointer transition-colors hover:border-primary/50"
      onClick={() => onOpen(search.id)}
    >
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2">
            <Folder className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="truncate font-medium">{search.keyword}</p>
              <p className="truncate text-xs text-muted-foreground">
                {search.location} · {(search.radius / 1000).toFixed(0)} km ·{" "}
                {SEARCH_MODE_LABELS[search.searchMode]}
              </p>
            </div>
          </div>
          <Badge variant={STATUS_VARIANT[search.jobStatus]}>{search.jobStatus}</Badge>
        </div>

        {(isRunning || isPaused) && (
          <Progress value={search.jobProgress} className="h-1.5" />
        )}

        {search.jobStatus === "failed" && search.jobError && (
          <p className="flex items-start gap-1 text-xs text-destructive">
            <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" /> {search.jobError}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {search.leadCount} leads
            {search.duplicateCount > 0 &&
              ` · ${search.duplicateCount} duplicate${search.duplicateCount === 1 ? "" : "s"} skipped`}
            {search.failedCount > 0 && ` · ${search.failedCount} failed`}
            {search.durationMs != null && ` · ${formatDuration(search.durationMs)}`}
          </span>
          <span>
            {formatDistanceToNow(new Date(search.createdAt), { addSuffix: true })}
          </span>
        </div>

        <div
          className="flex flex-wrap items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          {isRunning && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-xs"
              disabled={pause.isPending}
              onClick={() => pause.mutate(search.id)}
            >
              <Pause className="h-3 w-3" /> Pause
            </Button>
          )}
          {isPaused && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-xs"
              disabled={resume.isPending}
              onClick={() => resume.mutate(search.id)}
            >
              <Play className="h-3 w-3" /> Resume
            </Button>
          )}
          {(isRunning || isPaused) && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-xs"
              disabled={cancel.isPending}
              onClick={() => cancel.mutate(search.id)}
            >
              <Square className="h-3 w-3" /> Cancel
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs"
            disabled={rerun.isPending}
            onClick={() => rerun.mutate(search.id)}
          >
            <RotateCw className="h-3 w-3" /> Re-run
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
            disabled={del.isPending}
            onClick={() => {
              if (confirm("Delete this search folder? Its leads remain but lose the folder association.")) {
                del.mutate(search.id);
              }
            }}
          >
            <Trash2 className="h-3 w-3" /> Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
