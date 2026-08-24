from datetime import datetime
import uuid
from typing import Optional
from sqlalchemy import String, Text, Boolean, Integer, DateTime, ForeignKey, Index, CheckConstraint, UniqueConstraint, func, text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB

class Base(DeclarativeBase):
    pass

class Organization(Base):
    __tablename__ = "talentforge_organisations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    industry: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    mfa_policy: Mapped[dict] = mapped_column(JSONB, default=dict, server_default=text("'{}'::jsonb"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default=text('true'), nullable=False)
    access_valid_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (Index("idx_org_name", "name"),)

class OrgImage(Base):
    __tablename__ = "talentforge_org_images"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("talentforge_organisations.id", ondelete="CASCADE"), nullable=False)
    uploaded_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("talentforge_users.id", ondelete="SET NULL"), nullable=True)
    image_url: Mapped[str] = mapped_column(Text, nullable=False)
    label: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (Index("idx_org_images_org", "org_id"),)

class User(Base):
    __tablename__ = "talentforge_users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("talentforge_organisations.id", ondelete="SET NULL"), nullable=True)
    full_name: Mapped[str] = mapped_column(Text, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    region: Mapped[str] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    jds_created: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    jds_exported: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    profile_updates: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    color_code: Mapped[str | None] = mapped_column(String(7), nullable=True)
    mfa_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    mfa_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    mfa_secret: Mapped[str | None] = mapped_column(Text, nullable=True)
    backup_codes: Mapped[str | None] = mapped_column(Text, nullable=True)
    mfa_required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("talentforge_users.id", ondelete="SET NULL"), nullable=True)
    creator_name: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    created_jds: Mapped[list["JobDescription"]] = relationship("JobDescription", back_populates="creator")
    sent_assignments: Mapped[list["CandidateJDAssignment"]] = relationship("CandidateJDAssignment", foreign_keys="CandidateJDAssignment.assigned_by", back_populates="assignor")
    received_assignments: Mapped[list["CandidateJDAssignment"]] = relationship("CandidateJDAssignment", foreign_keys="CandidateJDAssignment.assigned_user_id", back_populates="assigned_user")
    sent_messages: Mapped[list["ChatMessage"]] = relationship("ChatMessage", foreign_keys="ChatMessage.sender_id", back_populates="sender")
    received_messages: Mapped[list["ChatMessage"]] = relationship("ChatMessage", foreign_keys="ChatMessage.recipient_id", back_populates="recipient")
    notifications: Mapped[list["Notification"]] = relationship("Notification", primaryjoin="User.id == Notification.user_id", foreign_keys="Notification.user_id", back_populates="user", cascade="all, delete-orphan", overlaps="user")

    # Reference to the user who created this user (self-referential)
    creator: Mapped["User"] = relationship("User", remote_side=[id], foreign_keys=[created_by])

    __table_args__ = (
        CheckConstraint("role IN ('Super_Admin', 'Admin', 'Manager', 'HR', 'User')", name="check_user_role"),
        Index("idx_user_org_id", "org_id"),
    )

class Template(Base):
    __tablename__ = "talentforge_templates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    template_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    industry: Mapped[str] = mapped_column(Text, nullable=False)
    compliance_tag: Mapped[str | None] = mapped_column(Text, nullable=True)
    content: Mapped[dict] = mapped_column(JSONB, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    company: Mapped[str | None] = mapped_column(Text, nullable=True)
    department: Mapped[str | None] = mapped_column(Text, nullable=True)
    location: Mapped[str | None] = mapped_column(Text, nullable=True)
    employment_type: Mapped[str | None] = mapped_column(Text, nullable=True)
    professional_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    responsibilities_overview: Mapped[str | None] = mapped_column(Text, nullable=True)
    licenses_and_certifications: Mapped[str | None] = mapped_column(Text, nullable=True)
    compliance_requirements: Mapped[str | None] = mapped_column(Text, nullable=True)
    tools_technologies: Mapped[str | None] = mapped_column(Text, nullable=True)
    eeo_statement: Mapped[str | None] = mapped_column(Text, nullable=True)
    country_code: Mapped[str | None] = mapped_column(Text, nullable=True)
    creator_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=True)  
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("idx_templates_industry", "industry"),
        Index("idx_templates_active_system", "is_active", "deleted_at", "creator_id"),
        Index("idx_templates_created_at", "created_at"),
        Index("idx_templates_country_code", "country_code"),
        Index("idx_templates_location", "location"),
        Index("idx_templates_content_region", text("(content->>'region')")),
        Index("idx_templates_content_country", text("(content->>'country_code')")),
    )

