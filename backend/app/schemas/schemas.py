from datetime import datetime
from uuid import UUID
from typing import Optional, List, Dict, Any, Literal
import re
from enum import Enum
from docx import settings
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator
from app.schemas.validators import validate_password_strength,validate_full_name,validate_org_name,validate_user_role,validate_section_name,validate_email,truncate_field,validate_job_level,validate_seniority,validate_weighted_section
#     client_id: str= settings.GOOGLE_OAUTH_CLIENT_ID

class UserSignup(BaseModel):
    full_name: str = Field(..., min_length=3, max_length=50, example="john_doe")
    email: EmailStr = Field(..., example="john@example.com")
    password: str = Field(..., min_length=8, example="Password123!")
    confirm_password: str = Field(..., example="Password123!")
    company_name: str = Field(...,min_length=2,max_length=100,example="Phenomecloud",description="Company/organization name. A new company can only be created by an Admin.")
    color_code: Optional[str] = Field(None, example="#ece75c", description="Hex color code for edit tracking")
    country: str = Field(..., min_length=2, max_length=120, description="User's country (from client profile / geolocation); stored as region — not inferred from IP.")
    role: str = Field("Admin", example="Admin", description="Role to assign to the new user")
    bootstrap_secret: Optional[str] = Field(None, description="Required when bootstrapping the first Super Admin")

    @field_validator("email")
    @classmethod
    def validate_email_field(cls, value):
        return validate_email(value)
    
    @field_validator("full_name")
    @classmethod
    def validate_username(cls, value):
        return validate_full_name(value)

    @field_validator("password")
    @classmethod
    def validate_password(cls, value):
        return validate_password_strength(value)

    @model_validator(mode="after")
    def passwords_match(self):
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self

    @field_validator("country")
    @classmethod
    def strip_country(cls, v: str) -> str:
        s = v.strip()
        if len(s) < 2:
            raise ValueError("Country must be at least 2 characters")
        return s

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        return validate_user_role(v)


class UserLogin(BaseModel):
    username_or_email: str = Field(..., min_length=1, example="john@example.com")
    password: str = Field(..., min_length=1, example="Password123!")
    country: Optional[str] = Field(None,max_length=120,
        description="When sent, updates the user's stored country (e.g. from client geolocation). Omit to keep existing profile country.")

    @field_validator("country")
    @classmethod
    def strip_optional_country(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        s = v.strip()
        return s if s else None


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, description="Your full name")
    email: Optional[EmailStr] = Field(None, description="Your email address")

    @field_validator("email")
    @classmethod
    def validate_email_field(cls, v):
        if v is None:
            return v
        return validate_email(v)

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v):
        if v is None:
            return v
        if len(v) < 3 or len(v) > 50:
            raise ValueError("Full name must be between 3 and 50 characters")
        return validate_full_name(v)


class AdminUserUpdate(BaseModel):
    user_id: UUID = Field(..., description="Target user ID to update")
    full_name: Optional[str] = Field(None, description="New full name")
    email: Optional[EmailStr] = Field(None, description="New email address")
    password: Optional[str] = Field(None, min_length=8, description="New password for the target user (Admin-only)")

    @field_validator("email")
    @classmethod
    def validate_email_field(cls, v):
        if v is None:
            return v
        return validate_email(v)

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v):
        if v is None:
            return v
        return validate_full_name(v)

    @field_validator("password")
    @classmethod
    def validate_password(cls, value):
        if value is None:
            return value
        return validate_password_strength(value)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    id: Optional[UUID] = None
    role: str
    full_name: Optional[str] = None
    email: Optional[str] = None
    country: Optional[str] = None
    color_code: Optional[str] = None
    previous_session_logged_out: Optional[Dict[str, Any]] = None
    user_type: Optional[str] = None  
    org_id: Optional[str] = None
    mfa: bool = Field(default=False, description="Whether MFA is enabled for this user")


class MFASetupResponse(BaseModel):
    secret: str
    otpauth_url: str
    backup_codes: List[str]


class MFAVerifyRequest(BaseModel):
    otp: str = Field(..., min_length=4, max_length=8)


class LoginMFAVerifyRequest(BaseModel):
    temp_token: str = Field(..., min_length=10)
    otp: str = Field(..., min_length=4, max_length=8)


class MFAStatusResponse(BaseModel):
    enabled: bool
    verified: bool
    required: bool
    can_disable: bool


class MFAPolicyRequest(BaseModel):
    required_roles: List[str] = Field(default_factory=list, description="Roles that must use MFA")
    optional_roles: List[str] = Field(default_factory=list, description="Roles that may skip MFA")


class MFAPolicyResponse(BaseModel):
    required_roles: List[str]
    optional_roles: List[str]


class SessionResponse(BaseModel):
    id: UUID
    user_id: Optional[UUID] = None
    org_id: Optional[UUID] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    device_type: str
    login_method: str
    login_status: str
    failure_reason: Optional[str] = None
    logged_in_at: datetime
    logout_at: Optional[datetime] = None
    session_duration_sec: Optional[int] = None
    last_activity_at: datetime

    model_config = {"from_attributes": True}


class TemplateCreate(BaseModel):
    template_code: str = Field(..., example="TECH001")
    title: str = Field(..., example="Software Engineer Template")
    industry: str = Field(..., example="Technology")
    compliance_tag: Optional[str] = Field(None, example="IT-Compliant")
    content: Dict[str, Any] = Field(..., example={"summary": "We are looking for...", "responsibilities": ["Develop code", "Test applications"], "qualifications": ["BS in CS", "3+ years experience"]})


class TemplateResponse(BaseModel):
    id: UUID
    template_code: str
    title: str
    industry: str
    compliance_tag: Optional[str]
    content: Dict[str, Any]
    is_active: bool
    created_at: datetime

    model_config = {
        "from_attributes": True
    }


class WeightedItem(BaseModel):
    point: str = Field(..., description="Description of the item")
    weight: int = Field(..., description="Weight percentage (0-100)")


class CustomFieldCreate(BaseModel):
    section_name: str = Field(..., example="benefits_overview", description="Name of the custom section")
    section_data_type: str = Field(..., example="text_section", description="Type of section data: text_section or points_section")
    section_data: Any = Field(..., description="Section content: string for text_section or weighted points list for points_section")
    description: Optional[str] = Field(None, example="Optional description for the custom section")

    @field_validator("section_data_type")
    @classmethod
    def normalize_section_data_type(cls, value):
        normalized = str(value or "").strip().lower().replace(" ", "_")
        if normalized == "textsection":
            normalized = "text_section"
        if normalized in {"pointssection", "points_section", "points"}:
            normalized = "points_section"
        if normalized not in {"text_section", "points_section"}:
            raise ValueError("section_data_type must be 'text_section' or 'points_section'")
        return normalized

    @model_validator(mode="after")
    def validate_section_data(self):
        if self.section_data_type == "text_section":
            if self.section_data is None:
                raise ValueError("section_data is required for text_section")
            if isinstance(self.section_data, str):
                return self
            if isinstance(self.section_data, list):
                if not self.section_data:
                    raise ValueError("section_data list for text_section must contain at least one item")
                for item in self.section_data:
                    if not isinstance(item, dict) or "point" not in item:
                        raise ValueError("Each item in section_data for text_section must be an object with a 'point' field")
                    if not isinstance(item["point"], str) or not item["point"].strip():
                        raise ValueError("Each 'point' in section_data for text_section must be a non-empty string")
                return self
            raise ValueError("section_data for text_section must be either a string or a list of point objects")

        if self.section_data_type == "points_section":
            if self.section_data is None:
                raise ValueError("section_data is required for points_section")
            if not isinstance(self.section_data, list):
                raise ValueError("section_data for points_section must be a list of weighted items")
            if not self.section_data:
                raise ValueError("section_data list for points_section must contain at least one weighted item")
            for item in self.section_data:
                if not isinstance(item, dict):
                    raise ValueError("Each item in section_data for points_section must be an object with 'point' and 'weight'")
                if "point" not in item or "weight" not in item:
                    raise ValueError("Each item in section_data for points_section must contain 'point' and 'weight'")
                if not isinstance(item["point"], str) or not item["point"].strip():
                    raise ValueError("Each 'point' in section_data for points_section must be a non-empty string")
                if not isinstance(item["weight"], int) or item["weight"] < 0:
                    raise ValueError("Each 'weight' in section_data for points_section must be a non-negative integer")
        return self


class CustomFieldResponse(BaseModel):
    id: UUID
    org_id: UUID
    org_name: Optional[str]
    created_by: UUID
    creator_name: str
    creator_role: str
    section_name: str
    section_data_type: str
    section_data: Any
    description: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CustomFieldUpdate(BaseModel):
    section_name: Optional[str] = Field(None, example="benefits_overview", description="Updated section name, must be unique for the organization")
    section_data_type: Optional[str] = Field(None, example="text_section", description="Updated section data type")
    section_data: Optional[Any] = Field(None, description="Updated section data")
    description: Optional[str] = Field(None, example="Updated description for the custom section")

    @field_validator("section_data_type")
    @classmethod
    def normalize_section_data_type(cls, value):
        if value is None:
            return value
        normalized = str(value or "").strip().lower().replace(" ", "_")
        if normalized == "textsection":
            normalized = "text_section"
        if normalized in {"pointssection", "points_section", "points"}:
            normalized = "points_section"
        if normalized not in {"text_section", "points_section"}:
            raise ValueError("section_data_type must be 'text_section' or 'points_section'")
        return normalized

    @model_validator(mode="after")
    def validate_update_payload(self):
        if self.section_name is None and self.section_data_type is None and self.section_data is None and self.description is None:
            raise ValueError("At least one field must be provided for update")

        if self.section_data is not None and isinstance(self.section_data, list):
            for item in self.section_data:
                if not isinstance(item, dict) or "point" not in item:
                    raise ValueError("Each item in section_data must be an object with a 'point' field")
                if not isinstance(item["point"], str) or not item["point"].strip():
                    raise ValueError("Each 'point' in section_data must be a non-empty string")
        return self


class PublicTemplateCreate(BaseModel):
    template_code: str = Field(..., example="TECH001")
    job_title: str = Field(..., example="Senior React Developer")
    company: Optional[str] = Field(None, example="Acme Tech")
    job_id: Optional[str] = Field(None, example="ENG_SEN", description="Internal job identifier")
    job_family: Optional[str] = Field(None, example="Software Development", description="Job family or category")
    job_level: Optional[str] = Field(None, example="L4", description="Job level or grade")
    industry: str = Field(..., example="Technology")
    department: Optional[str] = Field(None, example="Engineering")
    location: Optional[str] = Field(None, example="Hyderabad, India")
    city: Optional[str] = Field(None, example="Hyderabad")
    country_code: Optional[str] = Field(None, example="IN", description="ISO country code")
    seniority: Optional[str] = Field(None, example="Senior", description="Seniority level")
    salary_range: Optional[str] = Field(None, example="₹20L/yr - ₹35L/yr", description="Salary range display")
    salary_symbol: Optional[str] = Field(None, example="₹", description="Currency symbol")
    salary_min_value: Optional[str] = Field(None, example="20", description="Minimum salary value")
    salary_max_value: Optional[str] = Field(None, example="35", description="Maximum salary value")
    salary_period: Optional[str] = Field(None, example="/yr", description="Salary period")
    employment_type: Optional[str] = Field(None, example="Full-Time")
    professional_summary: Optional[str] = Field(None, example="Acme Tech builds fintech platforms that empower users to manage finances securely. The Senior React Developer will craft responsive interfaces using React.js, TypeScript, and Next.js.")
    responsibilities_overview: Optional[str] = Field(None, example="In this role you own the front-end architecture for fintech applications, defining component structures and integration patterns that align with product strategy and regulatory requirements.")
    key_duties: List[WeightedItem] = Field(default_factory=list, example=[
        {"point": "Design and implement reusable React.js components with TypeScript to deliver intuitive fintech user experiences", "weight": 30},
        {"point": "Integrate state management solutions such as Redux or Zustand to maintain consistent application state across complex workflows", "weight": 25},
        {"point": "Consume REST and GraphQL APIs efficiently, handling data fetching and error management within the front-end layer", "weight": 25},
        {"point": "Maintain CI/CD pipelines for automated testing and deployment, ensuring rapid and reliable release cycles", "weight": 20}
    ])
    core_competencies: List[WeightedItem] = Field(default_factory=list, example=[
        {"point": "Strong problem-solving orientation", "weight": 30},
        {"point": "Effective team collaboration", "weight": 30},
        {"point": "Clear communication of technical concepts", "weight": 20},
        {"point": "Commitment to continuous learning", "weight": 20}
    ])
    functional_competencies: List[WeightedItem] = Field(default_factory=list, example=[
        {"point": "Deep expertise in React.js and TypeScript", "weight": 40},
        {"point": "Proficiency with Next.js for server-side rendering", "weight": 30},
        {"point": "Experience with Redux or Zustand state management", "weight": 30}
    ])
    qualifications_required: List[WeightedItem] = Field(default_factory=list, example=[
        {"point": "Minimum 4 years of professional experience building web applications with React.js", "weight": 20},
        {"point": "Strong command of TypeScript and modern JavaScript features", "weight": 20},
        {"point": "Hands-on experience with Next.js for scalable front-end solutions", "weight": 15},
        {"point": "Proficiency in managing application state using Redux or Zustand", "weight": 15},
        {"point": "Experience integrating RESTful and GraphQL APIs in a fintech context", "weight": 15},
        {"point": "Familiarity with CI/CD pipelines and automated testing practices", "weight": 15}
    ])
    qualifications_preferred: List[WeightedItem] = Field(default_factory=list, example=[
        {"point": "Exposure to agile development methodologies", "weight": 34},
        {"point": "Understanding of security best practices for fintech applications", "weight": 33},
        {"point": "Knowledge of product lifecycle and fintech domain concepts", "weight": 33}
    ])
    required_licenses_certifications: List[str] = Field(default_factory=list, example=["React Certification", "TypeScript Certification"])
    compliance_requirements: List[str] = Field(default_factory=list, example=["GDPR Compliance", "FINRA Compliance"])
    tools_technologies: List[str] = Field(default_factory=list, example=["React.js", "TypeScript", "Next.js", "Redux", "Zustand"])
    equal_opportunity_statement: Optional[str] = Field(None, example="Acme Tech is an equal opportunity employer committed to a diverse and inclusive workplace. We welcome applications from all qualified individuals irrespective of gender, caste, religion, race, disability, sexual orientation, or any other characteristic protected under the Constitution of India, the Rights of Persons with Disabilities Act 2016, and the Transgender Persons (Protection of Rights) Act 2019.")

    @field_validator('key_duties')
    @classmethod
    def validate_key_duties_weights(cls, v):
        validated = validate_weighted_section(v)
        if validated is not None:
            return [WeightedItem(**item) for item in validated]
        return validated

    @field_validator('core_competencies')
    @classmethod
    def validate_core_competencies_weights(cls, v):
        validated = validate_weighted_section(v)
        if validated is not None:
            return [WeightedItem(**item) for item in validated]
        return validated

    @field_validator('functional_competencies')
    @classmethod
    def validate_functional_competencies_weights(cls, v):
        validated = validate_weighted_section(v)
        if validated is not None:
            return [WeightedItem(**item) for item in validated]
        return validated

    @field_validator('qualifications_required')
    @classmethod
    def validate_qualifications_required_weights(cls, v):
        validated = validate_weighted_section(v)
        if validated is not None:
            return [WeightedItem(**item) for item in validated]
        return validated

    @field_validator('qualifications_preferred')
    @classmethod
    def validate_qualifications_preferred_weights(cls, v):
        validated = validate_weighted_section(v)
        if validated is not None:
            return [WeightedItem(**item) for item in validated]
        return validated


