import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format, startOfMonth } from 'date-fns';
import {
  getRevenue,
  getUtilization,
  getPlayerSpend,
  getRevenueByGameType,
  getRevenueByHour,
  getProfitability,
} from '../../api';
import type { ProfitabilityResponse } from '../../api/types';
import { CurrencyIcon } from '../../components/CurrencyIcon';
import {
  REPORT_SECTION_LABELS,
  reportSectionFromParam,
} from '../../constants/reportSections';
import './Reports.css';

function Money({ value }: { value: number | string | null | undefined }) {
  if (value == null || value === '') return <>–</>;
  const num = Number(value);
  if (!Number.isFinite(num)) return <>–</>;
  return (
    <>
      <CurrencyIcon />
      {num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </>
  );
}

function unwrapList(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object') return payload;

  let current: unknown = payload;
  for (let i = 0; i < 2; i += 1) {
    if (current && typeof current === 'object' && 'data' in current && (current as { data: unknown }).data != null) {
      current = (current as { data: unknown }).data;
    }
  }

  if (Array.isArray(current)) return current;

  if (current && typeof current === 'object') {
    const arrayKeys = ['items', 'rows', 'records', 'list', 'results', 'result', 'values', 'series'];
    for (const key of arrayKeys) {
      const value = (current as Record<string, unknown>)[key];
      if (Array.isArray(value)) return value;
    }
  }

  return current;
}

function unwrapObject<T>(payload: unknown): T | null {
  if (!payload || typeof payload !== 'object') return null;

  let current: unknown = payload;
  for (let i = 0; i < 2; i += 1) {
    if (current && typeof current === 'object' && 'data' in current && (current as { data: unknown }).data != null) {
      current = (current as { data: unknown }).data;
    }
  }

  return current && typeof current === 'object' && !Array.isArray(current) ? (current as T) : null;
}

function pickNumber(obj: unknown, keys: string[]): number | null {
  if (!obj || typeof obj !== 'object') return null;
  for (const key of keys) {
    const value = (obj as Record<string, unknown>)[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value);
      if (!Number.isNaN(parsed) && Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function pickString(obj: unknown, keys: string[]): string | undefined {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const key of keys) {
    const value = (obj as Record<string, unknown>)[key];
    if (typeof value === 'string') return value;
  }
  return undefined;
}

export default function Reports() {
  const [searchParams] = useSearchParams();
  const activeSection = reportSectionFromParam(searchParams.get('section'));
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [revenue, setRevenue] = useState<number | null>(null);
  const [utilization, setUtilization] = useState<number | null>(null);
  const [playerSpend, setPlayerSpend] = useState<number | null>(null);
  const [revenueByGame, setRevenueByGame] = useState<{ name: string; revenue: number; fill: string }[]>([]);
  const [hourlyData, setHourlyData] = useState<{ hour: string; value: number }[]>([]);
  const [profitability, setProfitability] = useState<ProfitabilityResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadOverview = useCallback(async () => {
    const params = { start_date: dateFrom, end_date: dateTo };
    const [revRes, utilRes, spendRes, byGameRes, byHourRes] = await Promise.all([
      getRevenue(params),
      getUtilization(params),
      getPlayerSpend(params),
      getRevenueByGameType(params),
      getRevenueByHour(params),
    ]);
    const revenuePayload = unwrapObject<Record<string, unknown>>(revRes);
    const utilizationPayload = unwrapList(utilRes);
    const playerSpendPayload = unwrapList(spendRes);

    setRevenue(pickNumber(revenuePayload, ['total', 'total_revenue', 'revenue', 'amount']));

    let utilizationValue: number | null;
    if (Array.isArray(utilizationPayload)) {
      const values = utilizationPayload
        .map((item) => pickNumber(item, ['utilization', 'utilization_percent', 'utilizationPercentage']))
        .filter((v): v is number => v != null);
      utilizationValue = values.length
        ? Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 100) / 100
        : null;
    } else {
      utilizationValue = pickNumber(utilizationPayload, [
        'utilization',
        'utilization_percent',
        'utilizationPercentage',
        'utilization_percent',
      ]);
    }

    setUtilization(utilizationValue);

    if (Array.isArray(playerSpendPayload) && playerSpendPayload.length > 0) {
      const spends = playerSpendPayload
        .map((item) => pickNumber(item, ['total_spend', 'total', 'amount']))
        .filter((v): v is number => v != null);
      setPlayerSpend(
        spends.length ? Math.round((spends.reduce((sum, v) => sum + v, 0) / spends.length) * 100) / 100 : null
      );
    } else {
      setPlayerSpend(
        pickNumber(playerSpendPayload, ['average', 'avg_spend', 'average_spend', 'player_spend'])
      );
    }

    const gameList = Array.isArray(unwrapList(byGameRes)) ? (unwrapList(byGameRes) as unknown[]) : [];
    const colors = ['var(--chart-bar)', 'var(--chart-bar-alt)', 'var(--success)', 'var(--info)'];
    setRevenueByGame(
      gameList.map((g, i) => ({
        name: pickString(g, ['game_type', 'game_type_name', 'name']) ?? `Game ${i + 1}`,
        revenue: pickNumber(g, ['revenue', 'total_revenue', 'total']) ?? 0,
        fill: colors[i % colors.length],
      }))
    );

    const hourList = Array.isArray(unwrapList(byHourRes)) ? (unwrapList(byHourRes) as unknown[]) : [];
    setHourlyData(
      hourList.map((h, index) => ({
        hour:
          pickString(h, ['hour_label', 'label']) ??
          String(pickNumber(h, ['hour']) ?? pickNumber(h, ['hour_index']) ?? index),
        value: pickNumber(h, ['value', 'revenue', 'total', 'total_revenue']) ?? 0,
      }))
    );
  }, [dateFrom, dateTo]);

  const loadProfitability = useCallback(async () => {
    const params = { start_date: dateFrom, end_date: dateTo };
    const res = await getProfitability(params);
    setProfitability(unwrapObject<ProfitabilityResponse>(res));
  }, [dateFrom, dateTo]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (activeSection === 'overview') {
        await loadOverview();
      } else {
        await loadProfitability();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [activeSection, loadOverview, loadProfitability]);

  useEffect(() => {
    load();
  }, [load]);

  const formatDate = (value: string) => {
    try {
      return format(new Date(`${value}T12:00:00`), 'dd MMM yyyy');
    } catch {
      return value;
    }
  };

  const sectionTitle = REPORT_SECTION_LABELS[activeSection];

  const renderOverview = () => (
    <>
      <div className="kpi-grid" style={{ marginBottom: '2rem' }}>
        <div className="kpi-card">
          <div className="kpi-label">Revenue</div>
          <div className="kpi-value"><Money value={revenue} /></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Player Spend (Avg)</div>
          <div className="kpi-value"><Money value={playerSpend} /></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Utilization %</div>
          <div className="kpi-value">{utilization != null ? `${utilization}%` : '–'}</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div className="kpi-card chart-card" style={{ padding: '1.5rem' }}>
          <div className="chart-inner">
            <h3 className="chart-title">Revenue by Game Type</h3>
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={revenueByGame.length ? revenueByGame : [{ name: 'No data', revenue: 0, fill: 'var(--chart-pie-muted)' }]}
                  layout="vertical"
                  margin={{ left: 50, right: 16, top: 8, bottom: 8 }}
                >
                  <defs>
                    <linearGradient id="reportsGameGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="var(--chart-bar-soft)" />
                      <stop offset="40%" stopColor="var(--chart-bar)" />
                      <stop offset="100%" stopColor="var(--chart-bar-alt)" />
                    </linearGradient>
                  </defs>
                  <XAxis type="number" stroke="var(--chart-axis)" tickLine={false} axisLine={{ stroke: 'var(--chart-grid)' }} />
                  <YAxis dataKey="name" type="category" stroke="var(--chart-axis)" tickLine={false} axisLine={{ stroke: 'var(--chart-grid)' }} width={70} />
                  <Tooltip
                    cursor={{ fill: 'rgba(56, 189, 248, 0.08)' }}
                    contentStyle={{ background: 'var(--chart-tooltip-bg)', border: '1px solid var(--chart-tooltip-border)', borderRadius: 10 }}
                  />
                  <Bar dataKey="revenue" name="Revenue (SAR)" fill="url(#reportsGameGradient)" radius={[0, 10, 10, 0]} barSize={18}>
                    {revenueByGame.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div className="kpi-card chart-card" style={{ padding: '1.5rem' }}>
          <div className="chart-inner">
            <h3 className="chart-title">Revenue by Hour</h3>
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData.length ? hourlyData : [{ hour: '0', value: 0 }]} margin={{ left: 16, right: 16, top: 8, bottom: 8 }}>
                  <defs>
                    <linearGradient id="reportsHourGradient" x1="0" y1="1" x2="0" y2="0">
                      <stop offset="0%" stopColor="var(--chart-bar-soft)" />
                      <stop offset="35%" stopColor="var(--chart-bar)" />
                      <stop offset="100%" stopColor="var(--chart-bar-alt)" />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="hour" stroke="var(--chart-axis)" tickLine={false} axisLine={{ stroke: 'var(--chart-grid)' }} />
                  <YAxis stroke="var(--chart-axis)" tickLine={false} axisLine={{ stroke: 'var(--chart-grid)' }} />
                  <Tooltip
                    cursor={{ fill: 'rgba(56, 189, 248, 0.08)' }}
                    contentStyle={{ background: 'var(--chart-tooltip-bg)', border: '1px solid var(--chart-tooltip-border)', borderRadius: 10 }}
                  />
                  <Bar dataKey="value" name="Revenue (SAR)" fill="url(#reportsHourGradient)" radius={[10, 10, 0, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  const renderProfitabilitySummary = () => (
    <div className="kpi-grid">
      <div className="kpi-card">
        <div className="kpi-label">Total Revenue</div>
        <div className="kpi-value"><Money value={profitability?.total_revenue} /></div>
      </div>
      <div className="kpi-card">
        <div className="kpi-label">Weekend Revenue (Thu–Sat)</div>
        <div className="kpi-value"><Money value={profitability?.weekend_revenue} /></div>
      </div>
      <div className="kpi-card">
        <div className="kpi-label">Canteen Revenue</div>
        <div className="kpi-value"><Money value={profitability?.canteen_revenue} /></div>
      </div>
      <div className="kpi-card">
        <div className="kpi-label">Game Revenue</div>
        <div className="kpi-value"><Money value={profitability?.game_revenue} /></div>
      </div>
    </div>
  );

  const renderRevenuePerDay = () => {
    const days = [...(profitability?.revenue_by_day ?? [])].sort(
      (a, b) => new Date(`${a.date}T12:00:00`).getTime() - new Date(`${b.date}T12:00:00`).getTime()
    );
    return (
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr><th>#</th><th>Date</th><th>Revenue</th></tr>
          </thead>
          <tbody>
            {days.length === 0 ? (
              <tr><td colSpan={3} style={{ color: 'var(--text-secondary)' }}>No data for this period</td></tr>
            ) : (
              days.map((row, index) => (
                <tr key={row.date}>
                  <td>{index + 1}</td>
                  <td>{formatDate(row.date)}</td>
                  <td><Money value={row.revenue} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const renderWeekendRevenue = () => (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr><th>Day</th><th>Revenue</th></tr>
        </thead>
        <tbody>
          {(profitability?.weekend_breakdown ?? []).map((row) => (
            <tr key={row.day_name}>
              <td>{row.day_name}</td>
              <td><Money value={row.revenue} /></td>
            </tr>
          ))}
          <tr style={{ fontWeight: 600 }}>
            <td>Total (Thu–Sat)</td>
            <td><Money value={profitability?.weekend_revenue} /></td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  const renderRevenueByPlayer = () => (
    <>
      <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
        Repeat visits from the same player name are combined.
      </p>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr><th>#</th><th>Player</th><th>Visits</th><th>Game</th><th>Canteen</th><th>Total</th></tr>
          </thead>
          <tbody>
            {(profitability?.customers ?? []).length === 0 ? (
              <tr><td colSpan={6} style={{ color: 'var(--text-secondary)' }}>No player data for this period</td></tr>
            ) : (
              profitability!.customers.map((row) => (
                <tr key={`${row.rank}-${row.player_name}`}>
                  <td>{row.rank}</td>
                  <td>{row.player_name}</td>
                  <td>{row.session_count}</td>
                  <td><Money value={row.game_charge} /></td>
                  <td><Money value={row.canteen_charge} /></td>
                  <td><Money value={row.total_spend} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );

  const renderCanteenByProduct = () => (
    <>
      <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
        Total canteen: <Money value={profitability?.canteen_revenue} />
      </p>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr><th>#</th><th>Product</th><th>Qty Sold</th><th>Revenue</th></tr>
          </thead>
          <tbody>
            {(profitability?.canteen_products ?? []).length === 0 ? (
              <tr><td colSpan={4} style={{ color: 'var(--text-secondary)' }}>No canteen sales for this period</td></tr>
            ) : (
              profitability!.canteen_products.map((row, index) => (
                <tr key={row.product_id}>
                  <td>{index + 1}</td>
                  <td>{row.product_name}</td>
                  <td>{row.quantity_sold}</td>
                  <td><Money value={row.revenue} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div className="kpi-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Loading report…
        </div>
      );
    }

    switch (activeSection) {
      case 'overview':
        return renderOverview();
      case 'profitability-summary':
        return renderProfitabilitySummary();
      case 'revenue-per-day':
        return renderRevenuePerDay();
      case 'weekend-revenue':
        return renderWeekendRevenue();
      case 'revenue-by-player':
        return renderRevenueByPlayer();
      case 'canteen-by-product':
        return renderCanteenByProduct();
      default:
        return null;
    }
  };

  return (
    <div>
      <div className="page-header dashboard-header">
        <h2>{sectionTitle}</h2>
        <div className="filter-bar reports-date-filter">
          <div className="reports-date-row">
            <label className="reports-date-field">
              <span className="reports-date-label">Date From</span>
              <input
                type="date"
                className="form-input filter-date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                max={dateTo || undefined}
              />
            </label>
            <label className="reports-date-field">
              <span className="reports-date-label">Date To</span>
              <input
                type="date"
                className="form-input filter-date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                min={dateFrom || undefined}
              />
            </label>
            <button type="button" className="btn btn-primary reports-date-apply" onClick={load} disabled={loading}>
              {loading ? 'Loading…' : 'Apply'}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="toast-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      {renderContent()}
    </div>
  );
}