class JobDescription(Base):
    __tablename__ = "talentforge_job_descriptions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    creator_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("talentforge_users.id", ondelete="SET NULL"), nullable=True)
    template_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("talentforge_templates.id", ondelete="SET NULL"), nullable=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    company_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    job_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    job_family: Mapped[str | None] = mapped_column(Text, nullable=True)
    job_level: Mapped[str | None] = mapped_column(String(10), nullable=True)
    department: Mapped[str | None] = mapped_column(Text, nullable=True)
    location: Mapped[str | None] = mapped_column(Text, nullable=True)
    city: Mapped[str | None] = mapped_column(Text, nullable=True)
    country_code: Mapped[str] = mapped_column(String(10), default="US", nullable=False)
    seniority: Mapped[str | None] = mapped_column(String(100), nullable=True)
    industry: Mapped[str] = mapped_column(Text, nullable=False)
    employment_type: Mapped[str | None] = mapped_column(Text, nullable=True, default="Full-Time")
    salary_range: Mapped[str | None] = mapped_column(Text, nullable=True)
    salary_symbol: Mapped[str | None] = mapped_column(String(10), nullable=True)
    salary_min_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    salary_max_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    salary_period: Mapped[str | None] = mapped_column(String(10), nullable=True)
    key_skills: Mapped[str | None] = mapped_column(Text, nullable=True)
    core_competencies: Mapped[str | None] = mapped_column(Text, nullable=True)
    functional_competencies: Mapped[str | None] = mapped_column(Text, nullable=True)
    additional_context: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    input_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    generation_mode: Mapped[str] = mapped_column(String(30), default="ai", nullable=False)
    model_used: Mapped[str | None] = mapped_column(Text, nullable=True)
    _content: Mapped[dict] = mapped_column("content", JSONB, nullable=False)
    sections_metadata: Mapped[dict] = mapped_column(JSONB, default=dict, server_default=text("'{}'::jsonb"), nullable=False)

    @property
    def content(self) -> dict:
        content_val = self._content
        if not content_val or not any(k.startswith("section_") for k in content_val.keys()):
            raw_val = content_val or {}
            # Scrub phantom view locks from the raw content so they don't pollute the API payload
            return {k: v for k, v in raw_val.items() if not (k.endswith("_view") or k.startswith("weight_view_"))}
            
        legacy_content = {}
        sections_order = content_val.get("sections_order") or []
        for key in sections_order:
            sec_obj = content_val.get(key)
            if isinstance(sec_obj, dict) and "name" in sec_obj and "section_data" in sec_obj:
                name = sec_obj["name"]
                sem_key = name.lower().strip().replace(" ", "_")
                if sem_key == "professional_summary":
                    sem_key = "summary"
                elif sem_key == "essential_duties_and_responsibilities":
                    sem_key = "essential_duties_and_responsibilities"
                    
                legacy_content[sem_key] = sec_obj["section_data"]
                
                view_lock = sec_obj.get("metadata", {}).get("view", "unlocked")
                legacy_content[f"{sem_key}_view"] = view_lock
                
        legacy_content["_section_order"] = [
            (v["name"].lower().strip().replace(" ", "_") if v["name"].lower().strip().replace(" ", "_") != "professional_summary" else "summary")
            for k in sections_order if (v := content_val.get(k)) and isinstance(v, dict)
        ]
        return legacy_content

    @content.setter
    def content(self, value: dict):
        self._content = value
    eeoc_flags: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    eeoc_cleared: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False)
    word_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    finalized_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    csod_ou_id: Mapped[str | None] = mapped_column(String(50), nullable=True)          
    csod_pushed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)  
    parent_jd_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("talentforge_job_descriptions.id", ondelete="CASCADE"), nullable=True)
    public_jd_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("talentforge_job_descriptions.id", ondelete="SET NULL"), nullable=True)
    is_main: Mapped[bool] = mapped_column(Boolean, default=True, server_default=text('true'), nullable=False)
    version_history: Mapped[list] = mapped_column(JSONB, default=list, server_default=text("'[]'::jsonb"), nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    creator: Mapped["User"] = relationship("User", back_populates="created_jds")

    @property
    def creator_name(self) -> Optional[str]:
        """Get the creator's full name from the relationship."""
        if self.creator:
            return self.creator.full_name
        return None

    __table_args__ = (
        Index("idx_jd_org_id", "org_id"),
        Index("idx_jd_job_id", "job_id"),
        Index("idx_jd_creator", "creator_id"),
        Index("idx_jd_public_jd_id", "public_jd_id"),
        Index("idx_jd_status", "status"),
        Index("idx_jd_industry", "industry"),
        CheckConstraint("status IN ('draft','final','in_review','approved','public_view','declined','pushed_to_csod','push_to_csod','archive','archive_job','clone')", name="check_jd_status"),
        CheckConstraint("generation_mode IN ('ai','template','template_customised','saba_excel','saba','manual')", name="check_generation_mode"),
    )

class JDExportLog(Base):
    __tablename__ = "talentforge_jd_export_log"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    jd_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("talentforge_job_descriptions.id", ondelete="CASCADE"))
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("talentforge_users.id", ondelete="CASCADE"), nullable=False)  
    creator_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("talentforge_users.id", ondelete="SET NULL"), nullable=True)  
    export_type: Mapped[str] = mapped_column(Text, nullable=False)
    exported_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("idx_export_log_jd", "jd_id"),
        Index("idx_export_log_user", "user_id"),
        CheckConstraint("export_type IN ('pdf','txt','clipboard')", name="check_export_type"),
    )


