import { CurrencyIcon } from '../../components/CurrencyIcon';

const PLANS = [
  { id: 'p1', name: 'Starter', price: 1999, features: ['Up to 5 game units', '1 location'], maxUnits: 5 },
  { id: 'p2', name: 'Pro', price: 4999, features: ['Up to 20 game units', '3 locations', 'Reports'], maxUnits: 20 },
  { id: 'p3', name: 'Enterprise', price: 12999, features: ['Unlimited units', 'Unlimited locations', 'API', 'Priority support'], maxUnits: undefined },
];

export default function SubscriptionPlans() {
  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem' }}>Subscription Plans</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
        {PLANS.map((p) => (
          <div key={p.id} className="kpi-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>{p.name}</h3>
            <div className="kpi-value" style={{ marginBottom: '1rem' }}>
              <CurrencyIcon />
              {p.price.toLocaleString()}/mo
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {p.features.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
            {p.maxUnits != null && <p style={{ margin: '1rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Max units: {p.maxUnits}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
