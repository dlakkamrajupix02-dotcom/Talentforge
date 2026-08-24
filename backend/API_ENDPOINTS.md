# Talent Forge API — Endpoint Reference

Complete reference for every HTTP endpoint registered in the FastAPI application (`app/main.py`).

- **Base URL**: depends on environment (e.g. `https://<host>`)
- **Interactive docs**: `/docs` (Swagger UI), `/redoc`, `/openapi.json` (disabled when `enable_api_docs=false`)
- **Version**: `1.0.0`

## Authentication & Authorization

| Dependency | Accepts | Description |
|---|---|---|
| `get_current_user` | Staff `User` **or** `CandidateUser` JWT | `Authorization: Bearer <token>` header, or `access_token` cookie. Rejects expired/invalid tokens (401) and inactive accounts (401). |
| `get_current_regular_user` | **Staff only** JWT (Admin/HR/Manager/User) | Requires a valid session `sid` claim in the token; candidate tokens are rejected with 401. |
| `get_current_candidate` | **Candidate only** JWT | Staff tokens rejected. |
| `get_current_super_admin` | Staff JWT with role `Super_Admin` | |
| `get_current_user_optional` | Either a valid token or anonymous | Used by `/auth/signup`. |

**Conventions**
- All request/response bodies are `application/json` unless noted (`multipart/form-data` for uploads, binary for downloads).
- Rate limiting is applied via `slowapi` on several endpoints (noted inline).
- IDs are UUID strings.
- Where no `status_code=` is set, FastAPI returns `200` (not `201`) even for `POST`.

---

## Global / App-level Endpoints

### `GET /`
- **Purpose**: Root health/banner message.
- **Auth**: None
- **Response**: `200` — `{"message": "Talent Forge backend running successfully..."}`

### `GET /health`
- **Purpose**: Comprehensive health check for load balancers / monitoring (DB, Redis, cache, DB circuit stats). Returns `503` if the database is unavailable (readiness probe).
- **Auth**: None
- **Response**:
  - `200`:
    ```json
    {
      "status": "healthy",
      "timestamp": "2026-08-11T10:00:00+00:00",
      "version": "1.0.0",
      "checks": {
        "database": true,
        "redis": true,
        "cache": true,
        "db_circuit": { "state": "closed", "failures": 0 }
      }
    }
    ```
  - `503` — `{"status": "unhealthy"|"error", "timestamp": "...", "version": "1.0.0", ...}`

### `GET /static/{filepath:path}`
- **Purpose**: Serves static files (uploads) with a bearer token or `access_token` cookie required.
- **Auth**: Valid token (header or cookie) — else `401`
- **Path params**: `filepath` (str) — path under the `static/` directory
- **Response**: `200` file stream; `404` if not found / path traversal detected; `401` if no token

### `GET /private/uploads/{filepath}` (StaticFiles mount)
- **Purpose**: Serves private uploads from `private/uploads` (no app-level token check in this mount).
- **Response**: file stream

### Docs endpoints
- `GET /docs`, `GET /redoc`, `GET /openapi.json` — available only when `enable_api_docs` is enabled.

---

## 1. Authentication — `/auth`

### `GET /auth/oauth/{provider}/login`
- **Purpose**: Redirect the user to the OAuth provider's authorization page (Google/LinkedIn). Rate limited to 5/min.
- **Auth**: None (public)
- **Path params**: `provider` (str) — provider name (e.g. `google`)
- **Response**:
  - `302` — redirect to provider authorize URL, sets `oauth_state` cookie (httponly, max-age 600s)
  - `400` — `{"detail": "<OAuth error>"}`

### `GET /auth/oauth/{provider}/callback`
- **Purpose**: OAuth callback: validates `state`, exchanges code for a token, fetches profile, logs in existing `User`/`CandidateUser` (creates session + JWT), or triggers MFA flow.
- **Auth**: None at HTTP layer
- **Path params**: `provider` (str)
- **Query params**: `code` (str, optional), `state` (str, optional), `error` (str, optional)
- **Response**:
  - `302` — redirect to `<frontend_url>/login/success` with `access_token` cookie (LoginResponse embedded in cookie)
  - `200` (MFA required) — `{"mfaRequired": true, "tempToken": "<jwt>", "message": "MFA verification required"}`
  - `400` — invalid/missing code/state/provider error
  - `401` — `{"detail": "No account found for this OAuth email address."}`
  - `403` — account deactivated / candidate inactive