class CustomFieldDefinition(Base):
    __tablename__ = "talentforge_custom_field_definitions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("talentforge_organisations.id", ondelete="CASCADE"), nullable=False)
    org_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("talentforge_users.id", ondelete="SET NULL"), nullable=True)
    creator_name: Mapped[str] = mapped_column(Text, nullable=False)
    creator_role: Mapped[str] = mapped_column(Text, nullable=False)
    section_name: Mapped[str] = mapped_column(Text, nullable=False)
    section_data_type: Mapped[str] = mapped_column(Text, nullable=False)
    section_data: Mapped[dict] = mapped_column(JSONB, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        Index("idx_custom_fields_org", "org_id"),
        Index("idx_custom_fields_section", "section_name"),
        UniqueConstraint("org_id", "section_name", name="uq_custom_field_section_name_per_org"),
    )


class UserWordLimits(Base):
    __tablename__ = "talentforge_user_word_limits"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("talentforge_users.id", ondelete="CASCADE"), unique=True, nullable=False)
    summary_min: Mapped[int] = mapped_column(Integer, nullable=False, default=60)
    summary_max: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    key_duties_min: Mapped[int] = mapped_column(Integer, nullable=False, default=150)
    key_duties_max: Mapped[int] = mapped_column(Integer, nullable=False, default=230)
    core_competencies_min: Mapped[int] = mapped_column(Integer, nullable=False, default=60)
    core_competencies_max: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    functional_competencies_min: Mapped[int] = mapped_column(Integer, nullable=False, default=70)
    functional_competencies_max: Mapped[int] = mapped_column(Integer, nullable=False, default=120)
    qualifications_required_min: Mapped[int] = mapped_column(Integer, nullable=False, default=60)
    qualifications_required_max: Mapped[int] = mapped_column(Integer, nullable=False, default=180)
    qualifications_preferred_min: Mapped[int] = mapped_column(Integer, nullable=False, default=40)
    qualifications_preferred_max: Mapped[int] = mapped_column(Integer, nullable=False, default=70)
    eeo_statement_min: Mapped[int] = mapped_column(Integer, nullable=False, default=25)
    eeo_statement_max: Mapped[int] = mapped_column(Integer, nullable=False, default=50)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        CheckConstraint("summary_min <= summary_max", name="check_summary_min_max"),
        CheckConstraint("key_duties_min <= key_duties_max", name="check_key_duties_min_max"),
        CheckConstraint("core_competencies_min <= core_competencies_max", name="check_core_comp_min_max"),
        CheckConstraint("functional_competencies_min <= functional_competencies_max",name="check_functional_comp_min_max",),
        CheckConstraint("qualifications_required_min <= qualifications_required_max",name="check_qual_req_min_max",),
        CheckConstraint("qualifications_preferred_min <= qualifications_preferred_max",name="check_qual_pref_min_max",),
        CheckConstraint("eeo_statement_min <= eeo_statement_max", name="check_eeo_min_max"),
    )


