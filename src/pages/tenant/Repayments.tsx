import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  listRepayments,
  createRepayment,
  updateRepayment,
  deleteRepayment,
} from '../../api';
import type { RepaymentCategory, RepaymentItem } from '../../api/types';
import { CurrencyIcon } from '../../components/CurrencyIcon';
import './Repayments.css';

const CATEGORIES: { value: RepaymentCategory; label: string }[] = [
  { value: 'electricity', label: 'Electricity Bill' },
  { value: 'rent', label: 'Rent' },
  { value: 'salary', label: 'Salary' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'other', label: 'Other' },
];

const CATEGORY_LABELS = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.label]),
) as Record<RepaymentCategory, string>;

function monthRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end) };
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

const emptyForm = () => ({
  category: 'electricity' as RepaymentCategory,
  amount: '',
  paid_at: todayStr(),
  notes: '',
});

export default function Repayments() {
  const initialRange = useMemo(() => monthRange(), []);
  const [startDate, setStartDate] = useState(initialRange.start);
  const [endDate, setEndDate] = useState(initialRange.end);
  const [filterCategory, setFilterCategory] = useState<'' | RepaymentCategory>('');
  const [items, setItems] = useState<RepaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<RepaymentItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listRepayments({
        start_date: startDate,
        end_date: endDate,
        category: filterCategory || undefined,
      });
      setItems(res.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load bill payments');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, filterCategory]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalAmount = useMemo(
    () => items.reduce((sum, row) => sum + Number(row.amount), 0),
    [items],
  );

  const categoryTotals = useMemo(() => {
    const totals: Partial<Record<RepaymentCategory, number>> = {};
    for (const row of items) {
      totals[row.category] = (totals[row.category] ?? 0) + Number(row.amount);
    }
    return totals;
  }, [items]);

  const openCreate = () => {
    setEditItem(null);
    setForm(emptyForm());
    setShowForm(true);
  };

  const openEdit = (row: RepaymentItem) => {
    setEditItem(row);
    setForm({
      category: row.category,
      amount: String(row.amount),
      paid_at: row.paid_at,
      notes: row.notes ?? '',
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditItem(null);
    setForm(emptyForm());
  };

  const handleSave = async () => {
    const amount = Number(form.amount);
    if (!amount || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (!form.paid_at) {
      setError('Please select payment date');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        category: form.category,
        amount,
        paid_at: form.paid_at,
        notes: form.notes.trim() || undefined,
      };
      if (editItem) {
        await updateRepayment(editItem.id, payload);
      } else {
        await createRepayment(payload);
      }
      closeForm();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: RepaymentItem) => {
    if (!window.confirm(`Delete ${CATEGORY_LABELS[row.category]} payment of ${row.amount}?`)) return;
    setError('');
    try {
      await deleteRepayment(row.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  return (
    <div className="repayments-page">
      <div className="page-header">
        <div>
          <h2>Bill Payment</h2>
          <p className="repayments-subtitle">
            Record outgoing payments — electricity, rent, salary, maintenance, and more.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          Record Payment
        </button>
      </div>

      {error && <div className="toast-error repayments-error">{error}</div>}

      <div className="repayments-filters card">
        <div className="repayments-filter-row">
          <label>
            From
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>
          <label>
            Category
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as '' | RepaymentCategory)}
            >
              <option value="">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="repayments-summary">
        <div className="repayments-summary-card card">
          <span className="repayments-summary-label">Total paid</span>
          <span className="repayments-summary-value">
            <CurrencyIcon />
            {totalAmount.toFixed(2)}
          </span>
        </div>
        {CATEGORIES.filter((c) => categoryTotals[c.value]).map((c) => (
          <div key={c.value} className="repayments-summary-card card">
            <span className="repayments-summary-label">{c.label}</span>
            <span className="repayments-summary-value">
              <CurrencyIcon />
              {(categoryTotals[c.value] ?? 0).toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="page-loading">
          <p>Loading bill payments…</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table repayments-table">
            <thead>
              <tr>
                <th>Date Paid</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Notes</th>
                <th>Recorded</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="repayments-empty">
                    No payments recorded for this period.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id}>
                    <td>{row.paid_at}</td>
                    <td>
                      <span className={`repayment-badge repayment-badge--${row.category}`}>
                        {CATEGORY_LABELS[row.category]}
                      </span>
                    </td>
                    <td>
                      <CurrencyIcon />
                      {Number(row.amount).toFixed(2)}
                    </td>
                    <td>{row.notes || '—'}</td>
                    <td>{new Date(row.created_at).toLocaleString()}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ marginRight: '0.5rem' }}
                        onClick={() => openEdit(row)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => void handleDelete(row)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={closeForm}>
          <div className="modal repayments-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>{editItem ? 'Edit Payment' : 'Record Payment'}</h3>
              <button type="button" className="btn btn-ghost repayments-modal-close" onClick={closeForm} aria-label="Close">
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label" htmlFor="bill-category">
                  What did you pay for?
                </label>
                <select
                  id="bill-category"
                  className="form-input"
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value as RepaymentCategory }))
                  }
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="bill-amount">
                  Amount (SAR)
                </label>
                <div className="repayments-amount-input">
                  <CurrencyIcon size={18} />
                  <input
                    id="bill-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    className="form-input"
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="bill-date">
                  Date paid
                </label>
                <input
                  id="bill-date"
                  type="date"
                  className="form-input"
                  value={form.paid_at}
                  onChange={(e) => setForm((f) => ({ ...f, paid_at: e.target.value }))}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="bill-notes">
                  Notes <span className="repayments-optional">(optional)</span>
                </label>
                <textarea
                  id="bill-notes"
                  rows={3}
                  className="form-input repayments-notes"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="e.g. March electricity bill, staff name, vendor…"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={closeForm} disabled={saving}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={() => void handleSave()} disabled={saving}>
                {saving ? 'Saving…' : editItem ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
