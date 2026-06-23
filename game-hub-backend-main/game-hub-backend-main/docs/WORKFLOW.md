# GameHub Pro – Full Workflow Explained

This doc explains how the backend works end-to-end: from login to data and roles.

---

## 1. What GameHub Pro Does

GameHub Pro is a **multi-tenant** backend for game parlours (e.g. PC gaming cafes). It supports:

- **Multiple tenants** (e.g. different branches or franchises). Each tenant has its own games, sessions, and orders.
- **Users with roles**: Super Admin, Tenant Admin, Manager, Cashier. Each user belongs to one tenant (except Super Admin who can see all).
- **Core operations**: define game types/units → start/pause/end **sessions** → add **orders** (game time + canteen) → **billing** and **payments** → **reports** and **AI** read-only data.

---

## 2. How a Request Flows (Big Picture)

```
  Client (browser / app)
       |
       |  HTTP request (e.g. GET /games/units  +  Header: Authorization: Bearer <token>)
       v
  ┌─────────────────────────────────────────────────────────────────┐
  │  FastAPI app                                                     │
  │  1. CORS middleware   (allows your frontend to call the API)    │
  │  2. TenantMiddleware (reads JWT → sets request.state.tenant_id)│
  │  3. Route handler     (e.g. GET /games/units)                    │
  │       │                                                         │
  │       │  Dependencies run first:                                │
  │       │  - get_db()        → database session                   │
  │       │  - RequireCashier  → get_current_user → check role       │
  │       │  - If no/invalid token → 401                             │
  │       │  - If wrong role    → 403                                │
  │       v                                                         │
  │  Your handler runs with: current_user, db, request.state.tenant_id
  │  → Service layer (e.g. list game units for current_user.tenant_id)
  │  → Return JSON response                                         │
  └─────────────────────────────────────────────────────────────────┘
       |
       v
  Client gets JSON (e.g. list of game units)
```

- **Public routes** (no token): `/health`, `/auth/login`, `/auth/refresh`, `/auth/logout`.
- **Protected routes**: All others need `Authorization: Bearer <access_token>`. The **JWT** carries user id, tenant id, and role; the middleware and dependencies use them.

---

## 3. Authentication Flow

```
  ┌──────────┐                    ┌─────────────┐                    ┌──────────┐
  │  Client  │                    │   Backend   │                    │   DB     │
  └────┬─────┘                    └──────┬──────┘                    └────┬─────┘
       │                                 │                                │
       │  POST /auth/login               │                                │
       │  { "email", "password" }        │                                │
       │────────────────────────────────>│                                │
       │                                 │  Find user by email (case-insensitive)
       │                                 │  Verify password (bcrypt)      │
       │                                 │───────────────────────────────>│
       │                                 │<───────────────────────────────│
       │                                 │  Create JWT access + refresh    │
       │  { "data": { "access_token",     │  (user id, tenant_id, role)     │
       │             "refresh_token",     │                                │
       │             "expires_in" } }     │                                │
       │<────────────────────────────────│                                │
       │                                 │                                │
       │  Later: any API call            │                                │
       │  Header: Authorization: Bearer <access_token>                   │
       │────────────────────────────────>│  Decode JWT → user + tenant     │
       │                                 │  Load user from DB if needed    │
       │  Response (200 + data)          │  Check role → run handler       │
       │<────────────────────────────────│                                │
```

- **Login**: You send email + password. Backend checks DB, then returns **access_token** and **refresh_token**.
- **Every protected request**: Client sends `Authorization: Bearer <access_token>`. Backend decodes the JWT, gets user id + tenant id + role, and uses them for permissions and data scoping.
- **Refresh**: When the access token expires, client can call `POST /auth/refresh` with `refresh_token` to get a new access (and refresh) token.

---

## 4. Multi-Tenancy (Tenant Isolation)

- Each **user** belongs to one **tenant** (stored in `user.tenant_id`). Super Admin is special and can work across tenants.
- The **JWT** includes `tenant_id`. The **TenantMiddleware** reads it and sets `request.state.tenant_id`.
- **APIs use this to scope data**: e.g. list games/sessions/orders only for that tenant. So:
  - Tenant A’s cashier only sees Tenant A’s data.
  - Super Admin can see all (handled in services where needed).

So the “workflow” for data is: **request comes in → JWT decoded → tenant_id set → every query filters by that tenant_id**.

---

## 5. Roles and Who Can Do What

