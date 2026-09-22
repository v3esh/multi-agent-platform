from typing import Any, List, Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api import deps
from app.models.persona import Persona
from app.models.user import User
from app.schemas.persona import Persona as PersonaSchema, PersonaCreate, PersonaUpdate, PersonaGenerateRequest
from app.core.ai_service import ai_service

router = APIRouter()

@router.get("/", response_model=List[PersonaSchema])
async def read_personas(
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    current_user: Annotated[User, Depends(deps.get_current_active_user)],
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve personas.
    """
    result = await db.execute(select(Persona).offset(skip).limit(limit))
    return result.scalars().all()

@router.post("/", response_model=PersonaSchema)
async def create_persona(
    *,
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    persona_in: PersonaCreate,
    current_user: Annotated[User, Depends(deps.get_current_active_user)],
) -> Any:
    """
    Create a new persona manually. Requires superuser privileges.
    """
    persona_obj = Persona(**persona_in.model_dump())
    db.add(persona_obj)
    await db.commit()
    await db.refresh(persona_obj)
    return persona_obj
    
@router.post("/generate", response_model=PersonaSchema)
async def generate_persona(
    *,
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    request: PersonaGenerateRequest,
    current_user: Annotated[User, Depends(deps.get_current_active_user)],
) -> Any:
    """
    AI-assisted persona generation. Uses LLM to flesh out a profile based on a base description.
    """
    # 1. Use AI to generate the persona details
    generated_data = await ai_service.generate_persona(request.base_description)
    
    # 2. Save it to DB with assigned agent_id if provided
    if request.agent_id:
        generated_data["agent_id"] = request.agent_id
    persona_obj = Persona(**generated_data)
    db.add(persona_obj)
    await db.commit()
    await db.refresh(persona_obj)
    
    return persona_obj

@router.put("/{persona_id}", response_model=PersonaSchema)
async def update_persona(
    *,
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    persona_id: int,
    persona_in: PersonaUpdate,
    current_user: Annotated[User, Depends(deps.get_current_active_user)],
) -> Any:
    """
    Update a persona. Requires superuser privileges.
    """
    result = await db.execute(select(Persona).where(Persona.id == persona_id))
    persona_obj = result.scalars().first()
    if not persona_obj:
        raise HTTPException(status_code=404, detail="Persona not found")
        
    update_data = persona_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(persona_obj, field, value)
        
    await db.commit()
    await db.refresh(persona_obj)
    return persona_obj

@router.delete("/{persona_id}", response_model=PersonaSchema)
async def delete_persona(
    *,
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    persona_id: int,
    current_user: Annotated[User, Depends(deps.get_current_active_user)],
) -> Any:
    """
    Delete a persona. Requires superuser privileges.
    """
    result = await db.execute(select(Persona).where(Persona.id == persona_id))
    persona_obj = result.scalars().first()
    if not persona_obj:
        raise HTTPException(status_code=404, detail="Persona not found")
        
    await db.delete(persona_obj)
    await db.commit()
    return persona_obj
