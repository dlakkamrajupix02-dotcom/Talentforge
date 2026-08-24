from app.core.messages import ORG_ACCESS_SUSPENDED_MESSAGE
from app.core.exceptions import PasswordValidationError
from app.core.logging import get_logger
from app.core.client_ip import get_client_ip, normalize_country_value
from datetime import datetime, timezone, timedelta
import httpx
from uuid import uuid4, UUID
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response, Body
from fastapi.responses import RedirectResponse, JSONResponse
from pydantic import EmailStr, BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from app.core.database import get_db
from app.core.http_client import get_http_client
from app.core.rate_limiter import limiter
from app.models.models import User, UserSession
from app.schemas.schemas import UserSignup, UserLogin, Token, LoginResponse, ForgotPasswordInitiateRequest, ForgotPasswordRequest, ResetPasswordRequest, OTPVerification, VerificationResponse, AuthenticatedResetPasswordRequest, UserUpdate, AdminUserUpdate, MFASetupResponse, MFAVerifyRequest, MFAStatusResponse, LoginMFAVerifyRequest
from app.services.auth_service import (hash_password, verify_password, create_access_token, generate_backup_codes,generate_mfa_secret, generate_totp_code, verify_totp_code, read_secret, store_secret,should_require_mfa_for_role, set_auth_cookies, clear_auth_cookies)
from app.services.dependencies import get_current_user, get_current_regular_user, get_current_super_admin, get_current_user_optional, decode_token_payload, require_admin
from app.services.dependencies import oauth2_scheme_optional
from fastapi.security import HTTPAuthorizationCredentials
from app.services.redis_service import redis_service
from app.services.cache_service import cache_service
from typing import Optional
from app.services.organization_service import organization_service
from app.repository import organization_repository as org_repo
from app.core.config import settings
from app.repository import user_repository as user_repo
from app.repository import auth_repository as auth_repo
from app.repository import candidate_user_repository as candidate_repo
from app.core.logging import log_exception_one_line
from app.services.otp_service import otp_service
from app.services.user_service import user_service
from app.services.oauth_service import (build_authorize_url, exchange_code_for_access_token, fetch_oauth_user_info, OAuthError,verify_cornerstone_user_id, local_account_matches_cornerstone)


logger = get_logger()

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _infer_device_type(user_agent: str) -> str:
    """Infer device type from User-Agent string."""
    ua = (user_agent or "").lower()
    if not ua or ua in ("", "unknown"):
        return "api"
    if any(k in ua for k in ("mobile", "android", "iphone", "ipad")):
        return "mobile"
    if any(k in ua for k in ("mozilla", "chrome", "safari", "firefox", "edge")):
        return "desktop"
    return "api"


@router.get("/oauth/{provider}/login", include_in_schema=True)
@limiter.limit("5/minute")
async def oauth_provider_login(provider: str, request: Request) -> RedirectResponse:
    try:
        authorize_url, state = build_authorize_url(provider)
    except OAuthError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    redirect_response = RedirectResponse(authorize_url, status_code=status.HTTP_302_FOUND)
    redirect_response.set_cookie(key="oauth_state",value=state,httponly=True,samesite="lax",max_age=600,path="/")
    return redirect_response


