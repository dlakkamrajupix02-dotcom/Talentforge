from __future__ import annotations
import secrets
from typing import Any
from urllib.parse import urlencode, urlparse
import httpx
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger()

PROVIDER_ALIAS = {
    "microsoft": "microsoft",
    "office365": "microsoft",
    "outlook": "microsoft",
    "linkedin": "linkedin",
    "google": "google",
    "cornerstone": "cornerstone",
    "csod": "cornerstone",
}

GOOGLE_DEFAULTS = {
    "authorize_url": "https://accounts.google.com/o/oauth2/v2/auth",
    "token_url": "https://oauth2.googleapis.com/token",
    "userinfo_url": "https://openidconnect.googleapis.com/v1/userinfo",
    "scopes": "openid profile email",
}

MICROSOFT_DEFAULTS = {
    "authorize_url": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    "token_url": "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    "userinfo_url": "https://graph.microsoft.com/v1.0/me",
    "scopes": "openid profile email User.Read",
}

LINKEDIN_DEFAULTS = {
    "authorize_url": "https://www.linkedin.com/oauth/v2/authorization",
    "token_url": "https://www.linkedin.com/oauth/v2/accessToken",
    "userinfo_url": "https://api.linkedin.com/v2/me",
    "email_url": "https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))",
    "scopes": "r_liteprofile r_emailaddress",
}

CORNERSTONE_DEFAULTS = {
    "authorize_url": "https://cornerstone.com/oauth/authorize",
    "token_url": "https://cornerstone.com/oauth/token",
    "userinfo_url": "https://cornerstone.com/oauth/userinfo",
    "scopes": "openid profile email",
}


class OAuthError(Exception):
    pass


def normalize_oauth_provider(provider: str) -> str:
    provider = provider.strip().lower()
    if provider not in PROVIDER_ALIAS:
        raise OAuthError(f"Unsupported OAuth provider: {provider}")
    return PROVIDER_ALIAS[provider]


def _get_provider_settings(provider: str) -> dict[str, Any]:
    provider = normalize_oauth_provider(provider)
    if provider == "google":
        return {
            "client_id": settings.google_oauth_client_id,
            "client_secret": settings.google_oauth_client_secret,
            "authorize_url": settings.google_auth_url or GOOGLE_DEFAULTS["authorize_url"],
            "token_url": settings.google_token_url or GOOGLE_DEFAULTS["token_url"],
            "userinfo_url": settings.google_userinfo_url or GOOGLE_DEFAULTS["userinfo_url"],
            "scopes": settings.google_oauth_scopes or GOOGLE_DEFAULTS["scopes"],
            "redirect_uri": settings.google_redirect_uri,
        }
    if provider == "microsoft":
        return {
            "client_id": settings.microsoft_oauth_client_id,
            "client_secret": settings.microsoft_oauth_client_secret,
            "authorize_url": settings.microsoft_oauth_auth_url or MICROSOFT_DEFAULTS["authorize_url"],
            "token_url": settings.microsoft_oauth_token_url or MICROSOFT_DEFAULTS["token_url"],
            "userinfo_url": settings.microsoft_oauth_userinfo_url or MICROSOFT_DEFAULTS["userinfo_url"],
            "scopes": settings.microsoft_oauth_scopes or MICROSOFT_DEFAULTS["scopes"],
            "redirect_uri": settings.microsoft_oauth_redirect_uri,
        }
    if provider == "linkedin":
        return {
            "client_id": settings.linkedin_oauth_client_id,
            "client_secret": settings.linkedin_oauth_client_secret,
            "authorize_url": settings.linkedin_oauth_auth_url or LINKEDIN_DEFAULTS["authorize_url"],
            "token_url": settings.linkedin_oauth_token_url or LINKEDIN_DEFAULTS["token_url"],
            "userinfo_url": settings.linkedin_oauth_userinfo_url or LINKEDIN_DEFAULTS["userinfo_url"],
            "email_url": settings.linkedin_oauth_email_url or LINKEDIN_DEFAULTS["email_url"],
            "scopes": settings.linkedin_oauth_scopes or LINKEDIN_DEFAULTS["scopes"],
            "redirect_uri": settings.linkedin_oauth_redirect_uri,
        }
    if provider == "cornerstone":
        return {
            "client_id": settings.cornerstone_oauth_client_id,
            "client_secret": settings.cornerstone_oauth_client_secret,
            "authorize_url": settings.cornerstone_oauth_auth_url or CORNERSTONE_DEFAULTS["authorize_url"],
            "token_url": settings.cornerstone_oauth_token_url or CORNERSTONE_DEFAULTS["token_url"],
            "userinfo_url": settings.cornerstone_oauth_userinfo_url or CORNERSTONE_DEFAULTS["userinfo_url"],
            "scopes": settings.cornerstone_oauth_scopes or CORNERSTONE_DEFAULTS["scopes"],
            "redirect_uri": settings.cornerstone_oauth_redirect_uri,
        }
    raise OAuthError(f"Unsupported OAuth provider: {provider}")


