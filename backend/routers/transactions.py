from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from postgrest.exceptions import APIError

from auth import get_current_supabase, get_current_user
from models import TransactionCreate, TransactionRead, TransactionUpdate, User

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


def _month_date_range(month: int, year: int) -> tuple[str, str]:
    """Return (first_day, first_day_of_next_month) as ISO strings for date filtering."""
    first = date(year, month, 1)
    if month == 12:
        after = date(year + 1, 1, 1)
    else:
        after = date(year, month + 1, 1)
    return str(first), str(after)


@router.get("", response_model=list[TransactionRead])
def list_transactions(
    month:    Optional[int] = Query(None),
    year:     Optional[int] = Query(None),
    category: Optional[str] = Query(None),
    bank:     Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    supa = Depends(get_current_supabase),
):
    try:
        query = (
            supa.table("transaction")
            .select("*")
            .order("date", desc=True)
            .order("id", desc=True)
        )

        if month and year:
            first, after = _month_date_range(month, year)
            query = query.gte("date", first).lt("date", after)
        elif year:
            query = query.gte("date", f"{year}-01-01").lt("date", f"{year + 1}-01-01")
        elif month:
            # Month-only filter: fetch all and filter in Python (uncommon case)
            result = query.execute()
            return [r for r in result.data if date.fromisoformat(r["date"]).month == month]

        if category:
            query = query.eq("category", category)
        if bank:
            query = query.ilike("bank", f"%{bank}%")

        result = query.execute()
        return result.data

    except APIError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("", response_model=TransactionRead, status_code=201)
def create_transaction(
    data: TransactionCreate,
    current_user: User = Depends(get_current_user),
    supa = Depends(get_current_supabase),
):
    try:
        payload = {**data.model_dump(), "user_id": current_user.id, "email_id": "manual"}
        if isinstance(payload.get("date"), date):
            payload["date"] = str(payload["date"])
        result = supa.table("transaction").insert(payload).execute()
        return result.data[0]
    except APIError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{txn_id}", response_model=TransactionRead)
def get_transaction(
    txn_id: int,
    current_user: User = Depends(get_current_user),
    supa = Depends(get_current_supabase),
):
    try:
        # RLS enforces user ownership; 404 if not found or not owned by user
        result = supa.table("transaction").select("*").eq("id", txn_id).execute()
        if not result.data:
            raise HTTPException(404, "Transaction not found")
        return result.data[0]
    except APIError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{txn_id}", response_model=TransactionRead)
def update_transaction(
    txn_id: int,
    data: TransactionUpdate,
    current_user: User = Depends(get_current_user),
    supa = Depends(get_current_supabase),
):
    try:
        check = supa.table("transaction").select("id").eq("id", txn_id).execute()
        if not check.data:
            raise HTTPException(404, "Transaction not found")
        update_dict = data.model_dump(exclude_unset=True)
        if "date" in update_dict and isinstance(update_dict["date"], date):
            update_dict["date"] = str(update_dict["date"])
        result = supa.table("transaction").update(update_dict).eq("id", txn_id).execute()
        return result.data[0]
    except APIError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{txn_id}", status_code=204)
def delete_transaction(
    txn_id: int,
    current_user: User = Depends(get_current_user),
    supa = Depends(get_current_supabase),
):
    try:
        check = supa.table("transaction").select("id").eq("id", txn_id).execute()
        if not check.data:
            raise HTTPException(404, "Transaction not found")
        supa.table("transaction").delete().eq("id", txn_id).execute()
    except APIError as e:
        raise HTTPException(status_code=400, detail=str(e))