@router.get("/oauth/{provider}/callback", include_in_schema=True)
async def oauth_provider_callback(provider: str,request: Request,db: AsyncSession = Depends(get_db),code: str | None = None,state: str | None = None,error: str | None = None) -> JSONResponse:
    if error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"OAuth provider error: {error}")
    if not code or not state:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing OAuth code or state.")
    state_cookie = request.cookies.get("oauth_state")
    if not state_cookie or state_cookie != state:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OAuth state.")
    try:
        client = get_http_client()
        token_response = await exchange_code_for_access_token(provider, code, None, client)
        provider_access_token = token_response.get("access_token")
        if not provider_access_token:
            raise OAuthError("OAuth provider response was missing an access token.")
        profile = await fetch_oauth_user_info(provider, provider_access_token, client)
    except OAuthError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception as exc:
        log_exception_one_line("oauth_provider_callback failed", exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="OAuth login failed. Please try again.")
    email = profile.get("email")
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OAuth login did not return an email.")
    email = email.lower().strip()
    from app.core.client_ip import get_client_ip_and_country
    ip, detected_country = await get_client_ip_and_country(request)
    ua = request.headers.get("User-Agent", "")
    device = _infer_device_type(ua)
    login_method = provider.lower()
    try:
        db_user = await user_repo.get_user_by_email(db, email)
        if db_user:
            if db_user.status == "inactive":
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Your account has been deactivated. Please contact your administrator.")

            db_user = await user_repo.update_user_last_login(db, db_user, status="active")
            previous_sessions = await auth_repo.get_active_user_sessions(db, db_user.id)
            previous_device_info = None
            if previous_sessions:
                await auth_repo.close_previous_sessions(db, previous_sessions)
                most_recent = max(previous_sessions, key=lambda s: s.logged_in_at)
                previous_device_info = {
                    "device_type": most_recent.device_type,
                    "ip_address": most_recent.ip_address,
                    "logged_in_at": most_recent.logged_in_at.isoformat() if most_recent.logged_in_at else None,
                    "session_duration_sec": most_recent.session_duration_sec,
                }
            org_policy = None
            if db_user.org_id:
                org = await org_repo.get_organization_by_id(db, db_user.org_id)
                org_policy = getattr(org, "mfa_policy", None) or {}
            if should_require_mfa_for_role(db_user, org_policy) or (db_user.mfa_enabled and db_user.mfa_verified):
                temp_payload = {"sub": str(db_user.id), "type": "mfa", "sid": None}
                temp_token = create_access_token(temp_payload)
                return JSONResponse(status_code=200, content={"mfaRequired": True, "tempToken": temp_token, "message": "MFA verification required"})
            jwt_expires_at = datetime.now(timezone.utc).replace(second=0, microsecond=0)
            jwt_expires_at = jwt_expires_at + timedelta(minutes=settings.access_token_expire_minutes)
            session = UserSession(user_id=db_user.id,org_id=db_user.org_id,jwt_expires_at=jwt_expires_at,ip_address=ip,
                country=detected_country,user_agent=ua,device_type=device,login_method=login_method,login_status="success")
            await auth_repo.create_user_session(db, session=session)
            token = create_access_token({"sub": str(db_user.id), "sid": str(session.id)})
            try:
                await redis_service.set_session_id(str(db_user.id), str(session.id), settings.access_token_expire_minutes * 60)
                token_data = {"access_token": token, "token_type": "bearer", "sid": str(session.id)}
                await redis_service.store_token(str(db_user.id), token_data, settings.access_token_expire_minutes)
            except Exception as e:
                logger.warning("Redis session store unavailable for OAuth user %s: %s", db_user.id, e)
            response_payload = LoginResponse(access_token=token,token_type="bearer",id=db_user.id,role=db_user.role,
                full_name=db_user.full_name,email=db_user.email,country=normalize_country_value(detected_country or db_user.region),color_code=db_user.color_code,previous_session_logged_out=previous_device_info,
                user_type="regular",org_id=str(db_user.org_id) if db_user.org_id else None,mfa=bool(db_user.mfa_enabled)).model_dump(mode="json")
        else:
            candidate = await candidate_repo.get_candidate_user_by_email(db, email)
            if not candidate:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No account found for this OAuth email address.")
            if candidate.status == "inactive":
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Candidate account is inactive.")
            token = create_access_token({"sub": str(candidate.id)})
            candidate = await candidate_repo.update_candidate_last_login(db, candidate)
            response_payload = LoginResponse(access_token=token,token_type="bearer",id=candidate.id,role=candidate.role,full_name=candidate.full_name,email=candidate.email,
                country=None,color_code=None,previous_session_logged_out=None,user_type="candidate",org_id=str(candidate.org_id) if candidate.org_id else None,mfa=False).model_dump(mode="json")

        import urllib.parse
        
        frontend_url = settings.frontend_url.rstrip("/")
        redirect_url = f"{frontend_url}/login/success"
        response = RedirectResponse(url=redirect_url, status_code=status.HTTP_302_FOUND)
        set_auth_cookies(response, response_payload["access_token"])
        response.delete_cookie("oauth_state", path="/")
        return response
    except HTTPException:
        raise
    except Exception as exc:
        log_exception_one_line("oauth_provider_callback failed", exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="OAuth login failed. Please try again.")


#This is the Signup route
@router.post("/signup")
@limiter.limit("3/minute")
async def signup(request: Request, user: UserSignup, db: AsyncSession = Depends(get_db), current_user: Optional[User] = Depends(get_current_user_optional)):
    try:
        from sqlalchemy import select, func
        
        is_authenticated_super_admin = current_user and current_user.role == "Super_Admin"
        if not is_authenticated_super_admin:
            # Check if any super admin exists
            stmt = select(func.count(User.id)).where(User.role == "Super_Admin")
            result = await db.execute(stmt)
            super_admin_count = result.scalar() or 0
            
            if super_admin_count > 0:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Signup requires Super Admin privileges. Please log in.")
            if user.role != "Super_Admin":
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The first user created must be a Super_Admin.")
            expected_secret = (settings.super_admin_bootstrap_secret or "").strip()
            if not expected_secret:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Super Admin bootstrap is disabled. Set SUPER_ADMIN_BOOTSTRAP_SECRET and retry.",
                )
            provided_secret = (user.bootstrap_secret or request.headers.get("X-Bootstrap-Secret") or "").strip()
            if provided_secret != expected_secret:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid bootstrap credentials.")

        existing_user = await user_repo.get_user_by_email(db, user.email)
        if existing_user:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already exists")
        company_name = user.company_name.strip()
        
        # Check if organization exists, if not create it
        org = await org_repo.get_organization_by_name(db, company_name)
        if not org:
            org = await org_repo.create_organization(db, name=company_name)
            if not org:
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to setup organization")
        
        # Use the role provided in the request
        role = user.role
        await user_repo.create_user(db,user_id=uuid4(), full_name=user.full_name, email=user.email,
            hashed_password=hash_password(user.password), role=role, region=user.country, org_id=org.id, color_code=user.color_code)
        return {"message": "User created successfully. Please login to continue."}
    except PasswordValidationError as e:
        logger.warning("Password validation failed during signup: %s", e)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except HTTPException:
        raise
    except IntegrityError as e:
        logger.warning("Database integrity error during signup: %s", e)
        await auth_repo.rollback_db(db)
        if "email" in str(e).lower():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already exists")
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User creation failed due to duplicate data")
    except Exception as exc:
        log_exception_one_line("signup failed", exc)
        await auth_repo.rollback_db(db)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An internal error occurred during signup. Please try again.")


class CornerstoneLoginRequest(BaseModel):
    user_id: str

