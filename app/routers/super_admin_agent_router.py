from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.config import settings, LEXY_TO_PROVIDER
from app.services.dependencies import get_current_super_admin
from app.services.super_admin_agent_service import super_admin_agent_service

router = APIRouter(prefix="/super-admin/agent", tags=["Super Admin Agent"])

class AgentChatRequest(BaseModel):
    prompt: str = Field(..., min_length=2, max_length=2000, description="Natural language question or request")
    chat_history: Optional[List[Dict[str, str]]] = Field(default=None, description="Previous conversation messages")
    model_name: Optional[str] = Field(default=None, description="Selected AI model name")

@router.post("/chat", response_model=Dict[str, Any])
async def super_admin_agent_chat(
    payload: AgentChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_super_admin)
):
    """
    Execute Super Admin AI intelligence query: converts natural language to optimized PostgreSQL SQL,
    executes safe read-only query, and returns analytical narrative, dynamic chart configurations, and tabular data.
    """
    model_id = payload.model_name
    if model_id and model_id in LEXY_TO_PROVIDER:
        model_id = LEXY_TO_PROVIDER[model_id]

    result = await super_admin_agent_service.generate_sql_and_analysis(
        db=db,
        user_prompt=payload.prompt,
        chat_history=payload.chat_history,
        model_name=model_id
    )

    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("error") or result.get("message") or "Query processing failed."
        )

    return result

@router.get("/suggestions", response_model=List[Dict[str, Any]])
async def get_agent_suggestions(
    current_user = Depends(get_current_super_admin)
):
    """Get curated prompt suggestions and analytical intelligence cards for Super Admin."""
    return super_admin_agent_service.get_quick_suggestions()

class ExportExcelRequest(BaseModel):
    data: List[Dict[str, Any]] = Field(default_factory=list, description="Row records to export")
    columns: Optional[List[str]] = Field(default=None, description="Ordered column names")
    filename: Optional[str] = Field(default="analytics_export.xlsx", description="Target filename")
    title: Optional[str] = Field(default="Analytics Export", description="Sheet title")

@router.post("/export-excel")
async def super_admin_agent_export_excel(
    payload: ExportExcelRequest,
    current_user = Depends(get_current_super_admin)
):
    """
    Export analytics or SQL query results directly to a downloadable Excel (.xlsx) file.
    """
    from fastapi.responses import Response

    excel_bytes = super_admin_agent_service.export_data_to_excel_bytes(
        data=payload.data,
        columns=payload.columns,
        title=payload.title
    )
    
    filename = payload.filename if payload.filename.endswith(".xlsx") else f"{payload.filename}.xlsx"
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@router.get("/models", response_model=List[Dict[str, str]])
async def get_available_models(
    current_user = Depends(get_current_super_admin)
):
    """List available LLM models for SQL reasoning and analytics."""
    raw_models = getattr(settings, 'ai_available_models', 'codestral-latest,mistral-large-latest,mistral-medium-latest')
    model_list = [m.strip() for m in raw_models.split(',') if m.strip()]
    
    formatted = []
    for m in model_list:
        label = m.replace('-latest', '').replace('-', ' ').title()
        if 'Codestral' in label:
            label += " (Optimal for SQL)"
        elif 'Large' in label:
            label += " (Deep Reasoning)"
        formatted.append({"id": m, "name": label})
    return formatted

