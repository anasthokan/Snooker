# GameHub Pro Backend – Deployment Checklist

## Pre-deploy

1. **Environment**
   - Copy `.env.example` to `.env` and set production values.
   - Set `DEBUG=false` in production.
   - Set a long random `JWT_SECRET_KEY` (e.g. 32+ chars).
   - Configure `DB_*` or `DATABASE_URL` for production PostgreSQL.
   - Set `CORS_ORIGINS` to your frontend URL(s) (e.g. `https://your-app.com`).

2. **Database**
   - Create the PostgreSQL database.
   - Run migrations: `python -m alembic upgrade head`
   - Seed super admin (once): `python -m scripts.seed_super_user` (optionally set `ADMIN_EMAIL`, `ADMIN_PASSWORD`).

3. **Dependencies**
   - Use a virtualenv; install: `pip install -r requirements.txt`

## Run

- **Local:** `uvicorn app.main:app --reload --port 8000`
- **Production:** `uvicorn app.main:app --host 0.0.0.0 --port 8000` (or use gunicorn + uvicorn workers behind a reverse proxy).

## Post-deploy checks

- `GET /health` returns `{"status":"ok"}`.
- `POST /auth/login` with admin credentials returns 200 and tokens.
- Use `/docs` to test protected endpoints with the token (Authorize).

## Frontend-aligned features (this release)

- **Sessions:** `GET /sessions?status=active`, `POST /sessions/start-with-players` (1–10 players).
- **Reports:** `GET /reports/revenue-by-game-type`, `GET /reports/revenue-by-hour`; filters `game_type_id`, `game_unit_id` on revenue/utilization/player-spend.
- **Users:** `GET /users/roles`, `GET /users`, `POST /users`, `GET /users/{id}`, `PATCH /users/{id}` (Tenant Admin / Super Admin).
- **Auth:** `POST /auth/forgot-password`, `POST /auth/reset-password`.
- **Products:** `category` field; **Game units:** `status` filter (e.g. `available`).
- **Max 10 players** per session enforced.

## Security notes

- In production, use HTTPS (reverse proxy or load balancer).
- Keep `JWT_SECRET_KEY` secret and strong.
- With `DEBUG=false`, forgot-password does not return the reset token in the response (wire email later if needed).