class PublicTemplateUpdate(BaseModel):
    job_title: Optional[str] = None
    company: Optional[str] = None
    job_id: Optional[str] = None
    job_family: Optional[str] = None
    job_level: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    city: Optional[str] = None
    country_code: Optional[str] = None
    seniority: Optional[str] = None
    salary_range: Optional[str] = None
    salary_symbol: Optional[str] = None
    salary_min_value: Optional[str] = None
    salary_max_value: Optional[str] = None
    salary_period: Optional[str] = None
    industry: Optional[str] = None
    employment_type: Optional[str] = None
    professional_summary: Optional[str] = None
    responsibilities_overview: Optional[str] = None
    key_duties: Optional[List[WeightedItem]] = None
    core_competencies: Optional[List[WeightedItem]] = None
    functional_competencies: Optional[List[WeightedItem]] = None
    qualifications_required: Optional[List[WeightedItem]] = None
    qualifications_preferred: Optional[List[WeightedItem]] = None
    required_licenses_certifications: Optional[List[str]] = None
    compliance_requirements: Optional[List[str]] = None
    tools_technologies: Optional[List[str]] = None
    equal_opportunity_statement: Optional[str] = None
    is_active: Optional[bool] = None


class PublicTemplateResponse(BaseModel):
    id: UUID
    template_code: str
    job_title: str
    company: Optional[str] = None
    job_id: Optional[str] = None
    job_family: Optional[str] = None
    job_level: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    city: Optional[str] = None
    country_code: Optional[str] = None
    seniority: Optional[str] = None
    salary_range: Optional[str] = None
    salary_symbol: Optional[str] = None
    salary_min_value: Optional[str] = None
    salary_max_value: Optional[str] = None
    salary_period: Optional[str] = None
    industry: str
    employment_type: Optional[str] = None
    professional_summary: Optional[str] = None
    responsibilities_overview: Optional[str] = None
    key_duties: List[WeightedItem]
    core_competencies: List[WeightedItem]
    functional_competencies: List[WeightedItem]
    qualifications_required: List[WeightedItem] = []
    qualifications_preferred: List[WeightedItem] = []
    required_licenses_certifications: List[str] = []
    compliance_requirements: List[str] = []
    tools_technologies: List[str] = []
    equal_opportunity_statement: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True
    }


class JobDescriptionSkeletonCreate(BaseModel):
    title: Optional[str] = Field("OFfline creation", example="Senior Software Engineer")
    industry: Optional[str] = Field("Offline", example="Technology")

class JobDescriptionCreate(BaseModel):
    title: str = Field(..., example="Senior Software Engineer")
    department: Optional[str] = Field(None, example="Engineering")
    location: Optional[str] = Field(None, example="San Francisco, CA")
    city: Optional[str] = Field(None, example="San Francisco")
    country_code: str = Field("US", example="US")
    seniority: Optional[str] = Field(None, example="Senior")
    industry: str = Field(..., example="Technology")
    salary_range: Optional[str] = Field(None, example="$120k-$180k")
    input_prompt: str = Field(..., example="Create a job description for a senior software engineer role")
    generation_mode: str = Field("ai", example="ai")
    model_used: Optional[str] = Field(None, example="gpt-4")
    content: Dict[str, Any] = Field(..., example={"summary": "Job summary here...", "responsibilities": [], "qualifications": []})

    @field_validator('content')
    @classmethod
    def validate_content(cls, v):
        if not v:
            return v
        for key, val in list(v.items()):
            if key.endswith('_view'):
                if val not in ['locked', 'unlocked']:
                    v[key] = 'unlocked'
        return v

    model_config = {
        "from_attributes": True,
        "protected_namespaces": ()
    }


class JobDescriptionUpdate(BaseModel):
    content: Optional[Dict[str, Any]] = Field(None, example={"summary": "Updated summary..."})
    status: Optional[str] = Field(None, example="draft")

    @field_validator('content')
    @classmethod
    def validate_content(cls, v):
        if not v:
            return v
        for key, val in list(v.items()):
            if key.endswith('_view'):
                if val not in ['locked', 'unlocked']:
                    v[key] = 'unlocked'
        return v


class OrgJdIdResponse(BaseModel):
    jd_id: str
    status: str


class OrgJdSummaryResponse(BaseModel):
    id: UUID
    org_id: Optional[UUID] = None
    creator_id: Optional[UUID] = None
    creator_name: Optional[str] = None
    title: str
    company_name: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    country_code: str
    seniority: Optional[str] = None
    employment_type: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    status: str
    industry: str
    original_jd_id: Optional[UUID] = None
    public_jd_id: Optional[UUID] = None
    parent_jd_id: Optional[UUID] = None

    class Config:
        from_attributes = True


class JobDescriptionResponse(BaseModel):
    id: UUID
    org_id: Optional[UUID] = None
    creator_id: Optional[UUID] = None
    creator_name: Optional[str] = None
    template_id: Optional[UUID] = None
    title: str
    company_name: Optional[str] = None
    job_id: Optional[str] = None
    job_family: Optional[str] = None
    job_level: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    city: Optional[str] = None
    country_code: str
    seniority: Optional[str] = None
    industry: str
    salary_range: Optional[str] = None
    salary_symbol: Optional[str] = None
    salary_min_value: Optional[str] = None
    salary_max_value: Optional[str] = None
    salary_period: Optional[str] = None
    employment_type: Optional[str] = None
    key_skills: Optional[str] = None
    core_competencies: Optional[str] = None
    functional_competencies: Optional[str] = None
    additional_context: Optional[str] = None
    image_url: Optional[str] = None
    content: dict
    sections_metadata: dict = {}
    eeoc_flags: List[Any] = []
    eeoc_cleared: bool = False
    status: str
    public_jd_id: Optional[UUID] = None
    word_count: Optional[int] = None
    generation_mode: Optional[str] = None
    finalized_at: Optional[datetime] = None
    parent_jd_id: Optional[UUID] = None
    is_main: bool = True
    version_history: List[dict] = []
    created_at: datetime
    updated_at: datetime

    @field_validator("version_history", mode="before")
    @classmethod
    def validate_version_history(cls, value):
        if value is None:
            return []
        if isinstance(value, list):
            return value
        return []

def _normalize_sections_order_keys(order) -> list:
    """Coerce order arrays to plain section key strings."""
    if not isinstance(order, list):
        return []
    normalized = []
    for item in order:
        if isinstance(item, str):
            key = item.strip()
            if key:
                normalized.append(key)
        elif isinstance(item, dict):
            raw = item.get("point") or item.get("title") or item.get("name") or item.get("key") or item.get("id")
            if raw is not None:
                key = str(raw).strip()
                if key:
                    normalized.append(key)
        elif item is not None:
            key = str(item).strip()
            if key and not key.startswith("{"):
                normalized.append(key)
    return normalized

def _is_stable_section_key(key: str) -> bool:
    return bool(re.match(r"^section_\d+$", str(key or "").strip()))

def _is_section_view_lock_key(key: str) -> bool:
    return bool(re.match(r"^section_\d+_view$", str(key or "").strip()))


def _parse_python_dict_str(val: str):
    import ast
    if not isinstance(val, str) or not (val.strip().startswith("{") and val.strip().endswith("}")):
        return None
    try:
        parsed = ast.literal_eval(val.strip())
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        pass
    return None

def _sanitize_stable_content(content: dict, sections_metadata: Optional[dict] = None) -> tuple[dict, dict]:
    """Remove section_N_view pseudo-sections; merge view locks into section metadata."""
    content = dict(content or {})
    sections_metadata = dict(sections_metadata or {})

    for key in list(content.keys()):
        if _is_stable_section_key(key) and isinstance(content[key], dict):
            sec = dict(content[key])
            sd = sec.get("section_data")
            if isinstance(sd, list):
                new_sd = []
                for item in sd:
                    if isinstance(item, str):
                        parsed = _parse_python_dict_str(item)
                        if parsed:
                            new_sd.append(parsed)
                        else:
                            new_sd.append(item)
                    else:
                        new_sd.append(item)
                sec["section_data"] = new_sd
                content[key] = sec

    for key in list(content.keys()):
        match = re.match(r"^section_(\d+)_view$", str(key))
        if not match:
            continue
        base_key = f"section_{match.group(1)}"
        val = content.pop(key, None)
        lock_val = "unlocked"
        if val in ("locked", "unlocked"):
            lock_val = val
        elif isinstance(val, dict):
            sd = val.get("section_data")
            if sd in ("locked", "unlocked"):
                lock_val = sd
            elif isinstance(val.get("metadata"), dict):
                lock_val = val["metadata"].get("view", "unlocked")
        if base_key in content and isinstance(content[base_key], dict):
            sec = dict(content[base_key])
            meta = dict(sec.get("metadata") or {})
            meta["view"] = lock_val if lock_val in ("locked", "unlocked") else "unlocked"
            sec["metadata"] = meta
            content[base_key] = sec

    for key in list(content.keys()):
        if str(key).startswith("section_") and not _is_stable_section_key(str(key)):
            content.pop(key, None)

    order_source = content.get("sections_order") or sections_metadata.get("order") or []
    cleaned_order = [k for k in order_source if _is_stable_section_key(str(k)) and k in content]
    for key in content.keys():
        if _is_stable_section_key(str(key)) and key not in cleaned_order:
            cleaned_order.append(key)
    content["sections_order"] = cleaned_order

    locks = dict(sections_metadata.get("locks") or {})
    labels = dict(sections_metadata.get("labels") or {})
    for key in cleaned_order:
        sec = content.get(key) or {}
        if isinstance(sec, dict):
            locks[key] = sec.get("metadata", {}).get("view", locks.get(key, "unlocked"))
            labels[key] = sec.get("name", labels.get(key, key.replace("_", " ").title()))
    sections_metadata["order"] = cleaned_order
    sections_metadata["locks"] = locks
    sections_metadata["labels"] = labels
    return content, sections_metadata

