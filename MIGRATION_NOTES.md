# Migration Notes: SQLAlchemy → Supabase Client

## What changed

API routers (`transactions.py`, `budgets.py`, `dashboard.py`) were migrated from
SQLAlchemy ORM sessions to the `supabase-py` PostgREST client. The goal is to
enforce Row Level Security (RLS) at the database level so no user can ever
accidentally read or modify another user's data, even if application-level
filtering has a bug.

### Files modified

| File | Change |
|------|--------|
| `backend/supabase_client.py` | **New.** Base client + `get_supabase_for_user(user_id)` |
| `backend/auth.py` | Added `get_current_supabase` FastAPI dependency |
| `backend/routers/transactions.py` | Migrated to `supa.table("transaction")...` |
| `backend/routers/budgets.py` | Migrated to `supa.table("budget")...` |
| `backend/routers/dashboard.py` | Migrated; complex GROUP BY queries aggregated in Python |
| `backend/database.py` | Marked legacy (still used by sync_job + auth) |
| `backend/models.py` | Marked legacy (SQLModel tables still used by sync_job) |
| `backend/sync_job.py` | Added RLS bypass warning comment |
| `backend/requirements.txt` | Added `supabase>=2.0.0` |
| `backend/.env.example` | Added `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |

---

## What still uses SQLAlchemy (and why)

### `sync_job.py`
The background sync job has no request lifecycle, so there is no user JWT
available. It uses a direct SQLAlchemy connection as the Postgres superuser,
which bypasses RLS. **Safety is enforced by explicit `user_id` filters on every
query.** Do not remove those filters.

### `auth.py` (OAuth routes + `get_current_user`)
The `/auth/callback` route upserts the `User` record and needs a direct DB
session. `get_current_user` also fetches the `User` row by ID to validate the
JWT. These remain on SQLAlchemy because the `user` table is not exposed via
Supabase's PostgREST API in a simple way (it holds encrypted tokens), and
migrating it adds risk with no RLS benefit.

---

## JWT compatibility: why `auth.uid()` doesn't work (and what we did instead)

Our backend issues its own JWTs signed with `JWT_SECRET`. Supabase's RLS
policies using `auth.uid()` only work with Supabase-issued JWTs. Since the
frontend sends our JWT (not a Supabase JWT), PostgREST would reject it if we
set `postgrest.auth(jwt)`.

### Option A (implemented): `set_config` + `service_role` key

We use the `service_role` key so PostgREST accepts requests without JWT
verification. Before each operation, `get_supabase_for_user()` calls:

```sql
SELECT set_config('app.current_user_id', '<user_id>', false);
```

RLS policies must be written as:

```sql
USING (user_id = current_setting('app.current_user_id')::bigint)
```

**Required Supabase SQL setup** (run once in the SQL editor):

```sql
-- Transactions
ALTER TABLE public.transaction ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_isolation" ON public.transaction
  USING (user_id = current_setting('app.current_user_id')::bigint)
  WITH CHECK (user_id = current_setting('app.current_user_id')::bigint);

-- Budgets
ALTER TABLE public.budget ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_isolation" ON public.budget
  USING (user_id = current_setting('app.current_user_id')::bigint)
  WITH CHECK (user_id = current_setting('app.current_user_id')::bigint);

-- Processed emails
ALTER TABLE public.processedemail ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_isolation" ON public.processedemail
  USING (user_id = current_setting('app.current_user_id')::bigint)
  WITH CHECK (user_id = current_setting('app.current_user_id')::bigint);
```

**Known caveat:** `set_config` is a separate HTTP request to PostgREST
(separate DB transaction). With pgBouncer in **transaction mode** (Supabase
default), the GUC may not persist to the next query on a different connection.
To mitigate: switch the Supabase project to **session mode** pooling, or use
the direct connection string (non-pooled) for the backend.

### Option B (recommended long-term): Supabase Auth JWTs

When a user logs in via Google OAuth:
1. Also upsert the user in Supabase Auth via the admin client.
2. Issue a Supabase JWT in addition to our own JWT.
3. Store both JWTs in the frontend.
4. In `get_current_supabase`, call `client.postgrest.auth(supabase_jwt)`.
5. RLS policies can then use `auth.uid()` natively.

This eliminates the `set_config` round-trip and is fully compatible with
Supabase's standard RLS model. No changes to the existing JWT auth flow are
needed — the Supabase JWT is only used for DB calls.

---

## Dashboard: Python-side aggregation

The original `dashboard.py` used SQLAlchemy's `extract()` and `func.sum()`
for GROUP BY queries at the database level. PostgREST's query API doesn't
support arbitrary SQL functions directly.

The migrated version fetches filtered rows (by date range) and aggregates in
Python. For a personal finance app with hundreds to low thousands of transactions
per month, this is negligible. If the dataset grows significantly, move the
aggregations to Postgres functions called via `supa.rpc()`.

---

## Endpoints to manually verify after migration

No automated tests exist. Test these endpoints with a valid JWT:

| Endpoint | Method | Notes |
|----------|--------|-------|
| `GET /api/transactions` | GET | With and without month/year/category/bank filters |
| `POST /api/transactions` | POST | Check created_at and email_id="manual" |
| `PUT /api/transactions/{id}` | PUT | Verify 404 for another user's transaction |
| `DELETE /api/transactions/{id}` | DELETE | Same cross-user check |
| `GET /api/budgets` | GET | |
| `POST /api/budgets` | POST | Verify 409 on duplicate category |
| `GET /api/dashboard/summary` | GET | |
| `GET /api/dashboard/by-category` | GET | |
| `GET /api/dashboard/monthly-trend` | GET | |
| `GET /api/dashboard/budget-status` | GET | |
| `POST /api/sync` | POST | Still uses SQLAlchemy — verify sync still works |
