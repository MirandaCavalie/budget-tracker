import base64
import logging
import os
from typing import Generator
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

load_dotenv()
logger = logging.getLogger(__name__)

_raw_senders = os.getenv(
    "BANK_SENDERS",
    "alertas@bcp.com.pe,notificaciones@interbank.pe,avisos@bbva.pe,"
    "alertas@scotiabank.com.pe,notificaciones@notificacionesbcp.com.pe,"
    "servicioalcliente@netinterbank.com.pe,no-reply@operaciones.agora.pe,notificaciones.io.pe"
)
BANK_SENDERS: list[str] = [s.strip() for s in _raw_senders.split(",") if s.strip()]


def _decode_body(payload: dict) -> str:
    mime_type: str = payload.get("mimeType", "")
    body_data: str = payload.get("body", {}).get("data", "")

    if mime_type == "text/plain" and body_data:
        return base64.urlsafe_b64decode(body_data).decode("utf-8", errors="replace")

    if mime_type == "text/html" and body_data:
        html = base64.urlsafe_b64decode(body_data).decode("utf-8", errors="replace")
        return BeautifulSoup(html, "html.parser").get_text(separator="\n")

    for part in payload.get("parts", []):
        result = _decode_body(part)
        if result:
            return result

    return ""


def _build_query(days_back: int = 7) -> str:
    from_clause = " OR ".join(f"from:{s}" for s in BANK_SENDERS)
    return f"({from_clause}) newer_than:{days_back}d"


def fetch_bank_emails(
    credentials: Credentials,
    days_back: int = 7,
) -> Generator[dict, None, None]:

    service = build("gmail", "v1", credentials=credentials)
    query   = _build_query(days_back)
    logger.info("Gmail query: %s", query)

    page_token = None
    total = 0

    while True:
        kwargs: dict = {"userId": "me", "q": query, "maxResults": 100}
        if page_token:
            kwargs["pageToken"] = page_token

        response  = service.users().messages().list(**kwargs).execute()
        messages  = response.get("messages", [])

        for msg_ref in messages:
            msg_id: str = msg_ref["id"]
            try:
                msg = service.users().messages().get(
                    userId="me", id=msg_id, format="full"
                ).execute()
                headers = {
                    h["name"].lower(): h["value"]
                    for h in msg.get("payload", {}).get("headers", [])
                }
                body = _decode_body(msg.get("payload", {}))
                total += 1
                yield {
                    "id":      msg_id,
                    "from":    headers.get("from", ""),
                    "subject": headers.get("subject", ""),
                    "date":    headers.get("date", ""),
                    "body":    body,
                }
            except Exception as exc:
                logger.error("Failed to fetch message %s: %s", msg_id, exc)

        page_token = response.get("nextPageToken")
        if not page_token:
            break

    logger.info("Fetched %d bank emails total", total)