def migrate_to_stable_format(data: dict) -> dict:
    content = data.get("content")
    sections_metadata = data.get("sections_metadata")

    if not isinstance(content, dict):
        content = {}
    if not isinstance(sections_metadata, dict):
        sections_metadata = {}

    legacy_labels = sections_metadata.get("labels") or {}
    dynamic_sections = sections_metadata.get("dynamic_sections") or []

    is_stable_format = any(_is_stable_section_key(k) for k in content.keys()) or "sections_order" in content
    if is_stable_format:
        content, sections_metadata = _sanitize_stable_content(content, sections_metadata)
    if not is_stable_format:
        stable_content = {}
        sections_order = []
        
        legacy_order = content.get("_section_order") or sections_metadata.get("order") or []
        if not legacy_order:
            legacy_order = [
                k for k in content.keys()
                if not k.endswith("_view") and not k.startswith("weight_view_") and k not in ("_section_order", "sections_metadata")
            ]
        
        counter = 1
        for item in legacy_order:
            if not item:
                continue
            norm_item = item.strip()
            val = content.get(norm_item)
            if val is None:
                for k, v in content.items():
                    if k.lower() == norm_item.lower():
                        val = v
                        norm_item = k
                        break
                        
            if isinstance(val, list):
                new_val = []
                for x in val:
                    if isinstance(x, str):
                        parsed = _parse_python_dict_str(x)
                        if parsed:
                            new_val.append(parsed)
                        else:
                            new_val.append(x)
                    else:
                        new_val.append(x)
                val = new_val
                        
            if norm_item in ("_section_order", "sections_metadata") or norm_item.endswith("_view") or norm_item.startswith("weight_view_"):
                continue
                
            label = legacy_labels.get(norm_item) or norm_item.replace("_", " ").title()
                
            sec_type = "points" if isinstance(val, list) else "text"
            for ds in dynamic_sections:
                if ds.get("key") == norm_item or ds.get("id") == norm_item:
                    sec_type = ds.get("type", sec_type)
                    label = ds.get("heading", label)
                    break
                        
            view_lock = content.get(f"{norm_item}_view", "unlocked")
            if not isinstance(view_lock, str) or view_lock not in ("locked", "unlocked"):
                view_lock = "unlocked"
                
            push_csod = True
            for ds in dynamic_sections:
                if ds.get("key") == norm_item or ds.get("id") == norm_item:
                    push_csod = ds.get("push_to_csod", True)
                    break
                        
            stable_key = f"section_{counter}"
            stable_content[stable_key] = {
                "name": label,
                "type": sec_type,
                "section_data": val if val is not None else "",
                "metadata": {
                    "view": view_lock,
                    "push_to_csod": push_csod
                }
            }
            sections_order.append(stable_key)
            counter += 1
            
        stable_content["sections_order"] = sections_order
        content = stable_content
    else:
        # Already stable — normalize each section object and strip legacy key leaks
        meta_labels = sections_metadata.get("labels") or {}
        sections_order = _normalize_sections_order_keys(content.get("sections_order") or [])
        stable_keys = sorted(
            k for k in content.keys()
            if _is_stable_section_key(str(k))
        )
        if not sections_order:
            sections_order = stable_keys
        else:
            # Drop order entries only when section data was explicitly removed from content
            sections_order = [k for k in sections_order if not _is_stable_section_key(str(k)) or k in content]
            for k in stable_keys:
                if k not in sections_order:
                    sections_order.append(k)

        cleaned: dict = {"sections_order": sections_order}
        for key in sections_order:
            if not _is_stable_section_key(str(key)):
                continue
            sec_obj = content.get(key)
            fallback_name = meta_labels.get(key) or key.replace("_", " ").title()

            if isinstance(sec_obj, dict) and ("section_data" in sec_obj or "name" in sec_obj):
                sec_data = sec_obj.get("section_data", sec_obj.get("data", ""))
                sec_type = sec_obj.get("type")
                if not sec_type:
                    sec_type = "points" if isinstance(sec_data, list) else "text"
                metadata = sec_obj.get("metadata") if isinstance(sec_obj.get("metadata"), dict) else {}
                view = metadata.get("view", "unlocked")
                if view not in ("locked", "unlocked"):
                    view = "unlocked"
                cleaned[key] = {
                    "name": sec_obj.get("name") or fallback_name,
                    "type": sec_type,
                    "section_data": sec_data if sec_data is not None else ("" if sec_type == "text" else []),
                    "metadata": {
                        "view": view,
                        "push_to_csod": metadata.get("push_to_csod", True),
                    },
                }
            elif sec_obj is not None:
                sec_type = "points" if isinstance(sec_obj, list) else "text"
                cleaned[key] = {
                    "name": fallback_name,
                    "type": sec_type,
                    "section_data": sec_obj,
                    "metadata": {"view": "unlocked", "push_to_csod": True},
                }

        # Preserve any section_* still in storage but missing from cleaned output
        for key in stable_keys:
            if key in cleaned or content.get(key) is None:
                continue
            sec_obj = content[key]
            fallback_name = meta_labels.get(key) or key.replace("_", " ").title()
            sec_type = "points" if isinstance(sec_obj, list) else "text"
            if isinstance(sec_obj, dict) and ("section_data" in sec_obj or "name" in sec_obj):
                sec_data = sec_obj.get("section_data", sec_obj.get("data", ""))
                sec_type = sec_obj.get("type") or ("points" if isinstance(sec_data, list) else "text")
                metadata = sec_obj.get("metadata") if isinstance(sec_obj.get("metadata"), dict) else {}
                cleaned[key] = {
                    "name": sec_obj.get("name") or fallback_name,
                    "type": sec_type,
                    "section_data": sec_data if sec_data is not None else ("" if sec_type == "text" else []),
                    "metadata": {
                        "view": metadata.get("view", "unlocked"),
                        "push_to_csod": metadata.get("push_to_csod", True),
                    },
                }
            else:
                cleaned[key] = {
                    "name": fallback_name,
                    "type": sec_type,
                    "section_data": sec_obj,
                    "metadata": {"view": "unlocked", "push_to_csod": True},
                }
            if key not in sections_order:
                sections_order.append(key)
        cleaned["sections_order"] = sections_order
        content = cleaned

    if not sections_metadata:
        sections_metadata = {}
        
    sections_order = content.get("sections_order") or []
    sections_metadata["order"] = sections_order
    
    locks = {}
    labels = {}
    for key in sections_order:
        section_obj = content.get(key) or {}
        if isinstance(section_obj, dict):
            locks[key] = section_obj.get("metadata", {}).get("view", "unlocked")
            labels[key] = section_obj.get("name", key)
        else:
            locks[key] = "unlocked"
            labels[key] = key
    sections_metadata["locks"] = locks
    sections_metadata["labels"] = labels

    if "headers_metadata" not in sections_metadata:
        sections_metadata["headers_metadata"] = {
            "title": { "name": "Job Title", "visible": True, "required": True, "order": 1 },
            "salary_range": { "name": "Salary Range", "visible": True, "required": False, "order": 2 },
            "job_level": { "name": "Job Level", "visible": True, "required": False, "order": 3 },
            "industry": { "name": "Industry", "visible": True, "required": True, "order": 4 },
            "location": { "name": "Location", "visible": True, "required": False, "order": 5 },
            "employment_type": { "name": "Employment Type", "visible": True, "required": False, "order": 6 }
        }

    data["content"] = content
    data["sections_metadata"] = sections_metadata
    data.pop("custom_fields", None)
    return data

def _section_key_number(key: str) -> int:
    match = re.match(r"^section_(\d+)$", key or "")
    return int(match.group(1)) if match else 9999

def reindex_stable_sections(content: dict, sections_metadata: Optional[dict] = None, sections_order: Optional[list] = None) -> dict:
    """Renumber section_N keys sequentially after deletions, preserving display order."""
    content = dict(content or {})
    sections_metadata = dict(sections_metadata or {})

    order_source = sections_order or content.get("sections_order") or sections_metadata.get("order") or []
    non_section_keys = [k for k in order_source if not _is_stable_section_key(str(k))]

    # Preserve the user's display order from sections_order; append any orphan keys at the end
    order_section_keys = [
        k for k in order_source
        if _is_stable_section_key(str(k)) and k in content
    ]
    discovered = [k for k in content.keys() if _is_stable_section_key(str(k)) and k in content]
    ordered_section_keys = order_section_keys + sorted(
        [k for k in discovered if k not in order_section_keys],
        key=_section_key_number,
    )

    key_map: dict[str, str] = {}
    reindexed: dict = {}
    for index, old_key in enumerate(ordered_section_keys, start=1):
        new_key = f"section_{index}"
        key_map[old_key] = new_key
        reindexed[new_key] = content[old_key]

    for key in list(content.keys()):
        if str(key).startswith("section_"):
            del content[key]
    content.update(reindexed)

    new_section_order = [key_map[k] for k in ordered_section_keys]
    content["sections_order"] = non_section_keys + new_section_order

    def _remap_dict(obj: Optional[dict]) -> dict:
        if not isinstance(obj, dict):
            return {}
        remapped = {}
        for key, value in obj.items():
            if str(key).startswith("section_"):
                if key in key_map:
                    remapped[key_map[key]] = value
            else:
                remapped[key] = value
        return remapped

    for key in list(sections_metadata.keys()):
        if str(key).startswith("section_") and key not in key_map:
            del sections_metadata[key]
    for old_key, new_key in key_map.items():
        if old_key in sections_metadata:
            sections_metadata[new_key] = sections_metadata.pop(old_key)

    if "locks" in sections_metadata:
        sections_metadata["locks"] = _remap_dict(sections_metadata.get("locks"))
    if "labels" in sections_metadata:
        sections_metadata["labels"] = _remap_dict(sections_metadata.get("labels"))
    sections_metadata["order"] = content["sections_order"]

    return {"content": content, "sections_metadata": sections_metadata, "key_map": key_map}

def delete_and_reindex_stable_sections(content: dict, sections_metadata: Optional[dict], section_key: str) -> dict:
    content = dict(content or {})
    sections_metadata = dict(sections_metadata or {})
    content.pop(section_key, None)
    sections_metadata.pop(section_key, None)
    for nested_key in ("locks", "labels"):
        nested = sections_metadata.get(nested_key)
        if isinstance(nested, dict):
            nested.pop(section_key, None)
    order = [k for k in (content.get("sections_order") or sections_metadata.get("order") or []) if k != section_key]
    return reindex_stable_sections(content, sections_metadata, order)

class JobDescriptionResponse(BaseModel):
    id: UUID
    title: str
    org_id: Optional[UUID] = None
    department: Optional[str] = None
    industry: Optional[str] = None
    location: Optional[str] = None
    seniority: Optional[str] = None
    job_level: Optional[str] = None
    job_family: Optional[str] = None
    employment_type: Optional[str] = None
    country_code: Optional[str] = None
    salary_min_value: Any = None
    salary_max_value: Any = None
    salary_symbol: Optional[str] = None
    salary_period: Optional[str] = None
    company_name: Optional[str] = None
    company_logo: Optional[str] = None
    job_id: Optional[str] = None
    word_count: Optional[int] = None
    content: dict = {}
    sections_metadata: dict = {}
    status: str
    created_at: datetime
    updated_at: datetime
    generation_mode: Optional[str] = None
    creator_id: Optional[UUID] = None
    public_jd_id: Optional[UUID] = None
    original_jd_id: Optional[UUID] = None
    is_main: bool = True
    version_history: List[dict] = []
    eeoc_flags: List[Any] = []
    eeoc_cleared: bool = False

    creatorName: Optional[str] = None
    canEdit: Optional[bool] = None

    csodOuId: Optional[str] = None
    csodPushedAt: Optional[datetime] = None

    @field_validator("version_history", mode="before")
    @classmethod
    def validate_version_history(cls, value):
        if value is None:
            return []
        if isinstance(value, list):
            return value
        return []

    class Config:
        from_attributes = True

    @model_validator(mode="before")
    @classmethod
    def populate_dynamic_layout(cls, data):
        if not isinstance(data, dict):
            data_dict = {}
            if hasattr(data, "__table__"):
                for col in data.__table__.columns:
                    data_dict[col.name] = getattr(data, col.name, None)
            for attr in ["creatorName", "creator_name", "authorName", "author_name", "canEdit", "can_edit", "csodOuId", "csodPushedAt"]:
                if hasattr(data, attr):
                    data_dict[attr] = getattr(data, attr)
            data_dict["content"] = getattr(data, "_content", None) or getattr(data, "content", None)
            data_dict["sections_metadata"] = getattr(data, "sections_metadata", None)
            data = data_dict

        return migrate_to_stable_format(data)

    class Config:
        from_attributes = True


class RegenerateSectionRequest(BaseModel):
    section: str = Field(..., example="summary")
    context: Optional[str] = Field(None, example="Make it longer and more specific.")
    country_code: Optional[str] = Field(None, example="US", max_length=30)
    salary_symbol: Optional[str] = Field(None, example="$", max_length=5)
    salary_min_value: Optional[str] = Field(None, example="120", max_length=20)
    salary_max_value: Optional[str] = Field(None, example="180", max_length=20)
    salary_period: Optional[str] = Field(None, example="/yr", max_length=10)


class EEOCDismissalCreate(BaseModel):
    jd_id: UUID = Field(..., example="123e4567-e89b-12d3-a456-426614174000")
    rule_id: str = Field(..., example="RULE001")
    phrase: str = Field(..., example="discriminatory phrase")
    char_index: int = Field(..., example=10)
    reason: Optional[str] = Field(None, example="Not applicable in context")


class ExportLogCreate(BaseModel):
    jd_id: UUID = Field(..., example="123e4567-e89b-12d3-a456-426614174000")
    export_type: str = Field(..., example="pdf")


class JDCreateFromTemplate(BaseModel):
    title: str = Field(..., example="Senior Software Engineer")
    industry: str = Field(..., example="Technology")
    department: Optional[str] = Field(None, example="Engineering")
    location: Optional[str] = Field(None, example="San Francisco, CA")
    city: Optional[str] = Field(None, example="San Francisco")
    seniority: Optional[str] = Field(None, example="Senior")
    employment_type: Optional[str] = Field(..., example="Full-Time")
    salary_range: Optional[str] = Field(None, example="$120k-$180k")
    key_skills: Optional[str] = Field(None, example="Python, FastAPI, PostgreSQL")
    additional_context: Optional[str] = Field(None, example="Looking for experienced developer")
    summary: str = Field(..., example="We are looking for a talented software engineer...")
    responsibilities: List[str] = Field(..., example=["Develop web applications", "Write clean code", "Collaborate with team"])
    qualifications: Dict[str, List[str]] = Field(..., example={"required": ["BS in CS", "3+ years experience"], "preferred": ["Master's degree", "AWS certification"]})
    eeo_statement: str = Field(..., example="We are an equal opportunity employer...")
    compliance_tag: Optional[str] = Field(None, example="IT-Compliant")

    @field_validator('seniority')
    @classmethod
    def validate_seniority(cls, v):
        if v is not None:
            v = v.strip()
        return v


