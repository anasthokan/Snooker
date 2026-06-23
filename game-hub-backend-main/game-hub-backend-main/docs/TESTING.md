# GameHub Pro Backend – Step-by-Step Testing Guide

This guide walks you through testing the API in order, with copy-paste examples. Use **Swagger UI** (`http://localhost:8000/docs`) or **Postman** (same requests).

---

## Prerequisites

Before testing, ensure:

1. **Database** – PostgreSQL running; database `gamehub` exists.
2. **Environment** – `.env` file in `gamehub-backend` with correct `DB_*` (or `DATABASE_URL`).
3. **Migrations** – Run once:
   ```powershell
   cd "c:\Users\sayyed fardeen\Desktop\gaminig hub\gamehub-backend"
   .\venv\Scripts\python.exe -m alembic upgrade head
   ```
4. **Seed admin** – Run once (creates `admin@gamehub.local` / `Admin@123`):
   ```powershell
   .\venv\Scripts\python.exe -m scripts.seed_super_user
   ```
5. **Start server**:
   ```powershell
   .\venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
   ```
   Leave this terminal open. Open browser: **http://localhost:8000/docs**

---

## Step 1: Health check (no auth)

**Purpose:** Confirm the API is running.

| Method | URL | Body |
|--------|-----|------|
| GET | http://localhost:8000/health | — |

**Example (Swagger):** Open **GET /health** → **Try it out** → **Execute**.

**Expected response (200):**
```json
{
  "status": "ok"
}
```

---

## Step 2: Login and get token

**Purpose:** Get `access_token` to call protected endpoints.

| Method | URL | Body |
|--------|-----|------|
| POST | http://localhost:8000/auth/login | JSON below |

**Request body:**
```json
{
  "email": "admin@gamehub.local",
  "password": "Admin@123"
}
```

**Example (Swagger):** **POST /auth/login** → **Try it out** → paste the JSON above → **Execute**.

**Expected response (200):**
```json
{
  "status": "success",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "expires_in": 3600
  },
  "message": "Login successful"
}
```

**Copy the `access_token`** (the long string from `data.access_token`).

---

## Step 3: Authorize in Swagger

**Purpose:** So every protected request sends the token automatically.

1. In Swagger UI, click **Authorize** (top right).
2. In the **Value** box, paste your **access_token** (you can paste with or without `Bearer ` – Swagger often adds it).
3. Click **Authorize**, then **Close**.

After this, all requests in the docs will include `Authorization: Bearer <token>`.

---

## Step 4: Test tenants (Super Admin)

**Purpose:** Create and list tenants.

### 4.1 List tenants

| Method | URL |
|--------|-----|
| GET | http://localhost:8000/tenants |

**Expected (200):** List of tenants (may be empty or include the default one).

### 4.2 Create tenant

| Method | URL | Body |
|--------|-----|------|
| POST | http://localhost:8000/tenants | JSON below |

**Request body:**
```json
{
  "name": "Downtown Gaming Cafe",
  "status": "active",
  "subscription_plan": "basic"
}
```

**Expected (201):** Tenant object with `id`, `name`, `status`, `subscription_plan`, `created_at`.

---

## Step 5: Test game types and units

**Purpose:** Create a game type and a game unit (needed for sessions).

### 5.1 Create game type

| Method | URL | Body |
|--------|-----|------|
| POST | http://localhost:8000/games/types | JSON below |

**Request body:**
```json
{
  "name": "PC",
  "billing_type": "hourly",
  "icon": null,
  "status": "active"
}
```

**Expected (201):** Game type with `id` (e.g. `1`). **Note the `id`** for the next step.

**Other `billing_type` examples:** `"hourly"`, `"per_session"`, `"flat"`.

### 5.2 Create game unit

| Method | URL | Body |
|--------|-----|------|
| POST | http://localhost:8000/games/units | JSON below |

**Request body (use the `id` from 5.1 as `game_type_id`):**
```json
{
  "game_type_id": 1,
  "unit_name": "PC-01",
  "weekday_price": 50,
  "weekend_price": 80,
  "special_price": null,
  "status": "active"
}
```

**Expected (201):** Game unit with `id` (e.g. `1`). Note both **game_type_id** and **unit id** for sessions.

### 5.3 List game types and units

