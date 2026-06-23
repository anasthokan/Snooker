import axios from 'axios';
import { API_BASE_URL, getAccessToken } from '../api';

function safeGetStorageItem(key) {
  if (typeof window === 'undefined') return null;
  try {
    if (window.sessionStorage) {
      const fromSession = window.sessionStorage.getItem(key);
      if (fromSession) return fromSession;
    }
  } catch {
    // ignore
  }
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {
    // ignore
  }
  return null;
}

function getTenantToken() {
  const keys = ['gamehub_tenant_token', 'tenant_token', 'tenantToken'];
  for (const key of keys) {
    const value = safeGetStorageItem(key);
    if (value) return value;
  }
  return null;
}

const dashboardApi = axios.create({
  baseURL: API_BASE_URL,
});

dashboardApi.interceptors.request.use((config) => {
  const token = getAccessToken?.();
  if (token) {
    // Attach main access token
    // eslint-disable-next-line no-param-reassign
    config.headers = {
      ...(config.headers || {}),
      Authorization: `Bearer ${token}`,
    };
  }

  const tenantToken = getTenantToken();
  if (tenantToken) {
    // Attach tenant token if available – header name aligned with common SaaS patterns
    // eslint-disable-next-line no-param-reassign
    config.headers = {
      ...(config.headers || {}),
      'X-Tenant-Token': tenantToken,
    };
  }

  return config;
});

function unwrapData(payload) {
  if (!payload) return payload;

  let current = payload;

  if (current && typeof current === 'object' && 'data' in current && current.data != null) {
    current = current.data;
    if (current && typeof current === 'object' && 'data' in current && current.data != null) {
      current = current.data;
    }
  }

  if (Array.isArray(current)) return current;

  if (current && typeof current === 'object') {
    const arrayKeys = ['items', 'rows', 'records', 'list', 'results', 'result', 'values', 'series'];
    for (const key of arrayKeys) {
      const value = current[key];
      if (Array.isArray(value)) return value;
    }

    // Fallback: first array value in object
    for (const value of Object.values(current)) {
      if (Array.isArray(value)) return value;
    }
  }

  return current;
}

function pickNumber(obj, keys) {
  if (!obj) return null;
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value);
      if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
}

function pickString(obj, keys) {
  if (!obj) return undefined;
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'string') return value;
  }
  return undefined;
}

/**
 * Get date range based on period type.
 * @param {'daily'|'weekly'|'monthly'|'date'} period
 * @param {{ startDate?: string; endDate?: string }} [customDates] - For 'date' period: YYYY-MM-DD
 */
function getDateRange(period, customDates) {
  const today = new Date();
  const toISO = (d) => d.toISOString().slice(0, 10);

  if (period === 'date' && customDates?.startDate && customDates?.endDate) {
    return { start_date: customDates.startDate, end_date: customDates.endDate };
  }

  if (period === 'weekly') {
    const start = new Date(today);
    start.setDate(start.getDate() - start.getDay() + 1); // Monday
    const end = new Date(start);
    end.setDate(end.getDate() + 6); // Sunday
    return { start_date: toISO(start), end_date: toISO(end) };
  }

  if (period === 'monthly') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { start_date: toISO(start), end_date: toISO(end) };
  }

  // daily (default)
  const todayStr = toISO(today);
  return { start_date: todayStr, end_date: todayStr };
}

function toError(error) {
  if (error instanceof Error) return error;
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return new Error(error.message);
  }
  return new Error('Failed to load dashboard data');
}

export async function getRevenueByHour(paramsOrPeriod, customDates) {
  try {
    const params =
      paramsOrPeriod && typeof paramsOrPeriod === 'object' && 'start_date' in paramsOrPeriod
        ? paramsOrPeriod
        : getDateRange(paramsOrPeriod || 'daily', customDates);
    const res = await dashboardApi.get('/reports/revenue-by-hour', { params });
    const raw = unwrapData(res.data) ?? [];
    const list = Array.isArray(raw) ? raw : [];

    return list.map((h, index) => {
      const hourLabel =
        pickString(h, ['hour_label', 'label']) ??
        String(
          pickNumber(h, ['hour']) ??
            pickNumber(h, ['hour_index']) ??
            index
        );
      const revenueValue =
        pickNumber(h, ['value', 'revenue', 'total', 'total_revenue']) ?? 0;
      return { hour: hourLabel, revenue: revenueValue };
    });
  } catch (error) {
    throw toError(error);
  }
}