class UserSectionMetadata(BaseModel):
    push_to_csod: bool = Field(True, description="Whether this section syncs to CSOD")
    view_section: bool = Field(True, description="Whether this section is visible in the JD")
    field_type: Optional[str] = Field(None, description="Original UI field type (TextBox, Paragraph, Weights, etc.)")


class UserSectionInput(BaseModel):
    """Optional user-defined JD section supplied before AI generation."""
    name: str = Field(..., min_length=1, max_length=200, description="Display name for the section (e.g. Benefits, Tech Stack)")
    content: Optional[Any] = Field(None, description="Pre-filled section body (string or list of points). Omit or leave empty to have AI generate.")
    type: Optional[str] = Field(None, description="Section type: text or points")
    generate_if_empty: bool = Field(True, description="When content is empty, generate via AI during JD creation")
    metadata: Optional[UserSectionMetadata] = Field(None, description="Section visibility and CSOD metadata")


class JDGenerateRequest(BaseModel):
    title: str = Field(..., example="Senior React Developer", max_length=100, description="Job title - required field")
    company_name: Optional[str] = Field(None, example="Acme Tech", max_length=100, description="Company name for the job description")
    job_id: Optional[str] = Field(None, example="ENG_SEN", max_length=50, description="Internal job identifier")
    job_family: Optional[str] = Field(None, example="Software Development", description="Job family or category")
    job_level: Optional[str] = Field(None, example="L4", description="Job level or grade (e.g., L1, L2, L3, L4, L5)")
    industry: str = Field(..., example="Technology", description="Industry sector - required field")
    department: Optional[str] = Field(None, example="Engineering", max_length=100, description="Department name")
    location: Optional[str] = Field(None, example="Hyderabad, India", max_length=200, description="Job location (full address)")
    city: Optional[str] = Field(None, example="Hyderabad", max_length=100, description="City name")
    country_code: Optional[str] = Field("US", example="IN", max_length=30, description="Country code or country name (default: US). Accepts None.")
    seniority: Optional[str] = Field(None, example="Senior", max_length=50, description="Seniority level (Junior, Mid, Senior, Lead, etc.)")
    employment_type: Optional[str] = Field("Full-Time", example="Full-Time", description="Employment type (e.g., Full-Time, Contract, Remote)")
    salary_range: Optional[str] = Field(None, example="₹20 - ₹35/yr", max_length=200, description="Formatted salary range (auto-built from min/max if omitted)")
    salary_symbol: Optional[str] = Field(None, example="₹", max_length=5, description="Salary currency symbol (e.g., $, £, ₹, MYR symbol if applicable)")
    salary_min_value: Optional[str] = Field(None, example="20", max_length=20, description="Minimum salary value (without symbol)")
    salary_max_value: Optional[str] = Field(None, example="35", max_length=20, description="Maximum salary value (without symbol)")
    salary_period: Optional[str] = Field(None, example="/yr", max_length=10, description="Optional period/suffix appended to min/max (e.g., k, M, /year, /month)")
    key_skills_and_requirements: Optional[str] = Field(None, example="React.js, TypeScript, Next.js", max_length=1000, description="Key technical skills and requirements")
    core_competencies: Optional[List[WeightedItem]] = Field(None, example=[
        {"point": "Strong problem-solving orientation", "weight": 30},
        {"point": "Effective team collaboration", "weight": 30},
        {"point": "Clear communication of technical concepts", "weight": 20},
        {"point": "Commitment to continuous learning", "weight": 20}
    ], description="Leadership and behavioral competencies with weights")
    functional_competencies: Optional[List[WeightedItem]] = Field(None, example=[
        {"point": "Deep expertise in React.js and TypeScript", "weight": 40},
        {"point": "Proficiency with Next.js for server-side rendering", "weight": 30},
        {"point": "Experience with Redux or Zustand state management", "weight": 30}
    ], description="Technical and operational competencies with weights")
    additional_context: Optional[str] = Field(None, example="Acme Tech builds fintech platforms that empower users to manage finances securely", max_length=1000, description="Additional context or special requirements")
    model_name: Optional[str] = Field(None, example="phenomecloud-small", max_length=200, description="Lexy model name for generation (optional, defaults to configured model)")
    user_sections: Optional[List[UserSectionInput]] = Field(None, description="Optional custom sections to include in the generated JD")
    sections_order: Optional[List[str]] = Field(None, description="Preferred order for user-defined section names")

    @field_validator('key_skills_and_requirements')
    @classmethod
    def validate_key_skills(cls, v):
        return truncate_field(v, 1000)

    @field_validator('core_competencies')
    @classmethod
    def validate_core_competencies(cls, v):
        validated = validate_weighted_section(v)
        if validated is not None:
            return [WeightedItem(**item) for item in validated]
        return validated

    @field_validator('functional_competencies')
    @classmethod
    def validate_functional_competencies(cls, v):
        validated = validate_weighted_section(v)
        if validated is not None:
            return [WeightedItem(**item) for item in validated]
        return validated

    @field_validator('job_level')
    @classmethod
    def validate_job_level(cls, v):
        return validate_job_level(v)


    @field_validator('seniority')
    @classmethod
    def validate_seniority(cls, v):
        return validate_seniority(v)

    @model_validator(mode='after')
    def build_salary_range(self):
        """Auto-build salary_range from min/max/symbol/period if not provided."""
        if self.salary_range is None or self.salary_range == "":
            if self.salary_min_value and self.salary_max_value:
                symbol = self.salary_symbol or ""
                period = self.salary_period or ""
                self.salary_range = f"{symbol}{self.salary_min_value} - {symbol}{self.salary_max_value}{period}"
        return self


class JDAutosaveRequest(BaseModel):
    summary: Optional[str] = Field(None, example="Updated summary...")
    essential_duties_and_responsibilities: Optional[str] = Field(None, example="Updated responsibilities...")
    key_duties: Optional[Any] = Field(None)
    core_competencies: Optional[Any] = Field(None)
    coreCompetencies: Optional[Any] = Field(None)
    functional_competencies: Optional[Any] = Field(None)
    functionalCompetencies: Optional[Any] = Field(None)
    qualifications_required: Optional[Any] = Field(None)
    qualifications_preferred: Optional[Any] = Field(None)
    qualifications: Optional[Any] = Field(None)
    eeo_statement: Optional[str] = Field(None)
    
    # Metadata fields
    title: Optional[str] = Field(None)
    company_name: Optional[str] = Field(None)
    companyName: Optional[str] = Field(None)
    job_id: Optional[str] = Field(None)
    jobId: Optional[str] = Field(None)
    job_family: Optional[str] = Field(None)
    jobFamily: Optional[str] = Field(None)
    job_level: Optional[str] = Field(None)
    jobLevel: Optional[str] = Field(None)
    department: Optional[str] = Field(None)
    location: Optional[str] = Field(None)
    city: Optional[str] = Field(None)
    country_code: Optional[str] = Field(None)
    countryCode: Optional[str] = Field(None)
    seniority: Optional[str] = Field(None)
    industry: Optional[str] = Field(None)
    salary_range: Optional[str] = Field(None)
    salary_symbol: Optional[str] = Field(None)
    salary_min_value: Optional[str] = Field(None)
    salary_max_value: Optional[str] = Field(None)
    salary_period: Optional[str] = Field(None)
    employment_type: Optional[str] = Field(None)
    key_skills: Optional[str] = Field(None)
    skills: Optional[str] = Field(None)
    additional_context: Optional[str] = Field(None)
    context: Optional[str] = Field(None)
    
    # Legacy section layout hints (migrated into sections_metadata on save)
    section_labels: Optional[Any] = Field(None)
    dynamic_sections: Optional[Any] = Field(None)


class JDUpdateSectionRequest(BaseModel):
    section: Optional[str] = Field(None, example="summary", description="Section name (optional if sent as query param)")
    value: Any = Field(..., example={"summary": "Updated summary", "responsibilities": ["New responsibility"]})

    @model_validator(mode="after")
    def validate_weight_view(self):
        if not self.section:
            return self
        if self.value not in ("locked", "unlocked"):
            return self
        normalized = self.section.replace(" ", "_").lower()
        if not normalized.endswith("_view") and normalized in {
            "summary", "essential_duties_and_responsibilities", "key_duties",
            "core_competencies", "functional_competencies",
            "qualifications_required", "qualifications_preferred", "eeo_statement",
        }:
            pass
        return self


class JDRenameSectionRequest(BaseModel):
    old_section_name: str = Field(..., example="summary", description="Current section name to rename")
    new_section_name: str = Field(..., example="description", description="New section name")


class JDStatusUpdateRequest(BaseModel):
    status: str = Field(..., example="approved", description="New status for the JD")
    
    @field_validator("status")
    @classmethod
    def validate_status(cls, value):
        valid_statuses = ["draft", "approved", "final", "public_view", "pushed_to_csod", "push_to_csod", "in_review", "declined", "archive", "archive_job", "clone"]
        if value not in valid_statuses:
            raise ValueError(f"Status must be one of: {', '.join(valid_statuses)}")
        return value


class JDBulkStatusUpdateRequest(BaseModel):
    from_status: str = Field(..., example="draft", description="Current status of JDs to update")
    to_status: str = Field(..., example="approved", description="New status to set for JDs")
    jd_ids: List[UUID] = Field(..., description="List of JD IDs to update")
    
    @field_validator("from_status", "to_status")
    @classmethod
    def validate_status(cls, value):
        valid_statuses = ["draft", "approved", "final", "public_view", "pushed_to_csod", "push_to_csod", "in_review", "declined", "archive", "archive_job", "clone"]
        if value not in valid_statuses:
            raise ValueError(f"Status must be one of: {', '.join(valid_statuses)}")
        return value


class JobIdCheckRequest(BaseModel):
    job_id: str = Field(..., min_length=1, max_length=50, example="CRI_ICU_123")


class JobIdMatchRecord(BaseModel):
    jd_id: UUID
    title: str
    status: str
    created_at: datetime


class JobIdCheckResponse(BaseModel):
    job_id: str
    exists: bool
    count: int
    jd_ids: List[UUID]
    records: List[JobIdMatchRecord]


class ForgotPasswordInitiateRequest(BaseModel):
    email: EmailStr = Field(..., example="user@example.com")
    purpose: Literal["forgot_password", "mfa"] = Field(default="forgot_password", description="OTP purpose: forgot_password or mfa")

    @field_validator("email")
    @classmethod
    def validate_email_field(cls, value):
        return validate_email(value)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr = Field(..., example="user@example.com")
    otp: str = Field(..., min_length=6, max_length=6, example="123456", description="6-digit OTP code sent to email")
    new_password: str = Field(..., min_length=8, example="NewPassword123!")
    confirm_password: str = Field(..., example="NewPassword123!")
    purpose: Literal["forgot_password", "mfa"] = Field(default="forgot_password", description="OTP purpose: forgot_password or mfa")

    @field_validator("email")
    @classmethod
    def validate_email_field(cls, value):
        return validate_email(value)

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, value):
        return validate_password_strength(value)

    @model_validator(mode="after")
    def passwords_match(self):
        if self.new_password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self


class ResetPasswordRequest(BaseModel):
    email: EmailStr = Field(..., example="user@example.com")
    new_password: str = Field(..., min_length=8, example="NewPassword123!")
    confirm_password: str = Field(..., example="NewPassword123!")
    purpose: Literal["forgot_password", "mfa"] = Field(default="forgot_password", description="OTP purpose: forgot_password or mfa")

    @field_validator("email")
    @classmethod
    def validate_email_field(cls, value):
        return validate_email(value)

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, value):
        return validate_password_strength(value)

    @model_validator(mode="after")
    def passwords_match(self):
        if self.new_password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self


class AuthenticatedResetPasswordRequest(BaseModel):
    """Used by authenticated users to change their own password.
    Email is not accepted — the user identity comes from the JWT token.
    """
    new_password: str = Field(..., min_length=8, example="NewPassword123!")
    confirm_password: str = Field(..., example="NewPassword123!")

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, value):
        return validate_password_strength(value)

    @model_validator(mode="after")
    def passwords_match(self):
        if self.new_password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self



class UserResponse(BaseModel):
    id: UUID
    full_name: str
    email: EmailStr
    role: str
    country: Optional[str] = None
    org_id: Optional[UUID] = None
    org_name: Optional[str] = None
    color_code: Optional[str] = None
    created_at: datetime

    model_config = {
        "from_attributes": True
    }


class OrganizationCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Organization name")
    industry: Optional[str] = Field(None, max_length=100, description="Organization industry")
    image_url: Optional[str] = Field(None, description="Organization image URL")

    @field_validator("name")
    @classmethod
    def validate_name(cls, value):
        return validate_org_name(value)


class OrganizationUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100, description="Organization name")
    industry: Optional[str] = Field(None, max_length=100, description="Organization industry")
    image_url: Optional[str] = Field(None, description="Organization image URL")

    @field_validator("name")
    @classmethod
    def validate_name(cls, value):
        if value is None:
            return value
        return validate_org_name(value)