@router.post("/cornerstone-login", response_model=LoginResponse)
@limiter.limit("5/minute")
async def cornerstone_login(request: Request, payload: CornerstoneLoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    client = get_http_client()
    token_url = settings.cornerstone_oauth_token_url
    if not token_url:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cornerstone integration is not configured.")
        
    form = {
        "grant_type": "client_credentials",
        "client_id": settings.cornerstone_oauth_client_id,
        "client_secret": settings.cornerstone_oauth_client_secret,
        "scope": "applicationworkflow:read",
    }
    
    headers = {"Accept": "application/json"}
    try:
        resp = await client.post(token_url, data=form, headers=headers, timeout=15.0)
        resp.raise_for_status()
        token_data = resp.json()
        access_token = token_data.get("access_token")
        if not access_token:
            raise OAuthError("Cornerstone token endpoint did not return an access token.")
    except httpx.HTTPStatusError as exc:
        logger.warning(f"Cornerstone OAuth connection HTTP error {exc.response.status_code}: {exc.response.text}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cornerstone API verification failed: {exc.response.text}")
    except Exception as exc:
        logger.warning(f"Cornerstone OAuth connection failed: {exc}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cornerstone API verification failed: {exc}")

    try:
        csod_profile = await verify_cornerstone_user_id(client, access_token=access_token, user_id=payload.user_id)
    except httpx.HTTPStatusError as exc:
        logger.warning("Cornerstone user lookup HTTP error %s: %s", exc.response.status_code, exc.response.text)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Cornerstone user verification failed.")
    except ValueError as exc:
        logger.warning("Cornerstone user verification failed: %s", exc)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc))

    identifier = payload.user_id.lower().strip()
    # Log detected country for user tracking
    from app.core.client_ip import get_client_ip_and_country
    ip, detected_country = await get_client_ip_and_country(request)
    ua = request.headers.get("User-Agent", "")
    device = _infer_device_type(ua)
    login_method = "cornerstone"
    
    try:
        db_user = await user_repo.get_user_by_login_identifier(db, identifier)
        if not db_user and csod_profile.get("email"):
            db_user = await user_repo.get_user_by_email(db, csod_profile["email"])
        if db_user:
            if not local_account_matches_cornerstone(
                identifier=identifier,
                account_email=db_user.email,
                csod_profile=csod_profile,
            ):
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Cornerstone user does not match the linked local account.")
            if db_user.status == "inactive":
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Your account has been deactivated.")
                
            db_user = await user_repo.update_user_last_login(db, db_user, status="active")
            expire_minutes = getattr(settings, "access_token_expire_minutes", 60)
            jwt_expires_at = datetime.now(timezone.utc).replace(second=0, microsecond=0) + timedelta(minutes=expire_minutes)
            
            session = UserSession(user_id=db_user.id, org_id=db_user.org_id, jwt_expires_at=jwt_expires_at, ip_address=ip, country=detected_country, user_agent=ua, device_type=device, login_method=login_method, login_status="success")
            await auth_repo.create_user_session(db, session=session)
            token = create_access_token({"sub": str(db_user.id), "sid": str(session.id)})
            
            try:
                await redis_service.set_session_id(str(db_user.id), str(session.id), expire_minutes * 60)
                await redis_service.store_token(str(db_user.id), {"access_token": token, "token_type": "bearer", "sid": str(session.id)}, expire_minutes)
            except Exception as e:
                logger.warning("Redis store failed: %s", e)
                
            set_auth_cookies(response, token, max_age_minutes=expire_minutes)
            return LoginResponse(access_token=token, token_type="bearer", id=db_user.id, role=db_user.role, full_name=db_user.full_name, email=db_user.email, country=normalize_country_value(db_user.region), color_code=db_user.color_code, previous_session_logged_out=None, user_type="regular", org_id=str(db_user.org_id) if db_user.org_id else None, mfa=bool(db_user.mfa_enabled))

        # Fallback to candidate user lookup
        candidate = await candidate_repo.get_candidate_user_by_email(db, csod_profile.get("email") or identifier)
        if not candidate:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No local account found linked to this Cornerstone User ID.")
        if not local_account_matches_cornerstone(
            identifier=identifier,
            account_email=candidate.email,
            csod_profile=csod_profile,
        ):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Cornerstone user does not match the linked local account.")
            
        if candidate.status == "inactive":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Your account has been deactivated.")
            
        expire_minutes = getattr(settings, "access_token_expire_minutes", 60)
        jwt_expires_at = datetime.now(timezone.utc).replace(second=0, microsecond=0) + timedelta(minutes=expire_minutes)
        session = UserSession(user_id=candidate.id, org_id=candidate.org_id, jwt_expires_at=jwt_expires_at, ip_address=ip, country=detected_country, user_agent=ua, device_type=device, login_method=login_method, login_status="success")
        await auth_repo.create_user_session(db, session=session)
        token = create_access_token({"sub": str(candidate.id), "sid": str(session.id)})
        
        set_auth_cookies(response, token, max_age_minutes=expire_minutes)
        return LoginResponse(access_token=token, token_type="bearer", id=candidate.id, role=candidate.role, full_name=candidate.full_name, email=candidate.email, country=None, color_code=None, previous_session_logged_out=None, user_type="candidate", org_id=str(candidate.org_id) if candidate.org_id else None, mfa=False)
    except HTTPException:
        raise
    except Exception as exc:
        log_exception_one_line("cornerstone_login failed", exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Cornerstone login failed: {str(exc)}")

#This is login route - handles both User and CandidateUser
@router.post("/login", response_model=LoginResponse)
@limiter.limit("5/minute")
async def login(request: Request, user: UserLogin, response: Response, db: AsyncSession = Depends(get_db)):
    from app.core.client_ip import get_client_ip_and_country
    ip, detected_country = await get_client_ip_and_country(request)
    ua = request.headers.get("User-Agent", "")
    device = _infer_device_type(ua)
    identifier = user.username_or_email.lower().strip()
    login_method = "email" if "@" in identifier else "username"
    # Log detected country for user tracking
    if detected_country:
        logger.info(f"Login attempt for {identifier} from IP {ip}, detected country: {detected_country}")
    try:
        # First, try to find in User table (Admin/Manager/HR/User)
        db_user = await user_repo.get_user_by_login_identifier(db, identifier)  
        if db_user:
            # Block inactive users before password validation
            if db_user.status == "inactive":
                failed_session = UserSession(user_id=db_user.id, org_id=db_user.org_id, ip_address=ip, country=detected_country, user_agent=ua, device_type=device,
                    login_method=login_method, login_status="failed", failure_reason="Account inactive")
                await auth_repo.create_user_session(db, session=failed_session)
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,detail="Your account has been deactivated by an administrator. Please contact your admin for access.")
            
            # Check organization active status
            if db_user.org_id and db_user.role != "Super_Admin":
                org = await org_repo.get_organization_by_id(db, db_user.org_id)
                if org and (not org.is_active or (org.access_valid_until and org.access_valid_until < datetime.now(timezone.utc))):
                    failed_session = UserSession(user_id=db_user.id, org_id=db_user.org_id, ip_address=ip, country=detected_country, user_agent=ua, device_type=device, login_method=login_method, login_status="failed", failure_reason="Organization access removed")
                    await auth_repo.create_user_session(db, session=failed_session)
                    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=ORG_ACCESS_SUSPENDED_MESSAGE)

            # User found in User table - proceed with normal login
            if not verify_password(user.password.strip(), db_user.hashed_password):
                failed_session = UserSession(user_id=db_user.id, org_id=db_user.org_id,ip_address=ip, country=detected_country, user_agent=ua, device_type=device,
                    login_method=login_method, login_status="failed",failure_reason="Wrong password")
                await auth_repo.create_user_session(db, session=failed_session)
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
            if user.country:
                db_user = await user_repo.update_user_region(db, db_user, user.country)
            db_user = await user_repo.update_user_last_login(db, db_user, status="active")
            org_policy = None
            if db_user.org_id:
                org = await org_repo.get_organization_by_id(db, db_user.org_id)
                org_policy = getattr(org, "mfa_policy", None) or {}
            if should_require_mfa_for_role(db_user, org_policy) or (db_user.mfa_enabled and db_user.mfa_verified):
                temp_payload = {"sub": str(db_user.id), "type": "mfa", "sid": None}
                temp_token = create_access_token(temp_payload)
                response.status_code = status.HTTP_200_OK
                return JSONResponse(status_code=200, content={"mfaRequired": True, "tempToken": temp_token, "message": "MFA verification required"})
            previous_sessions = await auth_repo.get_active_user_sessions(db, db_user.id)
            previous_device_info = None
            if previous_sessions:
                await auth_repo.close_previous_sessions(db, previous_sessions)
                most_recent = max(previous_sessions, key=lambda s: s.logged_in_at)
                previous_device_info = {
                    "device_type": most_recent.device_type,
                    "ip_address": most_recent.ip_address,
                    "logged_in_at": most_recent.logged_in_at.isoformat() if most_recent.logged_in_at else None,
                    "session_duration_sec": most_recent.session_duration_sec
                }
                logger.info(f"Invalidated {len(previous_sessions)} previous sessions for user {db_user.id}")
            expire_minutes = getattr(settings, "access_token_expire_minutes", 60)
            jwt_expires_at = datetime.now(timezone.utc).replace(second=0, microsecond=0)
            jwt_expires_at = jwt_expires_at + timedelta(minutes=expire_minutes)
            # Create session first so we have the ID for the token
            session = UserSession(user_id=db_user.id,org_id=db_user.org_id,
                jwt_expires_at=jwt_expires_at,ip_address=ip,country=detected_country,user_agent=ua,device_type=device,
                login_method=login_method,login_status="success")
            await auth_repo.create_user_session(db, session=session)
            # Now create token with the specific session ID (sid)
            token = create_access_token({"sub": str(db_user.id), "sid": str(session.id)})
            try:
                await redis_service.set_session_id(str(db_user.id),str(session.id),expire_minutes * 60)
                # Store token linked to the specific session ID (sid)
                token_data = {"access_token": token, "token_type": "bearer", "sid": str(session.id)}
                await redis_service.store_token(str(db_user.id), token_data, expire_minutes)
            except Exception as e:
                logger.warning("Redis session store unavailable for user %s: %s", db_user.id, e)
            set_auth_cookies(response, token, max_age_minutes=expire_minutes)
            country_value = normalize_country_value(detected_country or db_user.region)
            return LoginResponse(access_token=token,token_type="bearer",id=db_user.id,role=db_user.role,
                full_name=db_user.full_name,email=db_user.email,
                country=country_value,
                color_code=db_user.color_code,previous_session_logged_out=previous_device_info,
                user_type="regular",org_id=str(db_user.org_id) if db_user.org_id else None,mfa=bool(db_user.mfa_enabled))
        # User not found in User table - try CandidateUser table
        candidate = await candidate_repo.get_candidate_user_by_email(db, identifier)
        if not candidate:
            failed_session = UserSession(user_id=None, org_id=None, ip_address=ip, user_agent=ua,
                device_type=device, login_method=login_method,login_status="failed", failure_reason="User not found")
            await auth_repo.create_user_session(db, session=failed_session)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        if candidate.status == "inactive":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,detail="Your account has been deactivated by an administrator. Please contact your admin for access.")
            
        # Check organization active status for candidate
        if candidate.org_id:
            org = await org_repo.get_organization_by_id(db, candidate.org_id)
            if org and (not org.is_active or (org.access_valid_until and org.access_valid_until < datetime.now(timezone.utc))):
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=ORG_ACCESS_SUSPENDED_MESSAGE)

        if not verify_password(user.password.strip(), candidate.hashed_password):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

        token = create_access_token({"sub": str(candidate.id)})
        candidate = await candidate_repo.update_candidate_last_login(db, candidate)
        logger.info("Candidate %s logged in successfully", candidate.id)
        set_auth_cookies(response, token)
        return LoginResponse(access_token=token,token_type="bearer",id=candidate.id,role=candidate.role,full_name=candidate.full_name,email=candidate.email,country=None,
            color_code=None,previous_session_logged_out=None,user_type="candidate",org_id=str(candidate.org_id) if candidate.org_id else None,mfa=bool(candidate.mfa_enabled))
    except HTTPException:
        raise
    except Exception as exc:
        log_exception_one_line("login failed", exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An internal error occurred during login. Please try again.")


@router.post("/mfa/setup", response_model=MFASetupResponse)
async def setup_mfa(current_user: User = Depends(get_current_regular_user), db: AsyncSession = Depends(get_db)):
    secret = generate_mfa_secret()
    encrypted_secret = store_secret(secret)
    backup_codes = generate_backup_codes()
    await user_repo.update_user_mfa_state(db, current_user, enabled=True, verified=False, secret=encrypted_secret, backup_codes="|".join(backup_codes))
    otpauth_url = f"otpauth://totp/TalentForge:{current_user.email}?secret={secret}&issuer=TalentForge"
    return MFASetupResponse(secret=secret, otpauth_url=otpauth_url, backup_codes=backup_codes)


@router.post("/mfa/verify")
async def verify_mfa(payload: MFAVerifyRequest, current_user: User = Depends(get_current_regular_user), db: AsyncSession = Depends(get_db)):
    secret = read_secret(current_user.mfa_secret)
    if not secret:
        raise HTTPException(status_code=400, detail="MFA not set up")
    if not verify_totp_code(secret, payload.otp):
        raise HTTPException(status_code=401, detail="Invalid MFA code")
    await user_repo.update_user_mfa_state(db, current_user, verified=True, enabled=True)
    return {"message": "MFA verified successfully"}


@router.get("/mfa", response_model=MFAStatusResponse)
async def get_mfa_status(current_user: User = Depends(get_current_regular_user), db: AsyncSession = Depends(get_db)):
    await db.refresh(current_user)
    org_policy = None
    if current_user.org_id:
        org = await org_repo.get_organization_by_id(db, current_user.org_id)
        org_policy = getattr(org, "mfa_policy", None) or {}
    required = should_require_mfa_for_role(current_user, org_policy)
    return MFAStatusResponse(enabled=current_user.mfa_enabled, verified=current_user.mfa_verified, required=required, can_disable=not required)


@router.post("/mfa/disable")
async def disable_mfa(current_user: User = Depends(get_current_regular_user), db: AsyncSession = Depends(get_db)):
    org_policy = None
    if current_user.org_id:
        org = await org_repo.get_organization_by_id(db, current_user.org_id)
        org_policy = getattr(org, "mfa_policy", None) or {}
    if should_require_mfa_for_role(current_user, org_policy):
        raise HTTPException(status_code=403, detail="MFA is enforced by organization policy")
    await user_repo.update_user_mfa_state(db, current_user, enabled=False, verified=False, secret=None, backup_codes=None)
    return {"message": "MFA disabled successfully"}


@router.post("/mfa/verify-login")
async def verify_login_mfa(payload: LoginMFAVerifyRequest, request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    if not payload.temp_token:
        raise HTTPException(status_code=400, detail="Temporary token is required")
    if not payload.otp:
        raise HTTPException(status_code=400, detail="OTP is required")
    try:
        from jose import jwt
        from app.core.config import settings
        payload_data = jwt.decode(payload.temp_token, settings.secret_key, algorithms=[settings.algorithm])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid temporary token")
    if payload_data.get("type") != "mfa":
        raise HTTPException(status_code=401, detail="Invalid temporary token")
    user_id = payload_data.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid temporary token")
    db_user = await user_repo.get_user_by_id(db, UUID(user_id))
    if not db_user:
        raise HTTPException(status_code=401, detail="User not found")
    secret = read_secret(db_user.mfa_secret)
    if not secret or not verify_totp_code(secret, payload.otp):
        raise HTTPException(status_code=401, detail="Invalid MFA code")
    session = UserSession(user_id=db_user.id, org_id=db_user.org_id, jwt_expires_at=datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes), ip_address=get_client_ip(request), country=None, user_agent=request.headers.get("User-Agent", ""), device_type=_infer_device_type(request.headers.get("User-Agent", "")), login_method="email", login_status="success")
    await auth_repo.create_user_session(db, session=session)
    access_token = create_access_token({"sub": str(db_user.id), "sid": str(session.id)})
    try:
        await redis_service.set_session_id(str(db_user.id), str(session.id), settings.access_token_expire_minutes * 60)
        token_data = {"access_token": access_token, "token_type": "bearer", "sid": str(session.id)}
        await redis_service.store_token(str(db_user.id), token_data, settings.access_token_expire_minutes)
    except Exception as exc:
        logger.warning("Redis session store unavailable for MFA login user %s: %s", db_user.id, exc)
    set_auth_cookies(response, access_token)
    return LoginResponse(access_token=access_token, token_type="bearer", id=db_user.id, role=db_user.role, full_name=db_user.full_name, email=db_user.email, country=normalize_country_value(db_user.region), color_code=db_user.color_code, previous_session_logged_out=None, user_type="regular", org_id=str(db_user.org_id) if db_user.org_id else None, mfa=bool(db_user.mfa_enabled))


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """
    Returns the profile information of the currently authenticated user including organization name.
    """
    try:
        user_id = str(current_user.id)
        org_name = "Organization"
        if current_user.org_id:
            org = await org_repo.get_organization_by_id(db, current_user.org_id)
            if org:
                org_name = org.name
        # Both User and CandidateUser now have full_name
        full_name = current_user.full_name
        region = getattr(current_user, "region", None)
        color_code = getattr(current_user, "color_code", None)
        user_dict = {
            "id": user_id,
            "full_name": full_name,
            "email": current_user.email,
            "role": current_user.role,
            "company_name": org_name,
            "org_id": str(current_user.org_id) if current_user.org_id else None,
            "country": region,
            "color_code": color_code
        }
        return user_dict
    except Exception as exc:
        log_exception_one_line("get_me failed", exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve user profile.")


#we can update the user name and email 
@router.patch("/update_profile")
async def update_profile(user_update: UserUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_regular_user)):
    try:
        # Only process fields explicitly sent by the client — proper PATCH semantics.
        updates = user_update.model_dump(exclude_unset=True)
        if not updates:
            return {"message": "No fields provided to update"}
        if "email" in updates:
            new_email = updates["email"]
            if new_email:
                existing_user = await user_repo.get_user_by_email(db, new_email)
                if existing_user and existing_user.id != current_user.id:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already exists")
        updated_user = await user_repo.update_user_profile(db, current_user,full_name=updates.get("full_name"),
        email=updates.get("email"))
        # Track profile update
        await auth_repo.increment_user_stat(db, current_user.id, "profile_updates")
        await cache_service.invalidate_user_cache(str(current_user.id))
        logger.debug("User cache invalidated after profile update for %s", current_user.id)
        return {
            "message": "Profile updated successfully",
            "user": {
                "id": str(updated_user.id),
                "full_name": updated_user.full_name,
                "email": updated_user.email,
                "role": updated_user.role,
                "country": updated_user.region,
            }
        }
    except HTTPException:
        raise
    except Exception as exc:
        log_exception_one_line("update_profile failed", exc)
        await auth_repo.rollback_db(db)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update profile. Please try again.")


# Admin version of profile update
@router.patch("/update_user_profile")
async def update_user_profile_admin(payload: AdminUserUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_regular_user)):
    """
    Allow an Admin to update the name, email, and password of any user within their own organization.
    """
    try:
        # 1. Role Check: Only Admins can perform this
        require_admin(current_user, detail="Access denied: Only organization Admins can update user profiles.")
        # 2. Find the target user
        target_user = await user_repo.get_user_by_id(db, payload.user_id, current_user.org_id)
        if not target_user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="The user you are trying to update does not exist.")
        # 3. Organization Guard: Must be in the same company
        if target_user.org_id != current_user.org_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied: You can only update users within your own company.")
        updates = payload.model_dump(exclude_unset=True)
        updates.pop("user_id", None)
        # Extract password separately — handled via its own repo method
        new_password = updates.pop("password", None)
        if not updates and not new_password:
            return {"message": "No fields provided to update"}
        # Prevent admin from resetting their own password through this endpoint
        if new_password and target_user.id == current_user.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="Use /reset_password to change your own password")
        # full_name can be duplicated — no uniqueness check needed
        if "email" in updates:
            new_email = updates["email"]
            if new_email:
                existing_user = await user_repo.get_user_by_email(db, new_email)
                if existing_user and existing_user.id != target_user.id:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already exists")
        updated_user = await user_repo.update_user_profile(db, target_user, 
            full_name=updates.get("full_name"),email=updates.get("email"))
        # Handle password reset if provided
        if new_password:
            await user_service.update_user_password_and_revoke_sessions(db, target_user, new_password)
            logger.warning("SECURITY: Admin %s reset password for user %s",current_user.id,target_user.id)
        # Track admin activity
        await auth_repo.increment_user_stat(db, current_user.id, "admin_user_updates")
        await cache_service.invalidate_user_cache(str(target_user.id))
        logger.info("Admin %s updated user %s profile", current_user.id, target_user.id)
        return {
            "message": "User profile updated successfully by Admin",
            "user": {
                "id": str(updated_user.id),
                "full_name": updated_user.full_name,
                "email": updated_user.email,
                "role": updated_user.role,
                "country": updated_user.region,
            }
        }
    except HTTPException:
        raise
    except Exception as exc:
        log_exception_one_line("admin_update_user_profile failed", exc)
        await auth_repo.rollback_db(db)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update user profile. Please try again.")