def build_authorize_url(provider: str, redirect_uri: str | None = None, state: str | None = None) -> tuple[str, str]:
    config = _get_provider_settings(provider)
    client_id = config.get("client_id")
    if not client_id:
        raise OAuthError(f"OAuth provider configuration is missing client_id for {provider}")
    if not redirect_uri:
        redirect_uri = config.get("redirect_uri")
    if not redirect_uri:
        raise OAuthError("Redirect URI is required for OAuth authorization URL generation.")

    state = state or secrets.token_urlsafe(16)
    query = {
        "client_id": client_id,
        "response_type": "code",
        "redirect_uri": redirect_uri,
        "scope": config.get("scopes", ""),
        "state": state,
    }

    if provider == "linkedin":
        query["response_type"] = "code"
        query["scope"] = config.get("scopes", "")

    authorize_url = config["authorize_url"].rstrip("/") + "?" + urlencode({k: v for k, v in query.items() if v is not None})
    return authorize_url, state


async def exchange_code_for_access_token(provider: str, code: str, redirect_uri: str | None, client: httpx.AsyncClient) -> dict[str, Any]:
    config = _get_provider_settings(provider)
    token_url = config["token_url"]
    client_id = config.get("client_id")
    client_secret = config.get("client_secret")
    if not client_id or not client_secret:
        raise OAuthError(f"OAuth provider configuration is incomplete for {provider}")
    if not redirect_uri:
        redirect_uri = config.get("redirect_uri")
    if not redirect_uri:
        raise OAuthError("Redirect URI is required to exchange OAuth code for a token.")

    form = {
        "client_id": client_id,
        "client_secret": client_secret,
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": redirect_uri,
    }

    headers = {"Accept": "application/json"}
    response = await client.post(token_url, data=form, headers=headers)
    try:
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        logger.warning("OAuth token exchange failed for %s: %s", provider, exc)
        raise OAuthError("OAuth token exchange failed") from exc

    token_data = response.json()
    access_token = token_data.get("access_token")
    if not access_token:
        raise OAuthError("OAuth provider did not return an access token.")
    return token_data


async def fetch_oauth_user_info(provider: str, access_token: str, client: httpx.AsyncClient) -> dict[str, str]:
    provider = normalize_oauth_provider(provider)
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/json",
    }

    if provider == "google":
        config = _get_provider_settings(provider)
        user_url = config["userinfo_url"]
        response = await client.get(user_url, headers=headers)
        try:
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            logger.warning("Google userinfo fetch failed: %s - Response: %s", exc, exc.response.text)
            raise OAuthError("Failed to fetch user profile from Google.") from exc
        payload = response.json()
        email = payload.get("email")
        if not email:
            raise OAuthError("Google user profile did not provide an email address.")
        return {
            "email": email.lower(),
            "full_name": payload.get("name", "") or "",
            "provider_id": payload.get("sub", ""),
        }

    if provider == "microsoft":
        config = _get_provider_settings(provider)
        user_url = config["userinfo_url"]
        response = await client.get(user_url, headers=headers)
        try:
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            logger.warning("Microsoft userinfo fetch failed: %s - Response: %s", exc, exc.response.text)
            raise OAuthError("Failed to fetch user profile from Microsoft.") from exc
        payload = response.json()
        email = payload.get("mail") or payload.get("userPrincipalName")
        if not email:
            raise OAuthError("Microsoft user profile did not provide an email address.")
        return {
            "email": email.lower(),
            "full_name": payload.get("displayName", "") or "",
            "provider_id": payload.get("id", ""),
        }

    if provider == "linkedin":
        config = _get_provider_settings(provider)
        user_url = config["userinfo_url"]
        response = await client.get(user_url, headers=headers)
        try:
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            logger.warning("LinkedIn profile fetch failed: %s", exc)
            raise OAuthError("Failed to fetch user profile from LinkedIn.") from exc
        profile = response.json()
        
        # Check if using modern OpenID Connect (OIDC) userinfo endpoint
        if "email" in profile:
            full_name = profile.get("name", "")
            if not full_name:
                given = profile.get("given_name", "")
                family = profile.get("family_name", "")
                full_name = " ".join(p for p in (given, family) if p).strip()
            return {
                "email": profile["email"].lower(),
                "full_name": full_name,
                "provider_id": profile.get("sub", profile.get("id", "")),
            }

        # Fallback to legacy v2 profile/email flow
        email_response = await client.get(config["email_url"], headers=headers)
        try:
            email_response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            logger.warning("LinkedIn email fetch failed: %s", exc)
            raise OAuthError("Failed to fetch email from LinkedIn.") from exc
        email_payload = email_response.json()
        email = None
        elements = email_payload.get("elements", [])
        if elements and isinstance(elements, list):
            handle = elements[0].get("handle~")
            if handle:
                email = handle.get("emailAddress")
        if not email:
            raise OAuthError("LinkedIn did not return an email address.")
        first_name = profile.get("localizedFirstName", "")
        last_name = profile.get("localizedLastName", "")
        full_name = " ".join(part for part in (first_name, last_name) if part).strip()
        return {
            "email": email.lower(),
            "full_name": full_name or "",
            "provider_id": profile.get("id", ""),
        }

    if provider == "cornerstone":
        config = _get_provider_settings(provider)
        user_url = config["userinfo_url"]
        response = await client.get(user_url, headers=headers)
        try:
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            logger.warning("Cornerstone userinfo fetch failed: %s - Response: %s", exc, exc.response.text)
            raise OAuthError("Failed to fetch user profile from Cornerstone.") from exc
        payload = response.json()
        email = payload.get("email") or payload.get("userPrincipalName") or payload.get("userName")
        if not email:
            raise OAuthError("Cornerstone user profile did not provide an email address.")
        return {
            "email": email.lower(),
            "full_name": payload.get("displayName", payload.get("name", "")) or "",
            "provider_id": payload.get("id", payload.get("sub", "")),
        }

    raise OAuthError(f"Unsupported OAuth provider: {provider}")