### `POST /auth/signup`
- **Purpose**: Create the first `Super_Admin` user (and the company's organization) or, if an authenticated Super_Admin calls it, an additional user. Rate limited to 3/min.
- **Auth**: Optional (`get_current_user_optional`); first user must be Super_Admin if none exists
- **Request body** — `UserSignup`:
  ```json
  {
    "full_name": "John Doe",
    "email": "john@example.com",
    "password": "Password123!",
    "confirm_password": "Password123!",
    "company_name": "Acme Inc",
    "color_code": "#ece75c",
    "country": "India",
    "role": "Super_Admin"
  }
  ```
  Fields: `full_name` (str 3–50, req), `email` (EmailStr, req), `password` (str ≥8, req), `confirm_password` (str, req), `company_name` (str 2–100, req), `color_code` (str, opt), `country` (str 2–120, req), `role` (str, opt, default `"Admin"`)
- **Response**:
  - `200` — `{"message": "User created successfully. Please login to continue."}`
  - `400` — email exists / first user must be Super_Admin / password validation
  - `403` — `{"detail": "Signup requires Super Admin privileges. Please log in."}`

### `POST /auth/cornerstone-login`
- **Purpose**: SSO login via Cornerstone (client-credentials token exchange). Rate limited to 5/min.
- **Auth**: None (public)
- **Request body** — `CornerstoneLoginRequest`:
  ```json
  { "user_id": "john.doe@acme.com" }
  ```
  Fields: `user_id` (str, req — lowercased/trimmed, matched against login identifier or candidate email)
- **Response**: `200` — `LoginResponse` (see below); also sets `access_token` cookie
- **Errors**: `400` (integration not configured / verification failed), `401` (no account), `403` (deactivated), `500`

**`LoginResponse` shape** (returned by all login endpoints):
```json
{
  "access_token": "<jwt>",
  "token_type": "bearer",
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "role": "Admin",
  "full_name": "John Doe",
  "email": "john@example.com",
  "country": "India",
  "color_code": "#ece75c",
  "previous_session_logged_out": null,
  "user_type": "regular",
  "org_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "mfa": false
}
```
For candidates, `user_type` is `"candidate"`, `mfa` is `false`, and `country`/`color_code`/`previous_session_logged_out` are `null`.

### `POST /auth/login`
- **Purpose**: Login for staff `User` and `CandidateUser`. Validates password, org status, MFA policy; closes previous sessions; stores token in Redis; sets `access_token` cookie. Rate limited to 5/min.
- **Auth**: None (public)
- **Request body** — `UserLogin`:
  ```json
  { "username_or_email": "john@example.com", "password": "Password123!", "country": "India" }
  ```
  Fields: `username_or_email` (str, req), `password` (str, req), `country` (str ≤120, opt — updates stored region)
- **Response**:
  - `200` — `LoginResponse`
  - `200` (MFA required) — `{"mfaRequired": true, "tempToken": "<jwt>", "message": "MFA verification required"}`
  - `401` — `{"detail": "Invalid credentials"}`
  - `403` — account deactivated / org access removed

### `POST /auth/mfa/setup`
- **Purpose**: Generate an MFA TOTP secret + backup codes, persist encrypted secret, return enrollment info.
- **Auth**: `get_current_regular_user` (staff only)
- **Request body**: None
- **Response** (`MFASetupResponse`):
  ```json
  {
    "secret": "JBSWY3DPEHPK3PXP",
    "otpauth_url": "otpauth://totp/TalentForge:john@example.com?secret=...&issuer=TalentForge",
    "backup_codes": ["1234-5678", "abcd-efgh"]
  }
  ```

### `POST /auth/mfa/verify`
- **Purpose**: Verify the TOTP code and mark the user's MFA as verified/enabled.
- **Auth**: `get_current_regular_user`
- **Request body** — `MFAVerifyRequest`: `otp` (str 4–8, req) → `{"otp": "123456"}`
- **Response**: `200` — `{"message": "MFA verified successfully"}`; `400` (not set up); `401` (invalid code)

### `GET /auth/mfa`
- **Purpose**: Get the current user's MFA status.
- **Auth**: `get_current_regular_user`
- **Response**: `200` — `{"enabled": true, "verified": true, "required": false, "can_disable": true}`

### `POST /auth/mfa/disable`
- **Purpose**: Disable the current user's MFA (unless enforced by org policy).
- **Auth**: `get_current_regular_user`
- **Response**: `200` — `{"message": "MFA disabled successfully"}`; `403` — `{"detail": "MFA is enforced by organization policy"}`

### `POST /auth/mfa/verify-login`
- **Purpose**: Complete the login MFA step using the temp token + TOTP; creates real session + access token.
- **Auth**: None directly — auth via `temp_token` in body
- **Request body** — `LoginMFAVerifyRequest`:
  ```json
  { "temp_token": "<jwt with type=mfa>", "otp": "123456" }
  ```
  Fields: `temp_token` (str ≥10, req), `otp` (str 4–8, req)
- **Response**: `200` — `LoginResponse` (no cookie set); `400`/`401` on invalid token/OTP

### `GET /auth/me`
- **Purpose**: Return the currently authenticated user's profile (staff or candidate) including organization name.
- **Auth**: `get_current_user`
- **Response**: `200`:
  ```json
  {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "full_name": "John Doe",
    "email": "john@example.com",
    "role": "Admin",
    "company_name": "Acme Inc",
    "org_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "country": "India",
    "color_code": "#ece75c"
  }
  ```

### `PATCH /auth/update_profile`
- **Purpose**: Update the current user's own `full_name` and/or `email` (only sent fields applied).
- **Auth**: `get_current_regular_user`
- **Request body** — `UserUpdate`: `full_name` (str 3–50, opt), `email` (EmailStr, opt)
  ```json
  { "full_name": "John A. Doe", "email": "john.new@example.com" }
  ```
- **Response**:
  - `200` — `{"message": "Profile updated successfully", "user": {...}}`
  - `200` — `{"message": "No fields provided to update"}`
  - `400` — `{"detail": "Email already exists"}`

### `PATCH /auth/update_user_profile`
- **Purpose**: Admin-only — update another user's `full_name`, `email`, and optionally `password` within the same organization.
- **Auth**: `get_current_regular_user` + role must be `Admin` (403 otherwise) + same-org guard
- **Request body** — `AdminUserUpdate`:
  ```json
  {
    "user_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "full_name": "Jane Smith",
    "email": "jane@example.com",
    "password": "NewPassword123!"
  }
  ```
  Fields: `user_id` (UUID, req), `full_name` (str, opt), `email` (EmailStr, opt), `password` (str ≥8, opt)
- **Response**: `200` — `{"message": "User profile updated successfully by Admin", "user": {...}}`; `400` (email exists / can't reset own password here); `403` (not admin / cross-org); `404` (user missing)

### `DELETE /auth/delete_user/{email}`
- **Purpose**: Admin-only — soft-delete a user within the same organization by email.
- **Auth**: `get_current_regular_user` + role `Admin` + same-org guard
- **Path params**: `email` (str)
- **Response**:
  - `200` — `{"message": "User deleted successfully from organization", "target_user_id": "...", "target_user_name": "...", "target_user_email": "..."}`
  - `403`, `404`, `500`

### `POST /auth/logout`
- **Purpose**: Invalidate the current session (Redis + DB), invalidate token, clear caches.
- **Auth**: `get_current_user`
- **Response**: `200` — `{"message": "Logout successful", "cache_cleared": true, "query_caches_cleared": 3}`

### `POST /auth/refresh_token`
- **Purpose**: Rotate the access token for the current user.
- **Auth**: `get_current_regular_user`
- **Response**: `200` — `{"access_token": "<new jwt>", "token_type": "bearer", "sid": "<session id>"}`

### `GET /auth/token_info`
- **Purpose**: Return token metadata (expiry) so the frontend can decide when to refresh.
- **Auth**: `get_current_regular_user`
- **Response**: `200`:
  ```json
  {
    "user_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "token_type": "bearer",
    "expires_in_minutes": 60,
    "expires_at": "2026-08-11T10:30:00+00:00",
    "issued_at": "2026-08-11T09:30:00.123456+00:00"
  }
  ```

### `POST /auth/forgot_password/initiate`
- **Purpose**: Send a 6-digit OTP to the email for password reset or MFA; 5-minute expiry. Never reveals whether the email exists. Rate limited to 3/min.
- **Auth**: None (public)
- **Request body** — `ForgotPasswordInitiateRequest`:
  ```json
  { "email": "user@example.com", "purpose": "forgot_password" }
  ```
  Fields: `email` (EmailStr, req), `purpose` (Literal `forgot_password`|`mfa`, opt, default `forgot_password`)
- **Response**: `200` always (security) — e.g. `{"message": "If the email exists in our system, you will receive a password reset code."}`

### `POST /auth/forgot_password`
- **Purpose**: **Legacy** combined reset flow (OTP + new password in one request). Prefer `initiate → verify → reset`. Rate limited to 3/min.
- **Auth**: None
- **Request body** — `ForgotPasswordRequest`:
  ```json
  {
    "email": "user@example.com",
    "otp": "123456",
    "new_password": "NewPassword123!",
    "confirm_password": "NewPassword123!",
    "purpose": "forgot_password"
  }
  ```
- **Response**: `200` — `{"message": "Your password has been updated. Please login with your new password."}`; `400` (invalid/expired OTP, password validation)

### `POST /auth/forgot_password/verify`
- **Purpose**: Verify the reset/MFA OTP before resetting the password. Rate limited to 5/min.
- **Auth**: None
- **Request body** — `OTPVerification`:
  ```json
  { "email": "user@example.com", "otp_code": "123456", "purpose": "forgot_password" }
  ```
  Fields: `email` (EmailStr, req), `otp_code` (str exactly 6, req), `purpose` (opt)
- **Response**: `200` — `{"message": "OTP verified successfully.", "verified": true}`; `400` on invalid OTP

### `POST /auth/forgot_password/reset`
- **Purpose**: Complete password reset after a verified OTP; invalidates old tokens and the used OTP. Rate limited to 3/min.
- **Auth**: None (requires prior `/verify` success)
- **Request body** — `ResetPasswordRequest`:
  ```json
  {
    "email": "user@example.com",
    "new_password": "NewPassword123!",
    "confirm_password": "NewPassword123!",
    "purpose": "forgot_password"
  }
  ```
- **Response**: `200` — `{"message": "Your password has been updated. Please login with your new password."}`; `400` (OTP not verified / password validation)

### `POST /auth/reset_password`
- **Purpose**: Authenticated password change for the current user. Rate limited to 3/min.
- **Auth**: `get_current_regular_user` (identity from token, never body)
- **Request body** — `AuthenticatedResetPasswordRequest`:
  ```json
  { "new_password": "NewPassword123!", "confirm_password": "NewPassword123!" }
  ```
- **Response**: `200` — `{"message": "Password changed successfully. Please log in again with your new password."}`; `400` on password validation

---

## 2. Email Verification & Feedback — `/auth`

### `POST /auth/request_otp`
- **Purpose**: Start the signup flow — check email is not registered, generate + email a 6-digit OTP (5-min expiry). Rate limited to 3/5min.
- **Auth**: None (public)
- **Request body** — `OTPRequest`:
  ```json
  {
    "email": "user@example.com",
    "username": "user123",
    "password": "Passw0rd!",
    "role": "Admin",
    "company_name": "Acme Inc",
    "color_code": "#ece75c",
    "country": "India"
  }
  ```
  Fields: `email` (EmailStr, req), `username` (str, opt), `password` (str ≥6, req), `role` (Admin|Manager|HR, req), `company_name` (str 2–100, opt), `color_code` (str, opt), `country` (str 2–120, req)
- **Response**: `200` — `{"message": "...", "expires_in_minutes": 5}`; `409` (already registered)

### `POST /auth/verify_otp`
- **Purpose**: Verify a signup OTP (checks expiry/attempts), marks email verified. Rate limited to 10/5min.
- **Auth**: None
- **Request body** — `OTPVerification`: `email` (EmailStr, req), `otp_code` (str exactly 6, req)
- **Response**: `200` — `{"message": "...", "verified": true}`; `400` on invalid OTP

### `POST /auth/complete_signup`
- **Purpose**: Complete signup after OTP verification — create the account (hashed password), clean up verification records. Rate limited to 3/5min.
- **Auth**: None (requires prior OTP verification)
- **Request body** — `OTPRequest` (same fields as `/request_otp`)
- **Response** (`UserCreationResponse`):
  ```json
  { "message": "...", "user_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6", "email": "user@example.com", "username": "user123" }
  ```
  `400` (email not verified), `409` (already registered)

### `POST /auth/resend_otp`
- **Purpose**: Resend the signup OTP with a 60s cooldown. Rate limited to 3/5min.
- **Auth**: None
- **Request body** — `OTPResend`: `email` (EmailStr, req), `username` (str, opt)
- **Response**: `200` — `{"message": "...", "expires_in_minutes": 5}`; `429` (cooldown active)

### `POST /auth/feedback`
- **Purpose**: Send app feedback to the configured help/support email. Rate limited to 3/5min.
- **Auth**: `get_current_user`
- **Request body** — `FeedbackRequest`:
  ```json
  { "subject": "Feedback about weekly reports", "message": "I would love to see a more detailed export option." }
  ```
  Fields: `subject` (str 5–120, req), `message` (str 10–2000, req)
- **Response**: `200` — service-defined return; `500` on failure

---

## 3. Job Descriptions — `/job_descriptions`

Shared response model `JobDescriptionResponse` (used by many JD endpoints):
`id` (UUID), `org_id`, `creator_id`, `creator_name`, `template_id`, `title`, `company_name`, `job_id`, `job_family`, `job_level`, `department`, `location`, `city`, `country_code` (str), `seniority`, `industry`, `salary_range`/`salary_symbol`/`salary_min_value`/`salary_max_value`/`salary_period`, `employment_type`, `key_skills`, `core_competencies`, `functional_competencies`, `additional_context`, `image_url`, `content` (dict), `custom_fields` (dict), `eeoc_flags` (list), `eeoc_cleared` (bool), `status` (str), `public_jd_id`, `word_count`, `generation_mode`, `finalized_at`, `parent_jd_id`, `is_main` (bool), `version_history` (list), `created_at`, `updated_at` — all nullable UUID/str/datetime fields default to `null` unless otherwise set.

### `POST /job_descriptions/check_job_id`
- **Purpose**: Check for existing job IDs to prevent duplicate creation.
- **Auth**: `get_current_regular_user`
- **Request body** — `JobIdCheckRequest`: `job_id` (str 1–50, req) → `{"job_id": "CRI_ICU_123"}`
- **Response**: `200` — `{"job_id": "...", "exists": true, "count": 1, "jd_ids": ["uuid"], "records": [{"jd_id": "uuid", "title": "...", "status": "...", "created_at": "..."}]}`

### `GET /job_descriptions/word_limits`
- **Purpose**: Return the signed-in user's word-count limits per JD section.
- **Auth**: `get_current_regular_user`
- **Response**: `200` — `{"summary": {"min": 50, "max": 150}, "key_duties": {...}, "core_competencies": {...}, "functional_competencies": {...}, "qualifications_required": {...}, "qualifications_preferred": {...}, "eeo_statement": {...}}`

### `PATCH /job_descriptions/word_limits`
- **Purpose**: Update the current user's word-count limits (partial).
- **Auth**: `get_current_regular_user`
- **Request body** — `UserWordLimitsPatch`: any of the 7 sections with `{min: int ≥0, max: int ≥0, min ≤ max}`
  ```json
  { "summary": {"min": 60, "max": 180}, "key_duties": {"min": 100, "max": 250} }
  ```
- **Response**: `200` — updated `UserWordLimitsResponse` (same shape as GET)

### `POST /job_descriptions/skeleton`
- **Purpose**: Create an empty skeleton JD (status `draft`, `generation_mode="manual"`).
- **Auth**: `get_current_regular_user`
- **Request body** — `JobDescriptionSkeletonCreate`: `title` (str, opt, default `"OFfline creation"`), `industry` (str, opt, default `"Offline"`)
- **Response**: `200` — `JobDescriptionResponse`

### `POST /job_descriptions/create_from_template`
- **Purpose**: Create a JD from a predefined template with AI-generated narrative sections (status `draft`).
- **Auth**: `get_current_regular_user`
- **Request body** — `JDCreateFromTemplate`:
  ```json
  {
    "title": "Senior Software Engineer",
    "industry": "Technology",
    "department": "Engineering",
    "employment_type": "Full-Time",
    "summary": "We are looking for a talented software engineer...",
    "responsibilities": ["Develop web applications", "Write clean code"],
    "qualifications": {"required": ["BS in CS"], "preferred": ["AWS certification"]},
    "eeo_statement": "We are an equal opportunity employer..."
  }
  ```
  Required: `title`, `industry`, `employment_type`, `summary`, `responsibilities` (list), `qualifications` (dict with `required`/`preferred`), `eeo_statement`. Optional: `department`, `location`, `city`, `seniority`, `salary_range`, `key_skills`, `additional_context`, `compliance_tag`.
- **Response**: `200` — `JobDescriptionResponse`

### `POST /job_descriptions/generate`
- **Purpose**: Generate a comprehensive JD via AI (model fallback logic), saves as draft. Rate limited to 30/min.
- **Auth**: `get_current_regular_user`
- **Request body** — `JDGenerateRequest` (all strings optional unless noted):
  ```json
  {
    "title": "Senior React Developer",
    "company_name": "Acme Tech",
    "job_level": "L4",
    "industry": "Technology",
    "country_code": "US",
    "salary_range": "$120K/yr - $180K/yr",
    "key_skills_and_requirements": "React.js, TypeScript",
    "core_competencies": [{"point": "Strong problem-solving", "weight": 30}]
  }
  ```
  Notable fields: `title` (req, ≤100), `industry` (req, ≤50), `company_name`, `job_id`, `job_family`, `job_level` (L1–L5), `department`, `location`, `city`, `country_code` (default `"US"`), `seniority`, `employment_type` (default `"Full-Time"`), `salary_range`/`salary_symbol`/`salary_min_value`/`salary_max_value`/`salary_period`, `key_skills_and_requirements` (≤1000), `core_competencies`/`functional_competencies` (list of `{point, weight 0–100}`), `additional_context` (≤1000), `model_name`, `custom_fields` (dict)
- **Response**: `200` — free-form dict:
  ```json
  {
    "message": "JD generated successfully",
    "jd_id": "uuid",
    "input_data": {...},
    "job_description": {
      "summary": "...",
      "essential_duties_and_responsibilities": "...",
      "key_duties": [{"point": "...", "weight": 30}],
      "core_competencies": "...",
      "functional_competencies": "...",
      "qualifications_required": [...],
      "qualifications_preferred": [...],
      "eeo_statement": "..."
    },
    "custom_fields": {},
    "eeoc_flags": [],
    "word_count": 250
  }
  ```
  `400` (no org / invalid model), `500` (AI service error)

### `POST /job_descriptions/create_from_template_with_image` *(hidden from schema)*
- **Purpose**: Create a JD from template with an optional image upload.
- **Auth**: `get_current_regular_user`
- **Request body**: `multipart/form-data` — `data` (str, req — JSON serialized `JDCreateFromTemplate`), `image` (UploadFile, opt)
- **Response**: `200` — `JobDescriptionResponse` (with `image_url`)

### `POST /job_descriptions/generate_with_image` *(hidden from schema)*
- **Purpose**: Generate a JD with an optional image upload.
- **Auth**: `get_current_regular_user`
- **Request body**: `multipart/form-data` — `data` (str, req — JSON serialized `JDGenerateRequest`), `image` (UploadFile, opt)
- **Response**: `200` — same free-form dict as `/generate` plus `image_url`

### `GET /job_descriptions/org/list_jd-ids`
- **Purpose**: Admin-only — return `jd_id` + `status` for all JDs in the org.
- **Auth**: `get_current_regular_user` + role `Admin`
- **Query params**: `status` (str, opt), `employment_type` (str, opt), `skip` (int, opt, default 0), `limit` (int, opt, default 100, ≤1000)
- **Response**: `200` — `[{"jd_id": "uuid", "status": "draft"}]`; `403` (non-admin)

### `GET /job_descriptions/org/public_jds`
- **Purpose**: Return the org's JDs published to public view.
- **Auth**: `get_current_user` (staff or candidate)
- **Query params**: `employment_type` (str, opt), `skip` (int, opt, 0), `limit` (int, opt, 1000, ≤1000)
- **Response**: `200` — `List[OrgJdSummaryResponse]` (`id`, `org_id`, `creator_id`, `creator_name`, `title`, `company_name`, `department`, `location`, `country_code`, `seniority`, `employment_type`, `created_at`, `updated_at`, `status`, `industry`, `original_jd_id`, `public_jd_id`, `parent_jd_id`)

### `GET /job_descriptions/models/available`
- **Purpose**: List available AI models for the frontend dropdown.
- **Auth**: None
- **Response**: `200` — `{"models": ["phenomecloud-small", "mistral-medium-latest"], "default": "phenomecloud-small", "count": 2}`

### `GET /job_descriptions/`
- **Purpose**: List JDs for the current user (non-admin) or whole org (admin).
- **Auth**: `get_current_regular_user`
- **Query params**: `status`, `employment_type`, `search` (text), `sort` (default `newest_first`), `skip` (0), `limit` (1000, ≤1000)
- **Response**: `200` — `List[JobDescriptionResponse]`

### `GET /job_descriptions/{jd_id}`
- **Purpose**: Get a single JD. `mode=edit` reverts a `final` JD back to draft (blocked under workflow review).
- **Auth**: `get_current_user`; access: creator, or same org + (`public_view` or role Admin/Manager/HR)
- **Path params**: `jd_id` (UUID, req)
- **Query params**: `mode` (str, opt — `"edit"`)
- **Response**: `200` — `JobDescriptionResponse`; `404` (not found / no permission); `409` (under workflow review)

### `DELETE /job_descriptions/{jd_id}`
- **Purpose**: Soft-delete a JD.
- **Auth**: `get_current_regular_user` + `_can_access_jd` (creator or same-org Admin/Manager/HR)
- **Path params**: `jd_id` (UUID, req)
- **Response**: `200` — `{"message": "JD deleted successfully"}`; `404` (not found/no access)

### `PATCH /job_descriptions/{jd_id}/autosave`
- **Purpose**: Periodically save a JD draft (content, metadata, custom fields). All fields optional; camelCase aliases supported.
- **Auth**: `get_current_regular_user` + `_can_access_jd`
- **Path params**: `jd_id` (UUID, req)
- **Request body** — `JDAutosaveRequest`:
  ```json
  {
    "title": "ICU Nurse",
    "summary": "Updated summary",
    "key_duties": [{"point": "Monitor patients", "weight": 60}],
    "qualifications": {"required": ["RN license"]}
  }
  ```
- **Response**: `200` — `{"status": "success", "word_count": 250}`

### `DELETE /job_descriptions/{jd_id}/section/{section_name}`
- **Purpose**: Delete a specific section from a JD's content and ordering.
- **Auth**: `get_current_regular_user` + `_can_access_jd`
- **Path params**: `jd_id` (UUID, req), `section_name` (str, req)
- **Response**: `200` — `{"status": "success", "message": "Section '<name>' deleted successfully."}`

### `PATCH /job_descriptions/{jd_id}/update_section`
- **Purpose**: Update/add a JD section; also handles view locks, section order, custom fields, top-level columns.
- **Auth**: `get_current_regular_user` + `_can_access_jd`
- **Path params**: `jd_id` (UUID, req)
- **Query params**: `section` (str, opt)
- **Request body** — `JDUpdateSectionRequest`:
  ```json
  { "section": "summary", "value": "Updated summary text" }
  ```
  `value` may be a string, list, weighted-points list, `"locked"`/`"unlocked"` (view locks), or `{section: value}` dict.
- **Response**: `200` — success dict varies by branch (`status`, `message`, `section`, `value`, `custom_fields`, `content`, `word_count`); `404`, `422` (missing section / invalid lock value), `500`

### `PATCH /job_descriptions/{jd_id}/finalize`
- **Purpose**: Mark a JD as final for publication.
- **Auth**: `get_current_regular_user` + `_can_access_jd`
- **Path params**: `jd_id` (UUID, req)
- **Response**: `200` — `{"status": "success", "message": "JD finalized", "finalized_at": "<datetime>"}`; `409` (under workflow review)

### `PATCH /job_descriptions/{jd_id}/archive`
- **Purpose**: Mark a JD as archived.
- **Auth**: `get_current_regular_user` + `_can_access_jd`
- **Path params**: `jd_id` (UUID, req)
- **Response**: `200` — `{"status": "success", "message": "JD archived"}`

### `PATCH /job_descriptions/bulk/status`
- **Purpose**: Bulk-update status of multiple JDs (with role/access/workflow validation); clones JDs when publishing to `public_view`.
- **Auth**: `get_current_regular_user`; approve → Admin/Manager; public_view → Admin
- **Request body** — `JDBulkStatusUpdateRequest`:
  ```json
  { "from_status": "draft", "to_status": "approved", "jd_ids": ["uuid1", "uuid2"] }
  ```
  `status` values: `draft`, `approved`, `final`, `public_view`, `pushed_to_csod`, `push_to_csod`, `in_review`, `declined`, `archive`, `archive_job`, `clone`
- **Response**:
  - `200` — `{"status": "success", "message": "Successfully updated N JDs to 'X'", "updated_jd_ids": [...], "public_jd_mappings": [{"original_jd_id": "...", "public_jd_id": "..."}]}`
  - `400`, `403`, `404`, `409` (under review)

### `PATCH /job_descriptions/{jd_id}/status`
- **Purpose**: Update the status of a single JD; clones for `public_view`.
- **Auth**: `get_current_regular_user` + `_can_access_jd` + role checks
- **Path params**: `jd_id` (UUID, req)
- **Request body** — `JDStatusUpdateRequest`: `status` (str, req — same allowed set)
  ```json
  { "status": "approved" }
  ```
- **Response**: `200` (two shapes):
  - public_view clone: `{"status": "success", "message": "JD duplicated and published for public view", "original_jd_id": "...", "public_jd_id": "...", "new_status": "public_view"}`
  - otherwise: `{"status": "success", "message": "JD status updated to <status>", "jd_id": "...", "new_status": "..."}`
  - `403` (role), `404`, `409` (under review)

### `PATCH /job_descriptions/{jd_id}/push-to-csod`
- **Purpose**: Mark a JD ready to be pushed to CSOD (status `push_to_csod`).
- **Auth**: `get_current_regular_user` + `_can_access_jd`
- **Path params**: `jd_id` (UUID, req)
- **Response**: `200` — `{"status": "success", "message": "JD marked for pushing to CSOD", "jd_id": "..."}`

### `POST /job_descriptions/{jd_id}/export/pdf`
- **Purpose**: Generate a PDF export of the JD (with logo resolution + export logging).
- **Auth**: `get_current_regular_user` + `_can_export_jd` (creator, or same-org Admin/Manager; HR denied)
- **Path params**: `jd_id` (UUID, req)
- **Response**: `200` — PDF stream; `400` (no company), `403` (permission), `404`

### `POST /job_descriptions/{jd_id}/export/word`
- **Purpose**: Generate a Word document export of the JD.
- **Auth**: `get_current_regular_user` + `_can_export_jd`
- **Path params**: `jd_id` (UUID, req)
- **Response**: `200` — Word stream; `400`, `403`, `404`, `500`

### `POST /job_descriptions/{jd_id}/export/clipboard`
- **Purpose**: Format the JD as plain text and log the clipboard export.
- **Auth**: `get_current_regular_user` + `_can_export_jd`
- **Path params**: `jd_id` (UUID, req)
- **Response**: `200` — `{"text": "<plain text JD>", "message": "Logged clipboard export"}`

### `POST /job_descriptions/regenerate_section`
- **Purpose**: Regenerate a single JD section from existing frontend content (nothing saved).
- **Auth**: `get_current_regular_user`
- **Request body** — `StandaloneRegenerateRequest`:
  ```json
  {
    "section_name": "summary",
    "existing_data": "We are looking for a Senior Software Engineer...",
    "modification_request": "Make it more concise and emphasise leadership skills.",
    "title": "Senior Software Engineer",
    "industry": "Technology"
  }
  ```
  Valid `section_name` values: `summary`, `essential_duties_and_responsibilities`, `key_duties`, `core_competencies`, `functional_competencies`, `qualifications_required`, `qualifications_preferred`, `eeo_statement`. `existing_data` (Any, req), `modification_request` (str 3–500, req); optional: `title`, `department`, `industry`, `seniority`, `location`, `country_code`, `salary_range`.
- **Response**: `200` — `{"section": "summary", "new_content": "...", "word_count": 42}`

### `POST /job_descriptions/regenerate_point`
- **Purpose**: Regenerate a single point within a JD section.
- **Auth**: `get_current_regular_user`
- **Request body** — `StandaloneRegeneratePointRequest`:
  ```json
  {
    "section_name": "qualifications_preferred",
    "existing_data": {"point": "AWS certification", "weight": 20},
    "modification_request": "Make it more specific to healthcare."
  }
  ```
- **Response**: `200` — `{"section": "...", "new_point": {...}}`

### `POST /job_descriptions/dei-scan`
- **Purpose**: Scan JD text for DEI issues (biased/ageist/coded language); return an inclusivity score + rephrasing suggestions.
- **Auth**: `get_current_regular_user`
- **Request body** — `DEIScanRequest`: `text` (str, req) → `{"text": "..."}`
- **Response**: `200` — `{"score": 72, "findings": [{"original": "...", "issue_type": "...", "explanation": "...", "suggested_rephrasing": "..."}]}`; `400` (empty text)

### `POST /job_descriptions/compliance-scan`
- **Purpose**: Scan JD text against regional EEO/labor laws per country code.
- **Auth**: `get_current_regular_user`
- **Request body** — `ComplianceScanRequest`:
  ```json
  { "text": "...JD text...", "country_code": "US" }
  ```
  Fields: `text` (str, req), `country_code` (str 2–10, req)
- **Response**: `200` — `{"is_compliant": false, "findings": [{"original": "...", "rule_violated": "...", "severity": "...", "explanation": "...", "fix": "..."}]}`; `400` (empty text)

### `POST /job_descriptions/{jd_id}/translate`
- **Purpose**: Translate a JD's content JSON into a target language (preserves keys/structure).
- **Auth**: `get_current_regular_user` + `_can_view_jd`
- **Path params**: `jd_id` (UUID, req)
- **Request body** — `JDTranslateRequest`: `target_language` (str, req) → `{"target_language": "Spanish"}`
- **Response**: `200` — `{"jd_id": "uuid", "target_language": "Spanish", "translated_content": {...}}`; `404`, `403`

---

## 4. Templates — `/templates`

Router-level auth: `get_current_regular_user` on all endpoints.

### `GET /templates/`
- **Purpose**: List active system templates with pagination, search, sorting, and advanced filtering.
- **Query params**: `search`, `title`, `industry` (comma-separated), `department`, `job_family`, `seniority`, `job_level`, `employment_type`, `template_code` (exact), `region` (regex `^[A-Za-z]{2,10}$` per token), `country_code`, `sort_by` (`title`|`industry`|`created_at`, default `created_at`), `sort_order` (`asc`|`desc`, default `desc`), `page` (default 1, ≤20000), `limit` (default 50, ≤1000)
- **Response**: `200`:
  ```json
  {
    "templates": [
      {
        "id": "uuid", "template_code": "TECH001", "title": "Senior React Developer",
        "industry": "Technology", "compliance_tag": null, "is_active": true,
        "company": "Acme Tech", "department": "Engineering", "location": "Hyderabad, India",
        "employment_type": "Full-Time", "professional_summary": "...", "responsibilities_overview": "...",
        "licenses_and_certifications": [], "compliance_requirements": [], "tools_technologies": [],
        "eeo_statement": null, "country_code": "IN", "creator_id": null,
        "created_at": "...", "updated_at": "...", "content": {}
      }
    ],
    "total": 42, "page": 1, "limit": 50
  }
  ```
- `400` (invalid filters), `500`

### `GET /templates/industries`
- **Purpose**: List distinct industries that have templates.
- **Response**: `200` — list of industry strings

### `GET /templates/template_details`
- **Purpose**: Lightweight summary of all templates (title, id, job_id, template_code, department, country_code, seniority, job_level).
- **Query params**: `skip` (int, opt, 0), `limit` (int, opt, 1000)
- **Response**: `200` — array of summary objects

### `GET /templates/{template_id}`
- **Purpose**: Get a single template by ID.
- **Path params**: `template_id` (UUID)
- **Response**: `200` — serialized template (shape as in `GET /templates/`); `404` — `{"detail": "Template not found"}`

### `POST /templates/public/{template_id}/use`
- **Purpose**: Instantiate a JD directly from a public template (no AI), creating a draft JD in the user's org.
- **Path params**: `template_id` (UUID)
- **Response**: `201` — `JobDescriptionResponse`; `400` (no org), `404` (template missing)

### `POST /templates/regenerate_section`
- **Purpose**: Regenerate a template section using existing frontend content (no save); uses user's JD word limits.
- **Request body** — `TemplateStandaloneRegenerateRequest`:
  ```json
  {
    "section_name": "summary",
    "existing_data": "We are looking for a talented Software Engineer...",
    "modification_request": "Make it more concise and emphasise leadership skills."
  }
  ```
- **Response**: `200` — `{"section": "summary", "new_content": "...", "word_count": 85}`

### `POST /templates/public/create`
- **Purpose**: Create a system-level (global) template with `creator_id=None`.
- **Request body** — `PublicTemplateCreate` (key fields):
  ```json
  {
    "template_code": "TECH001",
    "job_title": "Senior React Developer",
    "industry": "Technology",
    "company": "Acme Tech",
    "job_id": "ENG_SEN",
    "job_family": "Software Development",
    "job_level": "L4",
    "department": "Engineering",
    "location": "Hyderabad, India",
    "country_code": "IN",
    "seniority": "Senior",
    "employment_type": "Full-Time",
    "professional_summary": "...",
    "responsibilities_overview": "...",
    "key_duties": [{"point": "...", "weight": 30}],
    "core_competencies": [],
    "functional_competencies": [],
    "qualifications_required": [],
    "qualifications_preferred": [],
    "required_licenses_certifications": [],
    "compliance_requirements": [],
    "tools_technologies": [],
    "equal_opportunity_statement": null
  }
  ```
  Required: `template_code`, `job_title`, `industry`. Optional metadata: `company`, `job_id`, `job_family`, `job_level`, `department`, `location`, `city`, `country_code`, `seniority`, `salary_range`, `salary_symbol`, `salary_min_value`, `salary_max_value`, `salary_period`, `employment_type`, `professional_summary`, `responsibilities_overview`, weighted lists (`key_duties`, `core_competencies`, `functional_competencies`, `qualifications_required`, `qualifications_preferred` — each `{point, weight 0–100}`), string lists (`required_licenses_certifications`, `compliance_requirements`, `tools_technologies`), `equal_opportunity_statement`.
- **Response**: `201` — `PublicTemplateResponse` (see below)

**`PublicTemplateResponse` shape** (also returned by GET/PATCH below):
```json
{
  "id": "uuid", "template_code": "TECH001", "job_title": "Senior React Developer",
  "company": "Acme Tech", "job_id": "ENG_SEN", "job_family": "Software Development",
  "job_level": "L4", "department": "Engineering", "location": "Hyderabad, India",
  "city": "Hyderabad", "country_code": "IN", "seniority": "Senior",
  "salary_range": null, "salary_symbol": null, "salary_min_value": null,
  "salary_max_value": null, "salary_period": null, "industry": "Technology",
  "employment_type": "Full-Time", "professional_summary": "...", "responsibilities_overview": "...",
  "key_duties": [], "core_competencies": [], "functional_competencies": [],
  "qualifications_required": [], "qualifications_preferred": [],
  "required_licenses_certifications": [], "compliance_requirements": [], "tools_technologies": [],
  "equal_opportunity_statement": null, "is_active": true,
  "created_at": "...", "updated_at": "..."
}
```

### `GET /templates/public/{template_id}`
- **Purpose**: Fetch a public template for editing.
- **Path params**: `template_id` (UUID)
- **Response**: `200` — `PublicTemplateResponse`; `404`

### `PATCH /templates/public/{template_id}`
- **Purpose**: Partially update a public template (only sent fields applied).
- **Path params**: `template_id` (UUID)
- **Request body** — `PublicTemplateUpdate`: any subset of the create fields plus `is_active` (bool)
  ```json
  { "job_title": "Senior React Developer II", "job_level": "L5", "is_active": false }
  ```
- **Response**: `200` — `PublicTemplateResponse`; `404`

### `POST /templates/public/bulk-import`
- **Purpose**: Bulk-import templates from Word/PDF files (max 50 files; templates separated by `---` or `===` lines; duplicates skipped; `creator_id=NULL`, `is_active=TRUE`).
- **Request body**: `multipart/form-data` — `files` (array of `.docx`/`.pdf`, req, max 50)
- **Response**: `200` — `BulkImportSummary`:
  ```json
  {
    "total_files": 2, "total_created": 3, "total_skipped": 1, "total_failed": 1,
    "results": [
      {
        "filename": "templates.docx", "created": 3, "skipped": 0, "failed": 0,
        "errors": [], "created_ids": ["uuid"]
      }
    ]
  }
  ```
  `400` (too many files)

### `POST /templates/excel-import`
- **Purpose**: Import templates from an Excel file (sheet 0; requires `template_code`, `job_title`, `industry`; duplicate codes skipped; weighted columns normalized to sum 100).
- **Auth**: `get_current_regular_user` **+ role must be `Admin`** (403 otherwise)
- **Request body**: `multipart/form-data` — `file` (`.xlsx`/`.xls`, req)
- **Response**: `200` — `BulkImportSummary` (as above, `total_files` = 1); `400` (wrong file type / missing columns), `403` (non-admin)

---

## 5. Organizations — `/organizations`

Router-level auth: `get_current_regular_user`.

### `GET /organizations/managers`
- **Purpose**: List managers in the current org with profile/status.
- **Auth**: + role in {Admin, Manager, HR} (403 otherwise)
- **Query params**: `status` (str, opt — regex `^(active|inactive)$`)
- **Response**: `200` — array of `{id, name, email, orgname, status}`

### `GET /organizations/members`
- **Purpose**: List all org users (regular + candidate). Non-admins only see their own record.
- **Response**: `200` — array. Non-admin: `{user_id, name, email, role, color_code, user_type, country}`. Admin items add `status`, `company_name`, `employee_id`, `added_by_id`, `added_by_name`.

### `POST /organizations/members`
- **Purpose**: Create an org member. Admin/Manager/HR stored in `talentforge_users`; `User` role in `candidate_users`; welcome email sent.
- **Auth**: + role `Admin` (403 otherwise)
- **Request body** — `CreateOrgMemberRequest`:
  ```json
  {
    "full_name": "Alice Johnson",
    "email": "alice.johnson@acme.com",
    "password": "TempPass123!",
    "role": "Manager",
    "color_code": "#ece75c"
  }
  ```
  Fields: `full_name` (str 1–100, req), `email` (EmailStr, req), `password` (str ≥8, req), `role` (Admin|Manager|HR|User, req), `color_code` (str, opt)
- **Response**: `201` — `{"user_id": "uuid", "full_name": "...", "email": "...", "role": "..."}`; `409` (email exists)

### `GET /organizations/mfa-policy`
- **Purpose**: Get the org's MFA policy (required/optional roles).
- **Auth**: + role `Admin`
- **Response**: `200` — `{"required_roles": ["Admin", "HR"], "optional_roles": ["Manager"]}`

### `PATCH /organizations/mfa-policy`
- **Purpose**: Update the org's MFA policy.
- **Auth**: + role `Admin`
- **Request body** — `MFAPolicyRequest`: `required_roles` (list, opt), `optional_roles` (list, opt)
  ```json
  { "required_roles": ["Admin"], "optional_roles": [] }
  ```
- **Response**: `200` — `MFAPolicyResponse` (same shape as GET)

### `GET /organizations/organization_hierarchy`
- **Purpose**: Return an org hierarchy tree based on who added whom.
- **Auth**: + role `Admin`
- **Response**: `200` — nested array of `{id, name, email, role, org_id, joined_by_id, joined_at, children: [...]}`

### `POST /organizations/`
- **Purpose**: Create a new organization.
- **Auth**: + role `Admin`
- **Request body** — `OrganizationCreate`:
  ```json
  { "name": "Acme Corp", "industry": "Technology", "image_url": null }
  ```
  Fields: `name` (str 2–100, req), `industry` (str ≤100, opt), `image_url` (str, opt)
- **Response**: `201` — `OrganizationResponse`:
  ```json
  {
    "id": "uuid", "name": "Acme Corp", "industry": "Technology",
    "image_url": null, "image_base64": null, "is_active": true,
    "access_valid_until": null, "created_at": "...", "updated_at": "..."
  }
  ```
  `409` (name exists)

### `POST /organizations/with_image`
- **Purpose**: Create an organization with an optional image file (multipart).
- **Auth**: + role `Admin`
- **Request body**: `multipart/form-data` — `name` (str, req), `industry` (str, opt), `image` (UploadFile, opt)
- **Response**: `201` — `OrganizationResponse`

### `GET /organizations/`
- **Purpose**: List organizations with pagination. Admins see all; non-admins only their own.
- **Query params**: `skip` (int, opt, 0), `limit` (int, opt, 100, ≤100)
- **Response**: `200` — array of `OrganizationResponse`

### `GET /organizations/{org_id}`
- **Purpose**: Get an org by ID, including image as base64 when set.
- **Auth**: + Admin or `current_user.org_id == org_id` (403 otherwise)
- **Path params**: `org_id` (UUID)
- **Response**: `200` — `OrganizationResponse` with `image_base64` populated

### `PUT /organizations/{org_id}`
- **Purpose**: Update an org's details (full update of provided fields).
- **Auth**: + role `Admin` + must belong to org
- **Path params**: `org_id` (UUID)
- **Request body** — `OrganizationUpdate`: `name` (str 2–100, opt), `industry` (str ≤100, opt), `image_url` (str, opt)
  ```json
  { "name": "Acme Corporation", "industry": "Enterprise Software" }
  ```
- **Response**: `200` — `OrganizationResponse`; `404`, `409`

### `PATCH /organizations/{org_id}/image`
- **Purpose**: Replace the org's image on disk.
- **Auth**: + role `Admin` + must belong to org
- **Path params**: `org_id` (UUID)
- **Request body**: `multipart/form-data` — `image` (UploadFile, req)
- **Response**: `200` — `OrganizationResponse`

### `DELETE /organizations/{org_id}`
- **Purpose**: Soft-delete an org.
- **Auth**: + role `Admin` + must belong to org
- **Path params**: `org_id` (UUID)
- **Response**: `204` No Content; `404`; `400` (org has associated users)

---

## 6. Organization Images — `/organizations/images`

Router-level auth: `get_current_regular_user`.

### `POST /organizations/images/`
- **Purpose**: Admin-only — upload an image to the org's shared image library (used on JDs).
- **Auth**: + role `Admin` (service-enforced, 403)
- **Request body**: `multipart/form-data` — `image` (UploadFile, req), `label` (str, opt)
- **Response**: `201` — `OrgImageUploadResponse`:
  ```json
  {
    "id": "uuid", "org_id": "uuid", "uploaded_by": "uuid", "uploader_name": null,
    "uploader_role": null, "image_url": "organizations/img-123.png", "label": "Company logo",
    "created_at": "..."
  }
  ```

### `GET /organizations/images/`
- **Purpose**: List all images in the org's shared library.
- **Response**: `200` — `{"images": [OrgImageUploadResponse...], "total": 1}`

### `DELETE /organizations/images/{image_id}`
- **Purpose**: Admin-only — delete an image from the library (removes file from disk).
- **Auth**: + role `Admin`
- **Path params**: `image_id` (UUID)
- **Response**: `204` No Content; `404`

---

## 7. Sessions — `/sessions`

### `GET /sessions/me`
- **Purpose**: Return the authenticated user's own session history (success + failed logins), newest first.
- **Auth**: `get_current_regular_user`
- **Query params**: `limit` (int, opt, default 30, 1–100)
- **Response**: `200` — array of `SessionResponse`:
  ```json
  {
    "id": "uuid", "user_id": "uuid", "org_id": "uuid", "ip_address": "192.168.1.10",
    "user_agent": "Mozilla/5.0 ...", "device_type": "desktop", "login_method": "password",
    "login_status": "success", "failure_reason": null, "logged_in_at": "...",
    "logout_at": null, "session_duration_sec": null, "last_activity_at": "..."
  }
  ```

### `GET /sessions/active`
- **Purpose**: Admin-only — all active (not logged out) sessions in the org.
- **Auth**: + role `Admin`
- **Query params**: `limit` (int, opt, default 50, 1–200)
- **Response**: `200` — array of `SessionResponse`

### `GET /sessions/all`
- **Purpose**: Admin-only — full session audit log with filters.
- **Auth**: + role `Admin`
- **Query params**: `login_status` (`success`|`failed`, opt), `ip_address` (str, opt), `limit` (int, opt, default 100, 1–500)
- **Response**: `200` — array of `SessionResponse`

---

## 8. Notifications — `/notifications`

### `GET /notifications/`
- **Purpose**: List notifications for the current user.
- **Auth**: `get_current_user`
- **Query params**: `unread_only` (bool, opt, false), `limit` (int, opt, 50, 1–100), `offset` (int, opt, 0)
- **Response**: `200` — array of `NotificationResponse`:
  ```json
  {
    "id": "uuid", "user_id": "uuid", "sender_id": "uuid", "org_id": "uuid",
    "type": "workflow", "title": "JD approved", "message": "...", "link": "/jd/123",
    "is_read": false, "created_at": "..."
  }
  ```

### `GET /notifications/unread-count`
- **Purpose**: Unread notification count for the current user.
- **Auth**: `get_current_user`
- **Response**: `200` — `{"unread_count": 3}`

### `PATCH /notifications/{notification_id}/read`
- **Purpose**: Mark one notification as read.
- **Auth**: `get_current_regular_user`
- **Path params**: `notification_id` (UUID)
- **Response**: `200` — `{"status": "success", "message": "Notification marked as read"}`; `404`

### `PATCH /notifications/read-all`
- **Purpose**: Delete all notifications for the current user (despite the name).
- **Auth**: `get_current_user`
- **Response**: `200` — `{"status": "success", "message": "12 notifications deleted"}`

### `WEBSOCKET /notifications/ws/{user_id}`
- **Purpose**: Real-time notification stream. Auth via `?token=` query, `Authorization: Bearer` header, cookie, `Sec-WebSocket-Protocol` (`bearer.<jwt>`), or a `{"type":"auth","token":"<jwt>"}` client message. Server replies `"pong"` to `ping`.
- **Path params**: `user_id` (str — must parse as UUID, else close 1008)
- **Query params**: `token` (str, opt)
- **Close codes**: 1008 on auth failure / invalid user id

---

## 9. JD Assignment (user-to-user) — `/jd`

### `POST /jd/`
- **Purpose**: Create a JD assignment sent from the current user to another user in the same org.
- **Auth**: `get_current_regular_user`
- **Request body** — `JDAssignmentCreate`:
  ```json
  {
    "original_jd_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "sent_to": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "comment": "Please review before Friday"
  }
  ```
  Fields: `original_jd_id` (UUID, req), `sent_to` (UUID, req), `comment` (str, opt)
- **Response**: `200` — `JDAssignmentResponse`:
  ```json
  {
    "id": "uuid", "original_jd_id": "uuid", "sent_from": "uuid", "sent_to": "uuid",
    "status": "pending", "comment": "Please review before Friday",
    "created_at": "...", "updated_at": "...", "title": "Senior Software Engineer"
  }
  ```

### `GET /jd/`
- **Purpose**: List JD assignments sent by the current user.
- **Auth**: `get_current_regular_user`
- **Query params**: `status_filter` (str, opt)
- **Response**: `200` — `List[JDAssignmentResponse]`

### `GET /jd/received`
- **Purpose**: List JD assignments received by the current user.
- **Auth**: `get_current_regular_user`
- **Query params**: `status_filter` (str, opt)
- **Response**: `200` — `List[JDAssignmentResponse]`

### `PATCH /jd/{assignment_id}`
- **Purpose**: Update an assignment's status (approve/decline/forward). Caller must be sender or recipient.
- **Auth**: `get_current_regular_user`
- **Path params**: `assignment_id` (UUID)
- **Request body** — `JDAssignmentUpdate`:
  ```json
  { "status": "approved", "comment": "Looks good", "next_assignee_user_id": "uuid" }
  ```
  `status` must be one of `approved`, `declined`, `forward_for_approval`, `returned`; `next_assignee_user_id` required when `approved`.
- **Response**: `200` — `JDAssignmentResponse`; `400` (invalid status), `404`

### `POST /jd/candidate`
- **Purpose**: Assign a JD to a candidate user (sign-off assignment).
- **Auth**: `get_current_regular_user`
- **Request body** — `CandidateJDAssignmentCreate`:
  ```json
  { "jd_id": "uuid", "candidate_id": "uuid", "due_date": "2026-09-01T00:00:00Z" }
  ```
  Fields: `jd_id` (UUID, req), `candidate_id` (UUID, req), `due_date` (datetime, opt)
- **Response**: `200` — `CandidateJDAssignmentResponse`:
  ```json
  {
    "id": "uuid", "candidate_id": "uuid", "jd_id": "uuid", "status": "pending",
    "due_date": "2026-09-01T00:00:00Z", "assigned_at": "...", "completed_at": null,
    "decision": "", "digital_signature_url": null, "terms_accepted": false,
    "terms_accepted_at": null, "signature_method": null
  }
  ```

### `GET /jd/candidate`
- **Purpose**: List all candidate JD assignments in the org.
- **Auth**: `get_current_regular_user`
- **Query params**: `status_filter` (str, opt)
- **Response**: `200` — `List[CandidateJDAssignmentResponse]`

### `PATCH /jd/candidate/{assignment_id}`
- **Purpose**: Update a candidate assignment (status, decision, sign-off fields).
- **Auth**: `get_current_regular_user` + caller in assignment's org
- **Path params**: `assignment_id` (UUID)
- **Request body** — `CandidateJDAssignmentUpdate` (all optional):
  ```json
  {
    "status": "completed",
    "decision": "Accepted",
    "candidate_acknowledgement": "I confirm that I have read and understood the JD",
    "candidate_comments": "Thank you",
    "signature_method": "digital_signature",
    "signature_image_url": "data:image/png;base64,....",
    "terms_accepted": true,
    "terms_accepted_at": "2026-08-11T10:00:00Z"
  }
  ```
  `status` ∈ {`pending`, `accepted`, `rejected`, `completed`}; `digital_signature` drives `signature_method`; completing stamps `completed_at`.
- **Response**: `200` — cleaned assignment dict + `"message": "Assignment updated successfully"`

---

## 10. JD Approval Workflows — `/jd/workflow`

Router-level auth: `get_current_regular_user`.

### `GET /jd/workflow/members`
- **Purpose**: Search org members by name/email for the "Assign Reviewer" field.
- **Auth**: + role Admin/Manager (403 otherwise)
- **Query params**: `que` (str, opt — name/email search), `skip` (int, opt, 0), `limit` (int, opt, 100, 1–1000)
- **Response**: `200`:
  ```json
  { "members": [{"user_id": "uuid", "full_name": "Jane Doe", "email": "jane@corp.com", "role": "Manager", "color_code": "#ece75c"}] }
  ```

### `GET /jd/workflow/list_all_workflows`
- **Purpose**: List all active workflows in the org.
- **Response**: `200`:
  ```json
  { "workflows": [{"workflow_id": "uuid", "name": "Senior Approval", "steps": [{"step_name": "HR Review", "user_id": "uuid", "full_name": "Jane Doe", "email": "jane@corp.com", "sla_days": 2, "step_order": 1}], "is_draft": false, "is_active": true, "created_at": "..."}] }
  ```

### `GET /jd/workflow/jd_state/{jd_id}`
- **Purpose**: Get the current state of the active workflow run for a JD.
- **Path params**: `jd_id` (UUID)
- **Response**: `200`:
  ```json
  {
    "run_id": "uuid", "jd_id": "uuid", "status": "active", "current_step_index": 0,
    "current_approver": {"step_name": "HR Review", "user_id": "uuid", "full_name": "Jane Doe", "email": "jane@corp.com", "sla_days": 2, "step_order": 1},
    "total_steps": 2, "resolved_steps": [], "comments_trail": [],
    "current_jd_version_id": "uuid", "version_history": []
  }
  ```
  `404` if no run in org

### `POST /jd/workflow/create_workflow`
- **Purpose**: Create a new approval workflow with ordered steps.
- **Auth**: + role `Admin`
- **Request body** — `CreateWorkflowRequest`:
  ```json
  {
    "name": "Senior Manager Approval",
    "steps": [{"step_name": "HR Review", "user_email": "hr@corp.com", "sla_days": 2}],
    "is_draft": false
  }
  ```
  Fields: `name` (str 1–150, req), `steps` (list ≥1 of `{step_name` str 1–100 req, `user_email` EmailStr req, `sla_days` int opt default 1 `, req), `is_draft` (bool, opt)
- **Response**: `200` — `{workflow_id, name, steps, is_draft, message}`; `404` (email not in org)

### `PATCH /jd/workflow/{workflow_id}`
- **Purpose**: Patch a workflow's name, draft flag, and/or step assignees.
- **Auth**: + role `Admin`
- **Path params**: `workflow_id` (UUID)
- **Request body** — `UpdateWorkflowRequest` (at least one field required):
  ```json
  { "name": "Senior Approval v2", "is_draft": false }
  ```
- **Response**: `200` — `{workflow_id, name, steps, is_draft, is_active, message}`

### `DELETE /jd/workflow/delete/{workflow_id}`
- **Purpose**: Deactivate a workflow.
- **Auth**: + role `Admin`
- **Path params**: `workflow_id` (UUID)
- **Response**: `200` — `{"message": "Workflow 'X' has been deactivated."}`

### `POST /jd/workflow/start_workflow_event`
- **Purpose**: Start an approval workflow on a JD.
- **Request body** — `TriggerWorkflowRequest`:
  ```json
  { "jd_id": "uuid", "workflow_id": "uuid", "comment": "Please approve this JD" }
  ```
  Fields: `jd_id` (UUID, req), `workflow_id` (UUID, req), `comment` (str ≥1, req)
- **Response**: `200` — `{run_id, jd_id, workflow_name, total_steps, sent_to, comments_trail, message}`; `400` (draft workflow / no steps), `404`, `409` (already active run)

### `POST /jd/workflow/bulk_workflow_event`
- **Purpose**: Start the same workflow on multiple `final` JDs.
- **Request body** — `BulkTriggerWorkflowRequest`:
  ```json
  { "jd_ids": ["uuid1", "uuid2"], "workflow_id": "uuid", "comment": "Approve these JDs" }
  ```
- **Response**: `200` — `{workflow_name, total_submitted, successful, failed, successful_jds, failed_jds, errors, message}`

### `POST /jd/workflow/workflow_decision`
- **Purpose**: Approve/decline the JD at the caller's assigned step.
- **Auth**: + must be current step's assigned (or delegated) user
- **Request body** — `WorkflowDecideRequest`:
  ```json
  { "jd_id": "uuid", "decision": "approved", "comment": "Looks good" }
  ```
  `decision` ∈ {`approved`, `declined`}; `comment` (str ≥1, req)
- **Response**: `200` — shape varies:
  - more steps: `{jd_id, decision, step_completed, forwarded_to, comments_trail, message}`
  - last step: `{jd_id, decision, jd_status: "approved", comments_trail, message}`
  - declined: `{jd_id, decision, jd_status: "declined", returned_to, comments_trail, message}`

### `POST /jd/workflow/{jd_id}/delegate`
- **Purpose**: Delegate the current approval step to another Manager.
- **Auth**: + must be current step's assigned/delegated user
- **Path params**: `jd_id` (UUID)
- **Request body** — `DelegateStepRequest`:
  ```json
  { "delegate_to_email": "mgr@corp.com", "comment": "Out of office this week" }
  ```
  Fields: `delegate_to_email` (EmailStr, req — must be a Manager in org, not already in workflow), `comment` (str ≥1, req)
- **Response**: `200` — `{jd_id, decision: "delegated", delegated_to, comments_trail, message}`

---

## 11. Sign-off JDs — `/api/assigned-jds`

> Mounted with prefix `/api` in `main.py`, so full paths are `/api/assigned-jds/...`.

### `GET /api/assigned-jds/details/{id}`
- **Purpose**: Detailed view of a sign-off JD (content + sign-off fields).
- **Auth**: `get_current_user`; candidates only their own assignment, staff only their org
- **Path params**: `id` (UUID)
- **Response**: `200`:
  ```json
  {
    "id": "uuid", "candidate_id": "uuid", "jd_id": "uuid", "status": "sign-off-pending",
    "decision": null, "due_date": "2026-09-01T00:00:00Z", "assigned_at": "...", "completed_at": null,
    "title": "Senior Software Engineer", "company_name": "Acme Corp", "job_id": "JD-1001",
    "department": "Engineering", "location": "Remote", "salary_range": "120000 - 160000",
    "content": {"overview": "..."}, "candidate_acknowledgement": null, "candidate_comments": null,
    "signature_method": null, "digital_signature_url": null
  }
  ```
  `404`, `403`

### `PUT /api/assigned-jds/update/{id}`
- **Purpose**: Update sign-off fields; handles completion logic.
- **Auth**: `get_current_user` (ownership rules as above)
- **Path params**: `id` (UUID)
- **Request body** — `SignOffJDUpdate` (all optional):
  ```json
  {
    "status": "sign-off-complete",
    "candidate_acknowledgement": "I confirm that I have reviewed the job description and agree to its terms.",
    "candidate_comments": "Thank you for the opportunity.",
    "signature_method": "digital_signature",
    "signature_image_url": "data:image/png;base64,...."
  }
  ```
  `status` ∈ {`sign-off-pending`, `sign-off-complete`} — completing stamps `completed_at`.
- **Response**: `200` — details dict + `signature_image_url` + `"message": "Assignment updated successfully"`; `404`, `403`

### `DELETE /api/assigned-jds/delete/{id}`
- **Purpose**: Soft-delete a sign-off record.
- **Auth**: `get_current_regular_user` + role `Admin`
- **Path params**: `id` (UUID)
- **Response**: `204` No Content; `403`, `404`

### `GET /api/assigned-jds/list`
- **Purpose**: List all assigned JDs in the org.
- **Auth**: `get_current_regular_user`
- **Query params**: `status_filter` (str, opt)
- **Response**: `200` — `{"signoff_jds": [details...], "total": 1}`

### `GET /api/assigned-jds/download-signed-pdf/{assignment_id}`
- **Purpose**: Download the signed JD PDF (candidate name + signature embedded); only for `sign-off-complete` assignments.
- **Auth**: `get_current_user` (ownership rules as above)
- **Path params**: `assignment_id` (UUID)
- **Response**: `200` — PDF stream; `400` (not completed), `403`, `404`

---

## 12. Extra / Admin Utilities — `/extra`

### `GET /extra/download-template/regular`
- **Purpose**: Download the REGULAR_USER Excel template for bulk user creation.
- **Auth**: None (public)
- **Response**: `200` — Excel file stream; `404` if template missing

### `GET /extra/download-template/enduser`
- **Purpose**: Download the END_USER Excel template.
- **Auth**: None (public)
- **Response**: `200` — Excel file stream; `404`

### `POST /extra/bulk-create/regular-users`
- **Purpose**: Bulk-create Admin/HR/Manager users from the REGULAR_USER template.
- **Auth**: + role `Admin` (403)
- **Request body**: `multipart/form-data` — `file` (`.xlsx`/`.xls`, req). Columns: `SLNO`, `FULL NAME`, `EMAIL`, `PASSWORD`, `ROLE` (Admin|HR|Manager). Max 500 rows.
- **Response**: `200`:
  ```json
  {
    "status": "completed", "type": "regular_users", "total_rows": 3,
    "created_count": 2, "failed_count": 1,
    "created": [{"id": "uuid", "full_name": "Jane Doe", "email": "jane@x.com", "role": "Manager"}],
    "failed": [{"row": 4, "email": "jim@x.com", "reason": "Email already exists in the system"}]
  }
  ```

### `POST /extra/bulk-create/end-users`
- **Purpose**: Bulk-create candidate/end users from the END_USER template.
- **Auth**: + role `Admin` (403)
- **Request body**: `multipart/form-data` — `file` (`.xlsx`/`.xls`, req). Columns: `SLNO`, `FULL NAME`, `EMAIL`, `PASSWORD`, `EMPLOYEE ID`. Max 500 rows.
- **Response**: `200` — similar to above with `type: "end_users"`, `created` items include `employee_id`.

### `PATCH /extra/user/role`
- **Purpose**: Admin-only — update a user's role in the org by email.
- **Auth**: + role `Admin` (403)
- **Query params**: `email` (str, req)
- **Request body** — `RoleUpdateRequest`: `role` (Admin|HR|Manager|User, req)
  ```json
  { "role": "Manager" }
  ```
- **Response**: `200` — `{user_id, email, full_name, role, updated_by, updated_at}`; `404`

### `PATCH /extra/toggle-status/{email}`
- **Purpose**: Admin-only — toggle active/inactive for a user or candidate.
- **Auth**: + `require_admin`
- **Path params**: `email` (str)
- **Response**: `200` — `{entity_type, entity_id, email, status, old_status, new_status, updated_by, updated_at}`; `404`

### `PATCH /extra/user/mfa`
- **Purpose**: Admin-only — enable/disable MFA for a user/candidate in the org.
- **Auth**: + `require_admin`
- **Request body** — `OrgUserMfaToggleRequest`:
  ```json
  { "email": "jane@x.com", "mfa": true }
  ```
  Fields: `email` (EmailStr, req), `mfa` (bool, req)
- **Response**: `200` — `{email, id, mfa, org_id}`; `403` (different org), `404`

### `GET /extra/search-by-email/{email}`
- **Purpose**: Admin-only — search a user/candidate by email in the org.
- **Auth**: + `require_admin`
- **Path params**: `email` (str)
- **Response**: `200` — `{entity_type, entity_id, email, full_name, role, status, org_id, created_at, updated_at, user_type}` (candidate adds `company_name`, `employee_id`); `404`

### `POST /extra/competencies`
- **Purpose**: Admin-only — add a competency (org-scoped; `orgId` in body is ignored).
- **Auth**: + role `Admin`
- **Request body** — `CompetencyCreate`:
  ```json
  {
    "competencyName": "Leadership",
    "categoryName": "Core Competencies",
    "orgId": "123e4567-e89b-12d3-a456-426614174000",
    "description": "Ability to lead teams effectively"
  }
  ```
- **Response**: `201` — `CompetencyResponse`:
  ```json
  {
    "competency_id": "uuid", "competency_name": "Leadership", "category_name": "Core Competencies",
    "org_id": "uuid", "description": "...", "created_by": "uuid", "created_on": "...",
    "updated_by": null, "updated_on": "..."
  }
  ```

### `GET /extra/competencies`
- **Purpose**: List competencies (filterable by category).
- **Query params**: `categoryName` (str, opt)
- **Response**: `200` — `List[CompetencyResponse]`

### `PATCH /extra/competencies/{competencyId}`
- **Purpose**: Admin-only — update a competency.
- **Path params**: `competencyId` (UUID)
- **Request body** — `CompetencyUpdate` (all optional): `competencyName`, `categoryName`, `description`
- **Response**: `200` — `CompetencyResponse`

### `DELETE /extra/competencies/{competencyId}`
- **Purpose**: Admin-only — delete a competency (verifies org ownership).
- **Path params**: `competencyId` (UUID)
- **Response**: `200` — `{"message": "Competency deleted successfully"}`

### `POST /extra/custom-fields`
- **Purpose**: Admin-only — create a custom JD section definition for the org.
- **Auth**: + role `Admin`
- **Request body** — `CustomFieldCreate`:
  ```json
  {
    "section_name": "benefits_overview",
    "section_data_type": "text_section",
    "section_data": [{"point": "Health insurance coverage"}],
    "description": "Optional description"
  }
  ```
  `section_data_type` normalized to `text_section`|`points_section`.
- **Response**: `201` — `CustomFieldResponse` (id, org_id, org_name, created_by, creator_name, creator_role, section_name, section_data_type, section_data, description, created_at, updated_at); `409` (name exists)

### `GET /extra/custom-fields`
- **Purpose**: List custom JD field definitions for the org.
- **Response**: `200` — `List[CustomFieldResponse]`

### `PATCH /extra/custom-fields/{section_name}`
- **Purpose**: Admin-only — update a custom field definition by section name.
- **Path params**: `section_name` (str)
- **Request body** — `CustomFieldUpdate` (all optional): `section_name`, `section_data_type`, `section_data`, `description`
- **Response**: `200` — `CustomFieldResponse`; `404`, `409`

### `GET /extra/dashboard-stats`
- **Purpose**: Admin-only — dashboard statistics for the org (sets `Cache-Control: no-store`).
- **Auth**: + role `Admin`
- **Response**: `200`:
  ```json
  {
    "jd_distribution": {"total_descriptions": 10, "ai_built": 6, "predefined": 4, "total_template": 5},
    "users_and_access": {"total_member": 25, "active_member": 20, "admin": 1, "manager": 3, "hr": 2, "user": 10, "inactive_member": 5},
    "workflow_funnel": {"pending": 2, "approved": 3, "rejected": 1},
    "quality_and_scope": {"average_score": 30.0, "active_departments": 4}
  }
  ```

### `POST /extra/email-groups`
- **Purpose**: Admin-only — create an email group for the org.
- **Auth**: + role `Admin`
- **Request body** — `EmailGroupCreate`:
  ```json
  { "group_name": "Recruiting Team", "role": "HR", "emails": ["hr1@x.com", "hr2@x.com"] }
  ```
  Fields: `group_name` (str ≤255, req), `role` (str ≤50, opt), `emails` (list of EmailStr ≥1, req)
- **Response**: `201` — `EmailGroupResponse`:
  ```json
  {
    "id": "uuid", "org_id": "uuid", "group_name": "Recruiting Team", "role": "HR",
    "emails": ["hr1@x.com", "hr2@x.com"], "created_at": "...", "updated_at": "..."
  }
  ```
  `409` (group name exists)

### `GET /extra/email-groups`
- **Purpose**: List all email groups for the org.
- **Response**: `200` — `List[EmailGroupResponse]`

### `GET /extra/email-groups/{group_name}`
- **Purpose**: Get a specific email group by name.
- **Path params**: `group_name` (str)
- **Response**: `200` — `EmailGroupResponse`; `404`

### `PATCH /extra/email-groups/{group_name}`
- **Purpose**: Admin-only — update an email group.
- **Path params**: `group_name` (str)
- **Request body** — `EmailGroupUpdate` (all optional): `group_name`, `role`, `emails`
- **Response**: `200` — `EmailGroupResponse`; `404`, `409`

### `DELETE /extra/email-groups/{group_name}`
- **Purpose**: Admin-only — delete an email group.
- **Path params**: `group_name` (str)
- **Response**: `200` — `{"message": "Email group 'X' deleted successfully"}`; `404`

---

## 13. Skill Taxonomy — `/skill-taxonomy`

> Router registered with `include_in_schema=False` (hidden from OpenAPI, but functional). All endpoints require `get_current_regular_user`.

### `GET /skill-taxonomy/get-organization-types`
- **Purpose**: List organization types.
- **Query params**: `search` (str, opt), `skip` (int, opt, 0), `limit` (int, opt, 100, ≤500)
- **Response**: `200` — `[{"organization_type_id": "uuid", "organization_type_name": "Banking"}]`

### `GET /skill-taxonomy/get-organization-type-by-id/{organization_type_id}`
- **Purpose**: Get one organization type.
- **Path params**: `organization_type_id` (str)
- **Response**: `200` — `OrganizationTypeResponse`; `404`

### `POST /skill-taxonomy/create-organization-type`
- **Purpose**: Create an organization type.
- **Request body** — `OrganizationTypeCreate`: `organization_type_id` (str, opt), `organization_type_name` (str, req)
- **Response**: `201` — `OrganizationTypeResponse`

### `GET /skill-taxonomy/get-job-sets`
- **Purpose**: List job sets.
- **Query params**: `search`, `organization_type_id`, `skip` (0), `limit` (100, ≤500)
- **Response**: `200` — `[{"talentforge_job_title_id": "uuid", "name": "Software Engineer", "organization_type_id": "uuid", "description": null, "created_on": "...", "updated_on": "..."}]`

### `GET /skill-taxonomy/get-job-set-by-id/{talentforge_job_title_id}`
- **Purpose**: Get one job set.
- **Path params**: `talentforge_job_title_id` (str)
- **Response**: `200` — `TalentForgeJobSetResponse`; `404`

### `POST /skill-taxonomy/create-job-set`
- **Purpose**: Create a job set.
- **Request body** — `TalentForgeJobSetCreate`: `talentforge_job_title_id` (str, opt), `name` (str, req), `organization_type_id` (str, req), `description` (str, opt), `created_on`/`updated_on` (datetime, opt)
- **Response**: `201` — `TalentForgeJobSetResponse`

### `GET /skill-taxonomy/get-skill-sets`
- **Purpose**: List skill sets.
- **Query params**: `search`, `talentforge_job_set_id`, `organization_type_id`, `skip` (0), `limit` (100, ≤500)
- **Response**: `200` — `[{"talentforge_skill_id": "uuid", "name": "Python", "description": null, "talentforge_job_set_id": "uuid"}]`

### `GET /skill-taxonomy/get-skill-set-by-id/{talentforge_skill_id}`
- **Purpose**: Get one skill set.
- **Path params**: `talentforge_skill_id` (str)
- **Response**: `200` — `TalentForgeSkillSetResponse`; `404`

### `POST /skill-taxonomy/create-skill-set`
- **Purpose**: Create a skill set.
- **Request body** — `TalentForgeSkillSetCreate`: `talentforge_skill_id` (str, opt), `name` (str, req), `description` (str, opt), `talentforge_job_set_id` (str, req)
- **Response**: `201` — `TalentForgeSkillSetResponse`

---

## 14. Terms & Conditions — `/terms-and-conditions`

### `POST /terms-and-conditions/`
- **Purpose**: Create a T&C record for the org.
- **Auth**: `get_current_regular_user` + role `Admin` (service-enforced, 403)
- **Request body** — `TermsAndConditionsCreate`:
  ```json
  { "content": "## Terms\nBy using this platform you agree to...", "is_active": true }
  ```
  Fields: `content` (str, req), `is_active` (bool, opt, default true)
- **Response**: `201` — `TermsAndConditionsResponse`:
  ```json
  {
    "id": "uuid", "org_id": "uuid", "content": "## Terms\n...", "is_active": true,
    "created_at": "...", "updated_at": "..."
  }
  ```

### `GET /terms-and-conditions/active`
- **Purpose**: Get the currently active T&C for the org.
- **Auth**: `get_current_user`
- **Response**: `200` — `TermsAndConditionsResponse`; `404` (none active)

### `GET /terms-and-conditions/`
- **Purpose**: List all T&C records for the org.
- **Auth**: `get_current_user`
- **Response**: `200` — `List[TermsAndConditionsResponse]`

### `GET /terms-and-conditions/{tc_id}`
- **Purpose**: Get a specific T&C record.
- **Auth**: `get_current_user`
- **Path params**: `tc_id` (UUID)
- **Response**: `200` — `TermsAndConditionsResponse`; `404`, `403`

### `PATCH /terms-and-conditions/{tc_id}`
- **Purpose**: Update a T&C record.
- **Auth**: `get_current_regular_user` + role `Admin`
- **Path params**: `tc_id` (UUID)
- **Request body** — `TermsAndConditionsUpdate` (all optional): `content` (str), `is_active` (bool)
- **Response**: `200` — `TermsAndConditionsResponse`; `404`, `403`

### `DELETE /terms-and-conditions/{tc_id}`
- **Purpose**: Delete a T&C record.
- **Auth**: `get_current_regular_user` + role `Admin`
- **Path params**: `tc_id` (UUID)
- **Response**: `200` — `{"message": "Terms and Conditions record deleted successfully."}`; `404`, `403`

---

## 15. Saba (CSOD JD Import) — `/saba`

All endpoints use `get_current_user` and require `current_user.org_id` (else `400 "User is not part of an organization"`).

### `GET /saba/`
- **Purpose**: List all Saba JDs for the user's org.
- **Response**: `200` — `List[SabaJobDescriptionResponse]`:
  ```json
  [{
    "id": "uuid", "org_id": "uuid", "creator_id": "uuid", "title": "Prof 4515 - Engineer",
    "job_id": "Prof 4515",
    "sections": {"Job Details": {"Department": "Eng", "Location": "NY", "Employment Type": "Full-Time", "Job Family": "Tech"}},
    "created_at": "...", "updated_at": "..."
  }]
  ```

### `GET /saba/by_job_id/{job_id}`
- **Purpose**: Look up a Saba JD by its business `job_id`.
- **Path params**: `job_id` (str)
- **Response**: `200` — `SabaJobDescriptionResponse`; `404`

### `GET /saba/{jd_id}`
- **Purpose**: Get a Saba JD by record UUID.
- **Path params**: `jd_id` (UUID)
- **Response**: `200` — `SabaJobDescriptionResponse`; `404`

### `PATCH /saba/{jd_id}`
- **Purpose**: Update a Saba JD's `title` and/or `job_id`.
- **Path params**: `jd_id` (UUID)
- **Request body** — `SabaJobDescriptionUpdateRequest` (all optional): `title` (str), `job_id` (str)
- **Response**: `200` — `SabaJobDescriptionResponse`; `404`

### `PATCH /saba/{jd_id}/sections`
- **Purpose**: Update a single named section within a Saba JD's `sections` dict.
- **Path params**: `jd_id` (UUID)
- **Request body** — `SabaSectionUpdateRequest`:
  ```json
  { "section_name": "Job Details", "section_content": {"Department": "Eng", "Location": "NY"} }
  ```
  Fields: `section_name` (str, req), `section_content` (str|list|dict, req)
- **Response**: `200` — `SabaJobDescriptionResponse`; `404`

### `DELETE /saba/{jd_id}`
- **Purpose**: Delete a Saba JD (org-scoped).
- **Path params**: `jd_id` (UUID)
- **Response**: `204` No Content; `404`

### `POST /saba/upload_pdf`
- **Purpose**: Upload PDF(s) containing JD text; each is parsed (Mistral) and stored as a Saba JD.
- **Request body**: `multipart/form-data` — `files` (list of `.pdf`, req; must have `%PDF` magic bytes)
- **Response**: `201` — `List[SabaJobDescriptionResponse]`; `400` (no/non-PDF files), `500`

### `POST /saba/bulk_convert`
- **Purpose**: Convert multiple Saba JDs to standard `JobDescription` records in bulk; Saba rows are deleted.
- **Request body** — `BulkConvertRequest`:
  ```json
  { "jd_ids": ["uuid1", "uuid2"] }
  ```
  Fields: `jd_ids` (list of UUID, req)
- **Response**: `200` — `List[JobDescriptionResponse]` (`generation_mode="saba"`, `status="draft"`, `industry="Imported"`, `country_code="US"`); `400` (none converted)

### `POST /saba/{jd_id}/export`
- **Purpose**: Export a Saba JD as PDF or Word (streamed).
- **Path params**: `jd_id` (UUID)
- **Query params**: `format` (enum `pdf`|`word`, opt, default `pdf`)
- **Response**: `200` — file stream; `404`, `500`

---

## 16. CSOD Integration — `/csod`

Router-level auth: `get_current_regular_user`. Role helpers: `require_admin` (role Admin), `require_csod_staff` (role Admin/HR/Manager). Several endpoints return raw service-layer results whose exact shape is not typed in the router.

### `GET /csod/ous/{ouid}`
- **Purpose**: Fetch an Organizational Unit from CSOD by internal ID and store it in the DB.
- **Auth**: + `require_admin`
- **Path params**: `ouid` (int)
- **Response**: `200` — service result

### `GET /csod/ou-details/{ouid}`
- **Purpose**: Fetch OU details directly from CSOD using an active connection (no DB store).
- **Auth**: + `require_csod_staff`
- **Path params**: `ouid` (int)
- **Query params**: `connection_name` (str, opt)
- **Response**: `200` — service result

### `GET /csod/ous/by-external-id/{ou_ref_id}`
- **Purpose**: Fetch an OU from CSOD by `externalId` and store it in the DB.
- **Auth**: + `require_admin`
- **Path params**: `ou_ref_id` (str)
- **Response**: `200` — service result

### `GET /csod/status`
- **Purpose**: Return the CSOD connection status for the user's org.
- **Auth**: + `require_csod_staff`
- **Response**: `200` — service result

### `POST /csod/connect`
- **Purpose**: Save a new CSOD connection (credentials stored encrypted).
- **Auth**: + `require_admin`
- **Request body** — `CSODConnectRequest`:
  ```json
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
  ```
  Fields: `connection_name` (str 1–120, req), `base_url` (str, req), `auth_token_url` (str, opt — derived if omitted), `client_id` (str, req), `client_secret` (str, req), `scope` (str, opt), `export_type` (`Foundation`|`Bulk`, opt, default `Foundation`), `default_openings` (int 1–1000, opt, 1), `default_expiry_days` (int 1–3650, opt, 90), `default_country` (str 2–10, opt, `"US"`)
- **Response**: `200` — service result

### `GET /csod/connection/{connection_name}`
- **Purpose**: Get a stored CSOD connection by name.
- **Auth**: + `require_admin`
- **Path params**: `connection_name` (str)
- **Response**: `200` — service result

### `PATCH /csod/connection/{connection_name}`
- **Purpose**: Partially update a stored CSOD connection (only sent fields applied).
- **Auth**: + `require_admin`
- **Path params**: `connection_name` (str)
- **Request body** — `CSODConnectionPatch`: any subset of the `connect` fields
  ```json
  { "base_url": "https://serviceslearn3.csod.com", "scope": "ou:write" }
  ```
- **Response**: `200` — service result

### `DELETE /csod/connection/{connection_name}`
- **Purpose**: Delete a stored CSOD connection.
- **Auth**: + `require_admin`
- **Path params**: `connection_name` (str)
- **Response**: `200` — service result

### `POST /csod/token`
- **Purpose**: Fetch a CSOD OAuth token directly from supplied credentials. Rate limited to 10/min.
- **Auth**: + `require_admin`
- **Request body** — `CSODTokenRequest`:
  ```json
  {
    "base_url": "https://portal.csod.com",
    "client_id": "api_client_123",
    "client_secret": "super_secret_key",
    "scope": "ou:write",
    "grant_type": "client_credentials"
  }
  ```
- **Response**: `200` — CSOD token response (`access_token`, `token_type`, `expires_in`, ...)

### `POST /csod/token/from-connection`
- **Purpose**: Fetch a CSOD OAuth token using a stored connection's credentials. Rate limited to 10/min.
- **Auth**: + `require_admin`
- **Request body** — `CSODTokenFromConnectionRequest`:
  ```json
  { "connection_name": "CSOD Production", "scope": "ou:read" }
  ```
- **Response**: `200` — token response

### `POST /csod/test-connection`
- **Purpose**: Test the most recently updated CSOD connection (sets status active on success).
- **Auth**: + `require_admin`
- **Request body**: None
- **Response**: `200` — service result

### `POST /csod/check-position`
- **Purpose**: Detect the CSOD Position OU `typeId` (types endpoint). Rate limited to 20/min.
- **Auth**: + `require_admin`
- **Request body** — `CSODCheckPositionRequest`: `base_url` (str, req), `token` (str, req)
- **Response**: `200` — service result

### `POST /csod/get-position`
- **Purpose**: Fetch a specific CSOD position OU by id. Rate limited to 20/min.
- **Auth**: + `require_admin`
- **Request body** — `CSODGetPositionRequest`: `base_url` (str, req), `token` (str, req), `position_id` (int ≥1, req)
- **Response**: `200` — service result

### `POST /csod/create-position`
- **Purpose**: Create a position OU in CSOD. Rate limited to 10/min.
- **Auth**: + `require_admin`
- **Request body** — `CSODCreatePositionRequest`:
  ```json
  { "base_url": "...", "token": "eyJ...", "typeId": 5, "name": "Senior Software Engineer", "parentId": 100, "description": "..." }
  ```
  Fields: `base_url` (req), `token` (req), `typeId` (int ≥1, req), `name` (str, req), `parentId` (int ≥1, req), `description` (str, opt, default `""`)
- **Response**: `200` — service result

### `POST /csod/pipeline/create-position`
- **Purpose**: One-shot CSOD pipeline: token → detect Position typeId → create position. Rate limited to 10/min.
- **Auth**: + `require_admin`
- **Request body** — `CSODCreatePositionPipelineRequest`:
  ```json
  {
    "base_url": "https://portal.csod.com",
    "client_id": "api_client_123",
    "client_secret": "super_secret_key",
    "scope": "ou:write",
    "name": "TalentForge Position",
    "parentId": 100,
    "description": "Created via TalentForge Pipeline"
  }
  ```
  Fields: `base_url` (req), `client_id` (req), `client_secret` (req), `scope` (opt), `typeId` (int ≥1, opt — auto-detected if omitted), `name` (opt, default `"talentForge"`), `parentId` (int ≥1, opt, null allowed), `description` (opt)
- **Response**: `200` — service result

### `POST /csod/bulk/create-ous`
- **Purpose**: Bulk-create OUs (Positions) in CSOD. Rate limited to 5/min.
- **Auth**: + `require_admin`
- **Request body** — `CSODBulkOURequest`:
  ```json
  {
    "connection_name": "CSOD Production",
    "typeId": 5,
    "ous": [{"name": "Engineering", "parentId": 10, "description": "Eng Dept"}]
  }
  ```
  Fields: `connection_name` (str, req), `typeId` (int ≥1, opt), `ous` (list ≥1 of `{name` req, `parentId` int req, `description` opt`)
- **Response**: `200` — service result

### `POST /csod/push-jd`
- **Purpose**: Transform and push a JD to CSOD as a Position. Rate limited to 10/min.
- **Auth**: + `require_admin`
- **Request body** — `CSODPushJDRequest`:
  ```json
  { "jd_id": "550e8400-e29b-41d4-a716-446655440000", "connection_name": "CSOD Production", "parentId": 100 }
  ```
- **Response**: `200` — service result

### `POST /csod/bulk/push-jds`
- **Purpose**: Bulk-transform and push multiple JDs to CSOD. Rate limited to 5/min.
- **Auth**: + `require_admin`
- **Request body** — `CSODBulkPushJDRequest`:
  ```json
  {
    "connection_name": "CSOD Production",
    "jds": [{"jd_id": "550e8400-...", "parentId": 100}]
  }
  ```
- **Response**: `200` — service result

### `GET /csod/job-applications`
- **Purpose**: Fetch job requisition/application details from CSOD using an active connection.
- **Auth**: + `require_csod_staff`
- **Query params**: `connection_name` (opt); all other query params forwarded verbatim to CSOD as filters
- **Response**: `200` — service result

### `GET /csod/export-pipeline-pushes`
- **Purpose**: Export CSOD pipeline push records as CSV or Excel.
- **Auth**: + `require_admin`
- **Query params**: `format` (str, opt, default `"csv"`) — `csv` or `excel`
- **Response**: `200` — streaming file. CSV: `csod_pushes_{org_id}_{iso}.csv`; Excel: `TalentForge_CSOD_EXPORT_{org_id}_{iso}.xlsx`. Columns: `pushed_by_name`, `jd_id`, `pipeline_type`, `connection_name`, `ou_ref_id`, `status`, `stage_of_failure`, `csod_ou_id`, `csod_response_timestamp`, `csod_response_link`, `our_error`, `csod_error_code`, `csod_error_message`, `csod_error_fields`, `csod_http_status`, `pushed_at`.

---

## 17. Foundation Pipeline — `/foundation`

### `GET /foundation/push-records`
- **Purpose**: List CSOD pipeline push records. Admins see all org records; others only their own.
- **Auth**: `get_current_regular_user`
- **Query params**: `pipeline_type` (`foundation`|`bulk`, opt), `status` (`success`|`failed`, opt)
- **Response**: `200` — array of `CSODPipelinePushResponse`:
  ```json
  [
    {
      "id": "uuid", "org_id": "uuid", "pushed_by": "uuid", "pushed_by_name": "Jane Admin",
      "jd_id": "uuid", "pipeline_type": "foundation", "connection_name": "CSOD Production",
      "batch_id": null, "ou_ref_id": "TALENTFORGE_...", "status": "success",
      "stage_of_failure": null, "csod_ou_id": "123456", "csod_response_timestamp": "...",
      "csod_response_link": "https://...", "our_error": null, "csod_error_code": null,
      "csod_error_message": null, "csod_http_status": null, "pushed_at": "..."
    }
  ]
  ```

### `POST /foundation/process`
- **Purpose**: Push up to 150 JDs to CSOD as Position OUs in parallel (Foundation pipeline). Rate limited to 10/min.
- **Auth**: `get_current_regular_user` + role `Admin` (403)
- **Request body** — `FoundationPipelineRequest`:
  ```json
  { "jd_ids": ["uuid1", "uuid2"], "connection_name": "my-csod-prod" }
  ```
  Fields: `jd_ids` (list of UUID strings, req, 1–150), `connection_name` (str, opt — defaults to most recently tested active connection)
- **Response**: `200` — `FoundationSummarySchema`:
  ```json
  {
    "total_submitted": 2, "total_succeeded": 1, "total_failed": 1,
    "failure_breakdown": {"csod_create": 1},
    "failed_jd_ids": ["uuid"], "failed_records": [{"jd_id": "uuid", "error": "..."}]
  }
  ```
  Errors: `400` (>150 JDs), `401` (no org / no active connection), `404` (named connection not active), `500`, `502` (token fetch failure)

---

## 18. Bulk Pipeline — `/bulk`

### `POST /bulk/process`
- **Purpose**: Push up to 1,000 JDs to CSOD via the Bulk Import API (auto-chunked, 100/chunk). Rate limited to 10/min.
- **Auth**: `get_current_regular_user` + role `Admin` (403)
- **Request body** — `BulkPipelineRequest`:
  ```json
  { "jd_ids": ["uuid"], "connection_name": "my-csod-prod" }
  ```
  Fields: `jd_ids` (list of UUID strings, req, 1–1000), `connection_name` (str, opt)
- **Response**: `200` — `BulkSummarySchema`:
  ```json
  {
    "total_submitted": 150, "total_succeeded": 149, "total_failed": 1, "batches_processed": 2,
    "per_batch_results": [
      {
        "chunk_id": "e2b3...", "total_jds": 100, "total_succeeded": 99, "total_failed": 1,
        "failure_breakdown": {"7c9e6679-...": {"csod_error": "Not loaded", "csod_error_code": "CSV_ERROR", "csod_status": null}}
      }
    ],
    "failed_jd_ids": ["7c9e6679-..."]
  }
  ```
  Errors: `400`, `401`, `500`, `502`

---

## 19. Candidate Users — `/candidate-users`

### `POST /candidate-users/login`
- **Purpose**: Candidate login — returns a JWT. Rate limited to 5/min.
- **Auth**: None (public)
- **Request body** — `CandidateLoginRequest`: `email` (str 1–255, req), `password` (str 1–255, req)
  ```json
  { "email": "candidate@example.com", "password": "Password123!" }
  ```
- **Response**: `200` — service result (token + profile); `401` (bad credentials)

### `GET /candidate-users/me`
- **Purpose**: Get the current candidate's profile.
- **Auth**: `get_current_candidate`
- **Response**: `200` — `CandidateMeResponse`:
  ```json
  {
    "id": "uuid", "org_id": "uuid", "full_name": "John Candidate", "email": "john@example.com",
    "role": "Candidate", "company_name": "Acme Inc", "employee_id": "E123",
    "digital_signature_url": "https://.../sig.png", "created_at": "...", "updated_at": "..."
  }
  ```

### `POST /candidate-users/forgot_password/initiate`
- **Purpose**: Send a password-reset OTP to a candidate's email. Rate limited to 3/min.
- **Auth**: None
- **Query params**: `email` (str, req)
- **Response**: `200` — `{"message": "If the email exists in our system, you will receive a password reset code."}`

### `POST /candidate-users/forgot_password`
- **Purpose**: Reset a candidate password after OTP verification. Rate limited to 3/min.
- **Auth**: None
- **Request body** — `CandidateForgotPasswordRequest`:
  ```json
  {
    "email": "candidate@example.com",
    "otp": "123456",
    "new_password": "NewPassword123!",
    "confirm_password": "NewPassword123!"
  }
  ```
- **Response**: `200` — service result; `400` (validation)

### `POST /candidate-users/`
- **Purpose**: Create a candidate user (Admin only); sends welcome email.
- **Auth**: `get_current_regular_user` + role Admin (service-enforced)
- **Request body** — `CandidateUserCreate`:
  ```json
  {
    "full_name": "Jane Doe",
    "email": "jane@example.com",
    "password": "Password123!",
    "company_name": "Acme Inc",
    "employee_id": "E456"
  }
  ```
  Fields: `full_name` (str 1–255, req), `email` (EmailStr, req), `password` (str ≥8, req), `company_name` (str ≤255, opt), `employee_id` (str ≤50, opt)
- **Response**: `201` — `CandidateUserResponse`:
  ```json
  {
    "id": "uuid", "org_id": "uuid", "full_name": "Jane Doe", "email": "jane@example.com",
    "role": "Candidate", "company_name": "Acme Inc", "employee_id": "E456",
    "created_by": "uuid", "creator_name": "Admin User", "created_at": "...", "updated_at": "..."
  }
  ```

### `GET /candidate-users/`
- **Purpose**: List all candidate users in the org (Admin only).
- **Auth**: `get_current_regular_user` + role Admin
- **Response**: `200` — `{"candidates": [CandidateUserResponse...], "total": 1}`

### `GET /candidate-users/by-email/{email}`
- **Purpose**: Get a candidate by email (Admin only).
- **Auth**: + role Admin
- **Path params**: `email` (str)
- **Response**: `200` — `CandidateUserResponse`; `404`

### `PATCH /candidate-users/by-email/{email}`
- **Purpose**: Update a candidate by email (Admin only).
- **Auth**: + role Admin
- **Path params**: `email` (str)
- **Request body** — `CandidateUserUpdate` (all optional): `full_name`, `email`, `password`, `company_name`, `employee_id`
- **Response**: `200` — `CandidateUserResponse`; `404`

### `DELETE /candidate-users/by-email/{email}`
- **Purpose**: Soft-delete a candidate by email (Admin only).
- **Auth**: + role Admin
- **Path params**: `email` (str)
- **Response**: `200` — service result; `404`, `403`

### `POST /candidate-users/by-email/{email}/allot-jd`
- **Purpose**: Allot a JD to a candidate for sign-off (Admin only).
- **Auth**: + role Admin
- **Path params**: `email` (str)
- **Request body** — `AllotJDRequest`:
  ```json
  { "jd_id": "uuid", "due_date": "2026-09-01T00:00:00", "status": "pending" }
  ```
  Fields: `jd_id` (UUID, req), `due_date` (datetime, opt), `status` (str, opt, default `"pending"`)
- **Response**: `200` — `SignOffJDResponse` (assignment + JD snapshot fields + optional `message`)

### `POST /candidate-users/by-email/{email}/decision`
- **Purpose**: Submit a candidate decision for a JD assignment (submitted by an authenticated staff user).
- **Auth**: `get_current_regular_user`
- **Path params**: `email` (str)
- **Request body** — `CandidateDecisionRequest`:
  ```json
  {
    "jd_id": "uuid", "decision": "I accept the offer", "status": "completed",
    "email": "jane@example.com", "password": "Password123!",
    "terms_accepted": true, "digital_signature_url": null, "signature_method": "password"
  }
  ```
- **Response**: `200` — service result; `404`, `403`

### `GET /candidate-users/by-email/{email}/assignments`
- **Purpose**: List a candidate's JD assignments (Admin only).
- **Auth**: + role Admin
- **Path params**: `email` (str)
- **Response**: `200` — service result

### `GET /candidate-users/all-assignments`
- **Purpose**: List all JD assignments for the org (Admin only).
- **Auth**: + role Admin
- **Response**: `200` — service result

### `GET /candidate-users/my-assignments`
- **Purpose**: List the current candidate's JD assignments.
- **Auth**: `get_current_candidate`
- **Response**: `200` — service result

### `GET /candidate-users/assignments/{assignment_id}`
- **Purpose**: Get a specific assignment. Admins see any; regular users only their own.
- **Auth**: `get_current_regular_user`
- **Path params**: `assignment_id` (UUID)
- **Response**: `200` — service result; `404`, `403`

### `POST /candidate-users/verify-password`
- **Purpose**: Candidate password verification for a JD assignment (electronic signature); finalizes the decision.
- **Auth**: `get_current_candidate`
- **Request body** — `VerifyPasswordRequest`:
  ```json
  {
    "jd_id": "uuid", "password": "Password123!", "terms_accepted": true,
    "signature_method": "password", "digital_signature_url": null
  }
  ```
  `signature_method` must match `^(password|digital_signature)$`.
- **Response**: `200` — service result (a `VerifyPasswordResponse` shape exists but is not enforced as response_model); `400`, `403`

### `POST /candidate-users/upload-signature`
- **Purpose**: Upload a digital signature image for the candidate.
- **Auth**: `get_current_candidate`
- **Request body**: `multipart/form-data` — `file` (UploadFile, req)
- **Response**: `200` — service result

### `GET /candidate-users/my-sign`
- **Purpose**: Get the current candidate's digital signature URL.
- **Auth**: `get_current_candidate`
- **Response**: `200` — `{"success": true, "signature_url": "https://.../public/sig/<filename>", "candidate_id": "uuid"}`

### `GET /candidate-users/my-tasks`
- **Purpose**: Get the current candidate's tasks (Inbox).
- **Auth**: `get_current_candidate`
- **Query params**: `status` (`pending`|`completed`|`overdue`, opt — else 400)
- **Response**: `200` — array of `CandidateTaskResponse`:
  ```json
  [
    {
      "id": "task-1", "type": "JD_SIGN_OFF", "title": "Sign off Senior Engineer JD",
      "status": "pending", "due_date": "2026-09-01", "priority": "Medium",
      "description": "Review and sign", "jd_id": "uuid",
      "signature_type": null, "signature_data": null,
      "assigned_by": {"id": "uuid", "name": "Admin"}
    }
  ]
  ```

### `GET /candidate-users/dashboard-summary`
- **Purpose**: Candidate dashboard summary (stats, recent activity, tasks).
- **Auth**: `get_current_candidate`
- **Response**: `200` — service result

### `POST /candidate-users/bulk_assign_jd`
- **Purpose**: Assign a single JD to multiple candidates (Admin only).
- **Auth**: + role Admin
- **Query params**: `assignment_status` (str, opt, default `"pending"`)
- **Request body** — `BulkAssign`:
  ```json
  {
    "jd_id": "uuid",
    "data": [
      {"email": "jane@example.com", "due_date": "2026-09-01T00:00:00"},
      {"email": "john@example.com"}
    ]
  }
  ```
  Fields: `jd_id` (UUID, req), `data` (list ≥1 of `{email` EmailStr req, `due_date` datetime opt`)
- **Response**: `200` — service result; `403`, `500`

---

## 20. Job Applications — `/applications`

### `POST /applications/submit`
- **Purpose**: Submit a job application for a public JD.
- **Auth**: `get_current_user` (staff or candidate)
- **Request body** — `JobApplicationCreate`:
  ```json
  { "public_jd_id": "550e8400-e29b-41d4-a716-446655440000", "metadata": { "resume_id": "r1" } }
  ```
  Fields: `public_jd_id` (UUID, req), `metadata` (dict, opt)
- **Response**: `201` — `JobApplicationResponse`:
  ```json
  {
    "id": "uuid", "org_id": "uuid", "public_jd_id": "uuid", "original_jd_id": "uuid",
    "applicant_name": "Jane Doe", "applicant_email": "jane@example.com", "applicant_phone": null,
    "source": null, "status": "applied", "interview_stage": null, "comments": null,
    "application_metadata": {"resume_id": "r1"}, "created_at": "...", "updated_at": "..."
  }
  ```
  `400` (no org/email/ValueError), `403` (JD from another org), `404` (public JD missing)

### `GET /applications/`
- **Purpose**: List applications. Admins see all org applications; others only their own.
- **Auth**: `get_current_user`
- **Query params**: `public_jd_id` (UUID, opt), `status` (str, opt)
- **Response**: `200` — array of `JobApplicationResponse`

### `GET /applications/export/excel`
- **Purpose**: Export applicants for a public JD as Excel.
- **Auth**: `get_current_regular_user`
- **Query params**: `public_jd_id` (UUID, req)
- **Response**: `200` — `.xlsx` stream (`applicants_{first8}.xlsx`); columns: `S.No`, `Applicant Name`, `Email`, `Phone`, `Status`, `Interview Stage`, `Source`, `Comments`, `Applied At`, `Last Updated`. `400` (no org), `404` (no applications)

### `GET /applications/{application_id}`
- **Purpose**: Get one application (org-scoped).
- **Auth**: `get_current_regular_user`
- **Path params**: `application_id` (UUID)
- **Response**: `200` — `JobApplicationResponse`; `404`

### `PATCH /applications/{application_id}`
- **Purpose**: Update an application (status, interview stage, comments, metadata).
- **Auth**: `get_current_regular_user`
- **Path params**: `application_id` (UUID)
- **Request body** — `JobApplicationUpdate` (all optional):
  ```json
  { "status": "interviewing", "interview_stage": "Round 2", "comments": "Strong candidate" }
  ```
- **Response**: `200` — `JobApplicationResponse`; `404`

---

## 21. Analytics — `/analytics`

### `GET /analytics/jd-approval-funnel`
- **Purpose**: JD approval funnel data for visualization (`total_intake`, `manager_review`, `hr_review`, `accepted`, `rejected`, `rate`).
- **Auth**: `get_current_regular_user` + role Admin/Manager/HR (403 otherwise)
- **Response**: `200` — service result; `400` (no org)

### `GET /analytics/me/recent-activities`
- **Purpose**: Recent activities for the current user.
- **Auth**: `get_current_regular_user`
- **Query params**: `limit` (int, opt, default 20)
- **Response**: `200` — service result; `400` (no org)

### `GET /analytics/users/{user_id}/recent-activities`
- **Purpose**: Recent activities for a specific user (Admin/Manager/HR, or self).
- **Auth**: `get_current_regular_user` + role/ownership check
- **Path params**: `user_id` (str)
- **Query params**: `limit` (int, opt, default 20)
- **Response**: `200` — service result; `400`, `403`

### `GET /analytics/unified-engine-overview`
- **Purpose**: Unified analytics engine overview (sets response cache headers).
- **Auth**: `get_current_regular_user` + role Admin/Manager/HR
- **Response**: `200` — service result; `400`, `403`

---

## 22. Super Admin — `/super-admin`

### `POST /super-admin/organizations/with-admin`
- **Purpose**: Create an org + default admin user in one step (multipart).
- **Auth**: `get_current_super_admin`
- **Request body**: `multipart/form-data`:
  - `org_name` (str 2–100, req), `org_industry` (str ≤100, opt), `org_image` (UploadFile, opt)
  - `admin_full_name` (str 3–50, req), `admin_email` (EmailStr, req), `admin_password` (str ≥8, req), `admin_country` (str 2–120, req), `admin_color_code` (str, opt, e.g. `#ece75c`)
- **Response**: `201` — free-form dict (created org/admin details)

### `GET /super-admin/organizations/members-by-name`
- **Purpose**: Get grouped member details for an org by name.
- **Auth**: `get_current_super_admin`
- **Query params**: `org_name` (str ≥1, req)
- **Response**: `200` — `OrgMembersGroupedResponse`:
  ```json
  {
    "organization_id": "uuid", "organization_name": "Acme Inc",
    "admins": [{"id": "uuid", "name": "Jane Admin", "email": "jane@acme.com", "status": "active", "user_type": "regular"}],
    "managers": [], "hr": [], "end_users": []
  }
  ```

### `PATCH /super-admin/organizations/{org_id}`
- **Purpose**: Partially update an org (name, industry, image_url).
- **Auth**: `get_current_super_admin`
- **Path params**: `org_id` (UUID)
- **Request body** — `OrganizationUpdate` (all optional): `name`, `industry`, `image_url`
- **Response**: `200` — `OrganizationResponse`

### `GET /super-admin/organizations`
- **Purpose**: List all organizations.
- **Auth**: `get_current_super_admin`
- **Response**: `200` — array of `OrganizationResponse`

### `PATCH /super-admin/organizations/{org_id}/access`
- **Purpose**: Update org access (active status + expiry).
- **Auth**: `get_current_super_admin`
- **Path params**: `org_id` (UUID)
- **Request body** — `OrganizationAccessUpdate`:
  ```json
  { "is_active": true, "access_valid_until": "2026-12-31T00:00:00" }
  ```
  Fields: `is_active` (bool, req), `access_valid_until` (datetime, opt)
- **Response**: `200` — `OrganizationResponse`

### `GET /super-admin/analytics/jds`
- **Purpose**: JD creation analytics (daily/monthly/yearly) per org.
- **Auth**: `get_current_super_admin`
- **Response**: `200` — array of `OrgJDAnalyticsResponse`:
  ```json
  {
    "org_id": "uuid", "org_name": "Acme Inc",
    "daily_count": 2, "monthly_count": 15, "yearly_count": 120, "total_count": 300,
    "total_users": 45, "admin_count": 2, "hr_count": 3, "manager_count": 10, "enduser_count": 30
  }
  ```

### `POST /super-admin/broadcasts`
- **Purpose**: Create a broadcast message.
- **Auth**: `get_current_super_admin`
- **Request body** — `BroadcastMessageCreate`:
  ```json
  { "title": "Maintenance", "message": "Scheduled downtime tonight.", "type": "warning", "is_active": true, "expires_at": "2026-08-12T23:00:00" }
  ```
  Fields: `title` (str 1–255, req), `message` (str ≥1, req), `type` (str, opt, default `"info"`), `is_active` (bool, opt, default true), `expires_at` (datetime, opt)
- **Response**: `200` — `BroadcastMessageResponse`:
  ```json
  {
    "id": "uuid", "title": "Maintenance", "message": "Scheduled downtime tonight.",
    "type": "warning", "is_active": true, "expires_at": "...",
    "created_at": "...", "updated_at": "...", "created_by_id": "uuid"
  }
  ```

### `GET /super-admin/broadcasts`
- **Purpose**: Get all broadcast messages (active and inactive).
- **Auth**: `get_current_super_admin`
- **Response**: `200` — array of `BroadcastMessageResponse`

### `PATCH /super-admin/broadcasts/{broadcast_id}`
- **Purpose**: Update a broadcast message.
- **Auth**: `get_current_super_admin`
- **Path params**: `broadcast_id` (UUID)
- **Request body** — `BroadcastMessageUpdate` (all optional): `title`, `message`, `type`, `is_active`, `expires_at`
- **Response**: `200` — `BroadcastMessageResponse`

### `DELETE /super-admin/broadcasts/{broadcast_id}`
- **Purpose**: Delete a broadcast message.
- **Auth**: `get_current_super_admin`
- **Path params**: `broadcast_id` (UUID)
- **Response**: `204` No Content

### `GET /super-admin/broadcasts/active`
- **Purpose**: Get all currently active broadcasts (platform announcements).
- **Auth**: `get_current_user` (any authenticated user)
- **Response**: `200` — array of `BroadcastMessageResponse`

---

## Notes & Caveats

- **Endpoints not registered in `main.py`** (routers exist but are not included): `chat_routes.py`, `file_routes.py`, `integration_routes.py`. They are **not** exposed.
- **Hidden from OpenAPI**: `skill-taxonomy` router (`include_in_schema=False`), and the two image upload JD endpoints (`create_from_template_with_image`, `generate_with_image`).
- **Response shapes marked "service result"** are returned by service-layer functions without a declared `response_model`, so their JSON is not statically enforced by the router code.
- **Default success status**: FastAPI returns `200` unless a `status_code` is declared (e.g. `201` on several create endpoints, `204` on deletes).
- **Rate limits** (`slowapi`): login 5/min, signup 3/min, OTP endpoints 3–10 per 5 min, AI JD generation 30/min, CSOD token/push 5–20/min, foundation/bulk pipelines 10/min. Exceeding returns `429`.
- **Security middleware** (applies to all endpoints): request body limit 10 MB (413), `x-request-id` header on responses, security headers (`x-content-type-options`, `x-frame-options`, `referrer-policy`, `x-xss-protection`, `permissions-policy`, `content-security-policy`, `strict-transport-security`), `TRACE`/`CONNECT` methods rejected (405).
