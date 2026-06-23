declare function useDashboardData(): {
  revenueByHour: any[];
  topGames: any[];
  todayStats: any;
  loading: boolean;
  error: string | null;
  period: 'daily' | 'weekly' | 'monthly' | 'date';
  setPeriod: (p: 'daily' | 'weekly' | 'monthly' | 'date') => void;
  dateRange: { startDate: string; endDate: string };
  setDateRange: (v: { startDate: string; endDate: string } | ((prev: { startDate: string; endDate: string }) => { startDate: string; endDate: string })) => void;
};

export default useDashboardData;