class OrganizationResponse(BaseModel):
    id: UUID
    name: str
    industry: Optional[str] = None
    image_url: Optional[str] = None
    image_base64: Optional[str] = None
    is_active: bool = True
    access_valid_until: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True
    }



class OrganizationWithAdminCreate(BaseModel):
    org_name: str = Field(..., min_length=2, max_length=100, description="Organization name")
    org_industry: Optional[str] = Field(None, max_length=100, description="Organization industry")
    org_image_url: Optional[str] = Field(None, description="Organization image URL")
    admin_full_name: str = Field(..., min_length=3, max_length=50, example="john_doe")
    admin_email: EmailStr = Field(..., example="admin@example.com")
    admin_password: str = Field(..., min_length=8, example="Password123!")
    admin_country: str = Field(..., min_length=2, max_length=120, description="Admin's country")
    admin_color_code: Optional[str] = Field(None, example="#ece75c", description="Hex color code for edit tracking")

    @field_validator("admin_email")
    @classmethod
    def validate_email_field(cls, value):
        return validate_email(value)

    @field_validator("admin_full_name")
    @classmethod
    def validate_full_name_field(cls, value):
        return validate_full_name(value)

    @field_validator("admin_password")
    @classmethod
    def validate_password_field(cls, value):
        return validate_password_strength(value)

    @field_validator("admin_country")
    @classmethod
    def strip_country(cls, v: str) -> str:
        s = v.strip()
        if len(s) < 2:
            raise ValueError("Country must be at least 2 characters")
        return s

    @field_validator("org_name")
    @classmethod
    def validate_org_name_field(cls, value):
        return validate_org_name(value)


class OTPRequest(BaseModel):
    email: EmailStr = Field(..., description="User email address")
    username: Optional[str] = Field(None, description="Optional username")
    password: str = Field(..., min_length=6, description="User password")
    role: str = Field(..., description="User role: Admin, Manager, or HR")
    company_name: Optional[str] = Field(None, min_length=2, max_length=100, description="Optional for now")
    color_code: Optional[str] = Field(None, example="#ece75c", description="Hex color code for edit tracking")
    country: str = Field(..., min_length=2, max_length=120, description="User's country from client — not inferred from IP.")

    @field_validator("email")
    @classmethod
    def validate_email_field(cls, value):
        return validate_email(value)

    @field_validator("role")
    @classmethod
    def validate_role(cls, value):
        return validate_user_role(value)

    @field_validator("country")
    @classmethod
    def strip_otp_country(cls, v: str) -> str:
        s = v.strip()
        if len(s) < 2:
            raise ValueError("Country must be at least 2 characters")
        return s


class OTPVerification(BaseModel):
    email: EmailStr = Field(..., description="User email address")
    otp_code: str = Field(..., min_length=6, max_length=6, description="6-digit OTP code")
    purpose: Literal["forgot_password", "mfa"] = Field(default="forgot_password", description="OTP purpose: forgot_password or mfa")

    @field_validator("email")
    @classmethod
    def validate_email_field(cls, value):
        return validate_email(value)


class OTPResend(BaseModel):
    email: EmailStr = Field(..., description="User email address")
    username: Optional[str] = Field(None, description="Username for personalized email")

    @field_validator("email")
    @classmethod
    def validate_email_field(cls, value):
        return validate_email(value)


class OTPResponse(BaseModel):
    message: str = Field(..., description="Response message")
    expires_in_minutes: int = Field(..., description="OTP expiry time in minutes")


class VerificationResponse(BaseModel):
    message: str = Field(..., description="Verification status message")
    verified: bool = Field(..., description="Whether OTP is verified")


class FeedbackRequest(BaseModel):
    subject: str = Field(..., min_length=5, max_length=120, example="Feedback about weekly reports")
    message: str = Field(..., min_length=10, max_length=2000, example="I would love to see a more detailed export option for the monthly analytics.")


class UserCreationResponse(BaseModel):
    message: str = Field(..., description="Account creation status")
    user_id: str = Field(..., description="Created user ID")
    email: str = Field(..., description="User email")
    username: Optional[str] = Field(None, description="Username if provided")


class StandaloneRegenerateRequest(BaseModel):
    """
    Payload for POST /job-descriptions/regenerate-section.
    """
    section_name: str = Field(...,example="summary",description="Name of the section to regenerate.")
    existing_data: Any = Field(...,example="We are looking for a Senior Software Engineer to join our team...",
        description=("Current content of the section as displayed to the user. "
            "Pass a string for text sections or a list of strings for list sections "))
    modification_request: str = Field(...,min_length=3,max_length=500,example="Make it more concise and emphasise leadership skills.",
        description="What the user wants changed — used verbatim as the AI instruction.")
    section_label: Optional[str] = Field(None, description="Human-readable section label for stable/custom sections")
    section_type: Optional[str] = Field(None, description="Section type: text, points, or weighted_list")
    title: Optional[str] = Field(None)
    department: Optional[str] = Field(None)
    industry: Optional[str] = Field(None)
    seniority: Optional[str] = Field(None)
    location: Optional[str] = Field(None)
    country_code: Optional[str] = Field(None)
    salary_range: Optional[str] = Field(None)

    @field_validator("section_name")
    @classmethod
    def validate_section_name(cls, v: str) -> str:
        return validate_section_name(v)


class StandaloneRegenerateSectionResponse(BaseModel):
    section: str = Field(..., description="Section that was regenerated")
    new_content: Any = Field(...,description="Regenerated content — string for text sections, list for array sections")
    word_count: int = Field(..., description="Approximate word count of the new content")


class StandaloneRegeneratePointRequest(BaseModel):
    """
    Payload for POST /job_descriptions/regenerate_point.
    """
    section_name: str = Field(...,example="qualifications_preferred",description="Name of the section to regenerate point in")
    existing_data: Any = Field(...,description="The specific point data to refine")
    modification_request: str = Field(...,min_length=3,max_length=500,description="What the user wants changed for this point")
    title: Optional[str] = Field(None)
    department: Optional[str] = Field(None)
    industry: Optional[str] = Field(None)
    seniority: Optional[str] = Field(None)
    location: Optional[str] = Field(None)
    country_code: Optional[str] = Field(None)
    salary_range: Optional[str] = Field(None)

    @field_validator("section_name")
    @classmethod
    def validate_section_name(cls, v: str) -> str:
        return validate_section_name(v)


class StandaloneRegeneratePointResponse(BaseModel):
    section: str = Field(..., description="Section that the point belongs to")
    new_point: Any = Field(...,description="Regenerated point data")


class WordLimitSpec(BaseModel):
    min: int = Field(..., ge=0, example=50)
    max: int = Field(..., ge=0, example=150)

    @model_validator(mode="after")
    def validate_min_max(self):
        if self.min > self.max:
            raise ValueError("min must be <= max")
        return self


class UserWordLimitsPatch(BaseModel):
    summary: Optional[WordLimitSpec] = None
    key_duties: Optional[WordLimitSpec] = None
    core_competencies: Optional[WordLimitSpec] = None
    functional_competencies: Optional[WordLimitSpec] = None
    qualifications_required: Optional[WordLimitSpec] = None
    qualifications_preferred: Optional[WordLimitSpec] = None
    eeo_statement: Optional[WordLimitSpec] = None


class UserWordLimitsResponse(BaseModel):
    summary: WordLimitSpec
    key_duties: WordLimitSpec
    core_competencies: WordLimitSpec
    functional_competencies: WordLimitSpec
    qualifications_required: WordLimitSpec
    qualifications_preferred: WordLimitSpec
    eeo_statement: WordLimitSpec


class TemplateStandaloneRegenerateRequest(BaseModel):
    """
    Payload for POST /templates/regenerate-section.
    """
    section_name: str = Field(...,example="summary",description="Name of the template section to regenerate.")
    existing_data: Any = Field(...,example="We are looking for a talented Software Engineer...",
        description=("Current content of the section as displayed to the user. ""Pass a string for text sections or a list of strings for list sections "))
    modification_request: str = Field(...,min_length=3,max_length=500,example="Make it more concise and emphasise leadership skills.",description="What the user wants changed — used verbatim as the AI instruction.")

    @field_validator("section_name")
    @classmethod
    def validate_template_section_name(cls, v: str) -> str:
        return validate_section_name(v)


class TemplateStandaloneRegenerateSectionResponse(BaseModel):
    section: str = Field(..., description="Template section that was regenerated")
    new_content: Any = Field(...,description="Regenerated content — string for text sections, list for array sections")
    word_count: int = Field(..., description="Approximate word count of the new content")


class OrganizationTypeCreate(BaseModel):
    organization_type_id: Optional[str] = None
    organization_type_name: str


class OrganizationTypeResponse(BaseModel):
    organization_type_id: str
    organization_type_name: str

    model_config = {"from_attributes": True}


class TalentForgeJobSetCreate(BaseModel):
    talentforge_job_title_id: Optional[str] = None
    name: str
    organization_type_id: str
    description: Optional[str] = None
    created_on: Optional[datetime] = None
    updated_on: Optional[datetime] = None


class TalentForgeJobSetResponse(BaseModel):
    talentforge_job_title_id: str
    name: str
    organization_type_id: str
    description: Optional[str]
    created_on: Optional[datetime]
    updated_on: Optional[datetime]

    model_config = {"from_attributes": True}


class TalentForgeSkillSetCreate(BaseModel):
    talentforge_skill_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    talentforge_job_set_id: str


class TalentForgeSkillSetResponse(BaseModel):
    talentforge_skill_id: str
    name: str
    description: Optional[str]
    talentforge_job_set_id: str

    model_config = {"from_attributes": True}



class AssignJDRequest(BaseModel):
    jd_id: UUID = Field(..., description="UUID of the Job Description to assign")
    assignee_user_id: UUID = Field(..., description="UUID of the user to assign the JD to")
    comment: str = Field(..., min_length=1, description="Comment or note for the assignee")


class ForwardJDRequest(BaseModel):
    jd_id: UUID = Field(..., description="UUID of the Job Description to forward")
    decision: str = Field(..., description="Decision on the JD: 'approved' or 'declined'")
    comment: str = Field(..., min_length=1, description="Comment explaining the decision")


# Candidate Assignment Schemas
class CandidateJDAssignmentCreate(BaseModel):
    """Schema for assigning JD to candidate."""
    jd_id: UUID = Field(..., description="JD ID to assign")
    candidate_id: UUID = Field(..., description="Candidate user ID")
    due_date: Optional[datetime] = Field(None, description="Optional due date")


class CandidateJDAssignmentUpdate(BaseModel):
    """Schema for updating candidate JD assignment."""
    status: Optional[str] = Field(None, description="New status")
    decision: Optional[str] = Field(None, description="Decision text")
    due_date: Optional[datetime] = Field(None, description="Due date")
    digital_signature_url: Optional[str] = Field(None, description="Digital signature URL")
    signature_image_url: Optional[str] = Field(None, description="Signature image URL (alternative field)")
    digital_signature: Optional[str] = Field(None, description="Digital signature method (alternative field)")
    terms_accepted: Optional[bool] = Field(None, description="Terms acceptance status")
    terms_accepted_at: Optional[datetime] = Field(None, description="Terms acceptance timestamp")
    signature_method: Optional[str] = Field(None, description="Signature method: 'password' or 'digital_signature'")
    
    # Additional fields for sign-off process
    candidate_acknowledgement: Optional[str] = Field(None, description="Candidate acknowledgement text")
    candidate_comments: Optional[str] = Field(None, description="Candidate comments")


class CandidateJDAssignmentResponse(BaseModel):
    """Response schema for candidate JD assignment."""
    id: str
    candidate_id: str
    jd_id: str
    status: str
    due_date: Optional[datetime]
    assigned_at: datetime
    completed_at: Optional[datetime]
    decision: Optional[str]
    digital_signature_url: Optional[str]
    terms_accepted: bool
    terms_accepted_at: Optional[datetime]
    signature_method: Optional[str]


class JobApplicationCreate(BaseModel):
    """Schema for creating a job application."""
    public_jd_id: UUID = Field(..., description="Public view job description ID")
    metadata: Optional[dict] = Field(None, description="Optional application metadata")


class JobApplicationUpdate(BaseModel):
    """Schema for updating a job application."""
    status: Optional[str] = Field(None, description="Application status")
    interview_stage: Optional[str] = Field(None, description="Current interview stage")
    comments: Optional[str] = Field(None, description="Recruiter or hiring manager comments")
    metadata: Optional[dict] = Field(None, description="Optional application metadata updates")


class JobApplicationResponse(BaseModel):
    """Response schema for job applications."""
    id: UUID
    org_id: UUID
    public_jd_id: UUID
    original_jd_id: UUID
    applicant_name: str
    applicant_email: str
    applicant_phone: Optional[str]
    source: Optional[str]
    status: str
    interview_stage: Optional[str]
    comments: Optional[str]
    metadata: Optional[dict] = Field(None, alias="application_metadata")
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# JD Assignment Response Schemas
class JDAssignmentResponse(BaseModel):
    """Response schema for JD assignment."""
    id: str
    original_jd_id: str
    sent_from: str
    sent_to: str
    status: str
    comment: str
    created_at: datetime
    updated_at: datetime
    title: Optional[str] = None


class JDAssignmentCreate(BaseModel):
    """Schema for creating a JD assignment between users."""
    original_jd_id: UUID = Field(..., description="Original JD ID to assign")
    sent_to: UUID = Field(..., description="User ID to assign JD to")
    comment: Optional[str] = Field(None, description="Optional comment")