class CSODConnection(Base):
    __tablename__ = "talentforge_csod_connections"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("talentforge_organisations.id", ondelete="CASCADE"), nullable=False)
    connection_name: Mapped[str] = mapped_column(String(120), nullable=False)
    base_url_enc: Mapped[str] = mapped_column(Text, nullable=False)
    auth_token_url_enc: Mapped[str] = mapped_column(Text, nullable=False)
    client_id_enc: Mapped[str] = mapped_column(Text, nullable=False)
    client_secret_enc: Mapped[str] = mapped_column(Text, nullable=False)
    scope: Mapped[str] = mapped_column(Text, nullable=False, default="ou:write outype:read ou:read")
    export_type: Mapped[str] = mapped_column(String(20), nullable=False, default="Foundation")
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    default_openings: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    default_expiry_days: Mapped[int] = mapped_column(Integer, default=90, nullable=False)
    default_country: Mapped[str] = mapped_column(String(10), default="US", nullable=False)
    last_tested_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        CheckConstraint("status IN ('pending','active','error')", name="check_csod_status"),
        UniqueConstraint("org_id", "connection_name", name="uq_csod_connection_name_per_org"),
        CheckConstraint("export_type IN ('Foundation','Bulk')", name="check_csod_export_type"),
    )

class EmailVerification(Base):
    __tablename__ = "talentforge_email_verifications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    otp_code: Mapped[str] = mapped_column(String(6), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    verified_status: Mapped[bool] = mapped_column(Boolean, default=False)


class UserSession(Base):
    """Audit table — one row per login attempt (success or failure)."""
    __tablename__ = "talentforge_user_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("talentforge_users.id", ondelete="SET NULL"), nullable=True)
    org_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    jwt_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)   # IPv4 or IPv6
    country: Mapped[str | None] = mapped_column(String(100), nullable=True)     # Detected country from IP geolocation
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    device_type: Mapped[str] = mapped_column(String(20), default="unknown", nullable=False)
    login_method: Mapped[str] = mapped_column(String(20), default="email", nullable=False)
    login_status: Mapped[str] = mapped_column(String(10), default="success", nullable=False)
    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    logged_in_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_activity_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    logout_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    session_duration_sec: Mapped[int | None] = mapped_column(Integer, nullable=True)

    __table_args__ = (
        Index("idx_sessions_user_id", "user_id"),
        Index("idx_sessions_ip", "ip_address"),
        Index("idx_sessions_logged_in_at", "logged_in_at"),
        CheckConstraint("login_status IN ('success','failed')", name="check_session_status"),
        CheckConstraint("device_type IN ('desktop','mobile','api','unknown')", name="check_device_type"),
    )


class OrganizationType(Base):
    __tablename__ = "talentforge_organization_types"

    organization_type_id: Mapped[str] = mapped_column(String(255), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_type_name: Mapped[str] = mapped_column(Text, nullable=False)
    job_sets: Mapped[list["TalentForgeJobSet"]] = relationship("TalentForgeJobSet", back_populates="organization_type")

class TalentForgeJobSet(Base):
    __tablename__ = "talentforge_job_sets"

    talentforge_job_title_id: Mapped[str] = mapped_column(String(255), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(Text, nullable=False)
    organization_type_id: Mapped[str] = mapped_column(ForeignKey("talentforge_organization_types.organization_type_id", ondelete="CASCADE"), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_on: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_on: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    organization_type: Mapped["OrganizationType"] = relationship("OrganizationType", back_populates="job_sets")
    skill_sets: Mapped[list["TalentForgeSkillSet"]] = relationship("TalentForgeSkillSet", back_populates="talentforge_job_set")

class TalentForgeSkillSet(Base):
    __tablename__ = "talentforge_skill_sets"

    talentforge_skill_id: Mapped[str] = mapped_column(String(255), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    talentforge_job_set_id: Mapped[str] = mapped_column(ForeignKey("talentforge_job_sets.talentforge_job_title_id", ondelete="CASCADE"), nullable=False)
    talentforge_job_set: Mapped["TalentForgeJobSet"] = relationship("TalentForgeJobSet", back_populates="skill_sets")

class JDWorkflow(Base):
    """
    Stores workflow definitions created by Admins.
    Each workflow has N ordered steps, each pointing to a specific org member,
    with a step label and SLA days.
    """
    __tablename__ = "talentforge_jd_workflows"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("talentforge_users.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    steps: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    is_draft: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (Index("idx_jd_workflows_org", "org_id"),)

class JDWorkflowRun(Base):
    """
    Tracks a live execution of a workflow for a specific JD.
    """
    __tablename__ = "talentforge_jd_workflow_runs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    jd_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("talentforge_job_descriptions.id", ondelete="CASCADE"), nullable=False)
    current_jd_version_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("talentforge_job_descriptions.id", ondelete="SET NULL"), nullable=True)
    workflow_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("talentforge_jd_workflows.id", ondelete="CASCADE"), nullable=False)
    initiated_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("talentforge_users.id", ondelete="CASCADE"), nullable=False)
    current_step_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    resolved_steps: Mapped[list] = mapped_column(JSONB, nullable=False)  
    comments_trail: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)  
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("idx_jd_workflow_runs_org", "org_id"),
        Index("idx_jd_workflow_runs_workflow", "workflow_id"),
        Index("idx_jd_workflow_runs_initiator", "initiated_by"),
        Index("idx_jd_workflow_runs_jd", "jd_id"),
        CheckConstraint("status IN ('active', 'completed', 'returned_to_initiator', 'cancelled')", name="check_workflow_run_status"),
    )