#This is the endpoint to delete any user within the organization (Admin only)
@router.delete("/delete_user/{email}")
async def delete_user(email: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_regular_user)):
    """
    Allow an Admin to soft-delete any user within their own organization by email.
    Email is unique, so it's sufficient to identify the user.
    """
    try:
        # 1. Role Check: Only Admins can perform this
        require_admin(current_user, detail="Access denied: Only organization Admins can delete users.")
        # 2. Find the target user by email
        target_user = await user_repo.get_user_by_email(db, email, current_user.org_id)
        if not target_user:
            logger.warning("Admin %s attempted to delete non-existent user with email %s", current_user.id, email)
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="The user you are trying to delete does not exist.")
        # Log target user details for debugging
        logger.info("Delete request: Admin %s (org: %s) targeting user %s (email: %s, role: %s, org: %s, deleted_at: %s)", 
                    current_user.id, current_user.org_id, target_user.id, email, target_user.role, target_user.org_id, target_user.deleted_at)
        # 3. Organization Guard: Must be in the same company
        if target_user.org_id != current_user.org_id:
            logger.error("Admin %s attempted to delete user %s from a different organization (%s != %s)", 
                         current_user.id, target_user.id, target_user.org_id, current_user.org_id)
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied: You can only delete users within your own company.")
        target_id_str = str(target_user.id)
        # 4. Cleanup and Invalidation for the target user
        await cache_service.invalidate_user_cache(target_id_str)
        await cache_service.invalidate_permissions(target_id_str)
        # Clear any search or query caches related to this user
        cleared_queries = await cache_service.clear_cache_by_pattern(f"query:*{target_id_str}*")
        # Invalidate all active sessions in Redis for the target user
        await redis_service.invalidate_token(target_id_str)
        # 5. Perform the Soft Delete
        await user_repo.soft_delete_user(db, target_user)
        logger.info("Admin %s deleted user %s (Org: %s) — cleared %d query caches", 
                    current_user.id, target_id_str, current_user.org_id, cleared_queries)
        return {
            "message": "User deleted successfully from organization",
            "target_user_id": target_id_str,
            "target_user_name": target_user.full_name,
            "target_user_email": email,
        }
    except HTTPException:
        raise
    except Exception as exc:
        log_exception_one_line("admin_delete_user failed", exc)
        await auth_repo.rollback_db(db)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred while trying to delete the user. Please try again.")


