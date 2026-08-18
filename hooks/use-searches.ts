import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as api from "@/lib/api-client";
import type { CreateSearchInput } from "@/lib/api-client";

export function useSearches() {
  return useQuery({
    queryKey: ["searches"],
    queryFn: api.fetchSearches,
    refetchInterval: (query) => {
      const searches = query.state.data?.searches ?? [];
      const hasActive = searches.some(
        (s) => s.jobStatus === "pending" || s.jobStatus === "running"
      );
      return hasActive ? 2000 : false;
    },
  });
}

export function useSearch(id: string | null) {
  return useQuery({
    queryKey: ["search", id],
    queryFn: () => api.fetchSearch(id as string),
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.search.jobStatus;
      return status === "pending" || status === "running" ? 1500 : false;
    },
  });
}

export function useCreateSearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSearchInput) => api.createSearch(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["searches"] });
      toast.success("Search started");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useRerunSearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.rerunSearch(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["searches"] });
      toast.success("Search re-run started");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteSearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteSearch(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["searches"] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Search deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function usePauseSearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.pauseSearch(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["searches"] });
      toast.success("Search paused");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useResumeSearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.resumeSearch(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["searches"] });
      toast.success("Search resumed");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useCancelSearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.cancelSearch(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["searches"] });
      toast.success("Search cancelled");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
