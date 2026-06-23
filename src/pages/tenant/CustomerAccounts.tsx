import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  searchCustomerAccounts,
  getCustomerAccount,
  settleCustomerAccount,
  type CustomerAccountSummary,
  type CustomerAccountDetail,
} from '../../api/customerAccounts';
import { CurrencyIcon } from '../../components/CurrencyIcon';

function monthRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end) };
}

export default function CustomerAccounts() {
  const customerPayUrl = `${window.location.origin}/pay`;
  const customerPortalUrl = `${window.location.origin}/customer/login`;
  const initialRange = useMemo(() => monthRange(), []);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState(initialRange.start);
  const [endDate, setEndDate] = useState(initialRange.end);
  const [onlyWithBalance, setOnlyWithBalance] = useState(true);
  const [accounts, setAccounts] = useState<CustomerAccountSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<CustomerAccountDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleNotes, setSettleNotes] = useState('');
  const [settling, setSettling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await searchCustomerAccounts({
        q: searchQuery.trim() || undefined,
        start_date: startDate,
        end_date: endDate,
        only_with_balance: onlyWithBalance,
      });
      setAccounts(res.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load accounts');
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, startDate, endDate, onlyWithBalance]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 300);
    return () => clearTimeout(timer);
  }, [load]);

  const openDetail = async (row: CustomerAccountSummary) => {
    setDetailLoading(true);
    setError('');
    setSettleAmount(String(row.balance));
    setSettleNotes('');
    try {
      const res = await getCustomerAccount(row.customer_id, {
        start_date: startDate,
        end_date: endDate,
      });
      setSelected(res.data ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load account detail');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSettle = async () => {
    if (!selected) return;
    const amount = Number(settleAmount);
    if (!amount || amount <= 0) return;
    setSettling(true);
    setError('');
    try {
      await settleCustomerAccount(selected.customer_id, {
        amount,
        notes: settleNotes.trim() || undefined,
      });
      setSelected(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Settlement failed');
    } finally {
      setSettling(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Customer Accounts</h2>
          <p style={{ margin: '0.35rem 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Month-end credit accounts — search by mobile or name, view daily bills, settle payment
          </p>
        </div>
      </div>

      {error && <div className="toast-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div className="kpi-card" style={{ padding: '1rem', marginBottom: '1rem', border: '1px solid var(--primary)' }}>
        <strong>Customer portal link</strong>
        <p style={{ margin: '0.5rem 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Share this URL — customers can sign up, view tables, start games, add canteen, and use credit (month-end account):
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input className="form-input" readOnly value={customerPortalUrl} style={{ flex: 1, minWidth: 200 }} />
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              void navigator.clipboard.writeText(customerPortalUrl);
            }}
          >
            Copy Link
          </button>
        </div>
      </div>

      <div className="kpi-card" style={{ padding: '1rem', marginBottom: '1rem', border: '1px solid var(--primary)' }}>
        <strong>Customer payment link</strong>
        <p style={{ margin: '0.5rem 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Share this URL with customers so they can pay their balance online (Mada / Card / Apple Pay):
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input className="form-input" readOnly value={customerPayUrl} style={{ flex: 1, minWidth: 200 }} />
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              void navigator.clipboard.writeText(customerPayUrl);
            }}
          >
            Copy Link
          </button>
        </div>
      </div>

      <div className="kpi-card" style={{ padding: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0, minWidth: 200, flex: 1 }}>
            <label className="form-label">Search (mobile / name / ID)</label>
            <input
              className="form-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g. 03001234567"
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">From</label>
            <input
              type="date"
              className="form-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">To</label>
            <input
              type="date"
              className="form-input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <input
              type="checkbox"
              checked={onlyWithBalance}
              onChange={(e) => setOnlyWithBalance(e.target.checked)}
            />
            Only with due balance
          </label>
        </div>
      </div>

      {loading ? (
        <div className="page-loading"><p>Loading accounts…</p></div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Mobile</th>
                <th>Due Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No accounts found for this period.
                  </td>
                </tr>
              ) : (
                accounts.map((row) => (
                  <tr key={row.customer_id}>
                    <td>{row.customer_id}</td>
                    <td>{row.name}</td>
                    <td>{row.mobile ?? '-'}</td>
                    <td>
                      <CurrencyIcon />
                      {Number(row.balance).toFixed(2)}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => openDetail(row)}
                        disabled={detailLoading}
                      >
                        View Report
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>{selected.customer_name} — Account Report</h3>
              <button type="button" className="btn btn-ghost" onClick={() => setSelected(null)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div className="kpi-card" style={{ padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Debit</div>
                  <div style={{ fontWeight: 700 }}>
                    <CurrencyIcon />
                    {Number(selected.total_debit).toFixed(2)}
                  </div>
                </div>
                <div className="kpi-card" style={{ padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Credit</div>
                  <div style={{ fontWeight: 700 }}>
                    <CurrencyIcon />
                    {Number(selected.total_credit).toFixed(2)}
                  </div>
                </div>
                <div className="kpi-card" style={{ padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Due Balance</div>
                  <div style={{ fontWeight: 700, color: 'var(--error)' }}>
                    <CurrencyIcon />
                    {Number(selected.balance).toFixed(2)}
                  </div>
                </div>
              </div>

              <h4 style={{ margin: '0 0 0.75rem' }}>Daily Bills</h4>
              {selected.daily_entries.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>No entries in this period.</p>
              ) : (
                selected.daily_entries.map((day) => (
                  <div key={day.date} className="kpi-card" style={{ padding: '0.75rem', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <strong>{day.date}</strong>
                      <span>
                        Debit: <CurrencyIcon />
                        {Number(day.debit_total).toFixed(2)}
                        {Number(day.credit_total) > 0 && (
                          <>
                            {' '}| Credit: <CurrencyIcon />
                            {Number(day.credit_total).toFixed(2)}
                          </>
                        )}
                      </span>
                    </div>
                    {day.debits.map((bill) => (
                      <div
                        key={bill.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '0.9rem',
                          padding: '0.25rem 0',
                          borderTop: '1px solid var(--border)',
                        }}
                      >
                        <span>
                          {bill.description || `Session #${bill.session_id ?? '-'}`}
                        </span>
                        <span>
                          <CurrencyIcon />
                          {Number(bill.amount).toFixed(2)}
                        </span>
                      </div>
                    ))}
                    {day.credits.map((bill) => (
                      <div
                        key={bill.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '0.9rem',
                          padding: '0.25rem 0',
                          borderTop: '1px solid var(--border)',
                          color: 'var(--success)',
                        }}
                      >
                        <span>{bill.description || 'Settlement'}</span>
                        <span>
                          -<CurrencyIcon />
                          {Number(bill.amount).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                ))
              )}

              {Number(selected.balance) > 0 && (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                  <h4 style={{ margin: '0 0 0.75rem' }}>Settle Account (Credit Payment)</h4>
                  <div className="form-group">
                    <label className="form-label">Amount received</label>
                    <input
                      type="number"
                      className="form-input"
                      value={settleAmount}
                      onChange={(e) => setSettleAmount(e.target.value)}
                      min={0}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Notes (optional)</label>
                    <input
                      className="form-input"
                      value={settleNotes}
                      onChange={(e) => setSettleNotes(e.target.value)}
                      placeholder="Month-end settlement"
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSettle}
                    disabled={settling}
                  >
                    {settling ? 'Recording…' : 'Record Settlement'}
                  </button>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
