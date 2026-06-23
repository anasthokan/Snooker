import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { listTenants } from '../../api';
import type { TenantListItem } from '../../api/types';

export default function TenantsList() {
  const [tenants, setTenants] = useState<TenantListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listTenants();
      setTenants(res.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tenants');
      setTenants([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <div><p>Loading tenants…</p></div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>Tenants</h2>
        <Link to="/super/tenants/create" className="btn btn-primary">Create Tenant</Link>
      </div>
      {error && <div className="toast-error" style={{ marginBottom: '1rem' }}>{error}</div>}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Status</th>
              <th>Plan</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.id}>
                <td>{t.id}</td>
                <td>{t.name}</td>
                <td>
                  <span style={{ color: t.status === 'active' ? 'var(--success)' : 'var(--text-muted)' }}>{t.status}</span>
                </td>
                <td>{t.subscription_plan ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
