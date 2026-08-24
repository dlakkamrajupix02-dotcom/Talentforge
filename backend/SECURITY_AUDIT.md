# Security Audit — Talent Forge (SABA) API

**Date:** 2026-08-11
**Scope:** Static review of the FastAPI backend (`app/`) for production-readiness and security posture.
**Method:** Manual code review of auth, session management, RBAC/IDOR, secrets hygiene, middleware, rate limiting, and dependencies. All findings are evidence-backed with `file:line` references.

---

## Executive Summary

The codebase has a strong security baseline: org-scoped access control is applied consistently across service layers, OAuth state is CSRF-protected, MFA is implemented with encrypted secrets, and the middleware stack is unusually thorough. However, there are **3 critical** file-exposure issues (unauthenticated `/private/uploads`, presence-only token check on `/static`), **1 critical** secrets-hygiene gap (no `.gitignore`), and a **weak JWT signing key** (15-char `SECRET_KEY`). These should be addressed before any external deployment.

---

## Findings Summary

| # | Severity | Area | Finding |
|---|----------|------|---------|
| C1 | Critical | File exposure | `/private/uploads` mounted with **no auth** (`main.py:335`) |
| C2 | Critical | File exposure | `/static/{filepath}` validates token **presence only**, not validity/org (`main.py:312-332`) |
| C3 | Critical | Secrets hygiene | `.env` holds live secrets; **no `.gitignore`** in repo root |
| H1 | High | Crypto | `SECRET_KEY` is only **15 characters** (weak for HS256 JWT) |
| H2 | High | MFA | Backup codes stored **plaintext**, `"|"`-joined in DB (`auth_routes.py:421`) |
| H3 | High | Crypto | Dev fallback derives Fernet key from `SECRET_KEY` (`crypto.py`) — same weak secret signs JWTs *and* encrypts data |
| M1 | Medium | OTP | OTP codes stored **plaintext** in DB (`otp_service.py:225`) |
| M2 | Medium | Dependencies | `requirements.txt` partially unpinned (supply-chain drift) |
| M3 | Medium | Tooling | No test suite, no CI config, no `.env.example` |
| M4 | Medium | Hygiene | Unused `from docx import settings` shadows settings (`schemas.py:5`) |
| M5 | Medium | Config | `COUNTRY_OVERRIDE` hardcodes geo lookups in `.env` |
| M6 | Medium | Dead code | `integration_routes.py` unregistered in `main.py`; if ever mounted, `/csod/connect` uses `get_current_user` + untyped `dict` body |
| L1 | Low | Rate limit | `/auth/refresh_token` has **no** rate limit (`auth_routes.py:725`) |
| L2 | Low | Cookies | OAuth `oauth_state` cookie lacks `Secure` flag (`auth_routes.py:58`) |
| L3 | Low | Rate limit | `rate_limiter.py` comments contradict fail-open vs fail-closed on Redis outage |

---

## Critical Findings

### C1 — `/private/uploads` mounted without authentication
- **Evidence:** `app/main.py:335` — `app.mount("/private/uploads", StaticFiles(directory="private/uploads"), name="private_uploads")`
- **Impact:** The comment "Private uploads remain protected" is misleading. `StaticFiles` mounts accept no auth dependency; **any** file under `private/uploads/` (signatures, org documents — see `file_storage.py` `UPLOADS_ROOT = "private/uploads"`) is world-readable.
- **Fix:** Replace the mount with a guarded endpoint (like the `/static` handler below, but fully validating), or move sensitive files to an S3 bucket with pre-signed URLs.

### C2 — `/static/{filepath}` checks token presence only
- **Evidence:** `app/main.py:312-332`; in particular the admission at line 325: *"In a real app we'd fully validate the token here. For this fix, we just ensure it exists."*
- **Impact:** Any valid token (including a low-privilege **candidate** token, since `get_current_user` accepts candidates) can fetch any static file. Path-traversal is blocked (lines 327-330), but **no org-scoping or token validation** is done. Org images and JD uploads are potentially cross-org readable.
- **Fix:** Decode + verify the JWT, load the user, and check the file path against the user's `org_id` before serving.

