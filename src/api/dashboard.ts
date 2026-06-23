import { api } from './client';
import type { DashboardOverviewResponse } from './types';

export async function getDashboardOverview(): Promise<DashboardOverviewResponse> {
  return api.get<DashboardOverviewResponse>('/dashboard/overview');
}
