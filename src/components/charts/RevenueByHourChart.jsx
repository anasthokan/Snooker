import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import ChartCard from './ChartCard';

function RevenueTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  const value = typeof item.value === 'number' ? item.value : 0;

  return (
    <div
      className="chart-tooltip"
      style={{
        background: 'var(--chart-tooltip-bg)',
        border: `1px solid var(--chart-tooltip-border)`,
        borderRadius: 12,
        padding: '0.6rem 0.9rem',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      <div
        style={{
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--text-secondary)',
          marginBottom: 4,
        }}
      >
        Hour
      </div>
      <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
        <span style={{ color: 'var(--accent)', marginRight: 6 }}>{label}</span>
        <span>Revenue: </span>
        <span style={{ fontWeight: 600 }}>{value.toLocaleString()}</span>
      </div>
    </div>
  );
}

function RevenueByHourChart({ data, loading, periodLabel = 'Today' }) {
  const isEmpty = !loading && (!data || data.length === 0);

  return (
    <ChartCard
      title={`Revenue by Hour (${periodLabel})`}
      loading={loading}
      isEmpty={isEmpty}
      emptyMessage={`No data available for ${periodLabel.toLowerCase()}`}
    >
      {!loading && !isEmpty && (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart
            data={data}
            margin={{ left: 8, right: 16, top: 8, bottom: 8 }}
          >
            <defs>
              <linearGradient id="revenueAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-bar)" stopOpacity={0.95} />
                <stop offset="45%" stopColor="var(--chart-bar)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--chart-bar)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="var(--chart-grid)"
              strokeDasharray="3 3"
            />
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
              cursor={{ stroke: 'var(--chart-bar)', strokeWidth: 1 }}
              content={<RevenueTooltip />}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              name={`Revenue (${periodLabel})`}
              stroke="var(--chart-bar)"
              strokeWidth={2.6}
              fill="url(#revenueAreaGradient)"
              isAnimationActive
              animationDuration={700}
              animationEasing="ease-out"
              dot={false}
              activeDot={{
                r: 6,
                stroke: 'var(--chart-bar)',
                strokeWidth: 2,
                fill: 'var(--bg-card)',
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

export default RevenueByHourChart;

