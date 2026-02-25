"""FastAPI application entry point."""
import logging
import os
from contextlib import asynccontextmanager

from apscheduler.schedulers.background import BackgroundScheduler
from dotenv import load_dotenv
from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException
from pydantic import BaseModel, Field as PydanticField
from fastapi.middleware.cors import CORSMiddleware

from auth import get_current_user, router as auth_router
from database import create_db_and_tables
from models import User
from routers import budgets, dashboard, transactions
import sync_job

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

scheduler = BackgroundScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    logger.info("Database tables created/verified")

    scheduler.add_job(sync_job.run_sync_all_users, "interval", hours=6, id="sync_all")
    scheduler.start()
    logger.info("APScheduler started — syncing all users every 6 hours")

    yield

    scheduler.shutdown(wait=False)
    logger.info("APScheduler stopped")


app = FastAPI(title="Budget Tracker API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,   # required for cookies
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(transactions.router)
app.include_router(budgets.router)
app.include_router(dashboard.router)


@app.get("/health")
def health():
    return {"status": "ok", "version": "2.0.0"}


class SyncRequest(BaseModel):
    days_back: int = PydanticField(default=7, ge=1, le=180)


@app.post("/api/sync")
def trigger_sync(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    body: SyncRequest = None,
):
    """Manually trigger a sync for the authenticated user."""
    req = body or SyncRequest()
    background_tasks.add_task(sync_job.run_sync_for_user, current_user, req.days_back)
    days = req.days_back
    return {"message": f"Sync started for last {days} day{'s' if days != 1 else ''}"}
