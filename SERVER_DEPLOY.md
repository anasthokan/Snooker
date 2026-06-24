# Server Deploy — Frontend + Backend

> **Important:** GitHub par `git push` sirf code online save karta hai.  
> Server par **modified date tabhi change hogi** jab aap RDP par deploy script chalayenge.  
> Abhi `C:\Projects\game-hub-backend-main\...` purana code hai (6/22–6/23) — neeche wala step server par run karein.

## Sab se aasaan — ek command (RDP server par)

PowerShell **as Administrator** open karein, copy-paste karein:

```powershell
powershell -ExecutionPolicy Bypass -Command "iwr -UseBasicParsing https://raw.githubusercontent.com/anasthokan/Snooker/main/scripts/update-server-from-github.ps1 -OutFile C:\Projects\update-server-from-github.ps1; & C:\Projects\update-server-from-github.ps1"
```

Ya agar pehle se repo clone hai:

```powershell
cd C:\Projects\Snooker
git pull
.\scripts\deploy-server-iis.ps1
```

Double-click: `scripts\DEPLOY_SERVER.bat` (repo folder ke andar se)

---

Aapke server par yeh paths hain:

| Part | Path |
|------|------|
| **Frontend (IIS)** | `C:\inetpub\wwwroot\GameHub` |
| **Backend (FastAPI)** | `C:\Projects\game-hub-backend-main\game-hub-backend-main` |

---

## Option A — Git se (recommended)

**RDP server** par PowerShell:

```powershell
# Pehli dafa: clone
cd C:\Projects
git clone https://github.com/anasthokan/Snooker.git Snooker
cd Snooker\scripts

# Har update par:
cd C:\Projects\Snooker
git pull
.\scripts\deploy-server-iis.ps1
```

Ya double-click: `scripts\DEPLOY_SERVER.bat`

---

## Option B — Zip / folder copy

**Local machine** par zip banayein:

```powershell
cd "C:\Users\a2z\Downloads\3Snooker (1)\scripts"
.\pack-for-rdp.ps1
```

Zip ko server par copy karke extract karein (e.g. `C:\Projects\Snooker`), phir:

```powershell
cd C:\Projects\Snooker\scripts
.\deploy-server-iis.ps1
```

---

## API URL (agar frontend alag domain par hai)

Agar frontend `GameHub` IIS site par hai aur API alag host par:

```powershell
.\deploy-server-iis.ps1 -ApiUrl "https://snooker-apis.atozeesolutions.com"
```

Backend `.env` mein `CORS_ORIGINS` aur `PUBLIC_APP_URL` bhi frontend domain ke mutabiq hon.

---

## Script kya karta hai

1. `npm run build:split` — frontend `dist\` folder
2. `dist\` → `C:\inetpub\wwwroot\GameHub` (+ `web.config`)
3. Backend code → `C:\Projects\game-hub-backend-main\...` (`.env` safe rehta hai)
4. `pip install` + `alembic upgrade head`
5. `iisreset /restart`

---

## Manual (agar script na chalaye)

```powershell
cd C:\Projects\Snooker
npm ci
npm run build:split
robocopy dist C:\inetpub\wwwroot\GameHub /E
copy /Y deploy\frontend-web.config C:\inetpub\wwwroot\GameHub\web.config

robocopy game-hub-backend-main\game-hub-backend-main C:\Projects\game-hub-backend-main\game-hub-backend-main /E /XD .venv __pycache__ logs static_app /XF .env

cd C:\Projects\game-hub-backend-main\game-hub-backend-main
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m alembic upgrade head
iisreset /restart
```

---

## Check

- Frontend: browser se GameHub IIS site open karein → **Keep Tournament Going** menu dikhe
- API: `http://YOUR-API-HOST/health` → `{"status":"ok"}`
