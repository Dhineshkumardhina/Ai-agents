import { useQuery } from "@tanstack/react-query";
import type { SystemHealthResponse } from "../types/api";

async function fetchSystemHealth(): Promise<SystemHealthResponse> {
  const response = await fetch("/api/v1/health");
  if (!response.ok && response.status !== 503) {
    throw new Error(`Health check request failed with HTTP status ${response.status}`);
  }
  return response.json();
}

export function useHealthCheck() {
  return useQuery<SystemHealthResponse, Error>({
    queryKey: ["system-health"],
    queryFn: fetchSystemHealth,
    refetchInterval: 10000, // Recheck every 10 seconds
    retry: 2,
  });
}

