import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createTenant } from '../../api';

function slugFromName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export default function CreateTenant() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleNameChange = (value: string) => {
    setName(value);
    setSlug(slugFromName(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      await createTenant({
        name: name.trim(),
        status: 'active',
        subscription_plan: '',
      });
      navigate('/super/tenants');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem' }}>Create Tenant</h2>
      {error && <div className="toast-error" style={{ marginBottom: '1rem' }}>{error}</div>}
      <form onSubmit={handleSubmit} style={{ maxWidth: 480 }}>
        <div className="form-group">
          <label className="form-label">Tenant Name</label>
          <input type="text" className="form-input" value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="e.g. Green Baize Snooker" required />
        </div>
        <div className="form-group">
          <label className="form-label">Slug</label>
          <input type="text" className="form-input" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="e.g. green-baize-snooker" />
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create'}</button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/super/tenants')}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
