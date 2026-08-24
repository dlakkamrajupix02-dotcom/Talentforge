from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.dependencies import get_current_regular_user, get_current_user
from app.schemas.schemas import (
    SabaJobDescriptionResponse,
    SabaJobDescriptionUpdateRequest,
    SabaSectionUpdateRequest,
    SabaUploadResponse,
    SabaExtractionReportResponse,
    BulkConvertRequest,
    JobDescriptionResponse,
    migrate_to_stable_format,
)
from app.services.saba_service import SabaService
from app.models.models import User, JobDescription
from app.services.pdf_service import PDFGenerator
from app.services.document_text_service import (UnsupportedDocumentFormatError,get_supported_import_formats)
from app.repository import auth_repository as auth_repo
import uuid
from typing import List
from enum import Enum

pdf_generator = PDFGenerator()
router = APIRouter(prefix="/saba", tags=["Saba Integration"], dependencies=[Depends(get_current_regular_user)])


async def _handle_saba_document_upload(files: List[UploadFile],db: AsyncSession,current_user: User,*,pdf_only: bool = False) -> SabaUploadResponse:
    if not current_user.org_id:
        raise HTTPException(status_code=400, detail="User is not part of an organization")
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    created_jds = []
    extraction_reports = []
    service = SabaService(db)

    for file in files:
        filename = file.filename or "upload"
        try:
            content = await file.read()
            created_jd, _source_format, report = await service.create_saba_jd_from_document(
                org_id=current_user.org_id,
                creator_id=current_user.id,
                content=content,
                filename=filename,
                content_type=file.content_type,
                pdf_only=pdf_only,
            )
            created_jds.append(created_jd)
            extraction_reports.append(report)
            await auth_repo.increment_user_stat(db, current_user.id, "jds_created")
        except UnsupportedDocumentFormatError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=500,detail=f"Error parsing document {filename}: {str(exc)}") from exc

    await db.commit()
    for jd in created_jds:
        await db.refresh(jd)
    return SabaUploadResponse(
        job_descriptions=[SabaJobDescriptionResponse.model_validate(jd) for jd in created_jds],
        extraction_reports=[SabaExtractionReportResponse.model_validate(r) for r in extraction_reports],
    )