class JDAssignmentUpdate(BaseModel):
    """Schema for updating JD assignment status."""
    status: str = Field(..., description="New status")
    comment: Optional[str] = Field(None, description="Optional comment update")
    next_assignee_user_id: Optional[UUID] = Field(None, description="UUID of the next assignee (required when decision is 'approved')")


class CreateOrgMemberRequest(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=100, description="Member's full name")
    email: EmailStr = Field(..., description="Member's email address")
    password: str = Field(..., min_length=8, description="Temporary password")
    role: Literal["Admin", "Manager", "HR","User"] = Field(..., description="Role: Admin, Manager, HR or User")
    color_code: Optional[str] = Field(None, example="#ece75c", description="Hex color code for edit tracking")

    @field_validator("full_name")
    @classmethod
    def validate_name(cls, value):
        return validate_full_name(value)

    @field_validator("email")
    @classmethod
    def validate_email_field(cls, value):
        return validate_email(value)

    @field_validator("password")
    @classmethod
    def validate_password(cls, value):
        return validate_password_strength(value)


class SuperAdminCreateOrgMemberRequest(CreateOrgMemberRequest):
    country: Optional[str] = Field(None, min_length=2, max_length=120, description="Country/region for the member")


class WorkflowStepCreate(BaseModel):
    """One step in a workflow — the reviewer is picked by email."""
    step_name: str = Field(..., min_length=1, max_length=100, description="Label for this step")
    user_email: str = Field(..., description="Email of the reviewer assigned to this step")
    sla_days: int = Field(1, ge=1, description="Number of business days before auto-escalation")


class RoleUpdateRequest(BaseModel):
    """Admin-only: update user role."""
    role: str = Field(..., description="New role to assign to user")


class OrgUserMfaToggleRequest(BaseModel):
    """Admin-only: toggle MFA for a user in the same organization by email."""
    email: EmailStr = Field(..., description="User email address")
    mfa: bool = Field(..., description="Enable or disable MFA for the target user")

    @field_validator("email")
    @classmethod
    def validate_email_field(cls, value):
        return validate_email(value)


class CreateWorkflowRequest(BaseModel):
    """Admin-only: create an approval workflow with N ordered steps."""
    name: str = Field(..., min_length=1, max_length=150, description="Workflow name")
    steps: List[WorkflowStepCreate] = Field(..., min_length=1, description="Ordered list of approval steps. At least one required.")
    is_draft: bool = Field(False, description="Save as draft (won't be usable until published)")


class UpdateWorkflowRequest(BaseModel):
    """Admin-only: patch workflow metadata and/or step assignees."""
    name: Optional[str] = Field(None, min_length=1, max_length=150, description="Updated workflow name")
    steps: Optional[List[WorkflowStepCreate]] = Field(None, min_length=1, description="Full ordered workflow steps to replace existing steps.")
    is_draft: Optional[bool] = Field(None, description="Update draft/published state")

    @model_validator(mode="after")
    def validate_non_empty_patch(self):
        if self.name is None and self.steps is None and self.is_draft is None:
            raise ValueError("At least one field must be provided: name, steps, or is_draft.")
        return self


class TriggerWorkflowRequest(BaseModel):
    """Trigger a workflow on a JD — pick any active workflow from the org's list."""
    jd_id: UUID = Field(..., description="UUID of the Job Description to route")
    workflow_id: UUID = Field(..., description="UUID of the workflow to use for this JD")
    comment: str = Field(..., min_length=1, description="Initiating comment")


class BulkTriggerWorkflowRequest(BaseModel):
    """Trigger a workflow on multiple JDs with final status — assign them all to the same workflow."""
    jd_ids: List[UUID] = Field(..., min_length=1, description="List of Job Description UUIDs with final status")
    workflow_id: UUID = Field(..., description="UUID of the workflow to use for these JDs")
    comment: str = Field(..., min_length=1, description="Initiating comment")



class WorkflowDecideRequest(BaseModel):
    """Approve or decline a JD at the current workflow step."""
    jd_id: UUID = Field(..., description="UUID of the Job Description")
    decision: str = Field(..., description="'approved' or 'declined'")
    comment: str = Field(..., min_length=1, description="Comment — required for both decisions")


class OrgImageUploadResponse(BaseModel):
    id: UUID
    org_id: UUID
    uploaded_by: Optional[UUID] = None
    uploader_name: Optional[str] = None
    uploader_role: Optional[str] = None
    image_url: str
    label: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class OrgImageListResponse(BaseModel):
    images: list[OrgImageUploadResponse]
    total: int


class CompetencyCreate(BaseModel):
    competencyName: str = Field(..., example="Leadership")
    categoryName: str = Field(..., example="Core Competencies")
    orgId: UUID = Field(..., example="123e4567-e89b-12d3-a456-426614174000")
    description: Optional[str] = Field(None, example="Ability to lead teams effectively")


class CompetencyUpdate(BaseModel):
    competencyName: Optional[str] = Field(None, example="Leadership")
    categoryName: Optional[str] = Field(None, example="Core Competencies")
    description: Optional[str] = Field(None, example="Ability to lead teams effectively")


class CompetencyResponse(BaseModel):
    competency_id: UUID
    competency_name: str
    category_name: str
    org_id: UUID
    description: Optional[str]
    created_by: Optional[UUID]
    created_on: datetime
    updated_by: Optional[UUID]
    updated_on: datetime

    model_config = {"from_attributes": True}


class CSODConnectRequest(BaseModel):
    """
    Matches the CSOD connection UI:
    - Connection Name
    - Base URL
    - Auth Token URL
    - Client ID
    - Client Secret
    - Scope (optional; defaults from env)
    - Export Type (Foundation/Bulk)
    """

    class CSODExportType(str, Enum):
        Foundation = "Foundation"
        Bulk = "Bulk"

    connection_name: str = Field(..., min_length=1, max_length=120, description="Unique connection name within an organisation.")
    base_url: str = Field(..., min_length=1, description="CSOD base URL (e.g. https://serviceslearn3.csod.com).")
    auth_token_url: Optional[str] = Field(None,min_length=1,description="Optional OAuth token URL. If omitted, derived from base_url.")
    client_id: str = Field(..., min_length=1, description="CSOD client id.")
    client_secret: str = Field(..., min_length=1, description="CSOD client secret.")
    scope: Optional[str] = Field(None, description="OAuth scope. If omitted, defaults from env.")
    export_type: CSODExportType = Field(CSODExportType.Foundation, description="Export type.")
    default_openings: int = Field(1, ge=1, le=1000, description="Default openings count.")
    default_expiry_days: int = Field(90, ge=1, le=3650, description="Default posting expiry in days.")
    default_country: str = Field("US", min_length=2, max_length=10, description="Default country code.")

    model_config = {
        "use_enum_values": True,
        "json_schema_extra": {
            "examples": [
                {
                    "connection_name": "CSOD Production",
                    "base_url": "https://portal.csod.com",
                    "auth_token_url": "https://portal.csod.com/services/api/oauth2/token",
                    "client_id": "api_client_123",
                    "client_secret": "super_secret_key",
                    "scope": "ou:read ou:write",
                    "export_type": "Foundation",
                    "default_openings": 1,
                    "default_expiry_days": 90,
                    "default_country": "US"
                }
            ]
        }
    }


class CSODConnectionPatch(BaseModel):
    class CSODExportType(str, Enum):
        Foundation = "Foundation"
        Bulk = "Bulk"

    connection_name: Optional[str] = Field(None, min_length=1, max_length=120, description="Rename connection (must remain unique within org).")
    base_url: Optional[str] = Field(None, min_length=1)
    auth_token_url: Optional[str] = Field(None, min_length=1)
    client_id: Optional[str] = Field(None, min_length=1)
    client_secret: Optional[str] = Field(None, min_length=1)
    scope: Optional[str] = Field(None, min_length=1)
    export_type: Optional[CSODExportType] = None
    default_openings: Optional[int] = Field(None, ge=1, le=1000)
    default_expiry_days: Optional[int] = Field(None, ge=1, le=3650)
    default_country: Optional[str] = Field(None, min_length=2, max_length=10)

    model_config = {"use_enum_values": True}


class CSODTokenRequest(BaseModel):
    base_url: str = Field(..., min_length=1, description="CSOD portal base URL.")
    client_id: str = Field(..., min_length=1, description="CSOD client id.")
    client_secret: str = Field(..., min_length=1, description="CSOD client secret.")
    scope: Optional[str] = Field("ou:write", description="OAuth scope.")
    grant_type: Literal["client_credentials"] = Field("client_credentials", description="OAuth grant type.")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "base_url": "https://portal.csod.com",
                    "client_id": "api_client_123",
                    "client_secret": "super_secret_key",
                    "scope": "ou:write",
                    "grant_type": "client_credentials"
                }
            ]
        }
    }


class CSODTokenFromConnectionRequest(BaseModel):
    connection_name: str = Field(..., min_length=1, max_length=120, description="Connection name to use.")
    scope: Optional[str] = Field(None, description="OAuth scope to request from CSOD. Defaults to stored scope or env.")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "connection_name": "CSOD Production",
                    "scope": "ou:read"
                }
            ]
        }
    }


class CSODCheckPositionRequest(BaseModel):
    base_url: str = Field(..., min_length=1, description="CSOD portal base URL.")
    token: str = Field(..., min_length=1, description="Bearer token.")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "base_url": "https://portal.csod.com",
                    "token": "eyJhbGciOiJSUzI1NiIs..."
                }
            ]
        }
    }


class CSODGetPositionRequest(BaseModel):
    base_url: str = Field(..., min_length=1, description="CSOD portal base URL.")
    token: str = Field(..., min_length=1, description="Bearer token.")
    position_id: int = Field(..., ge=1, description="CSOD position OU id.")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "base_url": "https://portal.csod.com",
                    "token": "eyJhbGciOiJSUzI1NiIs...",
                    "position_id": 12345
                }
            ]
        }
    }


class CSODCreatePositionRequest(BaseModel):
    base_url: str = Field(..., min_length=1, description="CSOD portal base URL.")
    token: str = Field(..., min_length=1, description="Bearer token.")
    typeId: int = Field(..., ge=1, description="CSOD OU type id.")
    name: str = Field(..., min_length=1, description="Position name.")
    parentId: int = Field(..., ge=1, description="Parent OU id.")
    description: Optional[str] = Field("", description="Optional position description.")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "base_url": "https://portal.csod.com",
                    "token": "eyJhbGciOiJSUzI1NiIs...",
                    "typeId": 5,
                    "name": "Senior Software Engineer",
                    "parentId": 100,
                    "description": "Create a new position OU in CSOD"
                }
            ]
        }
    }


class CSODCreatePositionPipelineRequest(BaseModel):
    """
    One-shot pipeline:
    1) fetch token
    2) detect Position OU typeId
    3) create Position OU
    """

    base_url: str = Field(..., min_length=1)
    client_id: str = Field(..., min_length=1)
    client_secret: str = Field(..., min_length=1)
    scope: Optional[str] = Field(None, description="If omitted, defaults to env CSOD_SCOPES or 'ou:write ou:read'.")

    # Optional override for the detected 'Position' type id
    typeId: Optional[int] = Field(None, ge=1, description="Override typeId; if omitted, detected from types endpoint.")

    name: Optional[str] = Field("talentForge", min_length=1, description="Position name (default: talentForge).")
    parentId: Optional[int] = Field(None, ge=1, description="Parent OU id (null allowed).")
    description: Optional[str] = Field("", description="Optional position description.")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "base_url": "https://portal.csod.com",
                    "client_id": "api_client_123",
                    "client_secret": "super_secret_key",
                    "scope": "ou:write",
                    "name": "TalentForge Position",
                    "parentId": 100,
                    "description": "Created via TalentForge Pipeline"
                }
            ]
        }
    }


class CSODBulkOUItem(BaseModel):
    name: str = Field(..., min_length=1)
    parentId: int = Field(..., ge=1)
    description: Optional[str] = ""

class CSODBulkOURequest(BaseModel):
    connection_name: str = Field(..., min_length=1)
    typeId: Optional[int] = Field(None, ge=1, description="Optional OU type ID override.")
    ous: List[CSODBulkOUItem] = Field(..., min_items=1)

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "connection_name": "CSOD Production",
                    "typeId": 5,
                    "ous": [
                        {"name": "Engineering", "parentId": 10, "description": "Eng Dept"},
                        {"name": "Product", "parentId": 10, "description": "Product Dept"}
                    ]
                }
            ]
        }
    }

class CSODPushJDRequest(BaseModel):
    jd_id: UUID = Field(..., description="ID of the JD to push.")
    connection_name: str = Field(..., min_length=1, description="Connection name to use.")
    parentId: int = Field(..., ge=1, description="Parent OU ID in CSOD.")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "jd_id": "550e8400-e29b-41d4-a716-446655440000",
                    "connection_name": "CSOD Production",
                    "parentId": 100
                }
            ]
        }
    }
    
class CSODBulkPushJDItem(BaseModel):
    jd_id: UUID
    parentId: int

class CSODBulkPushJDRequest(BaseModel):
    connection_name: str = Field(..., min_length=1)
    jds: List[CSODBulkPushJDItem] = Field(..., min_items=1)


class BulkImportResult(BaseModel):
    """Per-file outcome from the bulk template import endpoint."""
    filename: str
    created: int = 0
    skipped: int = 0
    failed: int = 0
    jds_created: int = 0
    errors: List[str] = Field(default_factory=list)
    created_ids: List[UUID] = Field(default_factory=list)
    created_jd_ids: List[UUID] = Field(default_factory=list)


