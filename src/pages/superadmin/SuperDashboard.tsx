import { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { listTenants } from '../../api';

export default function SuperDashboard() {
  const [totalTenants, setTotalTenants] = useState<number>(0);
  const [activeTenants, setActiveTenants] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listTenants();
      const list = res.data ?? [];
      setTotalTenants(list.length);
      setActiveTenants(list.filter((t) => t.status === 'active').length);
    } catch {
      setTotalTenants(0);
      setActiveTenants(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const tenantData = [
    { name: 'Total', tenants: totalTenants },
    { name: 'Active', tenants: activeTenants },
  ];

  return (
    <div>
      <div className="page-header">
        <h2>System Overview</h2>
      </div>
      <div className="kpi-grid" style={{ marginBottom: '2rem' }}>
        <div className="kpi-card">
          <div className="kpi-label">Total Tenants</div>
          <div className="kpi-value">{loading ? '–' : totalTenants}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Active Tenants</div>
          <div className="kpi-value">{loading ? '–' : activeTenants}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">MRR</div>
          <div className="kpi-value">–</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">New (This Month)</div>
          <div className="kpi-value">–</div>
        </div>
      </div>
      <div className="kpi-card" style={{ padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>Tenants Summary</h3>
        <div style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tenantData}>
              <XAxis dataKey="name" stroke="var(--text-muted)" />
              <YAxis stroke="var(--text-muted)" />
              <Tooltip contentStyle={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }} />
              <Bar dataKey="tenants" fill="var(--accent)" name="Tenants" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
