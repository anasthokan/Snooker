import React from 'react';

function ChartCard({
  title,
  loading,
  isEmpty,
  emptyMessage = 'No data available for today',
  minHeight = 220,
  children,
}) {
  return (
    <div className="kpi-card chart-card chart-card--glass" style={{ padding: '1.5rem' }}>
      <div className="chart-inner" style={{ minHeight }}>
        <div className="chart-card-header">
          <h3 className="chart-title">{title}</h3>
        </div>
        <div className="chart-card-body">
          <div className="chart-card-body-inner">
            {loading ? (
              <div className="chart-skeleton" aria-busy="true" aria-label={`${title} loading`} />
            ) : isEmpty ? (
              <div className="chart-empty-state">{emptyMessage}</div>
            ) : (
              children
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChartCard;