- **GET /games/types** – List all types.
- **GET /games/units** – List all units.
- **GET /games/units?game_type_id=1** – Units for type 1.
- **GET /games/units?status=active** – Only active/available units.

---

## Step 6: Test sessions

**Purpose:** Start a session, list active sessions, optionally add players.

### 6.1 Start a session (simple)

| Method | URL | Body |
|--------|-----|------|
| POST | http://localhost:8000/sessions/start | JSON below |

**Request body (use your game_type_id and unit id):**
```json
{
  "game_type_id": 1,
  "game_unit_id": 1
}
```

**Expected (200):** `session_id`, `game_type_id`, `game_unit_id`, `start_time`, `status: "active"`. **Note `session_id`** (e.g. `1`).

### 6.2 List sessions (e.g. for dashboard)

| Method | URL |
|--------|-----|
| GET | http://localhost:8000/sessions |
| GET | http://localhost:8000/sessions?status=active |
| GET | http://localhost:8000/sessions?status=ended |

**Expected (200):** List of sessions (each with `id`, `status`, `duration_seconds`, etc.).

### 6.3 Start session with players (one request)

| Method | URL | Body |
|--------|-----|------|
| POST | http://localhost:8000/sessions/start-with-players | JSON below |

**Request body:**
```json
{
  "game_type_id": 1,
  "game_unit_id": 1,
  "players": [
    { "name": "Alice", "mobile": "9999999999", "membership_id": null },
    { "name": "Bob", "mobile": null, "membership_id": "M001" }
  ]
}
```

**Rules:** Minimum 1 player, maximum 10. `name` required; `mobile` and `membership_id` optional.

**Expected (200):** Same shape as **POST /sessions/start** (session created with players).

### 6.4 Add a player to an existing session

| Method | URL | Body |
|--------|-----|------|
| POST | http://localhost:8000/sessions/players | JSON below |

**Request body:**
```json
{
  "session_id": 1,
  "name": "Charlie",
  "mobile": null,
  "membership_id": null
}
```

**Expected (201):** Player object with `id`, `session_id`, `name`, `mobile`, `membership_id`.  
**Note:** Max 10 players per session; adding an 11th returns **400**.

### 6.5 Get session detail (with players and duration)

| Method | URL |
|--------|-----|
| GET | http://localhost:8000/sessions/1 |

**Expected (200):** Session object plus `players` array and `duration_seconds`.

### 6.6 Pause and resume (optional)

- **POST /sessions/pause** – Body: `{ "session_id": 1 }`
- **POST /sessions/resume** – Body: `{ "session_id": 1 }`

### 6.7 End session

| Method | URL | Body |
|--------|-----|------|
| POST | http://localhost:8000/sessions/end | `{ "session_id": 1 }` |

**Expected (200):** `session_id`, `status: "ended"`, `end_time`, `duration_seconds`.

---

## Step 7: Test products (canteen)

**Purpose:** Create products so you can add orders to a session.

### 7.1 Create product

| Method | URL | Body |
|--------|-----|------|
| POST | http://localhost:8000/products | JSON below |

**Request body:**
```json
{
  "name": "Cola",
  "price": 20,
  "category": "Drinks",
  "status": "active"
}
```

**Expected (201):** Product with `id`, `name`, `price`, `category`, `status`.

**Another example:**
```json
{
  "name": "Chips",
  "price": 15,
  "category": "Snacks",
  "status": "active"
}
```

### 7.2 List products

- **GET /products** – List all products for the tenant.

---

## Step 8: Test orders (canteen per player)

**Purpose:** Add canteen items to a **player** in a session. Session must be active and have at least one player.

**Request body:** You need a valid `session_id` and `player_id` (from **GET /sessions/{id}** → `players[].id`).

### 8.1 Create order

| Method | URL | Body |
|--------|-----|------|
| POST | http://localhost:8000/orders | JSON below |

**Request body (replace session_id, player_id, product_id):**
```json
{
  "session_id": 1,
  "player_id": 1,
  "product_id": 1,
  "quantity": 2,
  "price": 20
}
```

**Expected (201):** Order with `id`, `session_id`, `player_id`, `product_id`, `quantity`, `price`.

### 8.2 List orders for a session

| Method | URL |
|--------|-----|
| GET | http://localhost:8000/orders/session/1 |

**Expected (200):** List of orders for that session.

---

## Step 9: Test billing and payments

