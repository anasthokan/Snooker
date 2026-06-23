export default function SystemMetrics() {
  return (
    <div>
      <div className="page-header">
        <h2>System Metrics</h2>
      </div>
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">API Requests (24h)</div>
          <div className="kpi-value">124k</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Avg Response Time</div>
          <div className="kpi-value">42ms</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Uptime</div>
          <div className="kpi-value">99.98%</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Active Sessions (All Tenants)</div>
          <div className="kpi-value">89</div>
        </div>
      </div>
    </div>
  );
}
