from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import SabaJobDescription
from app.schemas.schemas import SabaJobDescriptionUpdateRequest, SabaSectionUpdateRequest
from app.repository.saba_repository import SabaRepository
import uuid
from typing import List, Optional, Any
from langchain_mistralai.chat_models import ChatMistralAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field
from app.core.config import settings


class SabaExtractedSection(BaseModel):
    name: str = Field(description="The exact heading name of this section as written in the source document")
    value: Any = Field(description="The text content, list of items, table, or bullet points under this heading")

class SabaParsedJD(BaseModel):
    title: str = Field(description="The job title")
    job_id: Optional[str] = Field(None, description="The document's Job ID, e.g. 'Prof 4515'")
    sections: List[SabaExtractedSection] = Field(description="List of all sections extracted from the document in order, with their exact heading names and content")

class SabaService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = SabaRepository(db)

    async def get_all_saba_jds(self, org_id: uuid.UUID) -> List[SabaJobDescription]:
        return await self.repo.get_saba_jds_by_org(org_id)

    async def get_saba_jd(self, jd_id: uuid.UUID, org_id: uuid.UUID) -> Optional[SabaJobDescription]:
        jd = await self.repo.get_saba_jd_by_id(jd_id)
        if jd and jd.org_id == org_id:
            return jd
        return None
        
    async def get_saba_jd_by_job_id(self, job_id: str, org_id: uuid.UUID) -> Optional[SabaJobDescription]:
        return await self.repo.get_saba_jd_by_job_id(job_id, org_id)

    async def update_saba_jd(self, jd_id: uuid.UUID, org_id: uuid.UUID, update_data: SabaJobDescriptionUpdateRequest) -> Optional[SabaJobDescription]:
        jd = await self.get_saba_jd(jd_id, org_id)
        if not jd:
            return None
        update_dict = update_data.model_dump(exclude_unset=True)
        for key, value in update_dict.items():
            if hasattr(jd, key):
                setattr(jd, key, value)
        await self.db.commit()
        await self.db.refresh(jd)
        return jd

    async def update_saba_jd_section(self, jd_id: uuid.UUID, org_id: uuid.UUID, update_data: SabaSectionUpdateRequest) -> Optional[SabaJobDescription]:
        jd = await self.get_saba_jd(jd_id, org_id)
        if not jd:
            return None
        sections = dict(jd.sections) if jd.sections else {}
        sections[update_data.section_name] = update_data.section_content
        jd.sections = sections

        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(jd, "sections")

        await self.db.commit()
        await self.db.refresh(jd)
        return jd

    async def delete_saba_jd(self, jd_id: uuid.UUID, org_id: uuid.UUID) -> bool:
        jd = await self.get_saba_jd(jd_id, org_id)
        if not jd:
            return False
        await self.repo.delete_saba_jd(jd)
        await self.db.commit()
        return True

    async def create_saba_jd_from_document(self,*,org_id: uuid.UUID,creator_id: uuid.UUID,content: bytes,filename: str,content_type: str | None = None,pdf_only: bool = False) -> tuple[SabaJobDescription, str, dict]:
        from app.services.document_ingestion.pipeline import extract_document

        doc = extract_document(content, filename, pdf_only=pdf_only)
        if not doc.success:
            error = doc.report.error or f"Extraction failed for {filename}"
            from app.services.document_ingestion.sniffing import FormatDetectionError
            if doc.report.detected_format == "unknown":
                raise FormatDetectionError(error)
            raise ValueError(error)

        extraction_report = doc.report.to_dict()
        parsed_data = await self.parse_jd_text_with_mistral(doc.text)

        title = parsed_data.get("title") or "Untitled Saba JD"
        job_id = parsed_data.get("job_id")
        sections_list = parsed_data.get("sections") or []
        sections_dict: dict[str, Any] = {}
        for sec in sections_list:
            if isinstance(sec, dict):
                name = sec.get("name")
                value = sec.get("value")
                if name:
                    sections_dict[name] = value

        new_jd = SabaJobDescription(org_id=org_id,creator_id=creator_id,title=title,job_id=job_id,sections=sections_dict)
        created_jd = await self.repo.create_saba_jd(new_jd)
        return created_jd, doc.detected_format, extraction_report

    async def parse_jd_text_with_mistral(self, text: str) -> dict:
        api_key = settings.ai_api_key
        model_kwargs = {
            "guardrails": [
                {
                    "block_on_error": False,
                    "moderation_llm_v1": {
                        "action": "block",
                        "model_name": "mistral-moderation-2411",
                        "custom_category_thresholds": {
                            "dangerous_and_criminal_content": 0.3,
                            "hate_and_discrimination": 0.3,
                            "selfharm": 0.3,
                            "sexual": 0.3,
                            "violence_and_threats": 0.3
                        },
                        "ignore_other_categories": True
                    }
                }
            ]
        }
        
        from app.services.enhanced_ai_service import get_llm_client
        llm = get_llm_client(model_name="mistral-large-latest")
        
        parser = JsonOutputParser(pydantic_object=SabaParsedJD)
        prompt = ChatPromptTemplate.from_messages([
            ("system", (
                "You are an expert HR assistant. Extract the job description from the provided text and format it into the exact JSON structure requested. "
                "Identify every single heading, section, table, or block of info in the text. "
                "IMPORTANT: Do not skip the 'Job Details' section (usually at the top containing Location, Reporting To, Employment Type, Department, Division, Version, FLSA Classification, Created By, etc.). You must extract it as a dictionary under the exact heading name 'Job Details'. "
                "Extract the document's Job ID (e.g. 'Prof 4515' or 'VPRIN-4412') from the text and populate the `job_id` field. "
                "FORMATTING INSTRUCTIONS FOR SECTIONS (CRITICAL: THE UI DOES NOT SUPPORT NESTED JSON OBJECTS):\n"
                "1. All lists, bullet points, competencies, and tables MUST be formatted as a flat array of strings (e.g., [\"Item 1\", \"Item 2\"]).\n"
                "2. NEVER output an array of dictionaries or objects (e.g., [{{{{\"Title\": \"...\"}}}}]). This breaks the frontend UI and renders as raw JSON text. Do not use dictionaries inside arrays under any circumstances.\n"
                "3. If the source has named items (e.g., Competencies with a Title and Definition), combine them into a single string for each bullet point: [\"Title: Definition\"].\n"
                "4. If the source has a table (e.g., Education with Degree and Program columns), combine the columns into a single string for that row: [\"Degree/Diploma Obtained: High School Diploma | Program of Study: Preferred\"].\n"
                "5. For each section or heading you find, extract its exact original heading name as written in the text, and get all content under it as the value. Do NOT change or standardise the heading names. Keep them exactly as they are in the source text.\n{format_instructions}"
            )),
            ("human", "{text}")
        ])
        
        chain = prompt | llm | parser
        
        import asyncio
        from fastapi import HTTPException
        try:
            parsed_data = await asyncio.to_thread(chain.invoke, {"text": text, "format_instructions": parser.get_format_instructions()})
            return parsed_data
        except Exception as e:
            import logging
            logging.getLogger("app").error(f"Saba parse exception: {str(e)}", exc_info=True)
            error_str = str(e).lower()
            if any(k in error_str for k in ("moderation", "guardrail", "policy", "block")):
                raise HTTPException(status_code=422, detail="unprocessible data found which is against the guardrils")
            raise HTTPException(status_code=500, detail=f"Failed to parse JD text: {str(e)}")

    async def convert_saba_jd_to_standard(self, saba_jd: Any, current_user: Any) -> Any:
        import re
        from app.schemas.schemas import migrate_to_stable_format
        from app.models.models import JobDescription
        content_dict = saba_jd.sections if isinstance(saba_jd.sections, dict) else {}

        job_details = content_dict.get("Job Details", {})
        if isinstance(job_details, dict):
            department = job_details.get("Department")
            location = job_details.get("Location")
            employment_type = job_details.get("Employment Type")
            job_family = job_details.get("Job Family")
        else:
            department = location = employment_type = job_family = None

        dynamic_sections = []
        section_labels = {}
        section_order = []
        for key in content_dict.keys():
            if key == "Job Details":
                continue
            section_order.append(key)
            norm = re.sub(r'[^a-zA-Z0-9_]', '', key.strip().replace(" ", "_").lower())
            dynamic_sections.append({
                "id": norm,
                "key": norm,
                "type": "text",
                "heading": key,
                "placeholder": f"Enter {key} here...",
                "use_custom_value": False,
                "required": False,
                "hide_from_candidates": False,
                "push_to_csod": True,
                "options": []
            })
            section_labels[norm] = key

        custom_fields = {
            "dynamic_sections": dynamic_sections,
            "section_labels": section_labels
        }

        content_dict["_section_order"] = section_order

        migrated = migrate_to_stable_format({
            "content": content_dict,
            "sections_metadata": {},
            "custom_fields": custom_fields,
        })

        new_standard_jd = JobDescription(org_id=current_user.org_id,creator_id=current_user.id,title=saba_jd.title,job_id=saba_jd.job_id,content=migrated["content"],sections_metadata=migrated["sections_metadata"],generation_mode="saba",input_prompt="Imported from Saba document",status="draft",industry="Imported",country_code="US",department=department,location=location,employment_type=employment_type,job_family=job_family)
        self.db.add(new_standard_jd)
        await self.repo.delete_saba_jd(saba_jd)
        await self.db.flush()
        return new_standard_jd

