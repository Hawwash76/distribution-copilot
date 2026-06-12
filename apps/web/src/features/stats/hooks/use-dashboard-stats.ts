import { useQuery } from "@tanstack/react-query";
import { dashboardStatsSchema, type DashboardStats } from "@distribution-copilot/shared";

import { apiFetch } from "@/lib/api-client";

async function fetchDashboardStats(): Promise<DashboardStats> {
  const data = await apiFetch("/stats");
  return dashboardStatsSchema.parse(data);
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: fetchDashboardStats,
    staleTime: 30_000,
  });
}