@router.get("/", response_model=List[SabaJobDescriptionResponse])
async def get_saba_jds(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.org_id:
        raise HTTPException(status_code=400, detail="User is not part of an organization")
    service = SabaService(db)
    return await service.get_all_saba_jds(current_user.org_id)


@router.get("/by_job_id/{job_id}", response_model=SabaJobDescriptionResponse)
async def get_saba_jd_by_job_id(job_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Look up a Saba JD by its business job_id (e.g. 'Prof 4515'), not the record UUID."""
    if not current_user.org_id:
        raise HTTPException(status_code=400, detail="User is not part of an organization")
    service = SabaService(db)
    jd = await service.get_saba_jd_by_job_id(job_id, current_user.org_id)
    if not jd:
        raise HTTPException(status_code=404, detail=f"Saba JD with job_id '{job_id}' not found")
    return jd


@router.get("/supported_formats")
async def get_saba_supported_import_formats(pdf_only: bool = Query(False, description="Return only PDF support (legacy upload endpoint)")):
    """Return the document formats/extensions supported by the Saba import backend."""
    return get_supported_import_formats(pdf_only=pdf_only)


@router.get("/{jd_id}", response_model=SabaJobDescriptionResponse)
async def get_saba_jd(jd_id: uuid.UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get a Saba JD by its record id (UUID from GET /saba/ or upload response)."""
    if not current_user.org_id:
        raise HTTPException(status_code=400, detail="User is not part of an organization")
    service = SabaService(db)
    jd = await service.get_saba_jd(jd_id, current_user.org_id)
    if not jd:
        raise HTTPException(status_code=404, detail="Saba JD not found")
    return jd


@router.patch("/{jd_id}", response_model=SabaJobDescriptionResponse)
async def update_saba_jd(jd_id: uuid.UUID, update_data: SabaJobDescriptionUpdateRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.org_id:
        raise HTTPException(status_code=400, detail="User is not part of an organization")
    service = SabaService(db)
    jd = await service.update_saba_jd(jd_id, current_user.org_id, update_data)
    if not jd:
        raise HTTPException(status_code=404, detail="Saba JD not found")
    return jd


@router.patch("/{jd_id}/sections", response_model=SabaJobDescriptionResponse)
async def update_saba_jd_section(jd_id: uuid.UUID, update_data: SabaSectionUpdateRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.org_id:
        raise HTTPException(status_code=400, detail="User is not part of an organization")
    service = SabaService(db)
    jd = await service.update_saba_jd_section(jd_id, current_user.org_id, update_data)
    if not jd:
        raise HTTPException(status_code=404, detail="Saba JD not found")
    return jd


@router.delete("/{jd_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_saba_jd(jd_id: uuid.UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.org_id:
        raise HTTPException(status_code=400, detail="User is not part of an organization")
    service = SabaService(db)
    success = await service.delete_saba_jd(jd_id, current_user.org_id)
    if not success:
        raise HTTPException(status_code=404, detail="Saba JD not found")


@router.post("/upload", response_model=SabaUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_saba_documents(files: List[UploadFile] = File(...,description="Job description files (.pdf, .doc, .docx, .html, .htm, .txt, .rtf, .word)",),db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_user)):
    """Upload one or more job description documents and create Saba JD records."""
    return await _handle_saba_document_upload(files, db, current_user, pdf_only=False)


@router.post("/upload_pdf", response_model=SabaUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_saba_pdf(files: List[UploadFile] = File(..., description="PDF files containing the JD text"),db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_user)):
    """Legacy PDF-only upload endpoint. Prefer POST /saba/upload for multi-format imports."""
    return await _handle_saba_document_upload(files, db, current_user, pdf_only=True)

@router.post("/bulk_convert", response_model=List[JobDescriptionResponse])
async def bulk_convert_saba_to_standard_jd(request: BulkConvertRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Convert multiple Saba JDs to standard JobDescriptions in bulk."""
    if not current_user.org_id:
        raise HTTPException(status_code=400, detail="User is not part of an organization")
        
    converted_jds = []
    service = SabaService(db)
    
    for jd_id in request.jd_ids:
        saba_jd = await service.get_saba_jd(jd_id, current_user.org_id)
        if not saba_jd:
            import logging
            logging.getLogger("app").warning(f"Saba JD {jd_id} not found or unauthorized.")
            continue
            
        new_standard_jd = await service.convert_saba_jd_to_standard(saba_jd, current_user)
        converted_jds.append(new_standard_jd)
            
    if not converted_jds and request.jd_ids:
        raise HTTPException(status_code=400, detail="Failed to convert any of the provided Saba JDs")
    await db.commit()
    for jd in converted_jds:
        await db.refresh(jd)
    return converted_jds


class ExportFormat(str, Enum):
    pdf = "pdf"
    word = "word"

@router.post("/{jd_id}/export")
async def export_saba_jd(jd_id: uuid.UUID, format: ExportFormat = Query(ExportFormat.pdf, description="Export format (pdf or word)"),db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.org_id:
        raise HTTPException(status_code=400, detail="User has no company assigned")
        
    service = SabaService(db)
    saba_jd = await service.get_saba_jd(jd_id, current_user.org_id)
    if not saba_jd:
        raise HTTPException(status_code=404, detail="Saba JD not found")

    content_dict = saba_jd.sections if isinstance(saba_jd.sections, dict) else {}
    
    job_details = content_dict.get("Job Details", {})
    if not isinstance(job_details, dict):
        job_details = {}
        
    jd_data = {
        "title": saba_jd.title,
        "company_name": "",
        "job_id": saba_jd.job_id,
        "job_family": job_details.get("Job Family"),
        "job_level": None,
        "department": job_details.get("Department"),
        "location": job_details.get("Location"),
        "city": None,
        "country_code": None,
        "industry": None,
        "seniority": None,
        "employment_type": job_details.get("Employment Type") or "Full-Time",
        "salary_range": None,
        "salary_symbol": None,
        "salary_min_value": None,
        "salary_max_value": None,
        "salary_period": None,
        "content": content_dict,
        "sections_metadata": {},
        "image_url": None,
    }

    try:
        if format == ExportFormat.pdf:
            response = await pdf_generator.generate_pdf_stream(jd_data, saba_jd.title, exclude_terms=True)
            await auth_repo.increment_user_stat(db, current_user.id, "jds_exported")
            return response
        elif format == ExportFormat.word:
            response = await pdf_generator.generate_word_stream(jd_data, saba_jd.title, exclude_terms=True)
            await auth_repo.increment_user_stat(db, current_user.id, "jds_exported")
            return response
    except Exception:
        import logging
        logging.getLogger("app").exception(f"{format.value.upper()} export failed for Saba JD")
        raise HTTPException(status_code=500, detail=f"Failed to generate {format.value.upper()}")
