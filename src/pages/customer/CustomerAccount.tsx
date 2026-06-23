import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCustomerAccount, type CustomerAccountData } from '../../api/customerPortal';
import { CurrencyIcon } from '../../components/CurrencyIcon';

function monthRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end) };
}

export default function CustomerAccount() {
  const initialRange = useMemo(() => monthRange(), []);
  const [startDate, setStartDate] = useState(initialRange.start);
  const [endDate, setEndDate] = useState(initialRange.end);
  const [account, setAccount] = useState<CustomerAccountData | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getCustomerAccount({ start_date: startDate, end_date: endDate });
      setAccount(res.data ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load account');
      setAccount(null);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    void load();
  }, [load]);

  const dayDetail = account?.daily_entries.find((d) => d.date === selectedDay);

  if (loading) return <div className="page-loading"><p>Loading account…</p></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>My Account</h2>
          <p style={{ margin: '0.35rem 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Month-end credit — daily bills and total due
          </p>
        </div>
      </div>

      {error && <div className="toast-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div className="kpi-card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">From</label>
            <input type="date" className="form-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">To</label>
            <input type="date" className="form-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
      </div>

      {account && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="kpi-card" style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Due (Balance)</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent)' }}>
                <CurrencyIcon />{account.balance.toFixed(2)}
              </div>
            </div>
            <div className="kpi-card" style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Debit (Bills)</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                <CurrencyIcon />{account.total_debit.toFixed(2)}
              </div>
            </div>
            <div className="kpi-card" style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Paid (Credit)</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                <CurrencyIcon />{account.total_credit.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="kpi-card" style={{ padding: '1rem' }}>
            <h3 style={{ margin: '0 0 1rem' }}>Daily Report — click a day for details</h3>
            {account.daily_entries.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No account activity in this period.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Debit (Bills)</th>
                    <th>Credit (Paid)</th>
                    <th>Net</th>
                  </tr>
                </thead>
                <tbody>
                  {account.daily_entries.map((day) => (
                    <tr
                      key={day.date}
                      style={{ cursor: 'pointer', background: selectedDay === day.date ? 'var(--accent-glow)' : undefined }}
                      onClick={() => setSelectedDay(day.date)}
                    >
                      <td>{day.date}</td>
                      <td><CurrencyIcon />{day.debit_total.toFixed(2)}</td>
                      <td><CurrencyIcon />{day.credit_total.toFixed(2)}</td>
                      <td><CurrencyIcon />{(day.debit_total - day.credit_total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {dayDetail && (
            <div className="kpi-card" style={{ padding: '1rem', marginTop: '1rem' }}>
              <h3 style={{ margin: '0 0 1rem' }}>Details — {dayDetail.date}</h3>
              {dayDetail.debits.length > 0 && (
                <>
                  <strong>Bills (Debit)</strong>
                  <ul>
                    {dayDetail.debits.map((b) => (
                      <li key={b.id}>
                        <CurrencyIcon />{b.amount.toFixed(2)} — {b.description}
                        {b.session_id ? ` (Session #${b.session_id})` : ''}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {dayDetail.credits.length > 0 && (
                <>
                  <strong>Payments (Credit)</strong>
                  <ul>
                    {dayDetail.credits.map((c) => (
                      <li key={c.id}>
                        <CurrencyIcon />{c.amount.toFixed(2)} — {c.description}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <button type="button" className="btn btn-ghost" style={{ marginTop: '0.5rem' }} onClick={() => setSelectedDay(null)}>
                Close details
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
