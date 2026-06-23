import { useState, useEffect, useCallback } from 'react';
import { getMe, updateMe } from '../api';
import type { ProfileItem } from '../api/types';

export default function Profile() {
  const [profile, setProfile] = useState<ProfileItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ display_name: '', mobile: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getMe();
      const p = res.data;
      setProfile(p ?? null);
      if (p) {
        setForm({
          display_name: p.display_name ?? '',
          mobile: p.mobile ?? '',
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load profile');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await updateMe({
        display_name: form.display_name.trim() || undefined,
        mobile: form.mobile.trim() || null,
      });
      if (res.data) setProfile(res.data);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = () => {
    if (profile) {
      setForm({
        display_name: profile.display_name ?? '',
        mobile: profile.mobile ?? '',
      });
      setEditing(true);
    }
  };

  if (loading) {
    return <div className="page-loading"><p>Loading profile…</p></div>;
  }

  if (!profile) {
    return (
      <div>
        <div className="page-header">
          <h2>Profile</h2>
        </div>
        {error && <div className="toast-error">{error}</div>}
        <p>Unable to load your profile.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2>Profile</h2>
        {!editing ? (
          <button type="button" className="btn btn-primary" onClick={startEdit}>Edit Profile</button>
        ) : (
          <>
            <button type="button" className="btn btn-secondary" style={{ marginRight: '0.5rem' }} onClick={() => setEditing(false)}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </>
        )}
      </div>
      {error && <div className="toast-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      {editing ? (
        <div style={{ maxWidth: '28rem', padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
          <div className="form-group">
            <label className="form-label">Display name</label>
            <input
              type="text"
              className="form-input"
              value={form.display_name}
              onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
              placeholder="Your display name"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Mobile</label>
            <input
              type="text"
              className="form-input"
              value={form.mobile}
              onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
              placeholder="9876543210"
            />
          </div>
        </div>
      ) : (
        <div style={{ maxWidth: '28rem', padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
          <dl style={{ margin: 0, display: 'grid', gap: '0.75rem' }}>
            <div>
              <dt style={{ margin: 0, fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.875rem' }}>ID</dt>
              <dd style={{ margin: '0.25rem 0 0 0' }}>{profile.id}</dd>
            </div>
            <div>
              <dt style={{ margin: 0, fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.875rem' }}>Email</dt>
              <dd style={{ margin: '0.25rem 0 0 0' }}>{profile.email}</dd>
            </div>
            {profile.role_name && (
              <div>
                <dt style={{ margin: 0, fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.875rem' }}>Role name</dt>
                <dd style={{ margin: '0.25rem 0 0 0' }}>{profile.role_name ?? '-'}</dd>
              </div>
            )}
            {profile.role_id != null && (
              <div>
                <dt style={{ margin: 0, fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.875rem' }}>Role ID</dt>
                <dd style={{ margin: '0.25rem 0 0 0' }}>{profile.role_id}</dd>
              </div>
            )}
            {profile.tenant_name && (
              <div>
                <dt style={{ margin: 0, fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.875rem' }}>Tenant name</dt>
                <dd style={{ margin: '0.25rem 0 0 0' }}>{profile.tenant_name ?? '-'}</dd>
              </div>
            )}
            {profile.tenant_id != null && (
              <div>
                <dt style={{ margin: 0, fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.875rem' }}>Tenant ID</dt>
                <dd style={{ margin: '0.25rem 0 0 0' }}>{profile.tenant_id}</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}