class CSODPipelinePush(Base):
    """
    Stores every CSOD pipeline push attempt (Foundation or Bulk).
    One row per JD per pipeline run — success or failure.
    """
    __tablename__ = "talentforge_csod_pipeline_pushes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    pushed_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("talentforge_users.id", ondelete="SET NULL"), nullable=True)
    pushed_by_name: Mapped[str] = mapped_column(String(255), nullable=True)
    jd_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("talentforge_job_descriptions.id", ondelete="CASCADE"), nullable=False)
    pipeline_type: Mapped[str] = mapped_column(String(20), nullable=False)  # 'foundation' or 'bulk'
    connection_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    batch_id: Mapped[str | None] = mapped_column(String(50), nullable=True)  # for bulk pipeline only
    ou_ref_id: Mapped[str | None] = mapped_column(String(200), nullable=True)  # CSOD reference ID sent to CSOD
    status: Mapped[str] = mapped_column(String(20), nullable=False)  # 'success' or 'failed'
    stage_of_failure: Mapped[str | None] = mapped_column(String(50), nullable=True)  # where failure occurred
    csod_ou_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    csod_response_timestamp: Mapped[str | None] = mapped_column(Text, nullable=True)  # ISO timestamp from CSOD response
    csod_response_link: Mapped[str | None] = mapped_column(Text, nullable=True)  # href from CSOD response
    our_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    csod_error_code: Mapped[str | None] = mapped_column(Text, nullable=True)
    csod_error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    csod_error_fields: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    csod_http_status: Mapped[int | None] = mapped_column(Integer, nullable=True)
    pushed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("idx_csod_push_org", "org_id"),
        Index("idx_csod_push_jd", "jd_id"),
        Index("idx_csod_push_pushed_by", "pushed_by"),
        CheckConstraint("pipeline_type IN ('foundation','bulk')", name="check_csod_push_pipeline_type"),
        CheckConstraint("status IN ('success','failed')", name="check_csod_push_status"),
    )


class BulkImportReport(Base):
    """Store CSV reports from CSOD Bulk API imports."""
    __tablename__ = "talentforge_bulk_import_reports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("talentforge_organisations.id", ondelete="CASCADE"), nullable=False)
    job_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)  # CSOD job ID
    import_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)  # CSOD import ID
    jd_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("talentforge_job_descriptions.id", ondelete="CASCADE"), nullable=False, index=True)  # TalentForge JD ID
    report_data: Mapped[str] = mapped_column(Text, nullable=False)  # Full CSV report as text
    loaded_status: Mapped[str | None] = mapped_column(String(20), nullable=True)  # 'Loaded' or empty from CSV
    errors: Mapped[str | None] = mapped_column(Text, nullable=True)  # Error message from CSV
    warnings: Mapped[str | None] = mapped_column(Text, nullable=True)  # Warning message from CSV
    ou_ref_id: Mapped[str | None] = mapped_column(String(100), nullable=True)  # CSOD ouRefId from CSV
    connection_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    
    __table_args__ = (Index("idx_bulk_report_org", "org_id"),)