**Purpose:** Calculate bill for a session, then record payment (single or split). Session should be **ended** for a full bill.

### 9.1 Calculate bill

| Method | URL | Body |
|--------|-----|------|
| POST | http://localhost:8000/billing/calculate | JSON below |

**Request body:**
```json
{
  "session_id": 1,
  "vat_percent": 5,
  "discount_amount": 0
}
```

**Expected (200):** `game_charge`, `canteen_charge`, `subtotal`, `vat_percent`, `vat_amount`, `discount_amount`, `total`, `duration_seconds`, `rate_used`.

### 9.2 Single payment

| Method | URL | Body |
|--------|-----|------|
| POST | http://localhost:8000/payments | JSON below |

**Request body:**
```json
{
  "session_id": 1,
  "amount": 150,
  "method": "cash",
  "status": "completed"
}
```

**Expected (201):** Payment object with `id`, `session_id`, `amount`, `method`, `status`.

### 9.3 Split payment (optional)

| Method | URL | Body |
|--------|-----|------|
| POST | http://localhost:8000/payments/split | JSON below |

**Request body:**
```json
{
  "session_id": 1,
  "payments": [
    { "amount": 100, "method": "cash" },
    { "amount": 50, "method": "card" }
  ]
}
```

**Expected (200):** List of payment objects.

### 9.4 List payments for session

- **GET /payments/session/1** – List all payments for session 1.

---

## Step 10: Test reports (Manager role)

**Purpose:** Revenue, utilization, player spend, revenue by game type, revenue by hour.

Use **GET** with optional query params. All support `start_date` and `end_date` (format: `YYYY-MM-DD`).

### 10.1 Revenue summary

| Method | URL |
|--------|-----|
| GET | http://localhost:8000/reports/revenue |
| GET | http://localhost:8000/reports/revenue?start_date=2025-01-01&end_date=2025-01-31 |
| GET | http://localhost:8000/reports/revenue?game_type_id=1&game_unit_id=1 |

**Expected (200):** `total_revenue`, `game_revenue`, `canteen_revenue`, `period_start`, `period_end`, `session_count`.

### 10.2 Utilization

| Method | URL |
|--------|-----|
| GET | http://localhost:8000/reports/utilization?start_date=2025-01-01&end_date=2025-01-31 |

**Expected (200):** `total_units`, `utilized_units`, `utilization_percent`, `by_game_type`.

### 10.3 Player spend

| Method | URL |
|--------|-----|
| GET | http://localhost:8000/reports/player-spend?start_date=2025-01-01&end_date=2025-01-31 |

**Expected (200):** List of player spend per session (game + canteen).

### 10.4 Revenue by game type (dashboard)

| Method | URL |
|--------|-----|
| GET | http://localhost:8000/reports/revenue-by-game-type?start_date=2025-01-01&end_date=2025-01-31 |

**Expected (200):** List of `{ "game_type_id", "game_type_name", "revenue", "session_count" }`.

### 10.5 Revenue by hour (peak hours heatmap)

| Method | URL |
|--------|-----|
| GET | http://localhost:8000/reports/revenue-by-hour?start_date=2025-01-01&end_date=2025-01-31 |

**Expected (200):** List of `{ "hour": 0..23, "revenue": number }`.

---

## Step 11: Test user management (Tenant Admin / Super Admin)

**Purpose:** List roles, list users, create user, update user.

### 11.1 List roles (for dropdowns)

| Method | URL |
|--------|-----|
| GET | http://localhost:8000/users/roles |

**Expected (200):** List of roles (e.g. SUPER_ADMIN, TENANT_ADMIN, MANAGER, CASHIER) with `id`, `name`.

### 11.2 List users

| Method | URL |
|--------|-----|
| GET | http://localhost:8000/users |
| GET | http://localhost:8000/users?tenant_id=1 |

**Expected (200):** List of users (Super Admin can filter by `tenant_id`).

### 11.3 Create user

| Method | URL | Body |
|--------|-----|------|
| POST | http://localhost:8000/users | JSON below |

**Request body (use a valid `role_id` and `tenant_id` from GET /users/roles and GET /tenants):**
```json
{
  "email": "cashier1@gamehub.local",
  "password": "Cashier@123",
  "role_id": 4,
  "tenant_id": 1,
  "is_active": true
}
```

