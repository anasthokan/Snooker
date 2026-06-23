# Step-by-Step: How to Check the GameHub Pro API

Make sure the API is running: `uvicorn app.main:app --reload` (from `gamehub-backend` folder).

---

## Step 1: Health check (no login)

Open in browser or use curl:

- **URL:** http://127.0.0.1:8000/health  
- **Expected:** `{"status":"ok"}`

---

## Step 2: Create first admin user (one-time)

If you haven’t run the seed script yet, create a super admin:

```bash
cd gamehub-backend
# Activate your venv, then:
python -m scripts.seed_super_user
```

Default login: **admin@gamehub.local** / **Admin@123**

(Or: `python -m scripts.seed_super_user your@email.com YourPassword`)

---

## Step 3: Open Swagger UI

- **URL:** http://127.0.0.1:8000/docs  
- You’ll see all API endpoints grouped by tags (Auth, Tenants, Games, etc.).

---

## Step 4: Login and get token

1. In Swagger, find **Auth** → **POST /auth/login**.
2. Click **Try it out**.
3. Use this body (or your seeded email/password):

```json
{
  "email": "admin@gamehub.local",
  "password": "Admin@123"
}
```

4. Click **Execute**.
5. In the response (e.g. 200), copy the **access_token** from the `data` object.

---

## Step 5: Authorize in Swagger

1. Click the **Authorize** button (top right, lock icon).
2. In the **Value** field, paste: `Bearer <your_access_token>`  
   Example: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
3. Click **Authorize**, then **Close**.

All requests from Swagger will now send this token.

---

## Step 6: Test protected endpoints

With the token set, try these in order:

| Step | What to do | Where in Swagger |
|------|------------|------------------|
| 6a | List tenants | **Tenants** → **GET /tenants** → Execute |
| 6b | Create a game type | **Games** → **POST /games/types** → body: `{"name":"PC","billing_type":"hourly","status":"active"}` → Execute |
| 6c | List game types | **Games** → **GET /games/types** → Execute |
| 6d | Create a game unit | **Games** → **POST /games/units** → body: `{"game_type_id":1,"unit_name":"Seat 1","weekday_price":50,"weekend_price":70,"status":"active"}` → Execute |
| 6e | Start a session | **Sessions** → **POST /sessions/start** → body: `{"game_type_id":1,"game_unit_id":1}` → Execute |
| 6f | Get session details | **Sessions** → **GET /sessions/{session_id}** → use session id from 6e (e.g. 1) → Execute |
| 6g | Create a product (for canteen) | **Products** → **POST /products** → body: `{"name":"Cola","price":20,"status":"active"}` → Execute |
| 6h | Add player to session | **Sessions** → **POST /sessions/players** → body: `{"session_id":1,"name":"John","mobile":"9999999999"}` → Execute |
| 6i | Calculate bill | **Billing** → **POST /billing/calculate** → body: `{"session_id":1,"vat_percent":0,"discount_amount":0}` → Execute |
| 6j | End session | **Sessions** → **POST /sessions/end** → body: `{"session_id":1}` → Execute |

Check that each request returns **200** (or **201** for create) and that the response body looks correct.

---

## Step 7: Optional – use curl

From a terminal (replace `YOUR_TOKEN` with the real access token):

```bash
# Health
curl http://127.0.0.1:8000/health

# Login
curl -X POST http://127.0.0.1:8000/auth/login -H "Content-Type: application/json" -d "{\"email\":\"admin@gamehub.local\",\"password\":\"Admin@123\"}"

# List game types (use token from login)
curl http://127.0.0.1:8000/games/types -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Step 8: Optional – Reports and AI

- **Reports:** **Reports** → **GET /reports/revenue** (and utilization, player-spend). Add query params like `start_date` and `end_date` if you want.
- **AI data:** **AI Data** → **GET /ai/sessions**, **GET /ai/revenue**, **GET /ai/players**. Same token; these are read-only.

---

## Quick checklist

- [ ] Health returns `{"status":"ok"}`  
- [ ] Seed script run (first admin exists)  
- [ ] Login returns `access_token`  
- [ ] Authorize in Swagger with that token  
- [ ] GET /games/types returns 200 (maybe empty list)  
- [ ] Create game type and unit, start session, get session, calculate bill, end session  

If all of these work, the application is working end-to-end.
