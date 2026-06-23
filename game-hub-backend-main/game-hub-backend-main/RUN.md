# Quick run & fix common errors

## 1. Database connection error: "password authentication failed for user postgres"

**Cause:** Wrong PostgreSQL user/password or wrong `.env` file.

**Fix:**

1. **Use a real `.env` file** (the app reads `.env`, not `.env.example`):
   ```bash
   copy .env.example .env
   ```

2. **Use separate DB variables** (avoids password encoding issues). In `.env` set:
   ```
   DB_USER=postgres
   DB_PASSWORD=YOUR_ACTUAL_POSTGRES_PASSWORD
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=gamehub
   ```
   Do **not** set `DATABASE_URL` if you use these (or comment it out). The app will build the URL from `DB_*` and your password can contain `@`, `#`, etc. without encoding.

3. If you prefer one URL, set only:
   ```
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/gamehub
   ```
   If the password has `@` or `#`, URL-encode: `@` → `%40`, `#` → `%23`.

4. Create the database if needed (psql or pgAdmin):
   ```sql
   CREATE DATABASE gamehub;
   ```

5. Run migrations again:
   ```bash
   alembic upgrade head
   ```

## 2. "alembic is not recognized"

From the `gamehub-backend` folder, with your venv activated:

```bash
pip install -r requirements.txt
python -m alembic upgrade head
```

## 3. Run the app

```bash
uvicorn app.main:app --reload --port 8000
```

Then open http://localhost:8000/docs