**Expected (201):** User object (no password). Tenant Admin can only use their own `tenant_id`.

### 11.4 Get and update user

- **GET /users/2** – Get user by id.
- **PATCH /users/2** – Body example: `{ "role_id": 3, "is_active": true }` or `{ "password": "NewPass@123" }`. Super Admin can also send `tenant_id`.

---

## Step 12: Test forgot password and reset password

**Purpose:** Request a reset token, then reset password. With `DEBUG=true`, the token is returned in the response (no email).

### 12.1 Forgot password

| Method | URL | Body |
|--------|-----|------|
| POST | http://localhost:8000/auth/forgot-password | JSON below |

**Request body:**
```json
{
  "email": "admin@gamehub.local"
}
```

**Expected (200):** Message like "If the email is registered, a reset link has been sent...".  
If **DEBUG=true** in `.env`, response also includes `"reset_token": "..."`. Copy it for the next step.

### 12.2 Reset password

| Method | URL | Body |
|--------|-----|------|
| POST | http://localhost:8000/auth/reset-password | JSON below |

**Request body (use token from 12.1 if DEBUG=true):**
```json
{
  "token": "<paste reset_token here>",
  "new_password": "NewAdmin@456"
}
```

**Expected (200):** "Password reset successful". Then log in with the new password to confirm.

---

## Step 13: Full flow example (copy-paste order)

Run these in order in Swagger (after **Authorize** with your token):

1. **GET /health** – OK  
2. **POST /auth/login** – get token, then Authorize  
3. **POST /games/types** – create "PC", note `id`  
4. **POST /games/units** – create "PC-01" for that type, note `id`  
5. **POST /products** – create "Cola", note `id`  
6. **POST /sessions/start-with-players** – game_type_id, game_unit_id, players: `[{ "name": "Test User" }]`  
7. **GET /sessions/1** – note `players[0].id`  
8. **POST /orders** – session_id=1, player_id from step 7, product_id from step 5, quantity=1, price=20  
9. **POST /sessions/end** – session_id=1  
10. **POST /billing/calculate** – session_id=1  
11. **POST /payments** – session_id=1, amount=total from step 10, method="cash"  
12. **GET /reports/revenue** – with today’s date or range  
13. **GET /reports/revenue-by-game-type**  
14. **GET /reports/revenue-by-hour**  
15. **GET /sessions?status=ended**

---

## Run automated tests (Pytest)

From project root:

```powershell
cd "c:\Users\sayyed fardeen\Desktop\gaminig hub\gamehub-backend"
.\venv\Scripts\python.exe -m pytest tests/ -v
```

- **Unit:** `pytest tests/unit/ -v` (security, JWT, session duration)  
- **API:** `pytest tests/api/ -v` (health, auth, protected endpoints, response format)  
- **Load:** `pytest tests/load/ -v` (health under load, response time)

**Expected:** All tests pass (e.g. 36 passed). If any fail, check that the app and DB are in a clean state and migrations are up to date.

---

## Error responses

All errors use this shape:

```json
{
  "status": "error",
  "error_code": 401,
  "message": "Invalid email or password"
}
```

Use `error_code` (e.g. 401, 403, 404, 422) and `message` in your frontend.

---

## Quick reference – endpoints summary

| Area | Key endpoints |
|------|----------------|
| Auth | POST /auth/login, /auth/refresh, /auth/forgot-password, /auth/reset-password |
| Tenants | GET/POST /tenants, GET/PATCH /tenants/{id} |
| Users | GET /users/roles, GET/POST /users, GET/PATCH /users/{id} |
| Games | POST/GET /games/types, POST/GET/PATCH /games/units, ?status= |
| Sessions | GET /sessions, POST /sessions/start, /sessions/start-with-players, /sessions/players, GET /sessions/{id}, pause, resume, end |
| Products | POST/GET /products, GET /products/{id} (category supported) |
| Orders | POST /orders, GET /orders/session/{id}, DELETE /orders/{id} |
| Billing | POST /billing/calculate |
| Payments | POST /payments, POST /payments/split, GET /payments/session/{id} |
| Reports | GET /reports/revenue, /utilization, /player-spend, /revenue-by-game-type, /revenue-by-hour (?start_date, &end_date, &game_type_id, &game_unit_id) |
| AI | GET /ai/sessions, /ai/revenue, /ai/players (read-only) |
