from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from postgrest.exceptions import APIError

from auth import get_current_supabase, get_current_user
from models import User
from services.exchange_rate import get_exchange_rate, get_exchange_rate_info

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def _current_month_year():
    today = date.today()
    return today.month, today.year


def _to_usd(amount: float, currency: str, pen_to_usd: float) -> float:
    return amount if currency == "USD" else amount * pen_to_usd


def _month_range(month: int, year: int) -> tuple[str, str]:
    first = date(year, month, 1)
    after = date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)
    return str(first), str(after)


def _fetch_month_transactions(supa, month: int, year: int) -> list[dict]:
    """Fetch all transactions for a given month via date range filter."""
    first, after = _month_range(month, year)
    result = (
        supa.table("transaction")
        .select("date,amount,currency,category")
        .gte("date", first)
        .lt("date", after)
        .execute()
    )
    return result.data


@router.get("/exchange-rate")
def exchange_rate_endpoint():
    """Return current PEN→USD rate with metadata."""
    return get_exchange_rate_info("PEN", "USD")


@router.get("/summary")
def summary(
    month: Optional[int] = Query(None),
    year:  Optional[int] = Query(None),
    current_user: User   = Depends(get_current_user),
    supa = Depends(get_current_supabase),
):
    if not month or not year:
        month, year = _current_month_year()

    pen_to_usd = get_exchange_rate("PEN", "USD")
    txns = _fetch_month_transactions(supa, month, year)

    pen_income   = sum(t["amount"] for t in txns if t["amount"] > 0 and t["currency"] == "PEN")
    pen_expenses = sum(t["amount"] for t in txns if t["amount"] < 0 and t["currency"] == "PEN")
    usd_income   = sum(t["amount"] for t in txns if t["amount"] > 0 and t["currency"] == "USD")
    usd_expenses = sum(t["amount"] for t in txns if t["amount"] < 0 and t["currency"] == "USD")

    total_income_usd   = _to_usd(pen_income,   "PEN", pen_to_usd) + usd_income
    total_expenses_usd = _to_usd(pen_expenses,  "PEN", pen_to_usd) + usd_expenses

    return {
        "month": month, "year": year,
        "pen": {
            "income":   round(pen_income, 2),
            "expenses": round(pen_expenses, 2),
            "net":      round(pen_income + pen_expenses, 2),
        },
        "usd": {
            "income":   round(usd_income, 2),
            "expenses": round(usd_expenses, 2),
            "net":      round(usd_income + usd_expenses, 2),
        },
        "total_usd": {
            "income":   round(total_income_usd, 2),
            "expenses": round(total_expenses_usd, 2),
            "net":      round(total_income_usd + total_expenses_usd, 2),
        },
        "exchange_rate":     pen_to_usd,
        "transaction_count": len(txns),
    }


@router.get("/by-category")
def by_category(
    month: Optional[int] = Query(None),
    year:  Optional[int] = Query(None),
    current_user: User   = Depends(get_current_user),
    supa = Depends(get_current_supabase),
):
    if not month or not year:
        month, year = _current_month_year()

    pen_to_usd = get_exchange_rate("PEN", "USD")
    txns = _fetch_month_transactions(supa, month, year)

    cat_totals: dict[str, float] = {}
    for t in txns:
        if t["amount"] < 0:
            cat = t["category"]
            cat_totals[cat] = cat_totals.get(cat, 0) + abs(_to_usd(t["amount"], t["currency"], pen_to_usd))

    return sorted(
        [{"category": c, "total": round(v, 2)} for c, v in cat_totals.items()],
        key=lambda x: x["total"], reverse=True,
    )


@router.get("/monthly-trend")
def monthly_trend(
    year: Optional[int] = Query(None),
    current_user: User  = Depends(get_current_user),
    supa = Depends(get_current_supabase),
):
    if not year:
        year = date.today().year

    MONTH_NAMES = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
    pen_to_usd = get_exchange_rate("PEN", "USD")

    result = (
        supa.table("transaction")
        .select("date,amount,currency")
        .gte("date", f"{year}-01-01")
        .lt("date", f"{year + 1}-01-01")
        .execute()
    )

    month_totals: dict[int, float] = {}
    for t in result.data:
        if t["amount"] < 0:
            m = date.fromisoformat(t["date"]).month
            month_totals[m] = month_totals.get(m, 0) + abs(_to_usd(t["amount"], t["currency"], pen_to_usd))

    return [
        {"month": MONTH_NAMES[m], "month_num": m, "expenses": round(v, 2)}
        for m, v in sorted(month_totals.items())
    ]


@router.get("/budget-status")
def budget_status(
    month: Optional[int] = Query(None),
    year:  Optional[int] = Query(None),
    current_user: User   = Depends(get_current_user),
    supa = Depends(get_current_supabase),
):
    if not month or not year:
        month, year = _current_month_year()

    try:
        budgets_result = supa.table("budget").select("*").execute()
    except APIError as e:
        raise HTTPException(status_code=400, detail=str(e))

    budgets = budgets_result.data
    if not budgets:
        return []

    pen_to_usd = get_exchange_rate("PEN", "USD")
    txns = _fetch_month_transactions(supa, month, year)

    spent_map: dict[str, float] = {}
    for t in txns:
        if t["amount"] < 0:
            cat = t["category"]
            spent_map[cat] = spent_map.get(cat, 0) + abs(_to_usd(t["amount"], t["currency"], pen_to_usd))

    result = []
    for b in budgets:
        spent = spent_map.get(b["category"], 0.0)
        limit_usd = _to_usd(b["monthly_limit"], b["currency"], pen_to_usd)
        pct = (spent / limit_usd * 100) if limit_usd > 0 else 0
        result.append({
            "category":   b["category"],
            "limit":      round(limit_usd, 2),
            "spent":      round(spent, 2),
            "percentage": round(pct, 1),
            "currency":   "USD",
        })

    return result
