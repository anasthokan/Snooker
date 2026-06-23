import { useState, useEffect, useCallback } from 'react';
import {
  getRevenueByHour,
  getTopGames,
  getTodayStats,
} from '../services/dashboardService';

/** @type {'daily'|'weekly'|'monthly'|'date'} */
const DEFAULT_PERIOD = 'daily';

export default function useDashboardData() {
  const [revenueByHour, setRevenueByHour] = useState([]);
  const [topGames, setTopGames] = useState([]);
  const [todayStats, setTodayStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState(DEFAULT_PERIOD);
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    let customDates;
    if (period === 'date') {
      const today = new Date().toISOString().slice(0, 10);
      customDates = {
        startDate: dateRange.startDate || today,
        endDate: dateRange.endDate || today,
      };
    } else {
      customDates = undefined;
    }
    try {
      const [hourData, gamesData, stats] = await Promise.all([
        getRevenueByHour(period, customDates),
        getTopGames(period, customDates),
        getTodayStats(period, customDates),
      ]);

      setRevenueByHour(Array.isArray(hourData) ? hourData : []);
      setTopGames(Array.isArray(gamesData) ? gamesData : []);
      setTodayStats(stats || null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load dashboard data'
      );
    } finally {
      setLoading(false);
    }
  }, [period, dateRange.startDate, dateRange.endDate]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    revenueByHour,
    topGames,
    todayStats,
    loading,
    error,
    period,
    setPeriod,
    dateRange,
    setDateRange,
  };
}

