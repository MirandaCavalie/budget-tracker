from fastapi import APIRouter, Depends, HTTPException
from postgrest.exceptions import APIError

from auth import get_current_supabase, get_current_user
from models import BudgetCreate, BudgetRead, BudgetUpdate, User

router = APIRouter(prefix="/api/budgets", tags=["budgets"])


@router.get("", response_model=list[BudgetRead])
def list_budgets(
    current_user: User = Depends(get_current_user),
    supa = Depends(get_current_supabase),
):
    try:
        result = supa.table("budget").select("*").order("category").execute()
        return result.data
    except APIError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("", response_model=BudgetRead, status_code=201)
def create_budget(
    data: BudgetCreate,
    current_user: User = Depends(get_current_user),
    supa = Depends(get_current_supabase),
):
    try:
        # Check for duplicate category (RLS already scopes to this user)
        existing = (
            supa.table("budget")
            .select("id")
            .eq("category", data.category)
            .execute()
        )
        if existing.data:
            raise HTTPException(409, f"Budget for '{data.category}' already exists")
        payload = {**data.model_dump(), "user_id": current_user.id}
        result = supa.table("budget").insert(payload).execute()
        return result.data[0]
    except APIError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{budget_id}", response_model=BudgetRead)
def update_budget(
    budget_id: int,
    data: BudgetUpdate,
    current_user: User = Depends(get_current_user),
    supa = Depends(get_current_supabase),
):
    try:
        check = supa.table("budget").select("id").eq("id", budget_id).execute()
        if not check.data:
            raise HTTPException(404, "Budget not found")
        update_dict = data.model_dump(exclude_unset=True)
        result = supa.table("budget").update(update_dict).eq("id", budget_id).execute()
        return result.data[0]
    except APIError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{budget_id}", status_code=204)
def delete_budget(
    budget_id: int,
    current_user: User = Depends(get_current_user),
    supa = Depends(get_current_supabase),
):
    try:
        check = supa.table("budget").select("id").eq("id", budget_id).execute()
        if not check.data:
            raise HTTPException(404, "Budget not found")
        supa.table("budget").delete().eq("id", budget_id).execute()
    except APIError as e:
        raise HTTPException(status_code=400, detail=str(e))