class BulkImportSummary(BaseModel):
    """Overall result returned by POST /templates/public/bulk-import."""
    total_files: int
    total_created: int
    total_skipped: int
    total_failed: int
    total_jds_created: int = 0
    results: List[BulkImportResult]



class FoundationPipelineRequest(BaseModel):
    """
    Request body for POST /foundation/process.

    Prerequisites before calling this endpoint:
      1. You must be authenticated (Bearer token in Authorization header).
      2. Your organisation must have a CSOD connection saved via POST /csod/connect.
      3. That connection must be tested and active via POST /csod/test-connection.
      4. The JD IDs below must exist in the system (created via POST /job-descriptions/generate).
    """
    jd_ids: List[str] = Field(...,min_length=1,max_length=150,description="List of Job Description UUIDs to push to CSOD as Position OUs. Maximum 150 per call.",
        example=[
            "3fa85f64-5717-4562-b3fc-2c963f66afa6",
            "7c9e6679-7425-40de-944b-e07fc1f90ae7"])

    connection_name: Optional[str] = Field(None,description=("Optional: name of the CSOD connection to use. ""If omitted, the most recently tested active connection for your organisation is used automatically."),example="my-csod-prod")

    @field_validator("jd_ids")
    @classmethod
    def validate_jd_ids(cls, value):
        """Validate that all jd_ids are valid UUIDs."""
        from uuid import UUID
        validated = []
        for jd_id in value:
            try:
                UUID(jd_id)
                validated.append(jd_id)
            except ValueError:
                raise ValueError(f"Invalid UUID format: {jd_id}")
        return validated


class FoundationResultSchema(BaseModel):
    """Per-JD result from the Foundation pipeline."""
    jd_id: str = Field(..., description="UUID of the processed Job Description")
    status: str = Field(..., description="'success' or 'failed'")
    ou_id: Optional[str] = Field(None, description="CSOD OU ID assigned after successful creation")
    stage_of_failure: Optional[str] = Field(None, description="Pipeline stage where failure occurred (fetch / conversion / csod_create / csod_verify)")
    our_error: Optional[str] = Field(None, description="Internal error message if failure is on our side")
    csod_error_code: Optional[str] = Field(None, description="CSOD API error code")
    csod_error_message: Optional[str] = Field(None, description="CSOD API error message")
    csod_http_status: Optional[int] = Field(None, description="HTTP status code returned by CSOD")
    created_at: Optional[str] = Field(None, description="ISO timestamp of when this result was recorded")


class FailedRecordSchema(BaseModel):
    jd_id: str = Field(..., description="UUID of the failed Job Description")
    error: str = Field(..., description="Reason for failure")


class FoundationSummarySchema(BaseModel):
    """Overall result from POST /foundation/process."""
    total_submitted: int = Field(..., description="Total number of JDs submitted")
    total_succeeded: int = Field(..., description="Number of JDs successfully pushed to CSOD")
    total_failed: int = Field(..., description="Number of JDs that failed")
    failure_breakdown: Dict[str, int] = Field(...,description="Count of failures grouped by pipeline stage (fetch / conversion / csod_create / csod_verify / unexpected_error)")
    failed_jd_ids: List[str] = Field(default_factory=list, description="List of TalentForge JD UUIDs that failed to push")
    failed_records: List[FailedRecordSchema] = Field(default_factory=list, description="Detailed list of failed JDs and their error reasons")


class BulkPipelineRequest(BaseModel):
    """
    Request body for POST /bulk/process.

    Prerequisites before calling this endpoint:
      1. You must be authenticated (Bearer token in Authorization header).
      2. Your organisation must have a CSOD connection saved via POST /csod/connect.
      3. That connection must be tested and active via POST /csod/test-connection.
      4. The JD IDs below must exist in the system (created via POST /job-descriptions/generate).
    """
    jd_ids: List[str] = Field(...,min_length=1,max_length=1000,description="List of Job Description UUIDs to push via CSOD Bulk Import API. Maximum 1000 per call.",
        example=[
            "3fa85f64-5717-4562-b3fc-2c963f66afa6",
            "7c9e6679-7425-40de-944b-e07fc1f90ae7"])

    connection_name: Optional[str] = Field(
        None,
        description=("Optional: name of the CSOD connection to use. ""If omitted, the most recently tested active connection for your organisation is used automatically."),
        example="my-csod-prod")

    @field_validator("jd_ids")
    @classmethod
    def validate_jd_ids(cls, value):
        """Validate that all jd_ids are valid UUIDs."""
        from uuid import UUID
        validated = []
        for jd_id in value:
            try:
                UUID(jd_id)
                validated.append(jd_id)
            except ValueError:
                raise ValueError(f"Invalid UUID format: {jd_id}")
        return validated


class BulkChunkResultSchema(BaseModel):
    """Result for a single chunk in the bulk pipeline."""
    chunk_id: str
    total_jds: int
    total_succeeded: int
    total_failed: int
    failure_breakdown: Dict[str, Any]


class BulkSummarySchema(BaseModel):
    """Overall result from POST /bulk/process."""
    total_submitted: int = Field(..., description="Total number of JDs submitted")
    total_succeeded: int = Field(..., description="Number of JDs successfully pushed to CSOD")
    total_failed: int = Field(..., description="Number of JDs that failed across all chunks")
    batches_processed: int = Field(..., description="Number of chunks/batches processed")
    per_batch_results: List[BulkChunkResultSchema] = Field(..., description="Detailed result per chunk")
    failed_jd_ids: List[str] = Field(default_factory=list, description="List of all TalentForge JD UUIDs that failed across all chunks")


class CSODPipelinePushResponse(BaseModel):
    """Response schema for a single CSOD pipeline push record."""
    id: str = Field(..., description="Push record UUID")
    org_id: str = Field(..., description="Organisation UUID")
    pushed_by: Optional[str] = Field(None, description="UUID of the user who triggered the push")
    pushed_by_name: Optional[str] = Field(None, description="Full name of the user who triggered the push")
    jd_id: str = Field(..., description="Job Description UUID")
    pipeline_type: str = Field(..., description="'foundation' or 'bulk'")
    connection_name: Optional[str] = Field(None, description="CSOD connection name used")
    batch_id: Optional[str] = Field(None, description="Batch ID for bulk pipeline")
    ou_ref_id: Optional[str] = Field(None, description="CSOD reference ID sent to CSOD")
    status: str = Field(..., description="'success' or 'failed'")
    stage_of_failure: Optional[str] = Field(None, description="Stage where failure occurred (fetch / conversion / csod_create / csod_verify)")
    csod_ou_id: Optional[str] = Field(None, description="CSOD Position OU ID (foundation only)")
    csod_response_timestamp: Optional[str] = Field(None, description="ISO timestamp from CSOD response")
    csod_response_link: Optional[str] = Field(None, description="CSOD OU link from response")
    our_error: Optional[str] = Field(None, description="Internal error message")
    csod_error_code: Optional[str] = Field(None, description="CSOD API error code")
    csod_error_message: Optional[str] = Field(None, description="CSOD API error message")
    csod_http_status: Optional[int] = Field(None, description="HTTP status code from CSOD")
    pushed_at: Optional[str] = Field(None, description="ISO timestamp of when the push occurred")

    class Config:
        from_attributes = True


class DelegateStepRequest(BaseModel):
    """Delegate the current workflow step to another user."""
    delegate_to_email: EmailStr = Field(..., description="Email address of the user to delegate to")
    comment: str = Field(..., min_length=1, description="Reason or comment for delegation")

    @field_validator("delegate_to_email")
    @classmethod
    def validate_delegate_to_email(cls, value):
        return validate_email(str(value))

    @field_validator("comment")
    @classmethod
    def validate_delegate_comment(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Comment cannot be empty")
        return cleaned


# Candidate User Schemas
class CandidateUserCreate(BaseModel):
    """Schema for creating a new candidate user (Admin only)."""
    full_name: str = Field(..., min_length=1, max_length=255, description="Candidate's full name")
    email: EmailStr = Field(..., description="Candidate's email address")
    password: str = Field(..., min_length=8, description="Candidate's password")
    company_name: Optional[str] = Field(None, max_length=255, description="Candidate's company name")
    employee_id: Optional[str] = Field(None, max_length=50, description="Candidate's employee ID")

    @field_validator("email")
    @classmethod
    def validate_email_field(cls, v):
        if v is None:
            return v
        return validate_email(v)


class CandidateUserUpdate(BaseModel):
    """Schema for updating a candidate user (Admin only)."""
    full_name: Optional[str] = Field(None, min_length=1, max_length=255, description="Candidate's full name")
    email: Optional[EmailStr] = Field(None, description="Candidate's email address")
    password: Optional[str] = Field(None, min_length=8, description="New password for the candidate")
    company_name: Optional[str] = Field(None, max_length=255, description="Candidate's company name")
    employee_id: Optional[str] = Field(None, max_length=50, description="Candidate's employee ID")

    @field_validator("email")
    @classmethod
    def validate_email_field(cls, v):
        if v is None:
            return v
        return validate_email(v)


class CandidateUserResponse(BaseModel):
    """Schema for candidate user response."""
    id: UUID
    org_id: UUID
    full_name: str
    email: str
    role: str
    company_name: str | None
    employee_id: str | None
    created_by: UUID | None
    creator_name: str | None = None
    created_at: datetime
    updated_at: datetime
    failed_login_attempts: int = 0
    digital_signature_url: Optional[str] = None

    class Config:
        from_attributes = True


class CandidateUserListResponse(BaseModel):
    """Schema for listing candidate users."""
    candidates: list[CandidateUserResponse]
    total: int


class AllotJDRequest(BaseModel):
    """Schema for allotting a JD to a candidate user."""
    jd_id: UUID = Field(..., description="JD ID to allot to the candidate")
    due_date: Optional[datetime] = Field(None, description="Due date for JD completion")
    status: Optional[str] = Field("pending", description="Status: pending, in_progress, completed, rejected")


class CandidateJDAssignmentResponse(BaseModel):
    """Schema for candidate JD assignment response."""
    id: UUID
    candidate_id: Optional[UUID] = None
    assigned_user_id: Optional[UUID] = None
    jd_id: UUID
    org_id: UUID
    parent_jd_id: Optional[UUID] = None
    assigned_end_user_id: Optional[UUID] = None
    
    # JD Core Fields
    title: Optional[str] = None
    company_name: Optional[str] = None
    job_id: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    salary_range: Optional[str] = None
    content: Optional[Dict[str, Any]] = None
    
    # Sign-Off Fields
    candidate_acknowledgement: Optional[str] = None
    candidate_comments: Optional[str] = None
    digital_signature: Optional[str] = None
    signature_image_url: Optional[str] = None
    
    due_date: Optional[datetime] = None
    status: str
    assigned_at: datetime
    completed_at: Optional[datetime] = None
    decision: Optional[str] = None
    comment: str = ""
    
    # Legacy/Deprecating
    jd_snapshot: Optional[Dict[str, Any]] = None
    digital_signature_url: Optional[str] = None
    terms_accepted: bool = False
    terms_accepted_at: Optional[datetime] = None
    signature_method: Optional[str] = None
    
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CandidateDecisionRequest(BaseModel):
    """Schema for candidate decision submission."""
    jd_id: UUID = Field(..., description="JD ID being completed")
    decision: str = Field(..., min_length=1, max_length=500, description="Candidate's decision/feedback")
    status: str = Field("completed", description="Status: completed, rejected")
    email: str = Field(..., min_length=1, max_length=255, description="Candidate's email address")
    password: str = Field(..., min_length=1, max_length=255, description="Candidate's password for verification")
    terms_accepted: bool = Field(..., description="Whether candidate accepts terms and conditions")
    digital_signature_url: Optional[str] = Field(None, description="Digital signature URL if applicable")
    signature_method: Optional[str] = Field(None, description="Signature method: 'password' or 'digital_signature'")


class CandidateLoginRequest(BaseModel):
    """Schema for candidate login."""
    email: str = Field(..., min_length=1, max_length=255, description="Candidate's email address")
    password: str = Field(..., min_length=1, max_length=255, description="Candidate's password")


class VerifyPasswordRequest(BaseModel):
    """Schema for candidate password verification for specific JD assignment."""
    jd_id: UUID = Field(..., description="Job Description ID to accept")
    password: str = Field(..., min_length=1, max_length=255, description="Candidate's password for verification")
    terms_accepted: bool = Field(..., description="Whether terms and conditions are accepted")
    signature_method: str = Field(..., pattern="^(password|digital_signature)$", description="Method used: 'password' or 'digital_signature'")
    digital_signature_url: Optional[str] = Field(None, max_length=500, description="URL to uploaded signature image (required if signature_method is 'digital_signature')")

    @model_validator(mode='before')
    def validate_signature_method(cls, values):
        signature_method = values.get('signature_method')
        digital_signature_url = values.get('digital_signature_url')
        
        if signature_method == 'password' and digital_signature_url:
            # Allow but ignore digital_signature_url for password method
            values['digital_signature_url'] = None 
        return values


class VerifyPasswordResponse(BaseModel):
    """Schema for candidate password verification response."""
    success: bool = Field(..., description="Whether verification was successful")
    message: str = Field(..., description="Response message")
    candidate_id: str = Field(..., description="Candidate's ID")
    email: str = Field(..., description="Candidate's email")
    full_name: str = Field(..., description="Candidate's name")
    jd_id: str = Field(..., description="Job Description ID that was accepted")
    assignment_status: str = Field(..., description="Status of the JD assignment after verification")
    signature_method: str = Field(..., description="Method used: 'password' or 'digital_signature'")
    terms_accepted_at: Optional[str] = Field(None, description="When terms were accepted (ISO timestamp)")
    digital_signature_url: Optional[str] = Field(None, description="URL to digital signature image (if applicable)")
    failed_attempts: int = Field(..., description="Current failed login attempts")

class CandidateTaskResponse(BaseModel):
    """Unified schema for candidate tasks (Inbox)."""
    id: str
    type: str  # 'JD_SIGN_OFF'
    title: str
    status: str
    due_date: Optional[str] = None
    priority: str = "Medium" # High, Medium, Low
    description: Optional[str] = None
    jd_id: Optional[str] = None
    signature_type: Optional[str] = None
    signature_data: Optional[str] = None
    assigned_by: Optional[dict] = None



class ChatMessageCreate(BaseModel):
    """Schema for sending a new message."""
    recipient_id: Optional[UUID] = Field(None, description="User ID of the recipient. If null, message is sent to the whole organization.")
    content: str = Field(..., min_length=1, max_length=5000, description="Message content")


class ChatMessageResponse(BaseModel):
    """Schema for returning a message."""
    id: UUID
    org_id: UUID
    sender_id: UUID
    recipient_id: Optional[UUID] = None
    content: str
    is_read: bool
    created_at: datetime


class ChatConversationResponse(BaseModel):
    """Schema for returning a list of conversations."""
    other_user_id: Optional[UUID] = None
    other_user_name: str
    last_message: str
    last_message_at: datetime
    unread_count: int
    presence: str = "offline"
    is_group: bool = False

class ChatMemberResponse(BaseModel):
    """Schema for returning a member of the organization."""
    user_id: UUID
    full_name: str
    email: str
    role: str
    presence: str = "offline"


class TypingStatusRequest(BaseModel):
    """Schema for setting typing status."""
    recipient_id: Optional[UUID] = None


class TypingStatusResponse(BaseModel):
    """Schema for checking typing status."""
    is_typing: bool


# Candidate Password Reset Schemas
class CandidateForgotPasswordRequest(BaseModel):
    """Schema for candidate forgot password with OTP verification."""
    email: EmailStr = Field(..., example="candidate@example.com")
    otp: str = Field(..., min_length=6, max_length=6, example="123456", description="6-digit OTP code sent to email")
    new_password: str = Field(..., min_length=8, example="NewPassword123!")
    confirm_password: str = Field(..., example="NewPassword123!")

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, value):
        return validate_password_strength(value)

    @model_validator(mode="after")
    def passwords_match(self):
        if self.new_password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self


