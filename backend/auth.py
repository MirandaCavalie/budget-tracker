"""
Google OAuth2 web flow + JWT session management.

Flow:
  1. Frontend redirects to GET /auth/login  → server redirects to Google
  2. Google redirects back to GET /auth/callback?code=...
  3. Server exchanges code for tokens, upserts User, sets httponly JWT cookie
  4. All /api/* routes call get_current_user() which validates the JWT cookie
"""
import os
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from cryptography.fernet import Fernet
from dotenv import load_dotenv
from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from jose import JWTError, jwt
from sqlmodel import Session, select

from database import get_session
from models import User, UserRead

load_dotenv()
logger = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────
GOOGLE_CLIENT_ID     = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
FRONTEND_URL         = os.getenv("FRONTEND_URL", "http://localhost:5173")
BACKEND_URL          = os.getenv("BACKEND_URL", "http://localhost:8000")
JWT_SECRET           = os.getenv("JWT_SECRET", "change-me-in-production-use-openssl-rand-hex-32")
JWT_ALGORITHM        = "HS256"
JWT_EXPIRE_DAYS      = 30
FERNET_KEY           = os.getenv("FERNET_KEY", "")   # base64 32-byte key

# Gmail scope required to read bank notification emails
SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/gmail.readonly",
]

router = APIRouter(prefix="/auth", tags=["auth"])


# ── Fernet encryption for storing OAuth tokens ────────────────────────────────
def _get_fernet() -> Fernet:
    key = FERNET_KEY
    if not key:
        # Auto-generate one on first run (dev only — set FERNET_KEY in prod)
        key = Fernet.generate_key().decode()
        logger.warning("FERNET_KEY not set — using ephemeral key. Tokens won't survive restart.")
    if isinstance(key, str):
        key = key.encode()
    return Fernet(key)


def encrypt_token(token: str) -> str:
    return _get_fernet().encrypt(token.encode()).decode()


def decrypt_token(encrypted: str) -> str:
    return _get_fernet().decrypt(encrypted.encode()).decode()


# ── OAuth2 Flow helpers ───────────────────────────────────────────────────────
def _build_flow(state: Optional[str] = None) -> Flow:
    client_config = {
        "web": {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [f"{BACKEND_URL}/auth/callback"],
        }
    }
    flow = Flow.from_client_config(
        client_config,
        scopes=SCOPES,
        redirect_uri=f"{BACKEND_URL}/auth/callback",
        state=state,
    )
    return flow


# ── JWT helpers ───────────────────────────────────────────────────────────────
def create_jwt(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRE_DAYS)
    return jwt.encode({"sub": str(user_id), "exp": expire}, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_jwt(token: str) -> int:
    payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    return int(payload["sub"])


# ── Auth dependency — use in every protected route ────────────────────────────
def get_current_user(
    session_token: Optional[str] = Cookie(default=None),
    session: Session = Depends(get_session),
) -> User:
    if not session_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        user_id = decode_jwt(session_token)
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session")
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


# ── Gmail credentials helper (used by sync_job) ───────────────────────────────
def get_user_gmail_credentials(user: User) -> Optional[Credentials]:
    """Return a valid Credentials object for the user, refreshing if needed."""
    if not user.encrypted_refresh_token:
        return None

    refresh_token = decrypt_token(user.encrypted_refresh_token)
    access_token  = decrypt_token(user.encrypted_access_token) if user.encrypted_access_token else None

    creds = Credentials(
        token=access_token,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        scopes=SCOPES,
    )

    # Refresh if expired
    if not creds.valid:
        try:
            creds.refresh(GoogleRequest())
        except Exception as exc:
            logger.error("Failed to refresh token for user %d: %s", user.id, exc)
            return None

    return creds


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/login")
def login():
    """Redirect the browser to Google's OAuth consent screen."""
    from fastapi.responses import RedirectResponse
    flow = _build_flow()
    # access_type=offline gets us a refresh_token
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",   # always show consent so we always get refresh_token
    )
    return RedirectResponse(url=auth_url)


@router.get("/callback")
def callback(
    code: str,
    response: Response,
    session: Session = Depends(get_session),
):
    """Handle Google's redirect, exchange code for tokens, set session cookie."""
    from fastapi.responses import RedirectResponse

    try:
        flow = _build_flow()
        flow.fetch_token(code=code)
        creds = flow.credentials
    except Exception as exc:
        logger.error("OAuth callback failed: %s", exc)
        return RedirectResponse(url=f"{FRONTEND_URL}?error=oauth_failed")

    # Get user profile from Google
    try:
        service  = build("oauth2", "v2", credentials=creds)
        profile  = service.userinfo().get().execute()
        google_id = profile["id"]
        email     = profile["email"]
        name      = profile.get("name", "")
        picture   = profile.get("picture", "")
    except Exception as exc:
        logger.error("Failed to fetch Google profile: %s", exc)
        return RedirectResponse(url=f"{FRONTEND_URL}?error=profile_failed")

    # Upsert user
    user = session.exec(select(User).where(User.google_id == google_id)).first()
    if not user:
        user = User(google_id=google_id, email=email, name=name, picture=picture)
        session.add(user)
        session.flush()  # get user.id

    # Always update tokens (refresh_token may only come on first consent)
    if creds.refresh_token:
        user.encrypted_refresh_token = encrypt_token(creds.refresh_token)
    if creds.token:
        user.encrypted_access_token = encrypt_token(creds.token)
    user.token_expiry = creds.expiry
    user.name    = name
    user.picture = picture
    session.add(user)
    session.commit()
    session.refresh(user)

    # Issue JWT cookie
    token = create_jwt(user.id)
    redirect = RedirectResponse(url=f"{FRONTEND_URL}/")
    redirect.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=True,          # HTTPS only in prod
        samesite="lax",
        max_age=60 * 60 * 24 * JWT_EXPIRE_DAYS,
        path="/",
    )
    return redirect


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("session_token", path="/")
    return {"ok": True}


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)):
    return current_user
