"""Exchange rate service with DB caching and API fallback."""
import logging
from datetime import datetime, timedelta

import httpx
from sqlmodel import Session, select

from database import engine
from models import ExchangeRate

logger = logging.getLogger(__name__)

FALLBACK_RATE = 0.27          # hardcoded last-resort
CACHE_TTL_HOURS = 24
API_URL = "https://open.er-api.com/v6/latest/{from_currency}"


def get_exchange_rate(from_currency: str = "PEN", to_currency: str = "USD") -> float:
    """
    Return the exchange rate from_currency → to_currency.
    Priority: fresh DB cache → API fetch → stale DB cache → hardcoded fallback.
    """
    with Session(engine) as session:
        cached = session.exec(
            select(ExchangeRate)
            .where(
                ExchangeRate.from_currency == from_currency,
                ExchangeRate.to_currency == to_currency,
            )
            .order_by(ExchangeRate.fetched_at.desc())
        ).first()

        # Return cached rate if it is fresh enough
        if cached:
            age = datetime.utcnow() - cached.fetched_at
            if age < timedelta(hours=CACHE_TTL_HOURS):
                return cached.rate

        # Try to fetch from API
        try:
            url = API_URL.format(from_currency=from_currency)
            resp = httpx.get(url, timeout=5)
            resp.raise_for_status()
            data = resp.json()
            rate = data["rates"][to_currency]

            record = ExchangeRate(
                from_currency=from_currency,
                to_currency=to_currency,
                rate=rate,
                fetched_at=datetime.utcnow(),
            )
            session.add(record)
            session.commit()
            logger.info("Exchange rate %s→%s fetched: %.6f", from_currency, to_currency, rate)
            return rate

        except Exception as exc:
            logger.warning("Exchange rate API failed: %s — using cached/fallback", exc)

        # Stale cache is better than hardcoded
        if cached:
            return cached.rate

        return FALLBACK_RATE


def get_exchange_rate_info(from_currency: str = "PEN", to_currency: str = "USD") -> dict:
    """Return rate plus metadata (fetched_at, source)."""
    with Session(engine) as session:
        cached = session.exec(
            select(ExchangeRate)
            .where(
                ExchangeRate.from_currency == from_currency,
                ExchangeRate.to_currency == to_currency,
            )
            .order_by(ExchangeRate.fetched_at.desc())
        ).first()

    rate = get_exchange_rate(from_currency, to_currency)

    if cached:
        age = datetime.utcnow() - cached.fetched_at
        age_hours = age.total_seconds() / 3600
        return {
            "from_currency": from_currency,
            "to_currency": to_currency,
            "rate": rate,
            "fetched_at": cached.fetched_at.isoformat(),
            "age_hours": round(age_hours, 1),
            "source": "cache" if age_hours < CACHE_TTL_HOURS else "stale_cache",
        }

    return {
        "from_currency": from_currency,
        "to_currency": to_currency,
        "rate": rate,
        "fetched_at": None,
        "age_hours": None,
        "source": "fallback",
    }
