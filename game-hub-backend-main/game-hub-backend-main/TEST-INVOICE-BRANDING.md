# Test: Logo, VAT No, CR No on Invoice PDF

Use this flow to confirm tenant branding (logo, VAT no, CR no) appears on the generated bill PDF.

---

## 1. Set tenant branding (VAT, CR, logo)

**Option A – Enter values manually**

- **PATCH** `/profile/tenant-branding` (JSON body):
  - Body:
    ```json
    {
      "vat_no": "VAT-123456789",
      "cr_no": "CR-987654321",
      "invoice_logo_url": null
    }
    ```
  - Use a token for a user in the tenant you want to test (e.g. tenant id **13** “dash-gaming”).

**Option B – Upload logo from device**

- **POST** `/profile/upload-tenant-logo`
  - Body: **form-data**, key `file`, type **File** → choose an image (JPEG/PNG, &lt; 5 MB).
  - Same token (tenant admin for that tenant).
  - This sets `invoice_logo_url` to something like `/static/uploads/tenants/13/logo_xxxx.png`.

Then set VAT/CR if not already set:

- **PATCH** `/profile/tenant-branding`  
  Body: `{"vat_no": "VAT-123456789", "cr_no": "CR-987654321"}`

---

## 2. Confirm profile has branding

- **GET** `/profile/me`  
  - Response should include: `tenant_vat_no`, `tenant_cr_no`, `tenant_logo_url` (if logo was set).

---

## 3. Get a session for that tenant

You need a **session** that belongs to the **same tenant** (e.g. 13).

- List sessions (e.g. **GET** `/sessions` or your sessions endpoint) and note a `session_id` for that tenant, **or**
- Create/start a session for a game unit in that tenant and use its `session_id`.

Example: assume `session_id = 5` for tenant 13.

---

## 4. Generate the bill PDF

- **GET** `/billing/session/{session_id}/bill-pdf`  
  - Example: **GET** `/billing/session/5/bill-pdf`
  - Use the **same tenant user token** (Cashier or Tenant Admin for tenant 13).
  - Headers: `Authorization: Bearer <access_token>`.

The response is a **PDF file** (binary). In Swagger you can “Download” it; in Postman/curl save the response as a file and open it.

---

## 5. Check the PDF

Open the downloaded PDF. You should see:

- **Tenant name** at the top (e.g. “dash-gaming”).
- **Logo** (if you uploaded one) above the name.
- **VAT No: VAT-123456789**
- **CR No: CR-987654321**
- Session details, game charge, canteen charge, VAT %, total, and QR code below.

If any of these are missing, check:

- The user used for the request is in the correct tenant (`tenant_id` in JWT).
- VAT/CR were set via **PATCH /profile/tenant-branding** (or tenant create/update).
- Logo was set via **POST /profile/upload-tenant-logo** or **PATCH /profile/tenant-branding** with `invoice_logo_url`; uploaded files are under `uploads/` and served at `/static/uploads/`.

---

## Quick curl example (after login)

```bash
# 1) Login as tenant user (e.g. admin@dash-gaming.com), get ACCESS_TOKEN from response.

# 2) Set branding (optional if already set)
curl -X PATCH "http://localhost:8000/profile/tenant-branding" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"vat_no":"VAT-123456789","cr_no":"CR-987654321"}'

# 3) Download bill PDF (replace 5 with your session_id)
curl -X GET "http://localhost:8000/billing/session/5/bill-pdf" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -o bill-session-5.pdf

# 4) Open bill-session-5.pdf and verify logo, VAT No, CR No.
```

Replace `localhost:8000` with your API base URL if different.
