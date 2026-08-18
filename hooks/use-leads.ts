import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as api from "@/lib/api-client";
import type { BulkUpdateLeadsInput, LeadsQueryParams, UpdateLeadInput } from "@/lib/api-client";

export function useLeads(params: LeadsQueryParams) {
  return useQuery({
    queryKey: ["leads", params],
    queryFn: () => api.fetchLeads(params),
    placeholderData: (prev) => prev,
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLeadInput }) =>
      api.updateLead(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useBulkUpdateLeads() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BulkUpdateLeadsInput) => api.bulkUpdateLeads(input),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success(`Updated ${res.updated} lead(s)`);
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useBulkDeleteLeads() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => api.bulkDeleteLeads(ids),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success(`Deleted ${res.deleted} lead(s)`);
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useEnrichLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.enrichLead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Enrichment queued");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useRunEnrichment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.runEnrichment,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success(
        res.queued > 0
          ? `Queued enrichment for ${res.queued} lead(s)`
          : "No leads to enrich"
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDuplicates() {
  return useQuery({
    queryKey: ["duplicates"],
    queryFn: api.fetchDuplicates,
  });
}

export function useMergeLeads() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      primaryId,
      duplicateIds,
    }: {
      primaryId: string;
      duplicateIds: string[];
    }) => api.mergeLeads(primaryId, duplicateIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["duplicates"] });
      toast.success("Leads merged");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
