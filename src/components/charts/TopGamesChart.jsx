import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import ChartCard from './ChartCard';

function TopGamesTooltip({ active, payload }) {
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
        Game
      </div>
      <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
        <div style={{ marginBottom: 2 }}>
          <span style={{ color: 'var(--accent)', fontWeight: 500 }}>
            {item.payload.name}
          </span>
        </div>
        <div>
          <span>Revenue: </span>
          <span style={{ fontWeight: 600 }}>{value.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

function TopGamesChart({ data, loading, periodLabel = 'Today' }) {
  const isEmpty = !loading && (!data || data.length === 0);

  return (
    <ChartCard
      title={`Top Games by Revenue (${periodLabel})`}
      loading={loading}
      isEmpty={isEmpty}
      emptyMessage={`No data available for ${periodLabel.toLowerCase()}`}
    >
      {!loading && !isEmpty && (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ left: 80, right: 16, top: 8, bottom: 8 }}
          >
            <defs>
              <linearGradient id="topGamesGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--chart-bar)" stopOpacity={0.95} />
                <stop offset="50%" stopColor="var(--chart-bar)" stopOpacity={0.9} />
                <stop offset="100%" stopColor="var(--chart-bar)" stopOpacity={0.4} />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="var(--chart-grid)"
              strokeDasharray="3 3"
              horizontal={false}
            />
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
              width={90}
            />
            <Tooltip
              cursor={{ fill: 'var(--chart-bar-soft)' }}
              content={<TopGamesTooltip />}
            />
            <Bar
              dataKey="revenue"
              name={`Revenue (${periodLabel})`}
              fill="url(#topGamesGradient)"
              radius={[999, 999, 999, 999]}
              barSize={22}
              isAnimationActive
              animationDuration={650}
              animationEasing="ease-out"
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

export default TopGamesChart;