#This is the endpoint for logout which is fully managed in frontend
@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    bearer: HTTPAuthorizationCredentials | None = Depends(oauth2_scheme_optional),
    db: AsyncSession = Depends(get_db),
):
    """Always clear auth cookies; invalidate server session when a valid token is present."""
    clear_auth_cookies(response)
    token_credentials = None
    if bearer and bearer.credentials:
        token_credentials = bearer.credentials
    elif request.cookies.get("access_token"):
        token_credentials = request.cookies.get("access_token")
    if not token_credentials:
        return {"message": "Logout successful", "cache_cleared": False, "query_caches_cleared": 0}
    try:
        payload = decode_token_payload(token_credentials)
    except HTTPException:
        return {"message": "Logout successful", "cache_cleared": False, "query_caches_cleared": 0}
    try:
        user_id = payload.get("sub")
        sid_str = payload.get("sid")
        if not user_id:
            return {"message": "Logout successful", "cache_cleared": False, "query_caches_cleared": 0}
        if sid_str:
            await redis_service.invalidate_session(sid_str)
            logger.info("Session %s invalidated on logout", sid_str)
        try:
            if sid_str:
                sid_uuid = UUID(sid_str)
                active_session = await auth_repo.get_session_by_id(db, sid_uuid)
                if active_session and active_session.logout_at is None:
                    await auth_repo.update_session_logout(db, active_session)
            old_sid_raw = await redis_service.get_session_id(user_id)
            if old_sid_raw and old_sid_raw != sid_str:
                await redis_service.delete_session_id(user_id)
        except Exception as e:
            logger.warning("Could not close session record on logout: %s", e)
        await redis_service.invalidate_token(user_id)
        await cache_service.invalidate_user_cache(user_id)
        await cache_service.invalidate_permissions(user_id)
        cleared_queries = await cache_service.clear_cache_by_pattern(f"query:*{user_id}*")
        logger.info("User %s logged out — cleared %d query caches", user_id, cleared_queries)
        return {
            "message": "Logout successful",
            "cache_cleared": True,
            "query_caches_cleared": cleared_queries,
        }
    except HTTPException:
        raise
    except Exception as exc:
        log_exception_one_line("logout failed", exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Logout failed.")


#This endpoint generates a new access token before the current one expires
@router.post("/refresh_token", response_model=Token)
async def refresh_token(response: Response, current_user: User = Depends(get_current_regular_user)):
    """
    Generate a new access token for the currently authenticated user.
    This endpoint can be called before the current token expires to ensure smooth application usage.
    """
    try:
        sid = getattr(current_user, "_current_sid", None)
        user_id = str(current_user.id)
        if sid:
            await redis_service.invalidate_session(sid)
        new_token = create_access_token({"sub": user_id, "sid": sid})
        token_data = {"access_token": new_token, "token_type": "bearer", "sid": sid}
        await redis_service.store_token(user_id,token_data,settings.access_token_expire_minutes)
        if sid:
            await redis_service.set_session_id(user_id,sid,settings.access_token_expire_minutes * 60)
        logger.info("Token rotated for user %s (sid: %s)", current_user.id, sid)
        set_auth_cookies(response, new_token)
        return token_data
    except Exception as exc:
        log_exception_one_line("refresh_token failed", exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to refresh token. Please try again.")


#This endpoint returns token information including expiration time
@router.get("/token_info")
async def get_token_info(current_user: User = Depends(get_current_regular_user)):
    """
    Get information about the current token including expiration time.
    Helps frontend determine when to refresh the token.
    """
    try:
        expiration_minutes = settings.access_token_expire_minutes
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=expiration_minutes)
        return {
            "user_id": str(current_user.id),
            "token_type": "bearer",
            "expires_in_minutes": expiration_minutes,
            "expires_at": expires_at.isoformat(),
            "issued_at": datetime.now(timezone.utc).isoformat()
        }
    except Exception as exc:
        log_exception_one_line("get_token_info failed", exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to get token info.")


# Initiate password reset - send OTP to email
@router.post("/forgot_password/initiate")
@limiter.limit("3/minute")
async def initiate_forgot_password(request: Request, payload: ForgotPasswordInitiateRequest, db: AsyncSession = Depends(get_db)):
    """
    Initiate password reset or MFA verification by sending OTP to email.
    - Validates the email exists in the system
    - Sends 6-digit OTP to email
    - OTP expires in 5 minutes
    """
    normalized_email = payload.email.lower().strip()
    purpose = payload.purpose or "forgot_password"
    try:
        user = await user_repo.get_user_by_email(db, normalized_email)
        if not user:
            # Security: Don't reveal if email exists or not
            return {"message": "If the email exists in our system, you will receive a password reset code."} 
        # Generate and send OTP (using password reset method that doesn't check user table)
        success, message = await otp_service.send_password_reset_otp(db, normalized_email, user.full_name or normalized_email.split('@')[0], purpose=purpose)
        if success:
            logger.info("OTP sent for email: %s (purpose=%s)", normalized_email, purpose)
            if purpose == "mfa":
                return {"message": "MFA verification code sent to your email. It expires in 5 minutes."}
            return {"message": "Password reset code sent to your email. It expires in 5 minutes."}
        else:
            logger.warning("Failed to send OTP for email %s (purpose=%s): %s", normalized_email, purpose, message)
            return {"message": message} 
    except Exception as exc:
        log_exception_one_line("initiate_forgot_password failed", exc)
        return {"message": "If the email exists in our system, you will receive a password reset code."}


# Forgot password endpoint - legacy combined flow
@router.post("/forgot_password")
@limiter.limit("3/minute")
async def forgot_password(request: Request, forgot_req: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    """
    Legacy endpoint for password reset. This endpoint performs both OTP verification and password update in a single request.
    Prefer the new split flow:
      1) POST /auth/forgot_password/initiate
      2) POST /auth/forgot_password/verify
      3) POST /auth/forgot_password/reset
    """
    try:
        normalized_email = forgot_req.email.lower().strip()
        user = await user_repo.get_user_by_email(db, normalized_email)
        if not user:
            # Security: Don't reveal if email exists or not
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired verification code")
        # Verify OTP
        otp_valid, otp_message = await otp_service.verify_otp(db, normalized_email, forgot_req.otp, purpose=forgot_req.purpose)
        if not otp_valid:
            logger.warning("Invalid OTP for password reset: %s", otp_message)
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=otp_message)
        
        # Reset password
        await user_service.update_user_password_and_revoke_sessions(db, user, forgot_req.new_password)
        
        # Invalidate the used OTP
        await otp_service.invalidate_previous_otps(db, normalized_email)
        
        logger.info("Password reset via forgot-password for user %s", user.id)
        return {"message": "Your password has been updated. Please login with your new password."}

    except PasswordValidationError as e:
        logger.warning("Password validation failed during forgot password: %s", e)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except HTTPException:
        raise
    except Exception as exc:
        log_exception_one_line("forgot_password failed", exc)
        await auth_repo.rollback_db(db)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to reset password. Please try again.")


@router.post("/forgot_password/verify", response_model=VerificationResponse)
@limiter.limit("5/minute")
async def verify_forgot_password_otp(request: Request, verification_req: OTPVerification, db: AsyncSession = Depends(get_db)):
    """
    Verify the password reset OTP code.
    - Validates the OTP code for the provided email
    - Returns a verification status that can be used before resetting the password
    """
    try:
        otp_valid, otp_message = await otp_service.verify_otp(db, verification_req.email, verification_req.otp_code, purpose=verification_req.purpose)
        if not otp_valid:
            logger.warning("Invalid OTP verification for password reset: %s", otp_message)
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=otp_message)
        return VerificationResponse(message="OTP verified successfully.", verified=True)
    except HTTPException:
        raise
    except Exception as exc:
        log_exception_one_line("verify_forgot_password_otp failed", exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to verify OTP. Please try again.")


@router.post("/forgot_password/reset")
@limiter.limit("3/minute")
async def reset_forgot_password(request: Request, reset_req: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    """
    Complete the password reset after OTP verification.
    - Requires a previously verified OTP for the provided email
    - Updates the user's password and invalidates existing sessions
    """
    try:
        normalized_email = reset_req.email.lower().strip()
        user = await user_repo.get_user_by_email(db, normalized_email)
        if not user:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired verification code")

        verified_otp = await otp_service.get_verified_email_verification(db, normalized_email, purpose=reset_req.purpose)
        if not verified_otp:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please verify your reset code before changing your password.")

        await user_service.update_user_password_and_revoke_sessions(db, user, reset_req.new_password)
        await otp_service.invalidate_previous_otps(db, normalized_email)

        logger.info("Password reset completed for user %s", user.id)
        return {"message": "Your password has been updated. Please login with your new password."}

    except PasswordValidationError as e:
        logger.warning("Password validation failed during password reset: %s", e)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except HTTPException:
        raise
    except Exception as exc:
        log_exception_one_line("reset_forgot_password failed", exc)
        await auth_repo.rollback_db(db)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to reset password. Please try again.")


# Reset password endpoint - authenticated users only (change their own password)
@router.post("/reset_password")
@limiter.limit("3/minute")
async def reset_password(request: Request,reset_req: AuthenticatedResetPasswordRequest,current_user: User = Depends(get_current_regular_user),
    db: AsyncSession = Depends(get_db)):
    """
    Change password for the currently authenticated user.
    Requires a valid Bearer token — the user's identity is taken from the token,
    not from the request body, so a user can only ever reset their own password.
    """
    try:
        await user_service.update_user_password_and_revoke_sessions(db, current_user, reset_req.new_password)

        logger.info("Password changed by authenticated user %s", current_user.id)
        return {"message": "Password changed successfully. Please log in again with your new password."}

    except PasswordValidationError as e:
        logger.warning("Password validation failed during password reset: %s", e)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except HTTPException:
        raise
    except Exception as exc:
        log_exception_one_line("reset_password failed", exc)
        await auth_repo.rollback_db(db)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to change password. Please try again.")
