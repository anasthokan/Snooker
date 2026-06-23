import type { SubscriptionPlan } from '../../types';
import { CurrencyIcon } from '../../components/CurrencyIcon';

const MOCK_PLANS: SubscriptionPlan[] = [
  { id: 'p1', name: 'Starter', price: 1999, features: ['5 game units', '1 location', 'Basic reports'], maxUnits: 5 },
  { id: 'p2', name: 'Growth', price: 4999, features: ['20 game units', '3 locations', 'Advanced reports', 'API access'], maxUnits: 20 },
  { id: 'p3', name: 'Enterprise', price: 12999, features: ['Unlimited units', 'Unlimited locations', 'Custom branding', 'Priority support'], maxUnits: undefined },
];

export default function Plans() {
  return (
    <div>
      <div className="page-header">
        <h2>Subscription Plans</h2>
      </div>
      <div className="plans-grid">
        {MOCK_PLANS.map((plan) => (
          <div key={plan.id} className="kpi-card plan-card">
            <h3 className="plan-name">{plan.name}</h3>
            <div className="kpi-value plan-price">
              <CurrencyIcon />
              {plan.price.toLocaleString()}/mo
            </div>
            <ul className="plan-features">
              {plan.features.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
            <span className="plan-max-units">
              Max units: {plan.maxUnits ?? 'Unlimited'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
