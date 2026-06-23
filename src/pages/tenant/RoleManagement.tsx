import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { listRoles, listUsers, listTenants, getUser, createUser, updateUser } from '../../api';
import type { RoleItem, UserListItem, TenantListItem } from '../../api/types';

export default function RoleManagement() {
  const { user: authUser } = useAuth();
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [tenants, setTenants] = useState<TenantListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [viewUser, setViewUser] = useState<UserListItem | null>(null);
  const [editUser, setEditUser] = useState<UserListItem | null>(null);
  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    role_id: 0,
    display_name: '',
    tenant_id: 0,
    is_active: true,
  });
  const [editForm, setEditForm] = useState({ role_id: 0, display_name: '', is_active: true });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [rolesRes, usersRes, tenantsRes] = await Promise.all([
        listRoles(),
        listUsers(),
        authUser?.role === 'super_admin' ? listTenants() : Promise.resolve({ data: [] as TenantListItem[] }),
      ]);
      setRoles(rolesRes.data ?? []);
      setUsers(usersRes.data ?? []);
      setTenants(tenantsRes.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [authUser?.role]);

  useEffect(() => {
    load();
  }, [load]);

  const openView = async (u: UserListItem) => {
    setViewUser(u);
    try {
      const res = await getUser(u.id);
      if (res.data) setViewUser(res.data);
    } catch {
      // keep row data
    }
  };

  const openEdit = (u: UserListItem) => {
    setEditUser(u);
    setEditForm({
      role_id: u.role_id,
      display_name: u.display_name ?? '',
      is_active: u.is_active,
    });
  };

  const openCreate = () => {
    const defaultTenantId = authUser?.tenantId ? Number(authUser.tenantId) : tenants[0]?.id ?? 0;
    setCreateForm({
      email: '',
      password: '',
      role_id: roles[0]?.id ?? 0,
      display_name: '',
      tenant_id: defaultTenantId,
      is_active: true,
    });
    setShowCreate(true);
  };

  const handleCreate = async () => {
    if (!createForm.email.trim() || !createForm.password.trim()) return;
    setSaving(true);
    setError('');
    try {
      const tenantId =
        authUser?.role === 'super_admin' && createForm.tenant_id
          ? createForm.tenant_id
          : authUser?.tenantId
            ? Number(authUser.tenantId)
            : createForm.tenant_id;
      await createUser({
        email: createForm.email.trim(),
        password: createForm.password,
        role_id: createForm.role_id,
        tenant_id: tenantId,
        is_active: createForm.is_active,
        display_name: createForm.display_name.trim() || undefined,
      });
      await load();
      setShowCreate(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editUser) return;
    setSaving(true);
    setError('');
    try {
      await updateUser(editUser.id, {
        display_name: editForm.display_name.trim() || undefined,
        role_id: editForm.role_id,
        is_active: editForm.is_active,
      });
      await load();
      setEditUser(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const roleName = (roleId: number) => roles.find((r) => r.id === roleId)?.name ?? `Role ${roleId}`;
  const tenantName = (tenantId: number) => tenants.find((t) => t.id === tenantId)?.name ?? String(tenantId);
  const isSuperAdmin = authUser?.role === 'super_admin';

  if (loading) {
    return <div className="page-loading"><p>Loading…</p></div>;
  }

  return (
    <div>
      <div className="page-header">
        <h2>Role Management</h2>
        <button type="button" className="btn btn-primary" onClick={openCreate}>Create User</button>
      </div>
      {error && <div className="toast-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      <h3 className="section-title">Roles</h3>
      <div className="table-wrap" style={{ marginBottom: '2rem' }}>
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.name ?? `Role ${r.id}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="section-title">Users</h3>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Email</th>
              <th>Role</th>
              <th>Tenant</th>
              <th>Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.email}</td>
                <td>{roleName(u.role_id)}</td>
                <td>{isSuperAdmin ? tenantName(u.tenant_id) : u.tenant_id}</td>
                <td>{u.is_active ? 'Yes' : 'No'}</td>
                <td>
                  <button type="button" className="btn btn-secondary" style={{ marginRight: '0.5rem' }} onClick={() => openView(u)}>View</button>
                  <button type="button" className="btn btn-secondary" onClick={() => openEdit(u)}>Update</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Create User</h3>
              <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" className="form-input" value={createForm.email} onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))} placeholder="user@example.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input type="password" className="form-input" value={createForm.password} onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))} placeholder="Password" />
              </div>
              <div className="form-group">
                <label className="form-label">Display Name</label>
                <input type="text" className="form-input" value={createForm.display_name} onChange={(e) => setCreateForm((f) => ({ ...f, display_name: e.target.value }))} placeholder="Display name" />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-input" value={createForm.role_id} onChange={(e) => setCreateForm((f) => ({ ...f, role_id: Number(e.target.value) }))}>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name ?? `Role ${r.id}`}</option>
                  ))}
                </select>
              </div>
              {isSuperAdmin && (
                <div className="form-group">
                  <label className="form-label">Tenant</label>
                  <select className="form-input" value={createForm.tenant_id} onChange={(e) => setCreateForm((f) => ({ ...f, tenant_id: Number(e.target.value) }))}>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {!isSuperAdmin && (
                <input type="hidden" value={createForm.tenant_id} readOnly />
              )}
              <div className="form-group">
                <label className="form-label">Active</label>
                <select className="form-input" value={createForm.is_active ? 'true' : 'false'} onChange={(e) => setCreateForm((f) => ({ ...f, is_active: e.target.value === 'true' }))}>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handleCreate} disabled={saving}>{saving ? 'Creating…' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      {viewUser !== null && (
        <div className="modal-overlay" onClick={() => setViewUser(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>User Details</h3>
              <button type="button" className="btn btn-ghost" onClick={() => setViewUser(null)}>×</button>
            </div>
            <div className="modal-body">
              <dl style={{ margin: 0, display: 'grid', gap: '0.5rem' }}>
                <div>
                  <dt style={{ margin: 0, fontWeight: 600, color: 'var(--text-muted)' }}>ID</dt>
                  <dd style={{ margin: '0.25rem 0 0 0' }}>{viewUser.id}</dd>
                </div>
                <div>
                  <dt style={{ margin: 0, fontWeight: 600, color: 'var(--text-muted)' }}>Email</dt>
                  <dd style={{ margin: '0.25rem 0 0 0' }}>{viewUser.email}</dd>
                </div>
                <div>
                  <dt style={{ margin: 0, fontWeight: 600, color: 'var(--text-muted)' }}>Role ID</dt>
                  <dd style={{ margin: '0.25rem 0 0 0' }}>{viewUser.role_id} ({roleName(viewUser.role_id)})</dd>
                </div>
                <div>
                  <dt style={{ margin: 0, fontWeight: 600, color: 'var(--text-muted)' }}>Tenant ID</dt>
                  <dd style={{ margin: '0.25rem 0 0 0' }}>{viewUser.tenant_id} {isSuperAdmin ? `(${tenantName(viewUser.tenant_id)})` : ''}</dd>
                </div>
                <div>
                  <dt style={{ margin: 0, fontWeight: 600, color: 'var(--text-muted)' }}>Active</dt>
                  <dd style={{ margin: '0.25rem 0 0 0' }}>{viewUser.is_active ? 'Yes' : 'No'}</dd>
                </div>
              </dl>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setViewUser(null)}>Close</button>
              <button type="button" className="btn btn-primary" onClick={() => { setViewUser(null); openEdit(viewUser); }}>Edit</button>
            </div>
          </div>
        </div>
      )}

      {editUser !== null && (
        <div className="modal-overlay" onClick={() => setEditUser(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Update User</h3>
              <button type="button" className="btn btn-ghost" onClick={() => setEditUser(null)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)' }}>{editUser.email}</p>
              <div className="form-group">
                <label className="form-label">Display Name</label>
                <input type="text" className="form-input" value={editForm.display_name} onChange={(e) => setEditForm((f) => ({ ...f, display_name: e.target.value }))} placeholder="Display name" />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-input" value={editForm.role_id} onChange={(e) => setEditForm((f) => ({ ...f, role_id: Number(e.target.value) }))}>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name ?? `Role ${r.id}`}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Active</label>
                <select className="form-input" value={editForm.is_active ? 'true' : 'false'} onChange={(e) => setEditForm((f) => ({ ...f, is_active: e.target.value === 'true' }))}>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setEditUser(null)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handleUpdate} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
