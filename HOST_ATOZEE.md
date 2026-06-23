# GameHub Pro — Atozee RDP Hosting Guide

## Server details

| | |
|---|---|
| **Host** | `74.208.184.175` |
| **RDP Port** | `3389` |
| **App Port** | `8010` |

---

## Step 1: RDP se connect karein

1. Windows par **Remote Desktop Connection** open karein (`mstsc`)
2. Computer: `74.208.184.175`
3. User: `Administrator`
4. Password: (jo aapko diya gaya hai)
5. Login karein

> **Security:** Password chat mein share mat karein — login ke baad password change kar lein.

---

## Step 2: Project server par copy karein

**Option A — Zip (recommended)**

Apni local machine par:
```powershell
cd "C:\Users\a2z\Downloads\3Snooker (1)\scripts"
.\pack-for-rdp.ps1
```

`GameHub-Atozee-Deploy.zip` ko RDP clipboard/drive se server par copy karein, extract to:
```
C:\GameHub
```

**Option B — Folder copy**

Poora folder `3Snooker (1)` RDP se copy karke `C:\GameHub` par paste karein.

---

## Step 3: Server par one-click setup

RDP server par **PowerShell as Administrator**:
```powershell
cd C:\GameHub\scripts
.\setup-on-rdp.ps1
```

Ya double-click: `scripts\SETUP_ON_RDP.bat`

Yeh script:
- PostgreSQL check
- Database migrate
- Frontend build
- Firewall port 8010 open
- Server background mein start

---

## Step 4: `.env` configure (pehli dafa)

Edit: `C:\GameHub\game-hub-backend-main\game-hub-backend-main\.env`

```env
DB_PASSWORD=your_postgres_password
JWT_SECRET_KEY=long-random-secret-string
PUBLIC_APP_URL=http://74.208.184.175:8010
CORS_ORIGINS=http://74.208.184.175:8010
MOYASAR_PUBLISHABLE_KEY=pk_live_...
MOYASAR_SECRET_KEY=sk_live_...
```

Phir dubara: `.\setup-on-rdp.ps1`

---

## URLs (customers ko share karein)

| Page | URL |
|------|-----|
| **Customer payment** | http://74.208.184.175:8010/pay?tenant=1 |
| **Staff login** | http://74.208.184.175:8010/login |
| **Health** | http://74.208.184.175:8010/health |

---

## Note: 502 error

Agar `http://74.208.184.175:8010` par **502** aaye, matlab IIS/proxy chal raha hai lekin app backend nahi. `setup-on-rdp.ps1` chalane se uvicorn seedha port 8010 par start hoga.

---

## Reboot ke baad auto-start

```powershell
cd C:\GameHub\scripts
.\install-atozee-service.ps1 -Port 8010
```