### C3 — `.env` secrets unguarded, no `.gitignore`
- **Evidence:** Repo root contains `.env` with live secrets (`SECRET_KEY`, `SMTP_PASSWORD`, `AI_API_KEY`, `GOOGLE_OAUTH_STATE_SECRET`, `MICROSOFT_OAUTH_CLIENT_SECRET`, `CSOD_ENCRYPTION_KEY`, DB URL, Redis URL). No `.gitignore` exists; repo is currently **not** a git repo.
- **Impact:** A single `git init` + commit exposes all secrets. This is the highest-blast-radius issue in the audit.
- **Fix:** Add `.gitignore` (`.env`, `*.env`, `private/`, `static/uploads/`), add `.env.example` with placeholders, and rotate all secrets.

---

## High Findings

### H1 — Weak JWT signing key
- **Evidence:** `SECRET_KEY` value in `.env` is only 15 characters; used for HS256 via `python-jose` (`auth_service.py`).
- **Impact:** HS256 keys are brute-forceable offline if a token is captured; 15 chars of printable ASCII is well below the recommended 256-bit key.
- **Fix:** Generate 32+ random bytes (`python -c "import secrets; print(secrets.token_urlsafe(32))"`), rotate the key, and enforce a minimum length in `config.py` (fail startup if too short in prod).

### H2 — MFA backup codes stored in plaintext
- **Evidence:** `app/routers/auth_routes.py:421` — `backup_codes="|".join(backup_codes)` written directly to the user record.
- **Impact:** DB compromise yields working backup codes. The TOTP secret itself is Fernet-encrypted (`store_secret`), so backup codes are the weak link.
- **Fix:** Store a salted hash of each code; verify one-time via hash + mark used.

### H3 — Fernet key derived from `SECRET_KEY` in dev
- **Evidence:** `app/core/crypto.py` — `_derive_fernet_key()` requires `CSOD_ENCRYPTION_KEY` in production but falls back to `SHA256(SECRET_KEY)` otherwise.
- **Impact:** If `CSOD_ENCRYPTION_KEY` is unset in a deployed env, the same low-entropy secret used for JWT signing also encrypts TOTP secrets and CSOD credentials.
- **Fix:** Make `CSOD_ENCRYPTION_KEY` mandatory at startup (no dev fallback outside `ENV=dev`), and never reuse keys across purposes.

---

## Medium Findings

### M1 — OTP codes stored in plaintext
- **Evidence:** `app/services/otp_service.py:225` — `if otp_record.otp_code != otp_code` compares against the stored code.
- **Impact:** DB leak enables OTP replay (mitigated by 5-minute expiry + attempt limits + invalidation on use, but a DB-leak scenario would also allow enumeration).
- **Fix:** Store a hash of the OTP, or use a signed token/Redis TTL instead of a DB column.

### M2 — Partially unpinned dependencies
- **Evidence:** `requirements.txt` — loose pins for `openai>=1.30.0`, `groq>=0.9.0`, `mistralai`, `langchain-core`, `langchain-mistralai`, `pypdf`, `aiofiles`, `geoip2`, `cachetools`.
- **Fix:** Pin exact versions (or use hashes) and run `pip-audit` in CI.

### M3 — No tests / CI / `.env.example`
- **Evidence:** No `tests/` directory, no CI config, no `.env.example` (audit via glob).
- **Fix:** Add pytest suite (deps already include `pytest==9.0.2`, `pytest-asyncio==1.3.0`), a CI pipeline, and a documented `.env.example`.

### M4 — Unused/misleading import
- **Evidence:** `app/schemas/schemas.py:5` — `from docx import settings` (unused; shadows the settings module).
- **Fix:** Remove the import.

### M5 — Hardcoded country override
- **Evidence:** `COUNTRY_OVERRIDE` present in `.env`; `client_ip.py` normalizes via `normalize_country_value`.
- **Impact:** Silently forces one country for all geo-aware logic (EEO, compliance).
- **Fix:** Use only in staging, or gate behind `ENV`.

