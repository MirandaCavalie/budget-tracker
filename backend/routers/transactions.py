from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import extract
from sqlmodel import Session, select

from auth import get_current_user
from database import get_session
from models import Transaction, TransactionCreate, TransactionRead, TransactionUpdate, User

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


@router.get("", response_model=list[TransactionRead])
def list_transactions(
    month:    Optional[int] = Query(None),
    year:     Optional[int] = Query(None),
    category: Optional[str] = Query(None),
    bank:     Optional[str] = Query(None),
    current_user: User  = Depends(get_current_user),
    session: Session    = Depends(get_session),
):
    stmt = (
        select(Transaction)
        .where(Transaction.user_id == current_user.id)
        .order_by(Transaction.date.desc(), Transaction.id.desc())
    )
    if month:
        stmt = stmt.where(extract("month", Transaction.date) == month)
    if year:
        stmt = stmt.where(extract("year",  Transaction.date) == year)
    if category:
        stmt = stmt.where(Transaction.category == category)
    if bank:
        stmt = stmt.where(Transaction.bank.ilike(f"%{bank}%"))
    return session.exec(stmt).all()


@router.post("", response_model=TransactionRead, status_code=201)
def create_transaction(
    data: TransactionCreate,
    current_user: User = Depends(get_current_user),
    session: Session   = Depends(get_session),
):
    txn = Transaction(**data.model_dump(), user_id=current_user.id, email_id="manual")
    session.add(txn)
    session.commit()
    session.refresh(txn)
    return txn


@router.get("/{txn_id}", response_model=TransactionRead)
def get_transaction(
    txn_id: int,
    current_user: User = Depends(get_current_user),
    session: Session   = Depends(get_session),
):
    txn = session.get(Transaction, txn_id)
    if not txn or txn.user_id != current_user.id:
        raise HTTPException(404, "Transaction not found")
    return txn


@router.put("/{txn_id}", response_model=TransactionRead)
def update_transaction(
    txn_id: int,
    data: TransactionUpdate,
    current_user: User = Depends(get_current_user),
    session: Session   = Depends(get_session),
):
    txn = session.get(Transaction, txn_id)
    if not txn or txn.user_id != current_user.id:
        raise HTTPException(404, "Transaction not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(txn, k, v)
    session.add(txn)
    session.commit()
    session.refresh(txn)
    return txn


@router.delete("/{txn_id}", status_code=204)
def delete_transaction(
    txn_id: int,
    current_user: User = Depends(get_current_user),
    session: Session   = Depends(get_session),
):
    txn = session.get(Transaction, txn_id)
    if not txn or txn.user_id != current_user.id:
        raise HTTPException(404, "Transaction not found")
    session.delete(txn)
    session.commit()