class CandidateMeResponse(BaseModel):
    """Schema for candidate profile response."""
    id: UUID
    org_id: UUID
    full_name: str
    email: str
    role: str
    company_name: Optional[str] = None
    employee_id: Optional[str] = None
    digital_signature_url: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SignOffJDUpdate(BaseModel):
    """Schema for updating a Sign-Off JD record."""
    candidate_acknowledgement: Optional[str] = None
    candidate_comments: Optional[str] = None
    digital_signature: Optional[str] = None
    signature_image_url: Optional[str] = None
    status: Optional[str] = Field(None, pattern="^(sign-off-pending|sign-off-complete)$")
    decision: Optional[str] = None

class SignOffJDResponse(CandidateJDAssignmentResponse):
    """Flat response schema for Sign-Off JD."""
    message: Optional[str] = None

class SignOffJDListResponse(BaseModel):
    """List response for Sign-Off JDs."""
    signoff_jds: List[SignOffJDResponse]
    total: int


class BulkJDRequest(BaseModel):
    """Schema for allotting a JD to a candidate user."""
    email: EmailStr = Field(..., description= "List of emails to assign the JD to")
    due_date: Optional[datetime] = Field(None, description="Due date for JD completion")

class BulkAssign(BaseModel):
    "Bulk assign single Jd to multiple candidates"
    jd_id : UUID =Field(..., description="JD ID  to allot to the candidates")
    data: List[BulkJDRequest] =Field(..., description= "List of jd data")


class NotificationResponse(BaseModel):
    """Schema for returning a notification."""
    id: UUID
    user_id: UUID
    sender_id: Optional[UUID] = None
    org_id: UUID
    type: str
    title: str
    message: str
    link: Optional[str] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

class NotificationCountResponse(BaseModel):
    """Schema for returning the unread notification count."""
    unread_count: int


class TermsAndConditionsCreate(BaseModel):
    """Schema for creating terms and conditions."""
    content: str = Field(..., description="The markdown or plain text content of the terms and conditions")
    is_active: bool = Field(True, description="Whether this terms and conditions version is active")

class TermsAndConditionsUpdate(BaseModel):
    """Schema for updating terms and conditions."""
    content: Optional[str] = Field(None, description="The updated content")
    is_active: Optional[bool] = Field(None, description="The updated active status")

class TermsAndConditionsResponse(BaseModel):
    """Schema for terms and conditions response."""
    id: UUID
    org_id: UUID
    content: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Email Groups

class EmailGroupCreate(BaseModel):
    group_name: str = Field(..., max_length=255)
    role: Optional[str] = Field(None, max_length=50)
    emails: List[EmailStr] = Field(..., min_length=1)

class EmailGroupUpdate(BaseModel):
    group_name: Optional[str] = Field(None, max_length=255)
    role: Optional[str] = Field(None, max_length=50)
    emails: Optional[List[EmailStr]] = Field(None, min_length=1)

class EmailGroupResponse(BaseModel):
    id: UUID
    org_id: UUID
    group_name: str
    role: Optional[str]
    emails: List[EmailStr]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


import uuid

class SabaJobDescriptionResponse(BaseModel):
    id: uuid.UUID
    org_id: Optional[uuid.UUID] = None
    creator_id: Optional[uuid.UUID] = None
    title: str
    job_id: Optional[str] = None
    sections: dict
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class SabaJobDescriptionUpdateRequest(BaseModel):
    title: Optional[str] = None
    job_id: Optional[str] = None

class SabaSectionUpdateRequest(BaseModel):
    section_name: str
    section_content: str | list | dict

class SabaExtractionReportResponse(BaseModel):
    filename: str
    declared_extension: str
    detected_format: str
    success: bool
    character_count: int = 0
    paragraph_count: int = 0
    warnings: List[str] = []
    error: Optional[str] = None

class SabaUploadResponse(BaseModel):
    job_descriptions: List[SabaJobDescriptionResponse]
    extraction_reports: List[SabaExtractionReportResponse]

class BulkConvertRequest(BaseModel):
    jd_ids: list[uuid.UUID]

class OrganizationAccessUpdate(BaseModel):
    is_active: bool = Field(..., description="Whether the organization is active and users can log in")
    access_valid_until: Optional[datetime] = Field(None, description="The date until which the organization has access")


class JDAnalyticsResponse(BaseModel):
    daily_count: int = Field(0, description="JDs created today")
    monthly_count: int = Field(0, description="JDs created this month")
    yearly_count: int = Field(0, description="JDs created this year")
    total_count: int = Field(0, description="Total JDs created ever")

class OrgJDAnalyticsResponse(BaseModel):
    org_id: UUID = Field(..., description="Organization ID")
    org_name: str = Field(..., description="Organization Name")
    daily_count: int = Field(0, description="JDs created today by org")
    monthly_count: int = Field(0, description="JDs created this month by org")
    yearly_count: int = Field(0, description="JDs created this year by org")
    total_count: int = Field(0, description="Total JDs created ever by org")
    total_users: int = Field(0, description="Total number of users in the org")
    admin_count: int = Field(0, description="Number of Admins in the org")
    hr_count: int = Field(0, description="Number of HRs in the org")
    manager_count: int = Field(0, description="Number of Managers in the org")
    enduser_count: int = Field(0, description="Number of Endusers in the org")


class PlatformMaintenanceAlert(BaseModel):
    type: str
    severity: str
    org_id: Optional[UUID] = None
    org_name: Optional[str] = None
    message: str


class PlatformOrgInsight(BaseModel):
    org_id: UUID
    org_name: str
    industry: Optional[str] = None
    is_active: bool = True
    access_valid_until: Optional[datetime] = None
    health: str
    daily_count: int = 0
    monthly_count: int = 0
    yearly_count: int = 0
    total_count: int = 0
    total_users: int = 0
    admin_count: int = 0
    hr_count: int = 0
    manager_count: int = 0
    enduser_count: int = 0


class PlatformOverviewResponse(BaseModel):
    total_organizations: int
    active_organizations: int
    suspended_organizations: int
    expiring_organizations: int
    idle_organizations: int
    total_users: int
    total_jds: int
    daily_jds: int
    monthly_jds: int
    yearly_jds: int
    active_broadcasts: int
    platform_health_score: int
    role_totals: dict
    maintenance_alerts: List[PlatformMaintenanceAlert]
    organizations: List[PlatformOrgInsight]
    velocity_trend: List[dict]

class BroadcastMessageCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    message: str = Field(..., min_length=1)
    type: str = Field("info", description="Type of message: info, warning, error, success")
    is_active: bool = Field(True)
    expires_at: Optional[datetime] = None

class BroadcastMessageUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    message: Optional[str] = Field(None, min_length=1)
    type: Optional[str] = Field(None, description="Type of message: info, warning, error, success")
    is_active: Optional[bool] = None
    expires_at: Optional[datetime] = None

class BroadcastMessageResponse(BaseModel):
    id: UUID
    title: str
    message: str
    type: str
    is_active: bool
    expires_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    created_by_id: Optional[UUID] = None

    class Config:
        from_attributes = True


class FeedbackPromptCopy(BaseModel):
    headline: str
    subcopy: str
    trigger: str


class FeedbackPromptResponse(BaseModel):
    eligible: bool
    reason: str
    prompt: Optional[FeedbackPromptCopy] = None


class FeedbackSessionResponse(BaseModel):
    recorded: bool
    reason: Optional[str] = None
    session_count: Optional[int] = None


class FeedbackEventRequest(BaseModel):
    event_type: str = Field(..., description="jd_created | jd_approved | jd_exported | assignment_completed | session_milestone")
    metadata: Optional[dict] = None


class FeedbackEventResponse(BaseModel):
    recorded: bool
    eligible: bool = False
    reason: Optional[str] = None
    prompt: Optional[FeedbackPromptCopy] = None
    metadata: Optional[dict] = None


class FeedbackDismissResponse(BaseModel):
    dismissed: bool
    snooze_until: Optional[str] = None


class FeedbackSubmitRequest(BaseModel):
    rating: Optional[int] = Field(None, ge=1, le=5)
    comment: Optional[str] = Field(None, max_length=2000)
    tip: Optional[str] = Field(None, max_length=1000, description="One quick tip to improve the platform")
    trigger_context: Optional[dict] = None


class FeedbackSubmitResponse(BaseModel):
    id: UUID
    message: str


class PlatformFeedbackResponse(BaseModel):
    id: UUID
    user_name: str
    user_email: str
    user_role: str
    org_name: Optional[str] = None
    rating: Optional[int] = None
    comment: Optional[str] = None
    tip: Optional[str] = None
    trigger_context: dict = Field(default_factory=dict)
    created_at: datetime

    class Config:
        from_attributes = True


class FeedbackBreakdownItem(BaseModel):
    label: str
    count: int
    average_rating: Optional[float] = None


class FeedbackAnalyticsResponse(BaseModel):
    total_count: int
    rated_count: int
    average_rating: float
    tips_count: int
    comments_count: int
    promoters: int
    passives: int
    detractors: int
    satisfaction_score: int
    rating_distribution: dict
    by_role: List[FeedbackBreakdownItem]
    by_org: List[FeedbackBreakdownItem]
    by_trigger: List[FeedbackBreakdownItem]
    recent: List[PlatformFeedbackResponse]


class OrgMemberDetail(BaseModel):
    id: UUID
    name: str
    email: str
    status: str
    user_type: str  # "regular" or "candidate"


class OrgMembersGroupedResponse(BaseModel):
    organization_id: UUID
    organization_name: str
    admins: List[OrgMemberDetail]
    managers: List[OrgMemberDetail]
    hr: List[OrgMemberDetail]
    end_users: List[OrgMemberDetail]


class DEIScanRequest(BaseModel):
    text: str = Field(..., description="The job description text to scan")


class DEIScanFinding(BaseModel):
    original: str
    issue_type: str
    explanation: str
    suggested_rephrasing: str


class DEIScanResponse(BaseModel):
    score: int
    findings: List[DEIScanFinding]


class ComplianceScanRequest(BaseModel):
    text: str = Field(..., description="The job description text to scan")
    country_code: str = Field(..., min_length=2, max_length=10, description="Country code (e.g. US, UK, IN, CA)")


class ComplianceScanFinding(BaseModel):
    original: str
    rule_violated: str
    severity: str
    explanation: str
    fix: str


class ComplianceScanResponse(BaseModel):
    is_compliant: bool
    findings: List[ComplianceScanFinding]


class JDTranslateRequest(BaseModel):
    target_language: str = Field(..., description="Target language to translate into (e.g. Spanish, French, German, Japanese)")


class JDTranslateResponse(BaseModel):
    jd_id: UUID
    target_language: str
    translated_content: dict = Field(..., description="The translated content JSON dictionary")
