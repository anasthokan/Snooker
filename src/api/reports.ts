import { api } from './client';
import type {
  ReportQuery,
  ReportRevenueResponse,
  ReportUtilizationResponse,
  ReportPlayerSpendResponse,
  ReportRevenueByGameTypeItem,
  ReportRevenueByHourItem,
} from './types';

function queryString(params: ReportQuery): string {
  return `?start_date=${encodeURIComponent(params.start_date)}&end_date=${encodeURIComponent(params.end_date)}`;
}

export async function getRevenue(params: ReportQuery) {
  return api.get<{ data?: ReportRevenueResponse }>(`/reports/revenue${queryString(params)}`);
}

export async function getUtilization(params: ReportQuery) {
  return api.get<{ data?: ReportUtilizationResponse }>(`/reports/utilization${queryString(params)}`);
}

export async function getPlayerSpend(params: ReportQuery) {
  return api.get<{ data?: ReportPlayerSpendResponse }>(`/reports/player-spend${queryString(params)}`);
}

export async function getRevenueByGameType(params: ReportQuery) {
  return api.get<{ data?: ReportRevenueByGameTypeItem[] }>(`/reports/revenue-by-game-type${queryString(params)}`);
}

export async function getRevenueByHour(params: ReportQuery) {
  return api.get<{ data?: ReportRevenueByHourItem[] }>(`/reports/revenue-by-hour${queryString(params)}`);
}
