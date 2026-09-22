from datetime import timedelta
from typing import Any, Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core import security
from app.core.config import settings
from app.api import deps
from app.models.user import User
from app.schemas.user import UserCreate, User as UserSchema
from app.schemas.token import Token

router = APIRouter()

@router.post("/login", response_model=Token)
async def login(
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()]
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalars().first()
    
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password"
        )
    elif not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        subject=user.id, expires_delta=access_token_expires
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


@router.post("/register", response_model=UserSchema)
async def register(
    *,
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    user_in: UserCreate,
) -> Any:
    """
    Register a new user.
    """
    result = await db.execute(select(User).where(User.email == user_in.email))
    user = result.scalars().first()
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The user with this username already exists in the system.",
        )
    
    user_obj = User(
        email=user_in.email,
        hashed_password=security.get_password_hash(user_in.password),
        full_name=user_in.full_name,
        is_active=True,
        is_superuser=True
    )
    
    db.add(user_obj)
    await db.commit()
    await db.refresh(user_obj)
    
    return user_obj

@router.get("/me", response_model=UserSchema)
async def read_users_me(
    current_user: Annotated[User, Depends(deps.get_current_active_user)]
) -> Any:
    """
    Get current user.
    """
    return current_user