### M6 — Unregistered integration router (dead code risk)
- **Evidence:** `app/routers/integration_routes.py` defines `/integrations/csod/connect|test|push` with `get_current_user` (candidates included) and `data: dict` bodies; it is **not** in `main.py`'s `include_router` list.
- **Impact:** Not currently reachable; if mounted later, it is under-constrained (no `require_admin`, untyped bodies).
- **Fix:** Delete or harden (typed schemas + admin role check) if re-enabled.

---

## Low Findings

### L1 — `/auth/refresh_token` unthrottled
- **Evidence:** `auth_routes.py:725` — no `@limiter.limit(...)` (unlike login 5/min, OTP 3/min).
- **Fix:** Add a limit (e.g. `10/minute`).

### L2 — OAuth state cookie lacks `Secure`
- **Evidence:** `auth_routes.py:58` — `set_cookie(..., httponly=True, samesite="lax", max_age=600)` — no `secure=True`.
- **Fix:** Add `secure=True` (already beneficial with the enforced HTTPS redirect).

### L3 — Rate-limiter fail-open/fail-closed contradiction
- **Evidence:** `app/core/rate_limiter.py` comments state both that requests are "blocking" when Redis is down and that limiting is "disabled but application should still function".
- **Fix:** Decide one policy; document it; if fail-open, add an in-memory fallback.

---

## What's Done Well (verified)

- **OAuth CSRF protection:** state cookie compared server-side (`auth_routes.py:68-70`), HttpOnly + SameSite=Lax + 10-min expiry.
- **MFA login flow:** TOTP secret stored Fernet-encrypted; MFA challenge issues a `temp_token` with `sid=None`; org MFA policy enforced (`should_require_mfa_for_role`).
- **Password policy:** min 12 chars, max 72 bytes, 4 character classes, bcrypt hashing (`auth_service.py`).
- **Session control:** single-session policy (login closes previous sessions); admin password reset invalidates tokens + closes sessions and logs `SECURITY: Admin ... reset password`.
- **Fail-closed auth:** session validation checks Redis first with DB fallback, denying on uncertainty (`dependencies.py`).
- **Consistent org-scoping:** `org_id` taken from `current_user`, never from request bodies, across `candidate_user_service.py` (lines 206, 229, 262, 279, 301, 404, 410, 460), `chat_service.py:18,41`, `application_service.py:11,13`, `competency_service.py:16,45,63`.
- **Resilience:** DB circuit breaker (`database.py`), Redis-backed slowapi limiter, `/health` readiness with DB/Redis/cache + circuit stats (`main.py:342-386`).
- **Hardening middleware:** security headers (CSP, HSTS, X-Frame-Options DENY, nosniff), TRACE/CONNECT rejection, IIS path-override header stripping, 10MB request-size cap, request-ID tracing (`main.py`).
- **Rate limiting:** auth (login 5/min, OTP 3/min), email-verification, CSOD, candidate-user, bulk pipeline (10/min) routes all limited.
- **Path traversal defenses:** `/static` resolves + prefixes against the base dir (`main.py:327-330`).
- **CSOD credential encryption:** `base_url_enc = encrypt_str(base_url)` at rest (`csod_service.py:182`).
- **Unauthorized-email non-disclosure:** password-reset initiate returns a generic message whether or not the email exists (`auth_routes.py:785-786`).

---

## Recommended Remediation Order

1. **Secrets hygiene (C3):** add `.gitignore` + `.env.example`, rotate all secrets, enforce min `SECRET_KEY` length in `config.py`.
2. **File exposure (C1, C2):** auth-guard `/private/uploads` and fully validate tokens + org ownership on `/static`.
3. **Backup codes (H2) + OTP hashing (M1):** hash at rest, one-time-use semantics.
4. **Key management (H1, H3):** 32+ byte `SECRET_KEY`, mandatory `CSOD_ENCRYPTION_KEY` outside dev.
5. **Minor hardening:** `Secure` flag on `oauth_state`, rate-limit `refresh_token`, remove dead `integration_routes.py`, drop `COUNTRY_OVERRIDE` outside staging.
6. **Process:** pin dependencies, add tests + CI, remove the `docx.settings` import.
