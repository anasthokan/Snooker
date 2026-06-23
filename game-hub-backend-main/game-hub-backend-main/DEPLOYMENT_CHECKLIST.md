# Deployment Checklist – Canteen Orders (Optional Session/Player)

Copy these files to your server. Ensure **all** are present.

## New files to create on server

```
app/models/canteen_bill.py
app/schemas/order_1.py
app/schemas/billing_1.py
app/services/order_service_1.py
app/services/billing_service_1.py
app/services/pdf_bill_service_1.py
app/api/orders_1.py
app/api/billing_1.py
migrations/versions/005_canteen_bill.py
```

## Files to update on server

| File | Change |
|------|--------|
| `app/models/__init__.py` | Add CanteenBill, CanteenBillItem imports |
| `app/main.py` | Use `orders_1` and `billing_1` routers (not `orders` and `billing`) |
| `app/schemas/billing.py` | Must be 66 lines only – no self-imports |

## Critical: main.py imports

Your `main.py` must have:

```python
from app.api.orders_1 import router as orders_router
from app.api.billing_1 import router as billing_router, payments_router
```

**NOT** `orders` or `billing` (without the `_1`).

## Critical: billing.py

`app/schemas/billing.py` must **NOT** contain:
- `from app.schemas.billing import ...` (self-import)
- Any content beyond line 66

## After copying

1. Run: `alembic upgrade head` (or merge heads first if needed)
2. Restart: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
