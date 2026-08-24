import re
from typing import Optional, Any
from email_validator import validate_email as email_validator_lib, EmailNotValidError


VALID_ROLES: list[str] = ["Super_Admin", "Admin", "Manager", "HR", "User"]



_ORG_NAME_PATTERN = re.compile(r"[A-Za-z0-9_. &-]+")


_DISPOSABLE_DOMAINS = {
    "tempmail.com", "throwaway.com", "guerrillamail.com", "mailinator.com",
    "10minutemail.com", "dispostable.com", "mailnesia.com", "tempail.com",
    "fakeinbox.com", "temp-mail.org", "getairmail.com", "yopmail.com",
    "maildrop.cc", "sharklasers.com", "grr.la", "guerrillamailblock.com",
}

_FULL_NAME_PATTERN = re.compile(r"[A-Za-z0-9_. ]+")


def validate_password_strength(value: str) -> str:
    """
    Enforce character-class and length rules on a plaintext password.
    Rules:
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    - At least one special character (non-alphanumeric)
    - Max 72 UTF-8 bytes (bcrypt limit)
    """
    if not re.search(r"[A-Z]", value):
        raise ValueError("Password must contain at least one uppercase letter")
    if not re.search(r"[a-z]", value):
        raise ValueError("Password must contain at least one lowercase letter")
    if not re.search(r"\d", value):
        raise ValueError("Password must contain at least one digit")
    if not re.search(r"[^A-Za-z0-9]", value):
        raise ValueError("Password must contain at least one special character")
    if len(value.encode("utf-8")) > 72:
        raise ValueError("Password is too long (maximum 72 bytes)")
    return value



def validate_full_name(value: str) -> str:
    """Letters, numbers, spaces, dots, underscores only. Strips whitespace."""
    if not re.fullmatch(_FULL_NAME_PATTERN, value):
        raise ValueError("Name must contain only letters, numbers, spaces, dots, and underscores")
    return value.strip()


def validate_org_name(value: str) -> str:
    """Organization name: letters, numbers, spaces, dots, ampersands, hyphens."""
    if not re.fullmatch(_ORG_NAME_PATTERN, value):
        raise ValueError("Organization name must contain only letters, numbers, spaces, "
            "dots, ampersands, and hyphens")
    return value.strip()


def validate_user_role(value: str) -> str:
    """Ensure value is one of the accepted user roles."""
    if value not in VALID_ROLES:
        raise ValueError(f"Role must be one of: {', '.join(VALID_ROLES)}")
    return value

def validate_section_name(value: str) -> str:
    """Ensure the section name is valid (supports dynamic/custom sections)."""
    if not value or not value.strip():
        raise ValueError("section_name cannot be empty")
    return value


def validate_email(value: str) -> str:
    """
    Email validation:
    """
    if not value or not value.strip():
        raise ValueError("Email address cannot be empty")

    value = value.strip().lower()

    try:
        validated = email_validator_lib(value, check_deliverability=False, dns_resolver=None)
        normalized_email = validated.email

    except EmailNotValidError as e:
        raise ValueError(f"Invalid email address: {str(e)}")

    domain = normalized_email.split("@")[1]

    if domain in _DISPOSABLE_DOMAINS:
        raise ValueError("Disposable email addresses are not allowed")

    return normalized_email


def truncate_field(value: Optional[Any], max_len: int) -> Optional[Any]:
    """Silently truncate a string field to ``max_len`` characters if it exceeds the limit."""
    if not value or not isinstance(value, str):
        return value
    if len(value) > max_len:
        return value[:max_len] + "..."
    return value


def validate_salary_range(min_value: Optional[str], max_value: Optional[str]) -> None:
    """Validate that minimum salary is less than maximum salary."""
    if min_value is None or max_value is None:
        return  
    
    try:
        min_num = float(min_value)
        max_num = float(max_value)
    except (ValueError, TypeError):
        raise ValueError("Salary values must be valid numbers")
    
    if min_num >= max_num:
        raise ValueError("Minimum salary must be less than maximum salary")
    
    if min_num < 0 or max_num < 0:
        raise ValueError("Salary values must be positive numbers")


def validate_job_level(value: Optional[str]) -> Optional[str]:
    """Validate job level (accept any string)."""
    if value is None:
        return value
    return value.strip()


def validate_seniority(value: Optional[str]) -> Optional[str]:
    """Accept any seniority string, stripping whitespace."""
    if value is None:
        return value
    return value.strip()


def validate_weighted_section(items: Optional[Any]) -> Optional[Any]:
    """Validate that weighted section items sum to 100 and have proper structure."""
    if items is None or not items:
        return items
    
    if not isinstance(items, list):
        raise ValueError("Weighted sections must be a list of items")
    
    total_weight = 0
    validated_items = []
    
    for item in items:
        if hasattr(item, 'model_dump'):
            item_dict = item.model_dump()
        elif isinstance(item, dict):
            item_dict = item
        else:
            raise ValueError("Each weighted item must be a dictionary or Pydantic model")
        
        # Validate required fields
        if 'weight' not in item_dict:
            raise ValueError("Each weighted item must have a 'weight' field")
        
        if 'point' not in item_dict:
            raise ValueError("Each weighted item must have a 'point' field")
        
        # Validate weight
        try:
            weight = int(item_dict.get('weight', 0))
        except (ValueError, TypeError):
            raise ValueError("Weight values must be integers")
        
        if weight < 0 or weight > 100:
            raise ValueError("Weight values must be between 0 and 100")
        
        # Validate point
        point = str(item_dict.get('point', '')).strip()
        if not point:
            raise ValueError("Each weighted item must have a non-empty 'point' field")
        
        total_weight += weight
        validated_items.append({'point': point, 'weight': weight})
    
    # Only scale down if weights exceed 100, preserve user weights if sum < 100
    if total_weight > 100:
        factor = 100 / total_weight
        for item in validated_items:
            original_weight = item['weight']
            adjusted_weight = max(1, min(100, int(original_weight * factor)))
            item['weight'] = adjusted_weight
    
    return validated_items
