"""
Supabase client for per-user RLS enforcement (Option A: set_config approach).

Architecture:
- Uses the service_role key so PostgREST accepts requests without a Supabase Auth JWT.
  Our backend issues its own JWTs (signed with JWT_SECRET), which are not Supabase JWTs,
  so auth.uid() in RLS policies would not work with them.
- Instead, before each set of queries we call set_config('app.current_user_id', user_id)
  so RLS policies can use current_setting('app.current_user_id')::bigint.

Required RLS policy shape (run once in Supabase SQL editor):
    CREATE POLICY "user_isolation" ON public.transaction
        USING (user_id = current_setting('app.current_user_id')::bigint);
    -- Repeat for budget, processedemail tables.

CAVEAT: set_config is a separate HTTP round-trip before each operation.
With pgBouncer in transaction mode, the GUC may not survive to the next query.
For production safety either:
  a) Switch pgBouncer to session mode, or
  b) Migrate to Option B (Supabase Auth JWTs) — see MIGRATION_NOTES.md.

FUTURE: Option B — when users log in via Google OAuth, also sync them into
Supabase Auth and issue a Supabase JWT. Use that JWT via postgrest.auth() so
auth.uid() works natively in RLS policies with no set_config needed.
"""

import os
from supabase import create_client, Client

_supabase: Client | None = None


def get_base_client() -> Client:
    """Return the shared Supabase client (lazily initialized)."""
    global _supabase
    if _supabase is None:
        url = os.environ["SUPABASE_URL"]
        # Service role key: bypasses Supabase Auth JWT verification.
        # NEVER expose this key to the frontend.
        key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
        _supabase = create_client(url, key)
    return _supabase


def get_supabase_for_user(user_id: int) -> Client:
    """
    Return the Supabase client with the current user's ID set as a Postgres GUC.

    RLS policies must use current_setting('app.current_user_id')::bigint
    instead of auth.uid() to enforce row-level isolation.
    """
    client = get_base_client()
    # set_config(setting_name, new_value, is_local)
    # is_local=False → persists for the DB session (safe with session-mode pooling).
    client.rpc(
        "set_config",
        {
            "setting_name": "app.current_user_id",
            "new_value": str(user_id),
            "is_local": False,
        },
    ).execute()
    return client
