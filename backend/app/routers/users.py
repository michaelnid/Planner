from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import UserCreate, UserResponse, UserUpdate
from app.auth.service import hash_password
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/users", tags=["Benutzer"])


@router.get("", response_model=list[UserResponse])
def list_users(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(User).order_by(User.username).all()


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    data: UserUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")

    if data.username is not None:
        existing = db.query(User).filter(
            User.username == data.username,
            User.id != user_id,
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Benutzername bereits vergeben")
        user.username = data.username

    if data.password is not None:
        user.password_hash = hash_password(data.password)

    if data.is_active is not None:
        user.is_active = data.is_active

    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Du kannst dich nicht selbst loeschen")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")
    db.delete(user)
    db.commit()
    return {"message": "Benutzer geloescht"}