class Competency(Base):
    __tablename__ = "talentforge_competencies"

    competency_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    competency_name: Mapped[str] = mapped_column(Text, nullable=False)
    category_name: Mapped[str] = mapped_column(Text, nullable=False)
    org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("talentforge_organisations.id", ondelete="CASCADE"), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("talentforge_users.id", ondelete="SET NULL"), nullable=True)
    created_on: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("talentforge_users.id", ondelete="SET NULL"), nullable=True)
    updated_on: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    company: Mapped["Organization"] = relationship("Organization")

    __table_args__ = (
        Index("idx_competency_company", "org_id"),
        Index("uq_competency_name_per_company_cat", "competency_name", "org_id", "category_name", unique=True),
    )


class CandidateUser(Base):
    """Candidate users created by Admins for external access to the platform."""
    __tablename__ = "talentforge_candidate_users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("talentforge_organisations.id", ondelete="CASCADE"), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="User")
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("talentforge_users.id", ondelete="SET NULL"), nullable=True)
    creator_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    company_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    employee_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    failed_login_attempts: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    mfa_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    mfa_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    mfa_required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    digital_signature_url: Mapped[str | None] = mapped_column(String(500), nullable=True, comment="URL to uploaded signature image")
    
    # Relationships
    organization: Mapped["Organization"] = relationship("Organization")
    creator: Mapped["User"] = relationship("User", foreign_keys=[created_by])
    assigned_jds: Mapped[list["CandidateJDAssignment"]] = relationship("CandidateJDAssignment", back_populates="candidate", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_candidate_users_org", "org_id"),
        Index("idx_candidate_status", "status"),
        CheckConstraint("role IN ('User')", name="check_candidate_user_role"),
    )


class CandidateJDAssignment(Base):
    """JD assignments to candidate users with status tracking."""
    __tablename__ = "talentforge_candidate_jd_assignments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("talentforge_candidate_users.id", ondelete="CASCADE"), nullable=True)
    assigned_user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("talentforge_users.id", ondelete="CASCADE"), nullable=True)
    jd_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("talentforge_job_descriptions.id", ondelete="CASCADE"), nullable=False)
    org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("talentforge_organisations.id", ondelete="CASCADE"), nullable=False)
    parent_jd_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("talentforge_job_descriptions.id", ondelete="CASCADE"), nullable=True)
    assigned_end_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("talentforge_users.id", ondelete="CASCADE"), nullable=True)
    assigned_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("talentforge_users.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str | None] = mapped_column(Text, nullable=True)
    company_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    job_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    job_family: Mapped[str | None] = mapped_column(Text, nullable=True)
    job_level: Mapped[str | None] = mapped_column(String(10), nullable=True)
    department: Mapped[str | None] = mapped_column(Text, nullable=True)
    location: Mapped[str | None] = mapped_column(Text, nullable=True)
    city: Mapped[str | None] = mapped_column(Text, nullable=True)
    country_code: Mapped[str | None] = mapped_column(String(10), nullable=True)
    seniority: Mapped[str | None] = mapped_column(String(100), nullable=True)
    industry: Mapped[str | None] = mapped_column(Text, nullable=True)
    salary_range: Mapped[str | None] = mapped_column(Text, nullable=True)
    salary_symbol: Mapped[str | None] = mapped_column(String(10), nullable=True)
    salary_min_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    salary_max_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    salary_period: Mapped[str | None] = mapped_column(String(10), nullable=True)
    key_skills: Mapped[str | None] = mapped_column(Text, nullable=True)
    core_competencies: Mapped[str | None] = mapped_column(Text, nullable=True)
    functional_competencies: Mapped[str | None] = mapped_column(Text, nullable=True)
    additional_context: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    content: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    candidate_acknowledgement: Mapped[str | None] = mapped_column(Text, nullable=True)
    candidate_comments: Mapped[str | None] = mapped_column(Text, nullable=True)
    digital_signature: Mapped[str | None] = mapped_column(Text, nullable=True)
    signature_image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="pending")
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    decision: Mapped[str | None] = mapped_column(String(500), nullable=True)
    comment: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    digital_signature_url: Mapped[str | None] = mapped_column(String(500), nullable=True, comment="URL to uploaded signature image")
    terms_accepted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, comment="Terms and conditions acceptance status")
    terms_accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, comment="When terms were accepted")
    signature_method: Mapped[str | None] = mapped_column(String(20), nullable=True, comment="Method used: 'password' or 'digital_signature'")
    jd_snapshot: Mapped[dict | None] = mapped_column(JSONB, nullable=True, comment="Complete snapshot of the JD at the time of assignment")
    terms_and_conditions: Mapped[str | None] = mapped_column(Text, nullable=True, comment="Terms and conditions text for this JD assignment")
    candidate: Mapped["CandidateUser"] = relationship("CandidateUser", back_populates="assigned_jds")
    assigned_user: Mapped["User"] = relationship("User", foreign_keys=[assigned_user_id], back_populates="received_assignments")
    assignor: Mapped["User"] = relationship("User", foreign_keys=[assigned_by], back_populates="sent_assignments")
    jd: Mapped["JobDescription"] = relationship("JobDescription", foreign_keys=[jd_id])
    parent_jd: Mapped["JobDescription"] = relationship("JobDescription", foreign_keys=[parent_jd_id])
    organization: Mapped["Organization"] = relationship("Organization")

    __table_args__ = (
        Index("idx_candidate_jd_assignments_user", "assigned_user_id"),
        Index("idx_candidate_jd_assignments_jd", "jd_id"),
        Index("idx_candidate_jd_assignments_org", "org_id"),
        Index("idx_candidate_jd_assignments_by", "assigned_by"),
        Index("idx_candidate_jd_assignments_parent", "parent_jd_id"),
        Index("idx_candidate_jd_assignments_creator", "created_by"),
        Index("idx_candidate_jd_assignments_status", "status"),
        UniqueConstraint("candidate_id", "jd_id", name="uq_candidate_jd_assignment"),
        CheckConstraint("status IN ('pending','waiting_for_approval','in_progress','approved','declined','forward_for_approval','returned','completed','rejected', 'sign-off-pending', 'sign-off-complete')", 
            name="check_candidate_jd_assignment_status"))