export async function getTopGames(paramsOrPeriod, customDates) {
  try {
    const params =
      paramsOrPeriod && typeof paramsOrPeriod === 'object' && 'start_date' in paramsOrPeriod
        ? paramsOrPeriod
        : getDateRange(paramsOrPeriod || 'daily', customDates);
    const res = await dashboardApi.get('/reports/revenue-by-game-type', { params });
    const raw = unwrapData(res.data) ?? [];
    const list = Array.isArray(raw) ? raw : [];

    return list.map((g, index) => {
      const name =
        pickString(g, ['game_type', 'game_type_name', 'name']) ??
        `Game ${index + 1}`;
      const revenue =
        pickNumber(g, ['revenue', 'total_revenue', 'total']) ?? 0;
      return { name, revenue };
    });
  } catch (error) {
    throw toError(error);
  }
}

export async function getTodayStats(paramsOrPeriod, customDates) {
  try {
    const params =
      paramsOrPeriod && typeof paramsOrPeriod === 'object' && 'start_date' in paramsOrPeriod
        ? paramsOrPeriod
        : getDateRange(paramsOrPeriod || 'daily', customDates);

    const [revenueRes, utilizationRes, byGameRes, sessionsRes] =
      await Promise.all([
        dashboardApi.get('/reports/revenue', { params }),
        dashboardApi.get('/reports/utilization', { params }),
        dashboardApi.get('/reports/revenue-by-game-type', { params }),
        dashboardApi.get('/sessions', { params: { status: 'active' } }),
      ]);

    const revenuePayload = unwrapData(revenueRes.data);
    const utilizationPayload = unwrapData(utilizationRes.data);
    const byGamePayload = unwrapData(byGameRes.data);

    const revenue =
      pickNumber(revenuePayload, ['total', 'total_revenue', 'revenue', 'amount']);

    let utilizationValue;
    if (Array.isArray(utilizationPayload)) {
      const values = utilizationPayload
        .map((item) =>
          pickNumber(item, [
            'utilization',
            'utilization_percent',
            'utilizationPercentage',
          ])
        )
        .filter((v) => v != null);

      if (values.length) {
        const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
        utilizationValue = Math.round(avg * 100) / 100;
      } else {
        utilizationValue = null;
      }
    } else {
      utilizationValue = pickNumber(utilizationPayload, [
        'utilization',
        'utilization_percent',
        'utilizationPercentage',
      ]);
    }

    const sessionsData = unwrapData(sessionsRes.data);
    const activeSessions = Array.isArray(sessionsData) ? sessionsData.length : 0;

    const gameListRaw = byGamePayload ?? [];
    const gameList = Array.isArray(gameListRaw) ? gameListRaw : [];

    const gameChartData = gameList.map((g, index) => {
      const name =
        pickString(g, ['game_type', 'game_type_name', 'name']) ??
        `Game ${index + 1}`;
      const value =
        pickNumber(g, ['revenue', 'total_revenue', 'total']) ?? 0;
      return { name, value };
    });

    let topGame = null;
    let canteenRevenue = null;

    if (gameChartData.length) {
      const sorted = [...gameChartData].sort((a, b) => b.value - a.value);
      topGame = sorted[0].name;

      const canteenPattern =
        /canteen|food|snack|cafe|f&b|f\/b|bev|beverage|drink|tea|coffee/i;
      const canteenTotal = gameChartData
        .filter((g) => canteenPattern.test(g.name))
        .reduce((sum, g) => sum + g.value, 0);
      canteenRevenue = canteenTotal || null;
    }

    return {
      revenue: revenue ?? null,
      utilization: utilizationValue ?? null,
      activeSessions,
      canteenRevenue,
      topGame,
    };
  } catch (error) {
    throw toError(error);
  }
}