def _derive_csod_base_url(token_url: str) -> str | None:
    """Derive portal base URL from an OAuth token URL."""
    if not token_url:
        return None
    parsed = urlparse(token_url.strip())
    if not parsed.scheme or not parsed.netloc:
        return None
    return f"{parsed.scheme}://{parsed.netloc}"


def _normalize_csod_value(value: str | None) -> str:
    return (value or "").strip().lower()


def _employee_record(payload: dict | list) -> dict | None:
    if isinstance(payload, list):
        return payload[0] if payload else None
    if isinstance(payload, dict):
        data = payload.get("data")
        if isinstance(data, list) and data:
            return data[0]
        if isinstance(data, dict):
            return data
        records = payload.get("records")
        if isinstance(records, list) and records:
            return records[0]
        if payload.get("externalId") or payload.get("userName") or payload.get("email"):
            return payload
    return None


async def verify_cornerstone_user_id(
    client: httpx.AsyncClient,
    *,
    access_token: str,
    user_id: str,
    base_url: str | None = None,
) -> dict:
    """
    Verify that user_id exists in Cornerstone and return normalized profile fields.
    user_id is treated as CSOD externalId (User Ref).
    """
    portal_base = base_url or _derive_csod_base_url(settings.cornerstone_oauth_token_url or "")
    if not portal_base:
        raise ValueError("Cornerstone portal base URL is not configured.")

    external_id = user_id.strip()
    url = f"{portal_base.rstrip('/')}/services/api/x/users/v2/employees"
    headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/json"}
    resp = await client.get(url, params={"externalId": external_id}, headers=headers, timeout=15.0)
    resp.raise_for_status()
    employee = _employee_record(resp.json())
    if not employee:
        raise ValueError("Cornerstone user not found for the supplied User ID.")

    csod_external = _normalize_csod_value(employee.get("externalId") or employee.get("userRef"))
    csod_username = _normalize_csod_value(employee.get("userName"))
    requested = _normalize_csod_value(external_id)

    if csod_external and csod_external != requested and csod_username != requested:
        raise ValueError("Cornerstone user identity mismatch.")

    status_value = _normalize_csod_value(str(employee.get("status") or employee.get("employmentStatus") or "active"))
    if status_value in {"inactive", "terminated", "disabled"}:
        raise ValueError("Cornerstone user account is not active.")

    return {
        "external_id": employee.get("externalId") or external_id,
        "user_name": employee.get("userName") or "",
        "email": (employee.get("email") or employee.get("primaryEmail") or "").strip().lower(),
        "full_name": (employee.get("fullName") or employee.get("displayName") or "").strip(),
    }


def local_account_matches_cornerstone(
    *,
    identifier: str,
    account_email: str | None,
    csod_profile: dict,
) -> bool:
    """Ensure the local account corresponds to the verified Cornerstone profile."""
    local_email = _normalize_csod_value(account_email)
    csod_email = _normalize_csod_value(csod_profile.get("email"))
    if local_email and csod_email and local_email == csod_email:
        return True

    ident = _normalize_csod_value(identifier)
    csod_external = _normalize_csod_value(csod_profile.get("external_id"))
    csod_username = _normalize_csod_value(csod_profile.get("user_name"))
    return ident in {csod_external, csod_username, csod_email}
