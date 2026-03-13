# LEGACY — used only by sync_job.py and auth.py (OAuth callback + get_current_user).
# All API routers now use the Supabase client (supabase_client.py) instead.
# Do not add new usages of get_session() in routers.
# See MIGRATION_NOTES.md for context.
import os
from sqlmodel import SQLModel, create_engine, Session
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./budget_tracker.db")

# PostgreSQL needs pool_pre_ping; SQLite needs check_same_thread
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    DATABASE_URL,
    echo=False,
    connect_args=connect_args,
    pool_pre_ping=True,
)


def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
