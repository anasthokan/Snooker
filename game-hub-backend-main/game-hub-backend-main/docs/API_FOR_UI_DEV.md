# GameHub Pro – API Guide for UI Developer

This document explains how your frontend should talk to the GameHub Pro backend API.

---

## Quick start (3 steps)

1. **API address**
   - Local: `http://localhost:8000`
   - Production: use the URL your team provides (e.g. `https://api.yourapp.com`)

2. **Get a token**
   - Call **POST** `http://localhost:8000/auth/login` with body:
   ```json
   { "email": "user@example.com", "password": "their_password" }
   ```
   - From the response, take `data.access_token` and save it (e.g. in memory or localStorage).

3. **Call other APIs**
   - For every request except login/refresh/forgot-password, send this header:
   ```
   Authorization: Bearer <paste access_token here>
   ```

That’s all you need to start. Details are below.

---

## Where to see the full API (Swagger)

Open in the browser:

- **Swagger (try all APIs):** `http://localhost:8000/docs`
- **ReDoc (read-only docs):** `http://localhost:8000/redoc`

There you can see every endpoint, request body, and response. Use the same base URL in production when the backend is deployed.

**Postman / code generation:** Use `http://localhost:8000/openapi.json` to import the API or generate a client.

---

## How login works (simple)

| Step | What to do in your app |
|------|------------------------|
| 1 | User enters email and password. |
| 2 | Send **POST /auth/login** with `{ "email": "...", "password": "..." }`. |
| 3 | If success: save `data.access_token` and `data.refresh_token`. |
| 4 | If error: show `message` from the response (e.g. "Invalid email or password"). |

**Using the token:**  
For all other requests (games, sessions, orders, etc.), add this header:

```
Authorization: Bearer <access_token>
```

**When the token expires:**  
Send **POST /auth/refresh** with `{ "refresh_token": "<saved refresh_token>" }`.  
You get a new `access_token` (and usually a new `refresh_token`). Replace the saved tokens and continue.

**Forgot password:**  
- **POST /auth/forgot-password** with `{ "email": "..." }` → user gets reset instructions (or in dev, a reset link/token).  
- **POST /auth/reset-password** with `{ "token": "...", "new_password": "..." }` → password is updated.

---

## How responses look (success vs error)

**When the API call succeeds (e.g. 200 or 201):**

```json
{
  "status": "success",
  "data": { ... the actual result ... },
  "message": "Optional short message"
}
```

- Use **`data`** for the content (list of games, created session, etc.).
- You can optionally show **`message`** to the user (e.g. “Session started”).

**When something goes wrong (e.g. 401, 403, 404, 422):**

```json
{
  "status": "error",
  "error_code": 401,
  "message": "Invalid email or password"
}
```

- Use **`error_code`** to decide what to do (e.g. 401 → redirect to login, 403 → show “Not allowed”).
- Show **`message`** to the user (or your own text based on `error_code`).

So in your UI: always check `status` (or HTTP status). If `status === "success"`, use `data`; if `status === "error"`, use `error_code` and `message`.

---

## What each part of the API is for

Short list so you know where to look in Swagger.

- **Health** – **GET /health**  
  Check if the API is up. No auth. Returns `{ "status": "ok" }`.

- **Auth** – **/auth/**  
  Login, refresh, forgot-password, reset-password. No auth header needed for these.

- **Tenants** – **/tenants**  
  Create, list, get, update tenants (for Super Admin). Needs auth.

- **Users & roles** – **/users**, **/users/roles**  
  List roles (for dropdowns), list users, create user, update user. For Tenant Admin / Super Admin. Needs auth.

- **Games** – **/games/types** and **/games/units**  
  Game types (e.g. PC, Snooker) and units (e.g. Table 1, PC-01). List units with optional filters: `?game_type_id=1` or `?status=active`. Needs auth (Cashier or above).

- **Sessions** – **/sessions**  
  - List: **GET /sessions** (optional: `?status=active` or `?status=ended`).  
  - Start: **POST /sessions/start** or **POST /sessions/start-with-players** (with a list of players).  
  - One session: **GET /sessions/{id}** (includes players and duration).  
  - Actions: **POST /sessions/pause**, **resume**, **end**.  
  - Add player: **POST /sessions/players**.  
  Needs auth (Cashier or above).

- **Products** – **/products**  
  Canteen items (name, price, category). Create, list, get one. Needs auth (Cashier or above).

- **Orders** – **/orders**  
  Add canteen orders to a player in a session (session_id, player_id, product_id, quantity, price). List by session. Delete order. Needs auth (Cashier or above).

- **Billing** – **/billing/calculate**  
  Calculate bill for a session (game + canteen + VAT − discount). Needs auth (Cashier or above).

- **Payments** – **/payments**  
  Record payment (single or split). List payments for a session. Needs auth (Cashier or above).

- **Reports** – **/reports/revenue**, **/reports/utilization**, **/reports/player-spend**, **/reports/revenue-by-game-type**, **/reports/revenue-by-hour**  
  Dashboards and charts. You can pass `start_date`, `end_date`, and optionally `game_type_id`, `game_unit_id`. Needs auth (Manager or above).

- **AI data** – **/ai/sessions**, **/ai/revenue**, **/ai/players**  
  Read-only data for analytics. Needs auth (Manager or above).

All of the above (except health and auth endpoints) need the **Authorization: Bearer &lt;access_token&gt;** header. The backend uses the token to know the user and their tenant; you don’t send tenant id from the UI.

---

## Roles (who can do what)

- **SUPER_ADMIN** – Can do everything, including manage all tenants and users.  
- **TENANT_ADMIN** – Can manage their own tenant and users in that tenant.  
- **MANAGER** – Can view reports and AI data; cannot manage tenants or users.  
- **CASHIER** – Can manage games, sessions, orders, products, billing, payments; cannot manage users or view some reports.

If the user is not allowed to do something, the API returns **403** and a message. In the UI you can hide or disable buttons based on the user’s role (you can get role from the login response or a “me” endpoint if the backend adds one).

---

## CORS (calling API from the browser)

The backend allows requests from certain frontend URLs (e.g. `http://localhost:3000`).  
If your UI runs on a different URL, the backend team must add that URL to their CORS list. If you get a CORS error in the browser, ask them to add your UI’s origin.

---

## Summary for UI dev

| You need to… | Use this |
|--------------|----------|
| See all endpoints and try them | Open **/docs** (Swagger) in the browser |
| Import into Postman or generate client | Use **/openapi.json** |
| Log the user in | **POST /auth/login**, then save `access_token` and `refresh_token` |
| Call any other API | Add header **Authorization: Bearer &lt;access_token&gt;** |
| Handle success | Read **`data`** from the response |
| Handle errors | Read **`error_code`** and **`message`** from the response |

If you need exact request/response examples for each endpoint, use **/docs** or ask for the **TESTING.md** document, which has step-by-step examples.
