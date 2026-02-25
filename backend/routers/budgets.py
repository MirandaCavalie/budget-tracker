from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from auth import get_current_user
from database import get_session
from models import Budget, BudgetCreate, BudgetRead, BudgetUpdate, User

router = APIRouter(prefix="/api/budgets", tags=["budgets"])


@router.get("", response_model=list[BudgetRead])
def list_budgets(
    current_user: User = Depends(get_current_user),
    session: Session   = Depends(get_session),
):
    return session.exec(
        select(Budget)
        .where(Budget.user_id == current_user.id)
        .order_by(Budget.category)
    ).all()


@router.post("", response_model=BudgetRead, status_code=201)
def create_budget(
    data: BudgetCreate,
    current_user: User = Depends(get_current_user),
    session: Session   = Depends(get_session),
):
    existing = session.exec(
        select(Budget).where(Budget.user_id == current_user.id, Budget.category == data.category)
    ).first()
    if existing:
        raise HTTPException(409, f"Budget for '{data.category}' already exists")
    budget = Budget(**data.model_dump(), user_id=current_user.id)
    session.add(budget)
    session.commit()
    session.refresh(budget)
    return budget


@router.put("/{budget_id}", response_model=BudgetRead)
def update_budget(
    budget_id: int,
    data: BudgetUpdate,
    current_user: User = Depends(get_current_user),
    session: Session   = Depends(get_session),
):
    budget = session.get(Budget, budget_id)
    if not budget or budget.user_id != current_user.id:
        raise HTTPException(404, "Budget not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(budget, k, v)
    session.add(budget)
    session.commit()
    session.refresh(budget)
    return budget


@router.delete("/{budget_id}", status_code=204)
def delete_budget(
    budget_id: int,
    current_user: User = Depends(get_current_user),
    session: Session   = Depends(get_session),
):
    budget = session.get(Budget, budget_id)
    if not budget or budget.user_id != current_user.id:
        raise HTTPException(404, "Budget not found")
    session.delete(budget)
    session.commit()
