"use client";

import * as React from "react";
import type { RowSelectionState, SortingState } from "@tanstack/react-table";
import { ArrowLeft, LogOut, PanelLeftClose, PanelLeftOpen, Sparkles } from "lucide-react";
import { SearchForm } from "@/components/search-form";
import { FoldersGrid } from "@/components/folders-grid";
import { FilterPanel } from "@/components/filter-panel";
import { LeadsTable } from "@/components/leads-table";
import { LeadDetailDrawer } from "@/components/lead-detail-drawer";
import { BulkActionsBar } from "@/components/bulk-actions-bar";
import { ImportDialog } from "@/components/import-dialog";
import { ExportMenu } from "@/components/export-menu";
import { DuplicatesDialog } from "@/components/duplicates-dialog";
import { TemplatesDialog } from "@/components/templates-dialog";
import { SettingsDialog } from "@/components/settings-dialog";
import { Button } from "@/components/ui/button";
import { useLeads, useRunEnrichment, useUpdateLead } from "@/hooks/use-leads";
import { useSearch } from "@/hooks/use-searches";
import type { LeadDTO, LeadStatus, SearchFilters } from "@/lib/types";

const PAGE_SIZE = 50;

type View = "folders" | "leads";

export default function Home() {
  const [view, setView] = React.useState<View>("folders");
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [filters, setFilters] = React.useState<SearchFilters>({});
  const [activeSearchId, setActiveSearchId] = React.useState<string | null>(null);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [selectedLead, setSelectedLead] = React.useState<LeadDTO | null>(null);
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const debouncedSearch = useDebouncedValue(search, 300);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters, activeSearchId, sorting]);

  const { data, isLoading, isError, error } = useLeads({
    page,
    pageSize: PAGE_SIZE,
    search: debouncedSearch || undefined,
    searchId: activeSearchId ?? undefined,
    filters,
    sortBy: sorting[0]?.id,
    sortDir: sorting[0] ? (sorting[0].desc ? "desc" : "asc") : undefined,
  });

  const { data: folderData } = useSearch(activeSearchId);
  const updateLead = useUpdateLead();
  const runEnrichment = useRunEnrichment();

  const leads = data?.leads ?? [];
  const total = data?.total ?? 0;
  const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id]);
  // Re-derive from the live query cache so edits made while the drawer is
  // open (status, tags, notes, re-enrichment) show up immediately instead of
  // the stale snapshot captured at click-time.
  const drawerLead = selectedLead
    ? (leads.find((l) => l.id === selectedLead.id) ?? selectedLead)
    : null;

  function handleStatusChange(id: string, status: LeadStatus) {
    updateLead.mutate({ id, data: { status } });
  }

  function handleToggleFavourite(id: string, favourite: boolean) {
    updateLead.mutate({ id, data: { favourite } });
  }

  function openFolder(searchId: string) {
    setActiveSearchId(searchId);
    setRowSelection({});
    setView("leads");
  }

  function openAllLeads() {
    setActiveSearchId(null);
    setRowSelection({});
    setView("leads");
  }

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-1 gap-6 p-6">
      {sidebarOpen ? (
        <aside className="w-80 shrink-0 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">LeadFinder</h1>
            <div className="flex items-center gap-1">
              <SettingsDialog />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                aria-label="Log out"
                title="Log out"
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  window.location.href = "/login";
                }}
              >
                <LogOut className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                aria-label="Hide search panel"
                onClick={() => setSidebarOpen(false)}
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <SearchForm />
        </aside>
      ) : (
        <button
          type="button"
          aria-label="Show search panel"
          onClick={() => setSidebarOpen(true)}
          className="flex h-9 w-9 shrink-0 items-center justify-center self-start rounded-md border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      )}

      <main className="min-w-0 flex-1 space-y-4">
        {view === "folders" ? (
          <>
            <div>
              <h2 className="text-lg font-semibold">Folders</h2>
              <p className="text-sm text-muted-foreground">
                Every search you run becomes its own folder of leads.
              </p>
            </div>
            <FoldersGrid onOpenFolder={openFolder} onOpenAllLeads={openAllLeads} />
          </>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setView("folders")}>
                  <ArrowLeft className="h-3.5 w-3.5" /> Folders
                </Button>
                <span className="text-sm text-muted-foreground">
                  {activeSearchId && folderData
                    ? `/ ${folderData.search.keyword} · ${folderData.search.location}`
                    : "/ All Leads"}
                </span>
              </div>
              {activeSearchId && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={runEnrichment.isPending}
                    onClick={() => runEnrichment.mutate({ searchId: activeSearchId })}
                  >
                    <Sparkles className="h-3.5 w-3.5" /> Retry Failed
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={runEnrichment.isPending}
                    onClick={() =>
                      runEnrichment.mutate({ searchId: activeSearchId, force: true })
                    }
                  >
                    <Sparkles className="h-3.5 w-3.5" /> Retry All
                  </Button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <FilterPanel
                search={search}
                onSearchChange={setSearch}
                filters={filters}
                onFiltersChange={setFilters}
                resultCount={total}
              />
              <div className="flex items-center gap-2">
                <TemplatesDialog />
                <DuplicatesDialog />
                <ImportDialog />
                <ExportMenu
                  search={debouncedSearch}
                  filters={filters}
                  searchId={activeSearchId}
                  selectedIds={selectedIds}
                />
              </div>
            </div>

            <BulkActionsBar
              selectedIds={selectedIds}
              onClearSelection={() => setRowSelection({})}
              onExportSelected={() => {
                const sp = new URLSearchParams({
                  format: "csv",
                  ids: selectedIds.join(","),
                });
                window.location.href = `/api/leads/export?${sp.toString()}`;
              }}
            />

            {isError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                Failed to load leads: {error instanceof Error ? error.message : "Unknown error"}
              </div>
            )}

            <LeadsTable
              leads={leads}
              total={total}
              page={page}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              isLoading={isLoading}
              rowSelection={rowSelection}
              onRowSelectionChange={setRowSelection}
              onStatusChange={handleStatusChange}
              onToggleFavourite={handleToggleFavourite}
              onRowClick={setSelectedLead}
              sorting={sorting}
              onSortingChange={setSorting}
            />
          </>
        )}
      </main>

      <LeadDetailDrawer lead={drawerLead} onOpenChange={(open) => !open && setSelectedLead(null)} />
    </div>
  );
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);
  return debounced;
}
