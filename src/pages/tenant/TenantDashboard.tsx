import { useMemo, useEffect } from 'react';
import useDashboardData from '../../hooks/useDashboardData';
import TopGamesChart from '../../components/charts/TopGamesChart';
import RevenueByHourChart from '../../components/charts/RevenueByHourChart';
import { CurrencyIcon } from '../../components/CurrencyIcon';

function getOverviewLabel(period: string) {
  switch (period) {
    case 'weekly':
      return "This Week's Overview";
    case 'monthly':
      return "This Month's Overview";
    case 'date':
      return 'Overview';
    default:
      return "Today's Overview";
  }
}

function getRevenueLabel(period: string) {
  switch (period) {
    case 'weekly':
      return 'Week Revenue';
    case 'monthly':
      return 'Month Revenue';
    case 'date':
      return 'Revenue';
    default:
      return 'Today Revenue';
  }
}

function getChartPeriodLabel(period: string, dateRange?: { startDate: string; endDate: string }) {
  if (period === 'date' && dateRange?.startDate && dateRange?.endDate) {
    return `${dateRange.startDate} to ${dateRange.endDate}`;
  }
  switch (period) {
    case 'weekly':
      return 'This Week';
    case 'monthly':
      return 'This Month';
    default:
      return 'Today';
  }
}

export default function TenantDashboard() {
  const {
    revenueByHour,
    topGames,
    todayStats,
    loading,
    error,
    period,
    setPeriod,
    dateRange,
    setDateRange,
  } = useDashboardData();

  const periodLabel = getChartPeriodLabel(period, dateRange);

  useEffect(() => {
    if (period === 'date' && !dateRange.startDate && !dateRange.endDate) {
      const today = new Date().toISOString().slice(0, 10);
      setDateRange({ startDate: today, endDate: today });
    }
  }, [period]);

  const {
    revenue,
    activeSessions,
    utilization,
    canteenRevenue,
    topGame,
  } = todayStats ?? {};

  const revenueDisplay =
    revenue != null ? (
      <>
        <CurrencyIcon />
        {revenue.toLocaleString()}
      </>
    ) : (
      '–'
    );
  const activeDisplay = activeSessions != null ? activeSessions.toString() : '–';
  const utilizationDisplay = utilization != null ? `${utilization}%` : '–';
  const canteenDisplay =
    canteenRevenue != null
      ? [
          <CurrencyIcon key="canteen-currency" />,
          canteenRevenue.toLocaleString(),
        ]
      : revenue != null
      ? [
          <CurrencyIcon key="canteen-currency-zero" />,
          '0',
        ]
      : '–';
  const topGameDisplay = topGame ?? '–';
  const topGamesChartData = useMemo(
    () =>
      Array.isArray(topGames)
        ? [...topGames]
            .filter((g) => g && typeof g.revenue === 'number' && g.revenue > 0)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5)
        : [],
    [topGames]
  );

  return (
    <div>
      <div className="page-header dashboard-header">
        <h2>{getOverviewLabel(period)}</h2>
        <div className="dashboard-period-filter filter-bar" style={{ marginTop: '1rem' }}>
          <div className="period-buttons">
            {(['daily', 'weekly', 'monthly', 'date'] as const).map((p) => (
              <button
                key={p}
                type="button"
                className={`btn period-btn ${period === p ? 'period-btn--active' : 'btn-secondary'}`}
                onClick={() => setPeriod(p)}
              >
                {p === 'daily' ? 'Daily' : p === 'weekly' ? 'Weekly' : p === 'monthly' ? 'Monthly' : 'Date-wise'}
              </button>
            ))}
          </div>
          {period === 'date' && (
            <div className="period-date-range">
              <input
                type="date"
                className="form-input filter-date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange((prev) => ({ ...prev, startDate: e.target.value }))}
                max={dateRange.endDate || undefined}
              />
              <span className="period-date-sep">to</span>
              <input
                type="date"
                className="form-input filter-date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange((prev) => ({ ...prev, endDate: e.target.value }))}
                min={dateRange.startDate || undefined}
              />
            </div>
          )}
        </div>
      </div>
      {error && (
        <div
          className="toast-error"
          style={{ marginBottom: '1rem' }}
        >
          {error}
        </div>
      )}
      <div className="kpi-grid" style={{ marginBottom: '2rem' }}>
        <div className="kpi-card">
          <div className="kpi-label">{getRevenueLabel(period)}</div>
          <div className="kpi-value">
            {loading && revenue == null ? 'Loading…' : revenueDisplay}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Active Sessions</div>
          <div className="kpi-value">
            {loading && activeSessions == null ? 'Loading…' : activeDisplay}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Table Utilization</div>
          <div className="kpi-value">
            {loading && utilization == null ? 'Loading…' : utilizationDisplay}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Canteen Revenue</div>
          <div className="kpi-value">
            {loading && canteenRevenue == null
              ? 'Loading…'
              : canteenDisplay}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Top Game</div>
          <div className="kpi-value">
            {loading && !topGame ? 'Loading…' : topGameDisplay}
          </div>
        </div>
      </div>
      <div className="dashboard-charts-grid">
        <TopGamesChart data={topGamesChartData} loading={loading} periodLabel={periodLabel} />
        <RevenueByHourChart data={revenueByHour} loading={loading} periodLabel={periodLabel} />
      </div>
    </div>
  );
}
