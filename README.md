# GameHub Pro – Multi-Game Parlour SaaS (Frontend)

React frontend for the GameHub Pro BRD: multi-tenant parlour management (Snooker, Pool, Carrom, TT, etc.) with sessions, canteen billing, and role-based access.

## Stack

- **Vite** + **React 19** + **TypeScript**
- **React Router** – auth and role-based routes
- **Recharts** – dashboard and reports
- **date-fns** – date filters in reports

## Run

```bash
npm install
npm run dev
```

Then open **http://localhost:5173**.

## Login (mock)

Use any of these emails to log in; role is chosen by email pattern:

| Role         | Email                  |
|-------------|------------------------|
| Super Admin | `admin@gamehub.pro`    |
| Tenant Owner| `owner@parlour.com`    |
| Manager     | `manager@parlour.com`  |
| Cashier    | `cashier@parlour.com`  |

Password: any (ignored in mock).

## Structure

- **Super Admin**: Dashboard, Tenants (CRUD + activate/deactivate), Subscription Plans, System Metrics.
- **Tenant**: Dashboard (KPIs, revenue by game, peak hours), Game Types CRUD, Game Units CRUD, **Start Game** (4 steps: game type → unit → players → start), **Active Sessions** (live timer, pause, canteen, end), **Canteen** (per-player orders, categories), **End Session** (duration, game + canteen, VAT, discount, single/split, cash/card/mixed), **Reports** (filters, revenue, utilization, heatmap), **Role Management** (create role, permissions, assign users).

## Theme

Dark “gaming” theme via CSS variables in `src/theme/variables.css` and `src/index.css`. Responsive layout with sidebar; tablet-friendly for cashier use.

## Backend

UI uses mock data and `sessionStorage` for the active session. Replace with your backend API when ready (same types in `src/types/index.ts`).
