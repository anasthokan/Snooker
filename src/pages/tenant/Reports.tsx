import { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format, subDays } from 'date-fns';
import { getRevenue, getUtilization, getPlayerSpend, getRevenueByGameType, getRevenueByHour } from '../../api';
import { CurrencyIcon } from '../../components/CurrencyIcon';

export default function Reports() {
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [revenue, setRevenue] = useState<number | null>(null);
  const [utilization, setUtilization] = useState<number | null>(null);
  const [playerSpend, setPlayerSpend] = useState<number | null>(null);
  const [revenueByGame, setRevenueByGame] = useState<{ name: string; revenue: number; fill: string }[]>([]);
  const [hourlyData, setHourlyData] = useState<{ hour: string; value: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Backend responses may use slightly different field names – normalise here
  function unwrapData(payload: any): any {
    if (!payload) return payload;

    let current: any = payload;

    // Common `{ data: ... }` wrapper (allow double-nesting just in case)
    if (current && typeof current === 'object' && 'data' in current && (current as any).data != null) {
      current = (current as any).data;
      if (current && typeof current === 'object' && 'data' in current && (current as any).data != null) {
        current = (current as any).data;
      }
    }

    // If it's already an array, return as-is
    if (Array.isArray(current)) return current;

    // Some APIs use `{ data: { items: [...] } }`, `{ data: { rows: [...] } }`, etc.
    if (current && typeof current === 'object') {
      const arrayKeys = [
        'items',
        'rows',
        'records',
        'list',
        'results',
        'result',
        'values',
        'series',
      ];
      for (const key of arrayKeys) {
        const value = (current as any)[key];
        if (Array.isArray(value)) return value;
      }

      // Fallback: if any property on the object is an array, use that
      for (const value of Object.values(current)) {
        if (Array.isArray(value)) return value;
      }
    }

    return current;
  }

  function pickNumber(obj: any, keys: string[]): number | null {
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

  function pickString(obj: any, keys: string[]): string | undefined {
    if (!obj) return undefined;
    for (const key of keys) {
      const value = obj[key];
      if (typeof value === 'string') return value;
    }
    return undefined;
  }

  const load = useCallback(async () => {
    const params = { start_date: dateFrom, end_date: dateTo };
    setLoading(true);
    setError('');
    try {
      const [revRes, utilRes, spendRes, byGameRes, byHourRes] = await Promise.all([
        getRevenue(params),
        getUtilization(params),
        getPlayerSpend(params),
        getRevenueByGameType(params),
        getRevenueByHour(params),
      ]);
      const revenuePayload: any = unwrapData(revRes);
      const utilizationPayload: any = unwrapData(utilRes);
      const playerSpendPayload: any = unwrapData(spendRes);

      setRevenue(
        pickNumber(revenuePayload, [
          'total',
          'total_revenue',
          'revenue',
          'amount',
        ])
      );

      let utilizationValue: number | null;
      if (Array.isArray(utilizationPayload)) {
        const values = utilizationPayload
          .map((item) =>
            pickNumber(item, [
              'utilization',
              'utilization_percent',
              'utilizationPercentage',
            ])
          )
          .filter((v): v is number => v != null);

        if (values.length) {
          const avg =
            values.reduce((sum, v) => sum + v, 0) / values.length;
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

      setUtilization(utilizationValue);

      setPlayerSpend(
        pickNumber(playerSpendPayload, [
          'average',
          'avg_spend',
          'average_spend',
          'player_spend',
        ])
      );

      const gameListRaw: any = unwrapData(byGameRes) ?? [];
      const gameList: any[] = Array.isArray(gameListRaw) ? gameListRaw : [];
      const colors = ['var(--chart-bar)', 'var(--chart-bar-alt)', 'var(--success)', 'var(--info)'];
      setRevenueByGame(
        gameList.map((g, i) => {
          const name =
            pickString(g, ['game_type', 'game_type_name', 'name']) ??
            `Game ${i + 1}`;
          const revenueValue =
            pickNumber(g, ['revenue', 'total_revenue', 'total']) ?? 0;
          return {
            name,
            revenue: revenueValue,
            fill: colors[i % colors.length],
          };
        })
      );

      const hourListRaw: any = unwrapData(byHourRes) ?? [];
      const hourList: any[] = Array.isArray(hourListRaw) ? hourListRaw : [];
      setHourlyData(
        hourList.map((h, index) => {
          const hourVal =
            pickString(h, ['hour_label', 'label']) ??
            String(
              pickNumber(h, ['hour']) ??
                pickNumber(h, ['hour_index']) ??
                index
            );
          const valueVal =
            pickNumber(h, ['value', 'revenue', 'total', 'total_revenue']) ?? 0;
          return { hour: hourVal, value: valueVal };
        })
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="page-header">
        <h2>Reports</h2>
      </div>
      {error && <div className="toast-error" style={{ marginBottom: '1rem' }}>{error}</div>}
      <div className="kpi-card" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Date From</label>
          <input type="date" className="form-input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ width: 'auto' }} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Date To</label>
          <input type="date" className="form-input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ width: 'auto' }} />
        </div>
        <button type="button" className="btn btn-primary" onClick={load} disabled={loading} style={{ alignSelf: 'flex-end' }}>
          {loading ? 'Loading…' : 'Apply'}
        </button>
      </div>
      <div className="kpi-grid" style={{ marginBottom: '2rem' }}>
        <div className="kpi-card">
          <div className="kpi-label">Revenue</div>
          <div className="kpi-value">
            {revenue != null ? (
              <>
                <CurrencyIcon />
                {revenue.toLocaleString()}
              </>
            ) : (
              '–'
            )}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Player Spend (Avg)</div>
          <div className="kpi-value">
            {playerSpend != null ? (
              <>
                <CurrencyIcon />
                {playerSpend.toLocaleString()}
              </>
            ) : (
              '–'
            )}
          </div>
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
                  data={
                    revenueByGame.length
                      ? revenueByGame
                      : [{ name: 'No data', revenue: 0, fill: 'var(--chart-pie-muted)' }]
                  }
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
                  <XAxis
                    type="number"
                    stroke="var(--chart-axis)"
                    tickLine={false}
                    axisLine={{ stroke: 'var(--chart-grid)' }}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    stroke="var(--chart-axis)"
                    tickLine={false}
                    axisLine={{ stroke: 'var(--chart-grid)' }}
                    width={70}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(56, 189, 248, 0.08)' }}
                    contentStyle={{
                      background: 'var(--chart-tooltip-bg)',
                      border: `1px solid var(--chart-tooltip-border)`,
                      borderRadius: 10,
                      boxShadow: '0 0 16px rgba(15, 23, 42, 0.8)',
                    }}
                  />
                  <Bar dataKey="revenue" name="Revenue (SAR)" fill="url(#reportsGameGradient)" radius={[0, 10, 10, 0]} barSize={18}>
                    {revenueByGame.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
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
                <BarChart
                  data={hourlyData.length ? hourlyData : [{ hour: '0', value: 0 }]}
                  margin={{ left: 16, right: 16, top: 8, bottom: 8 }}
                >
                  <defs>
                    <linearGradient id="reportsHourGradient" x1="0" y1="1" x2="0" y2="0">
                      <stop offset="0%" stopColor="var(--chart-bar-soft)" />
                      <stop offset="35%" stopColor="var(--chart-bar)" />
                      <stop offset="100%" stopColor="var(--chart-bar-alt)" />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="hour"
                    stroke="var(--chart-axis)"
                    tickLine={false}
                    axisLine={{ stroke: 'var(--chart-grid)' }}
                  />
                  <YAxis
                    stroke="var(--chart-axis)"
                    tickLine={false}
                    axisLine={{ stroke: 'var(--chart-grid)' }}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(56, 189, 248, 0.08)' }}
                    contentStyle={{
                      background: 'var(--chart-tooltip-bg)',
                      border: `1px solid var(--chart-tooltip-border)`,
                      borderRadius: 10,
                      boxShadow: '0 0 16px rgba(15, 23, 42, 0.8)',
                    }}
                  />
                  <Bar
                    dataKey="value"
                    name="Revenue (SAR)"
                    fill="url(#reportsHourGradient)"
                    radius={[10, 10, 0, 0]}
                    barSize={18}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