| Role          | What they can do (typical) |
|---------------|----------------------------|
| **SUPER_ADMIN** | Everything: manage tenants, all data, all tenants. |
| **TENANT_ADMIN** | Manage their tenant and its users/setup. |
| **MANAGER**     | Reports (revenue, utilization, player spend). |
| **CASHIER**     | Day-to-day: games, sessions, orders, products, billing, payments. |

- **Tenants API** (`/tenants`): needs auth; Super Admin can create/list/update tenants.
- **Games** (`/games/types`, `/games/units`): **RequireCashier** (and above). Create/list/update game types and units for the tenant.
- **Sessions** (`/sessions/start`, pause, resume, end, add player): **RequireCashier**. All scoped by `current_user.tenant_id`.
- **Orders** (`/orders`): **RequireCashier**. Create/delete orders, list by session.
- **Billing & Payments** (`/billing/calculate`, `/payments`): **RequireCashier**. Calculate bill, record payment (single or split).
- **Products** (`/products`): **RequireCashier**. Canteen/products for orders.
- **Reports** (`/reports/revenue`, utilization, player-spend): **RequireManager** (and above).
- **AI** (`/ai/sessions`, revenue, players): Read-only, tenant-scoped; for dashboards/integrations.

So the “workflow” for permissions is: **JWT → get_current_user → require_roles(...) → only then run the handler**.

---

## 6. Business Flow (What Happens in a Parlour)

A typical day at one tenant (one branch):

1. **Setup (once or rarely)**  
   - Create **game types** (e.g. “PC”, “Console”).  
   - Create **game units** (e.g. “PC-01”, “PC-02”) linked to a type.  
   - Add **products** (e.g. chips, drinks) for canteen.

2. **When a customer comes**  
   - Cashier **starts a session**: `POST /sessions/start` with `game_type_id`, `game_unit_id`.  
   - Backend creates a session (start time, status active), scoped to the tenant.

3. **During the session**  
   - Optional: **add player** to session.  
   - Optional: **pause** / **resume** (e.g. break).  
   - Customer may order snacks: **create order** `POST /orders` (session_id, product/items).  
   - Session duration is computed as (now - start) - paused_seconds (and used in billing).

4. **When the customer leaves**  
   - Cashier **ends session**: `POST /sessions/end`.  
   - Backend can calculate **billing**: `POST /billing/calculate` (session, game rate, canteen, VAT, discount).  
   - Then **record payment**: `POST /payments` (single) or `POST /payments/split` (split payment).

5. **Later (manager)**  
   - **Reports**: revenue, utilization, player spend via `/reports/*`.  
   - **AI** endpoints: read-only data for dashboards.

So the **workflow** is: **Tenant → Game types/units → Sessions (start/pause/resume/end) → Orders → Billing → Payments → Reports / AI**.

---

## 7. Summary Diagram

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                     GameHub Pro Backend                   │
                    └─────────────────────────────────────────────────────────┘
                                              │
         ┌────────────────────────────────────┼────────────────────────────────────┐
         │                                    │                                      │
         v                                    v                                      v
   /auth/login                          TenantMiddleware                      Route handlers
   /auth/refresh     →                (JWT → tenant_id)        →        (get_current_user, Require*)
   /auth/logout                                                                     │
         │                                    │                                      │
         │                                    │                                      v
         │                                    │                              Services (DB, business logic)
         │                                    │                              - Always filter by tenant_id
         │                                    │                              - Roles already checked
         v                                    v                                      v
   access_token + refresh_token         request.state.tenant_id              JSON response to client
   (used in Authorization header)      (used in APIs for scoping)
```

---

## 8. Quick Test Flow (After Login)

1. **Login** → `POST /auth/login` → copy `access_token`.
2. **Authorize** in Swagger (or set header `Authorization: Bearer <access_token>`).
3. **Create a game type** → `POST /games/types` with `{"name":"PC","description":"Gaming PCs"}`.
4. **Create a game unit** → `POST /games/units` with `{"game_type_id": 1, "name":"PC-01"}` (use the id from step 3).
5. **Start a session** → `POST /sessions/start` with `{"game_type_id": 1, "game_unit_id": 1}`.
6. **End the session** → `POST /sessions/end` with `{"session_id": 1}`.
7. **Reports** (as Manager role) → `GET /reports/revenue`, etc.

That’s the full workflow from login to data and roles in one place.
