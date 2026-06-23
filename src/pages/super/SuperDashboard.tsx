import { CurrencyIcon } from '../../components/CurrencyIcon';

const MOCK_TENANTS = 12;
const MOCK_ACTIVE = 10;
const MOCK_REVENUE = 84750;

export default function SuperDashboard() {
  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem' }}>System Overview</h2>
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Total Tenants</div>
          <div className="kpi-value">{MOCK_TENANTS}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Active Tenants</div>
          <div className="kpi-value">{MOCK_ACTIVE}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Platform Revenue (MTD)</div>
          <div className="kpi-value">
            <CurrencyIcon />
            {MOCK_REVENUE.toLocaleString()}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">New Signups (30d)</div>
          <div className="kpi-value">3</div>
        </div>
      </div>
      <div style={{ marginTop: '2rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Quick Actions</h3>
        <p style={{ color: 'var(--text-secondary)' }}>Create tenant, manage plans, view system metrics from the sidebar.</p>
      </div>
    </div>
  );
}