class JobApplication(Base):
    """Stores external applications submitted against public-view JDs."""
    __tablename__ = "talentforge_job_applications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("talentforge_organisations.id", ondelete="CASCADE"), nullable=False)
    public_jd_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("talentforge_job_descriptions.id", ondelete="CASCADE"), nullable=False)
    original_jd_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("talentforge_job_descriptions.id", ondelete="CASCADE"), nullable=False)
    applicant_name: Mapped[str] = mapped_column(Text, nullable=False)
    applicant_email: Mapped[str] = mapped_column(String(255), nullable=False)
    applicant_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    source: Mapped[str | None] = mapped_column(Text, nullable=True, default="TalentForge")
    status: Mapped[str] = mapped_column(String(30), default="applied", nullable=False)
    interview_stage: Mapped[str | None] = mapped_column(String(100), nullable=True)
    comments: Mapped[str | None] = mapped_column(Text, nullable=True)
    application_metadata: Mapped[dict | None] = mapped_column("metadata", JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    public_jd: Mapped[JobDescription] = relationship("JobDescription", foreign_keys=[public_jd_id])
    original_jd: Mapped[JobDescription] = relationship("JobDescription", foreign_keys=[original_jd_id])
    organization: Mapped["Organization"] = relationship("Organization")

    __table_args__ = (
        Index("idx_job_applications_org", "org_id"),
        Index("idx_job_applications_public_jd", "public_jd_id"),
        Index("idx_job_applications_original_jd", "original_jd_id"),
        Index("idx_job_applications_status", "status"),
    )


class CSODOU(Base):
    """
    Stores Organizational Units (Positions, Divisions, etc.) fetched from CSOD.
    """
    __tablename__ = "talentforge_csod_ous"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("talentforge_organisations.id", ondelete="CASCADE"), nullable=False)
    csod_ou_id: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    type_id: Mapped[int] = mapped_column(Integer, nullable=False)
    parent_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    external_id: Mapped[str | None] = mapped_column(String(200), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    full_data: Mapped[dict] = mapped_column(JSONB, nullable=False) # Stores the raw JSON response
    last_fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (UniqueConstraint("org_id", "csod_ou_id", name="uq_ou_per_org"),
        Index("idx_csod_ou_csod_id", "csod_ou_id"))


class ChatMessage(Base):
    """Stores internal organization chat messages."""
    __tablename__ = "talentforge_chat_messages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("talentforge_organisations.id", ondelete="CASCADE"), index=True)
    sender_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("talentforge_users.id", ondelete="CASCADE"), index=True)
    recipient_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("talentforge_users.id", ondelete="CASCADE"), index=True, nullable=True)
    content: Mapped[str] = mapped_column(Text)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    sender: Mapped["User"] = relationship("User", foreign_keys=[sender_id], back_populates="sent_messages")
    recipient: Mapped["User"] = relationship("User", foreign_keys=[recipient_id], back_populates="received_messages")


