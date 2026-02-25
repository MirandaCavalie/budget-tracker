"""Per-user sync job: Gmail → Claude extraction → DB."""
import logging
from datetime import datetime, date as date_type

from sqlmodel import Session, select

from database import engine
from extract_transactions import extract_transactions
from fetch_emails import fetch_bank_emails
from models import ProcessedEmail, Transaction, User

logger = logging.getLogger(__name__)


def run_sync_for_user(user: User, days_back: int = 7) -> dict:
    """
    Sync emails for a single user. Returns a summary dict.
    Never raises — safe to call from scheduler threads.
    """
    logger.info("⏱  Sync starting for user %d (%s)", user.id, user.email)
    start = datetime.utcnow()

    emails_processed = 0
    emails_skipped   = 0
    txns_added       = 0
    errors           = 0

    try:
        # Import here to avoid circular dependency
        from auth import get_user_gmail_credentials

        creds = get_user_gmail_credentials(user)
        if not creds:
            logger.warning("No valid Gmail credentials for user %d — skipping", user.id)
            return {"error": "no_credentials", "transactions_added": 0}

        with Session(engine) as session:
            for email in fetch_bank_emails(credentials=creds, days_back=days_back):
                email_id: str = email["id"]

                # Deduplication: per-user
                existing = session.exec(
                    select(ProcessedEmail).where(
                        ProcessedEmail.user_id == user.id,
                        ProcessedEmail.email_id == email_id,
                    )
                ).first()
                if existing:
                    emails_skipped += 1
                    continue

                # Extract with Claude
                try:
                    txns = extract_transactions(
                        email_body=email["body"],
                        email_subject=email["subject"],
                    )
                except Exception as exc:
                    logger.error("Extraction failed email %s user %d: %s", email_id, user.id, exc)
                    errors += 1
                    continue

                # Persist transactions
                count = 0
                for td in txns:
                    try:
                        txn_date = td.get("date")
                        if isinstance(txn_date, str):
                            txn_date = date_type.fromisoformat(txn_date)
                        session.add(Transaction(
                            user_id=user.id,
                            date=txn_date,
                            description=str(td.get("description", "")),
                            amount=float(td.get("amount", 0)),
                            currency=str(td.get("currency", "PEN")),
                            category=str(td.get("category", "other")),
                            bank=str(td.get("bank", "")),
                            email_id=email_id,
                        ))
                        count += 1
                    except Exception as exc:
                        logger.error("Failed to save txn from email %s: %s", email_id, exc)

                session.add(ProcessedEmail(
                    user_id=user.id,
                    email_id=email_id,
                    transaction_count=count,
                ))
                session.commit()
                emails_processed += 1
                txns_added += count
                logger.info("  ✓ Email %s → %d txn(s) for user %d", email_id, count, user.id)

            # Update user sync status
            db_user = session.get(User, user.id)
            if db_user:
                db_user.last_sync_at     = datetime.utcnow()
                db_user.last_sync_status = "ok" if errors == 0 else f"errors={errors}"
                session.add(db_user)
                session.commit()

    except Exception as exc:
        logger.error("Sync top-level error for user %d: %s", user.id, exc)
        errors += 1

    elapsed = (datetime.utcnow() - start).total_seconds()
    summary = {
        "emails_processed":   emails_processed,
        "emails_skipped":     emails_skipped,
        "transactions_added": txns_added,
        "errors":             errors,
        "duration_seconds":   round(elapsed, 2),
        "message":            f"Sync complete · {txns_added} new transaction(s)",
    }
    logger.info("✅ Sync done in %.1fs for user %d — %s", elapsed, user.id, summary)
    return summary


def run_sync_all_users(days_back: int = 7) -> None:
    """Called by the scheduler every 6 hours — syncs every user."""
    with Session(engine) as session:
        users = session.exec(select(User)).all()

    logger.info("⏰ Scheduled sync for %d user(s)", len(users))
    for user in users:
        if user.encrypted_refresh_token:
            run_sync_for_user(user, days_back=days_back)
