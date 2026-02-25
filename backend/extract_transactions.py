"""Use Claude to extract structured transactions from raw email text."""
import json
import logging
import re
from typing import Any

import anthropic
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

MODEL = "claude-sonnet-4-5-20250929"
MAX_TOKENS = 1024

SYSTEM_PROMPT = """You are a financial data extraction assistant specializing in Peruvian bank emails.
Extract ALL financial transactions from the bank notification email provided.
Return ONLY a valid JSON array, no markdown fences, no explanation, no extra text.

Each object in the array must have exactly these fields:
- "date": "YYYY-MM-DD" (infer year from context or use current year if ambiguous)
- "description": merchant name or transaction description (clean, concise)
- "amount": number (positive for deposits/income/transfers-in, negative for purchases/withdrawals/transfers-out)
- "currency": "PEN" or "USD"
- "category": one of [groceries, transport, restaurants, entertainment, utilities, transfer, salary, shopping, health, education, other]
- "bank": bank name extracted from the email (e.g. "BCP", "Interbank", "BBVA", "Scotiabank")

Rules:
- Amounts in soles (S/) → currency "PEN"
- Amounts in dollars ($) → currency "USD"
- Card purchases are negative
- Deposits, salary, transfers-in are positive
- If no transactions are found, return: []
- Handle Spanish text naturally (BCP, Interbank, BBVA Peru emails are in Spanish)
"""

_client: anthropic.Anthropic | None = None


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY from env
    return _client


def _strip_markdown(text: str) -> str:
    """Remove ```json ... ``` fences if Claude adds them despite instructions."""
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


def extract_transactions(email_body: str, email_subject: str = "") -> list[dict[str, Any]]:
    """
    Send email body to Claude and return a list of transaction dicts.
    Returns [] on any failure so the caller can continue processing other emails.
    """
    if not email_body.strip():
        logger.warning("Empty email body, skipping extraction")
        return []

    user_message = f"Subject: {email_subject}\n\n{email_body}"

    try:
        client = _get_client()
        message = client.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )
        raw = message.content[0].text
        cleaned = _strip_markdown(raw)
        transactions = json.loads(cleaned)

        if not isinstance(transactions, list):
            logger.error("Claude returned non-list: %s", type(transactions))
            return []

        # Basic field validation
        valid = []
        required_fields = {"date", "description", "amount", "currency", "category", "bank"}
        for txn in transactions:
            if required_fields.issubset(txn.keys()):
                valid.append(txn)
            else:
                missing = required_fields - txn.keys()
                logger.warning("Transaction missing fields %s — skipped: %s", missing, txn)

        return valid

    except json.JSONDecodeError as exc:
        logger.error("JSON parse error from Claude response: %s", exc)
        return []
    except anthropic.APIError as exc:
        logger.error("Anthropic API error: %s", exc)
        return []
    except Exception as exc:
        logger.error("Unexpected error in extract_transactions: %s", exc)
        return []