class Notification(Base):
    """Stores user notifications for JD assignments, approvals, and status changes."""
    __tablename__ = "talentforge_notifications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True) # Linked to either talentforge_users or talentforge_candidate_users
    sender_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("talentforge_users.id", ondelete="SET NULL"), nullable=True)
    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    type: Mapped[str] = mapped_column(String(50), nullable=False) # 'jd_assigned', 'approval_requested', 'status_update'
    title: Mapped[str] = mapped_column(Text, nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    link: Mapped[str | None] = mapped_column(Text, nullable=True) # e.g., "/jds/view/{jd_id}"
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user: Mapped["User | None"] = relationship("User", foreign_keys=[user_id], back_populates="notifications", primaryjoin="Notification.user_id == User.id", overlaps="notifications")
    sender: Mapped["User | None"] = relationship("User", foreign_keys=[sender_id])



class TermsAndConditions(Base):
    """Stores Terms and Conditions data for organizations."""
    __tablename__ = "talentforge_terms_and_conditions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("talentforge_organisations.id", ondelete="CASCADE"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationship
    organization: Mapped["Organization"] = relationship("Organization")

    __table_args__ = (Index("idx_tc_org", "org_id"),)


class TalentForgeEmailGroup(Base):
    __tablename__ = "talentforge_email_groups"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("talentforge_organisations.id", ondelete="CASCADE"), nullable=False)
    group_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str | None] = mapped_column(String(50), nullable=True)
    emails: Mapped[list | dict | None] = mapped_column(JSONB, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("org_id", "group_name", name="uq_email_group_name_per_org"),
        Index("idx_email_group_org_id", "org_id"),
    )



class BroadcastMessage(Base):
    __tablename__ = "talentforge_broadcast_messages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(String(50), default="info", nullable=False) # info, warning, error, success
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("talentforge_users.id", ondelete="SET NULL"), nullable=True)


class FeedbackPromptState(Base):
    """Tracks when to ask each user for platform feedback without over-prompting."""
    __tablename__ = "talentforge_feedback_prompt_state"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    user_type: Mapped[str] = mapped_column(String(20), nullable=False)  # staff | candidate
    org_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("talentforge_organisations.id", ondelete="SET NULL"), nullable=True)
    session_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    meaningful_actions: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    last_session_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_prompt_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_dismissed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    dismiss_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    snooze_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "user_type", name="uq_feedback_prompt_user"),
        Index("idx_feedback_prompt_user", "user_id", "user_type"),
    )


class PlatformFeedback(Base):
    __tablename__ = "talentforge_platform_feedback"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    user_type: Mapped[str] = mapped_column(String(20), nullable=False)
    org_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("talentforge_organisations.id", ondelete="SET NULL"), nullable=True)
    user_email: Mapped[str] = mapped_column(String(255), nullable=False)
    user_name: Mapped[str] = mapped_column(String(255), nullable=False)
    user_role: Mapped[str] = mapped_column(String(50), nullable=False)
    org_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    tip: Mapped[str | None] = mapped_column(Text, nullable=True)
    trigger_context: Mapped[dict] = mapped_column(JSONB, default=dict, server_default=text("'{}'::jsonb"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        CheckConstraint("rating IS NULL OR (rating >= 1 AND rating <= 5)", name="check_feedback_rating"),
        Index("idx_platform_feedback_org", "org_id"),
        Index("idx_platform_feedback_created", "created_at"),
    )


class SabaJobDescription(Base):
    __tablename__ = "talentforge_saba_job_descriptions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("talentforge_organisations.id", ondelete="SET NULL"), nullable=True)
    creator_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("talentforge_users.id", ondelete="SET NULL"), nullable=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    job_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    sections: Mapped[dict] = mapped_column(JSONB, default=dict, server_default=text("'{}'::jsonb"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    organization: Mapped["Organization"] = relationship("Organization", foreign_keys=[org_id])
    creator: Mapped["User"] = relationship("User", foreign_keys=[creator_id])

    __table_args__ = (Index("idx_saba_jd_org", "org_id"),)
