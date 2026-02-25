from datetime import date, datetime
from typing import Optional
from sqlmodel import Field, SQLModel, Column
import sqlalchemy as sa


CATEGORIES = [
    "groceries", "transport", "restaurants", "entertainment",
    "utilities", "transfer", "salary", "shopping", "health",
    "education", "other",
]


# ── User ──────────────────────────────────────────────────────────────────────

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    name: str = ""
    picture: str = ""                        # Google profile picture URL
    google_id: str = Field(unique=True, index=True)
    # Encrypted Gmail OAuth tokens (Fernet)
    encrypted_refresh_token: Optional[str] = None
    encrypted_access_token: Optional[str] = None
    token_expiry: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_sync_at: Optional[datetime] = None
    last_sync_status: str = "never"


# ── Transaction ───────────────────────────────────────────────────────────────

class Transaction(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    date: date
    description: str
    amount: float          # negative = expense, positive = income
    currency: str = "PEN"
    category: str
    bank: str
    email_id: str = Field(default="manual", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ── Budget ────────────────────────────────────────────────────────────────────

class Budget(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    category: str
    monthly_limit: float
    currency: str = "PEN"


# ── ExchangeRate ──────────────────────────────────────────────────────────────

class ExchangeRate(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    from_currency: str = Field(index=True)
    to_currency: str = Field(index=True)
    rate: float
    fetched_at: datetime = Field(default_factory=datetime.utcnow)


# ── ProcessedEmail ────────────────────────────────────────────────────────────

class ProcessedEmail(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    email_id: str = Field(index=True)       # Gmail message ID
    processed_at: datetime = Field(default_factory=datetime.utcnow)
    transaction_count: int = 0


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class TransactionRead(SQLModel):
    id: int
    date: date
    description: str
    amount: float
    currency: str
    category: str
    bank: str
    email_id: str
    created_at: datetime


class TransactionCreate(SQLModel):
    date: date
    description: str
    amount: float
    currency: str = "PEN"
    category: str = "other"
    bank: str = "Manual"


class TransactionUpdate(SQLModel):
    date: Optional[date] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    category: Optional[str] = None
    bank: Optional[str] = None


class BudgetCreate(SQLModel):
    category: str
    monthly_limit: float
    currency: str = "PEN"


class BudgetRead(SQLModel):
    id: int
    category: str
    monthly_limit: float
    currency: str


class BudgetUpdate(SQLModel):
    monthly_limit: Optional[float] = None
    currency: Optional[str] = None


class UserRead(SQLModel):
    id: int
    email: str
    name: str
    picture: str
    created_at: datetime
