import asyncio
import json
import re
from datetime import datetime, timezone
from difflib import SequenceMatcher
from typing import Any, Dict, List, Optional
from fastapi import HTTPException
from json_repair import repair_json
import httpx
from langchain_mistralai import ChatMistralAI
from langchain_core.messages import SystemMessage, HumanMessage
from tenacity import AsyncRetrying, RetryError, stop_after_attempt, wait_exponential_jitter
from app.core.config import settings
from app.core.logging import get_logger
from app.core.logging import log_exception_one_line

logger = get_logger()


def get_llm_client(model_name: str | None = None, temperature: float = 0.1, max_tokens: int | None = None) -> ChatMistralAI:
    """Centralized LLM client factory for ChatMistralAI."""
    selected_model = model_name or getattr(settings, "ai_model", "mistral-large-latest")
    kwargs = {
        "api_key": settings.ai_api_key,
        "model": selected_model,
        "temperature": temperature,
    }
    if max_tokens:
        kwargs["max_tokens"] = max_tokens
    if hasattr(settings, "ai_base_url") and settings.ai_base_url:
        kwargs["endpoint"] = settings.ai_base_url
    return ChatMistralAI(**kwargs)



def _safe_field_str(data: dict, key: str, default_if_absent: str = "") -> str:
    """
    String field from JSON body where explicit null must not reach .strip().
    dict.get(key, '') returns None when the key is present with value null.
    """
    if key not in data:
        return default_if_absent
    val = data.get(key)
    if val is None:
        return ""
    return str(val).strip()


COUNTRY_CONTEXT: dict = {
    "US": {
        "label": "United States",
        "currency": "USD",
        "eeo_template": (
            "{company} is an equal opportunity employer. All qualified applicants will receive "
            "consideration for employment without regard to race, color, religion, sex, sexual "
            "orientation, gender identity, national origin, age, disability, veteran status, or "
            "any other characteristic protected under applicable federal, state, or local law. "
            "Reasonable accommodations are available for qualified individuals with disabilities "
            "throughout the application and employment process."
        ),
        "writing_rules": [
            "Do not mention or imply age preference.",
            "Use strictly gender-neutral language. No gendered pronouns.",
            "Do not use 'native English speaker' unless fluency is a genuine job requirement.",
            "Do not reference 'culture fit'.",
            "Do not ask for salary history.",
            "Do not imply physical requirements unless genuinely essential.",
        ],
    },
    "UK": {
        "label": "United Kingdom",
        "currency": "GBP",
        "eeo_template": (
            "{company} is an equal opportunities employer. We are committed to creating a diverse "
            "and inclusive workplace in accordance with the Equality Act 2010 and the Employment "
            "Rights Act 2025. We welcome applications from all qualified individuals regardless of "
            "age, disability, gender reassignment, marriage and civil partnership status, pregnancy "
            "and maternity, race, religion or belief, sex, or sexual orientation. Reasonable "
            "adjustments are available throughout the recruitment process for candidates with "
            "disabilities upon request."
        ),
        "writing_rules": [
            "Use gender-neutral language. No gendered pronouns.",
            "Do not reference marital status, pregnancy plans, or family structure.",
            "Do not state nationality preference. Write 'must have the right to work in the UK'.",
            "No age preference implied.",
            "Include salary range if provided.",
        ],
    },
    "IN": {
        "label": "India",
        "currency": "INR",
        "eeo_template": (
            "{company} is an equal opportunity employer committed to a diverse and inclusive "
            "workplace. We welcome applications from all qualified individuals irrespective of "
            "gender, caste, religion, race, disability, sexual orientation, or any other "
            "characteristic protected under the Constitution of India, the Rights of Persons "
            "with Disabilities Act 2016, and the Transgender Persons (Protection of Rights) "
            "Act 2019. {company} maintains a zero-tolerance policy toward workplace sexual "
            "harassment in compliance with the POSH Act 2013. Reasonable accommodations are "
            "available for candidates with disabilities upon request."
        ),
        "writing_rules": [
            "No caste, religion, race, sex, or place-of-birth references.",
            "Fully gender-inclusive language. No gendered pronouns.",
            "No physical requirements beyond genuinely essential.",
            "No mother-tongue or regional-language requirement unless operationally essential.",
            "No age criterion.",
        ],
    },
    "CA": {
        "label": "Canada",
        "currency": "CAD",
        "eeo_template": (
            "{company} is committed to employment equity and building a diverse, inclusive "
            "workforce. We welcome and encourage applications from women, Indigenous peoples, "
            "persons with disabilities, and members of visible minority groups, in accordance "
            "with the Canadian Human Rights Act, the Employment Equity Act, and applicable "
            "provincial human rights legislation. All qualified candidates are considered "
            "regardless of race, colour, ancestry, place of origin, political belief, religion, "
            "marital status, family status, physical or mental disability, sex, sexual orientation, "
            "gender identity or expression, or age. Accommodations are available on request for "
            "candidates participating in all aspects of the selection process."
        ),
        "writing_rules": [
            "No previous salary or compensation history references.",
            "Use gender-neutral language. No gendered pronouns or titles.",
            "No age, citizenship, or country-of-origin requirements. Write 'legally eligible to work in Canada'.",
            "No 'culture fit'.",
        ],
    },
    "SG": {
        "label": "Singapore",
        "currency": "SGD",
        "eeo_template": (
            "{company} is committed to fair employment practices in accordance with the Tripartite "
            "Guidelines on Fair Employment Practices (TGFEP) issued by the Ministry of Manpower "
            "(MOM), the National Trades Union Congress (NTUC), and the Singapore National "
            "Employers Federation (SNEF). All candidates are considered based on merit, skills, "
            "and suitability for the role. We do not discriminate on the basis of age, race, "
            "gender, religion, marital status, family responsibilities, or disability. Reasonable "
            "adjustments are available upon request."
        ),
        "writing_rules": [
            "No racial group preference.",
            "No religion or religious observance references.",
            "No age references.",
            "No citizenship preference beyond work eligibility.",
            "Use gender-neutral language throughout.",
            "Include salary range if provided.",
        ],
    },
    "MY": {
        "label": "Malaysia",
        "currency": "MYR",
        "eeo_template": (
            "{company} is an equal opportunity employer committed to fair and inclusive hiring "
            "practices in accordance with the Employment Act 1955 and applicable Malaysian "
            "employment legislation. We consider all applicants on the basis of merit, skills, "
            "and suitability for the role, without regard to race, religion, gender, age, "
            "nationality, or disability status. Reasonable accommodations are provided for "
            "qualified individuals with disabilities throughout the recruitment process."
        ),
        "writing_rules": [
            "No race or ethnicity references.",
            "No religion or religious observance requirements.",
            "No gender preference unless genuine occupational requirement.",
            "No age references.",
            "Write 'valid work authorisation for Malaysia' rather than citizenship exclusions.",
        ],
    },
    "AU": {
        "label": "Australia",
        "currency": "AUD",
        "eeo_template": (
            "{company} is an equal opportunity employer in accordance with the Fair Work Act 2009, "
            "the Age Discrimination Act 2004, the Disability Discrimination Act 1992, the Racial "
            "Discrimination Act 1975, and applicable state and territory anti-discrimination "
            "legislation. We are committed to building an inclusive workforce and welcome "
            "applications from all individuals regardless of gender, age, disability, race, "
            "religion, sexual orientation, or cultural background. Reasonable adjustments are "
            "available for candidates with disabilities upon request."
        ),
        "writing_rules": [
            "No age references or implied age preference.",
            "Use gender-neutral language.",
            "Write 'valid working rights in Australia' rather than citizenship exclusions.",
        ],
    },
    "EU": {
        "label": "European Union",
        "currency": "EUR",
        "eeo_template": (
            "{company} is an equal opportunity employer committed to compliance with EU "
            "anti-discrimination directives, including the Employment Equality Directive "
            "(2000/78/EC) and the Racial Equality Directive (2000/43/EC), as well as applicable "
            "member-state legislation. We welcome applications from all qualified individuals "
            "regardless of gender, age, disability, racial or ethnic origin, religion or belief, "
            "or sexual orientation. Personal data submitted during the application process is "
            "processed in accordance with the General Data Protection Regulation (GDPR). "
            "Reasonable accommodations are provided for candidates with disabilities upon request."
        ),
        "writing_rules": [
            "Include salary range where provided.",
            "Use gender-neutral language. No gendered pronouns or titles.",
            "No EU-citizenship preference unless a legal requirement.",
            "No religion, political affiliation, or trade union membership references.",
        ],
    },
}


BANNED_WORDS = [
    "aggressive", "dominant", "rockstar", "ninja", "guru", "wizard",
    "fearless", "strongman", "utilize", "utilise", "synergy",
    "dynamic", "passionate", "he", "she", "his", "her",
    "salesman", "chairman", "foreman", "young", "fresh",
]

Banned_Words_List = [
    "recent graduate", "young professional", "youthful", "digital native",
    "fresh graduate", "freshers only", "under 30", "below 35",
    "high-energy youth", "mature candidate preferred", "age below", "age above",
    "early career only", "junior by age implication",
    "male candidate preferred", "female candidate preferred",
    "competitive warrior", "assertive male leader",
    "killer instinct", "battle-ready", "hard-driving", "dominant leader",
    "native english speaker", "indian only", "us-born", "american only",
    "local candidate only", "chinese preferred", "hispanic preferred",
    "white candidate", "black candidate", "regional candidate preferred",
    "specific caste preference", "community preference", "mother tongue required",
    "christian preferred", "hindu preferred", "muslim preferred",
    "religious values required", "church background", "temple background",
    "faith-based preference", "religious commitment required",
    "unmarried preferred", "married only", "single candidate",
    "married women not preferred", "family-free candidate",
    "no childcare responsibilities", "must relocate without family",
    "pregnancy plans", "maternity status", "planning children", "expecting mother",
    "physically fit required", "able-bodied", "perfect health",
    "no disability", "medical fitness mandatory",
    "salary history required", "previous ctc mandatory",
    "last salary proof required", "past salary mandatory",
    "culture fit", "fast-paced young environment",
    "always available", "24/7 availability", "work hard play hard",
    "world-class", "innovative solutions", "fast-paced",
    "self-starter", "team player", "results-driven",
]

NAMED_COMPLIANCE_FRAMEWORKS = frozenset({
    "soc 2", "soc2", "iso 27001", "iso27001", "gdpr", "ccpa", "hipaa",
    "hitech", "pci-dss", "pcidss", "pci dss", "sox", "fedramp", "nist csf",
    "nist", "owasp", "cis controls", "hitrust", "fisma", "glba",
    "basel iii", "basel iv", "ifrs", "gaap",
})

REGULATED_INDUSTRY_SIGNALS = frozenset({
    "healthcare", "health care", "medical", "clinical", "hipaa",
    "banking", "bank", "financial", "finance", "fintech", "insurance",
    "regulated", "compliance", "security", "governance", "audit",
    "government", "federal", "dod", "defense", "defence",
    "gdpr", "ccpa", "sox", "pci",
})

DEFAULT_WORD_COUNT_LIMITS: dict = {
    "summary": {"min": 60, "max": 100},
    "essential_duties_and_responsibilities": {"min": 150, "max": 230},
    "key_duties": {"min": 150, "max": 230},
    "core_competencies": {"min": 60, "max": 100},  
    "functional_competencies": {"min": 70, "max": 120},  
    "qualifications_required": {"min": 60, "max": 180},
    "qualifications_preferred": {"min": 40, "max": 70},
    "eeo_statement": {"min": 25, "max": 50},
}


WRITER_SYSTEM_PROMPT = """You are a senior HR professional with 20 years of experience writing
ATS-compliant, legally safe job descriptions for Fortune 500 organisations.
Your output is published directly to company career pages without any further editing.

OUTPUT FORMAT:
Return ONLY a valid JSON object. No markdown. No text outside the JSON.

Required keys and types:
  summary                               - string (4-6 sentences, plain prose)
  essential_duties_and_responsibilities - string (150-230 words, 4 prose paragraphs, no bullets)
  key_duties                            - array of {"point": str, "weight": int}
  core_competencies                     - array of {"point": str, "weight": int}
  functional_competencies               - array of {"point": str, "weight": int}
  qualifications_required               - array of {"point": str, "weight": int}
  qualifications_preferred              - array of {"point": str, "weight": int}
  eeo_statement                         - string (copy verbatim from the policy block)
  eeoc_flags                            - array (always empty)

VALIDATION RULES — any violation causes a failure:
- Weights in every array must sum to exactly 100
- essential_duties_and_responsibilities must be between 150 and 230 words (4 prose paragraphs)
- No bullet points or numbered lists inside essential_duties_and_responsibilities
- Only reference tools, frameworks, or technologies that appear in the SKILLS AND REQUIREMENTS input
- Only reference named compliance standards if they appear in the input
- No banned words or phrases (see BANNED LANGUAGE section below)
- summary must be between 60 and 100 words
- key_duties must be between 150 and 230 words total across all items
- qualifications_required must have at least 5 items
- qualifications_preferred must be between 40 and 70 words total
- eeo_statement must match the provided text character for character
- Every sentence must be complete

CONTENT RULES:

Skills fidelity — the SKILLS AND REQUIREMENTS block is the only source of named tools and
technologies. If a tool is not listed there, it cannot appear anywhere in the output.
Example: input lists "Python, FastAPI, PostgreSQL" — only those three tools may be named.
Docker, Redis, Kubernetes, or anything else not listed must not appear.

No invented facts — never write specific numbers, percentages, team sizes, client names,
request volumes, revenue figures, or any claim not provided in the input. Use qualitative
language instead: "high-throughput", "at scale", "measurable improvement".

Summary structure:
  Sentence 1 - Company purpose and why this role matters strategically
  Sentence 2 - Primary technical contribution using only the provided tools
  Sentence 3 - Qualitative business or team impact, no invented numbers
  Sentence 4 - Compensation if provided, otherwise omit this sentence

Essential duties structure:
  Paragraph 1 - Strategic ownership and technical scope using only the provided skills
  Paragraph 2 - Day-to-day execution naming only tools from the input
  Paragraph 3 - Cross-team collaboration and stakeholder communication
  Paragraph 4 - Quality practices, engineering standards, and mentorship
  Do not open with seniority level concatenated to job title (e.g. "As a Senior Senior Engineer")

Key duties — 4 to 6 items. Each item should combine a unique action verb, a tool from the input,
and a qualitative outcome. Weight by business criticality, highest first.

Core competencies — behavioural and leadership qualities only. No technical tools here.

Functional competencies — technical depth anchored to specific tools from the input only.

Qualifications required — 5 to 8 items. Realistic minimum bar using only provided tools and skills.
No compliance frameworks unless they appear in the input.

Qualifications preferred — 3 to 5 items. Optional enhancements within the provided tech stack only.

Compliance tone — if the input mentions a regulated domain such as healthcare or banking, compliance
language is appropriate. For a general engineering role, do not introduce security or compliance
framing. Use only: "security best practices", "code quality", "system reliability".

Seniority calibration:
  Entry    - guided execution, learning-focused
  Mid      - independent contributor, full deliverable ownership
  Senior   - workstream ownership, technical direction, mentors peers
  Staff    - cross-team standards, resolves organisational ambiguity
  Director - executive stakeholder scope, business strategy

BANNED LANGUAGE — these terms must not appear anywhere in the output:
  Age signals: recent graduate, young professional, digital native, fresh graduate, freshers only,
  under 30, below 35, high-energy youth, early career only, age below, age above, mature candidate preferred

  Gender signals: he, she, his, her, salesman, chairman, foreman, male candidate preferred,
  female candidate preferred, assertive male leader

  Masculine-coded: aggressive, dominant, competitive warrior, rockstar, ninja, guru, wizard,
  killer instinct, fearless, battle-ready, strongman, hard-driving, dominant leader

  Language signals: native english speaker, local candidate only

  Hollow corporate: culture fit, always available, 24/7 availability, work hard play hard,
  world-class, innovative solutions, fast-paced, self-starter, team player, results-driven,
  utilize, utilise, leverage, synergy, dynamic, passionate

  Salary history: salary history required, previous ctc mandatory, last salary proof required

BEFORE RETURNING OUTPUT — verify all of the following:
  essential_duties word count is at least 200 and each paragraph is at least 45 words
  No tool appears that was not in the input
  No compliance framework appears that was not in the input
  No banned words or phrases appear in any section
  Every array's weights sum to exactly 100
  No invented numbers, metrics, or business claims
  No duplicate phrases across sections
  eeo_statement is character-for-character verbatim
  Every sentence is complete"""


EDITOR_SYSTEM_PROMPT = """You are a senior HR professional editing a single section of a job
description for direct publication on a company career page. No further editing will be done.

OUTPUT FORMAT:
Return ONLY valid JSON in the form: { "section_name": <value> }
String sections return a plain string. Array sections return an array of {"point": str, "weight": int}
with weights summing to exactly 100. No markdown fences. No extra keys. No prose outside the JSON.

RULES:
- Preserve all existing specific numbers, values, salary ranges, grades, codes, versions, and identifiers present in the CURRENT CONTENT. Do not omit, discard, or alter them unless explicitly requested by the user instruction.
- Only reference tools and skills that appear in the input. Never add tools.
- Never reference compliance frameworks not mentioned in the input.
- No invented numbers, metrics, or statistics.
- No banned language: utilize, leverage, synergy, world-class, rockstar, ninja, guru, culture fit,
  aggressive, dominant, native english speaker, recent graduate, digital native.
- Each bullet opens with a distinct action verb.
- No duplicate phrases across sections.
- No truncated sentences.
- essential_duties requires between 150 and 230 words across 4 prose paragraphs, no bullets.
- essential_duties must not open with seniority and title concatenated.
- Follow all jurisdiction compliance rules from the policy section.
- eeo_statement must be copied verbatim from the provided text.
- Weights ordered highest business priority first."""


POINT_EDITOR_SYSTEM_PROMPT = """You are a senior HR professional editing a single point within a section of a job description for direct publication on a company career page. No further editing will be done.

OUTPUT FORMAT:
Return ONLY valid JSON in the form: { "refined_point": <value> }
If the input point was a string, return a string.
If the input point was an object with 'point' and 'weight' (or similar properties), return the updated object with the SAME keys, keeping everything except the text/description unchanged according to the user instruction.
No markdown fences. No extra keys. No prose outside the JSON.

RULES:
- Apply the user's requested modification to the point.
- Only reference tools and skills that appear in the input if provided.
- Do not reference compliance frameworks not mentioned in the input.
- No invented numbers, metrics, or statistics.
- No banned language: utilize, leverage, synergy, world-class, rockstar, ninja, guru, culture fit, aggressive, dominant.
- Maintain professional tone."""


SECTION_SPECS: dict = {
    "summary": (
        "Plain string. 4-6 sentences. Between 60 and 100 words. "
        "Sentence 1: company context and role importance. "
        "Sentence 2: primary technical contribution using provided tools only. "
        "Sentence 3: qualitative business impact, no invented numbers. "
        "Sentence 4: compensation if provided."
    ),
    "essential_duties_and_responsibilities": (
        "Plain string. Between 150 and 230 words total. Exactly 4 prose paragraphs. "
        "No bullet points or numbered lists. "
        "P1: strategic ownership with provided skills only. "
        "P2: day-to-day execution with provided tools only. "
        "P3: collaboration and stakeholder communication. "
        "P4: quality, standards, and mentorship. "
        "Do not open with seniority and title concatenated."
    ),
    "key_duties": (
        "Array of {point, weight}. 4-6 items. Between 150 and 230 words total across all items. Weights sum to 100, descending priority. "
        "Each point: unique action verb + tool from input + qualitative outcome."
    ),
    "core_competencies": (
        "Array of {point, weight}. 4-6 items. Between 60 and 100 words total across all items. Weights sum to 100. "
        "Each point is a behavioural leadership competency. No technical tools."
    ),
    "functional_competencies": (
        "Array of {point, weight}. 3-4 items. Between 70 and 120 words total across all items. Weights sum to 100. "
        "Each point is technical execution anchored to a specific tool from the input only."
    ),
    "qualifications_required": (
        "Array of {point, weight}. 5-6 items. Weights sum to 100. "
        "One requirement per item. Only tools and skills from the input. "
        "No compliance frameworks not in the input."
    ),
    "qualifications_preferred": (
        "Array of {point, weight}. 3-5 items. Between 40 and 70 words total across all items. Weights sum to 100. "
        "Each item is optional, role-relevant, and within the provided tech stack only."
    ),
    "eeo_statement": "Plain string. Between 25 and 50 words. Verbatim EEO text from the policy section. Do not alter.",
}


def get_current_date() -> str:
    """Returns today's date formatted for use in prompts."""
    return datetime.now(timezone.utc).strftime("%B %d, %Y")


def word_count(text: str) -> int:
    """Counts characters in a string."""
    return len(str(text or ""))


def truncate_text(text: str, max_words: int) -> str:
    """Truncates text to a word limit, preserving sentence endings."""
    words = str(text or "").split()
    if len(words) <= max_words:
        return str(text or "")
    return " ".join(words[:max_words]).rstrip(",.;:") + "."


def similarity_ratio(a: str, b: str) -> float:
    """Returns a 0-1 similarity score between two strings."""
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def has_banned_language(text: str) -> List[str]:
    """Returns a list of any banned words or phrases found in the text."""
    text_lower = text.lower()
    found = []
    for word in BANNED_WORDS:
        if re.search(r"\b" + re.escape(word.lower()) + r"\b", text_lower):
            found.append(word)
    for phrase in Banned_Words_List:
        if phrase.lower() in text_lower:
            found.append(phrase)
    return found


def collect_output_text(payload: dict) -> str:
    """Concatenates all LLM-generated text fields into one string for scanning."""
    parts = []
    
    def extract_text(val: Any):
        if isinstance(val, str):
            parts.append(val)
        elif isinstance(val, list):
            for item in val:
                if isinstance(item, dict):
                    parts.append(item.get("point") or item.get("text") or "")
                else:
                    parts.append(str(item))
                    
    for k, v in (payload or {}).items():
        if k.endswith("_view") or k.startswith("weight_view_") or k in ("_section_order", "sections_metadata", "sections_order"):
            continue
        if k.startswith("section_") and isinstance(v, dict) and "section_data" in v:
            extract_text(v["section_data"])
        else:
            extract_text(v)
            
    return " ".join(parts)


def extract_input_tokens(data: dict) -> frozenset:
    """Extracts all meaningful tokens and bigrams from the user's input fields."""
    fields = [
        data.get("key_skills_and_requirements") or data.get("skills") or "",
        data.get("core_competencies") or "",
        data.get("functional_competencies") or "",
        data.get("additional_context") or data.get("context") or "",
        data.get("title") or "",
        data.get("industry") or "",
        data.get("department") or "",
    ]
    raw = " ".join(str(f) for f in fields).lower()
    tokens = frozenset(
        t.strip().strip(".,;:()")
        for t in re.split(r"[,/\s;]+", raw)
        if len(t.strip()) > 1
    )
    words = re.findall(r"[a-z0-9][a-z0-9\-\.]*", raw)
    bigrams = frozenset(f"{words[i]} {words[i + 1]}" for i in range(len(words) - 1))
    return tokens | bigrams


def is_regulated_industry(data: dict) -> bool:
    """Returns True if the input signals a regulated industry like healthcare or banking."""
    combined = " ".join([
        str(data.get("industry") or ""),
        str(data.get("key_skills_and_requirements") or data.get("skills") or ""),
        str(data.get("additional_context") or data.get("context") or ""),
        str(data.get("department") or ""),
        str(data.get("title") or ""),
    ]).lower()
    return any(signal in combined for signal in REGULATED_INDUSTRY_SIGNALS)


def resolve_country(country_input: Optional[str]) -> dict:
    """Resolves a country name or code to a context dict, with a generic fallback."""
    raw = (country_input or "").strip()
    normalised = raw.upper()
    if normalised in COUNTRY_CONTEXT:
        return COUNTRY_CONTEXT[normalised]

    for _, ctx in COUNTRY_CONTEXT.items():
        if ctx.get("label", "").upper() == normalised:
            return ctx

    return {
        "label": raw or "Global",
        "currency": "local",
        "eeo_template": (
            "{company} is an equal opportunity employer committed to a diverse and inclusive "
            "workplace. We consider all qualified applicants regardless of background and provide "
            "reasonable accommodations for candidates with disabilities upon request."
        ),
        "writing_rules": [
            "Use gender-neutral language throughout.",
            "Do not reference age, religion, race, or national origin.",
            "Do not use 'culture fit', 'native speaker', or language implying bias.",
        ],
    }


def resolve_limits(word_count_limits: Optional[dict]) -> dict:
    """Merges caller-supplied word count limits with the defaults."""
    resolved = {}
    wc = word_count_limits or {}
    for section, defaults in DEFAULT_WORD_COUNT_LIMITS.items():
        user_section = wc.get(section, {})
        resolved[section] = {
            "min": int(user_section.get("min", defaults["min"])),
            "max": int(user_section.get("max", defaults["max"])),
        }
    return resolved


def build_eeo_statement(company: str, country_ctx: dict) -> str:
    """Fills the EEO template with the company name."""
    template = country_ctx.get("eeo_template", "")
    return template.replace("{company}", company.strip() or "We") if template else ""


def get_first(data: dict, keys: list) -> Any:
    """Returns the first non-empty value found among the given keys."""
    for k in keys:
        v = data.get(k)
        if v is not None and (not isinstance(v, str) or v.strip()):
            return v
    return None


def expand_salary_value(raw: str, unit: str) -> str:
    """Converts a salary value with optional K/M suffix into a formatted string."""
    raw = str(raw).strip().replace(",", "")
    unit_lower = str(unit or "").strip().lower()
    try:
        val = float(raw)
        if unit_lower == "k":
            val *= 1_000
        elif unit_lower == "m":
            val *= 1_000_000
        return f"{int(val):,}"
    except ValueError:
        return raw


def get_salary_display(data: dict, fallback: str) -> str:
    """Builds a formatted salary string from whatever salary fields are present."""
    symbol = get_first(data, ["salary_symbol", "currency_symbol", "salary_currency_symbol"])
    min_val = get_first(data, ["salary_min_value", "salary_min", "salary_value_min", "salary_from", "min_salary"])
    max_val = get_first(data, ["salary_max_value", "salary_max", "salary_value_max", "salary_to", "max_salary"])
    unit = get_first(data, ["salary_period", "salary_unit", "salary_unit_suffix", "salary_period_unit"]) or ""

    if symbol and min_val and max_val:
        s = str(symbol).strip()
        mn = expand_salary_value(str(min_val), unit)
        mx = expand_salary_value(str(max_val), unit)
        return f"{s}{mn}-{s}{mx}"
    if symbol and min_val:
        s = str(symbol).strip()
        mn = expand_salary_value(str(min_val), unit)
        return f"{s}{mn}+"
    return (fallback or "").strip()


def compute_weights_for_n(n: int) -> List[int]:
    """Generates a descending weight list that sums to exactly 100."""
    if n <= 0:
        return []
    step = max(1, 20 // max(n, 1))
    weights = [max(1, 20 - i * step) for i in range(n)]
    diff = 100 - sum(weights)
    weights[0] += diff
    return weights


def _scale_integer_weights_to_target(weights: List[int], target: int) -> List[int]:
    """Map non-negative weights to integers summing exactly to ``target`` (largest remainder)."""
    n = len(weights)
    if n == 0:
        return []
    if n == 1:
        return [max(0, target)]
    total = sum(weights)
    if total <= 0:
        base, rem = divmod(max(0, target), n)
        return [base + (1 if i < rem else 0) for i in range(n)]
    scaled = [target * w / total for w in weights]
    floors = [int(s) for s in scaled]
    remainder = target - sum(floors)
    order = sorted(range(n), key=lambda i: scaled[i] - floors[i], reverse=True)
    for k in range(max(0, remainder)):
        floors[order[k % n]] += 1
    return floors


def _norm_point_key(text: str) -> str:
    return " ".join(str(text).lower().split())


def _parse_client_weighted_seed(value: Any) -> Optional[List[Dict[str, Any]]]:
    """Client-supplied weighted bullets; None if not a non-empty list of dicts."""
    if not isinstance(value, list) or not value:
        return None
    out: List[Dict[str, Any]] = []
    for item in value:
        if not isinstance(item, dict):
            continue
        point = str(item.get("point") or item.get("text") or item.get("value") or "").strip()
        if not point:
            continue
        try:
            w = int(float(item.get("weight") or item.get("w") or 0))
        except (TypeError, ValueError):
            w = 0
        if w > 0:
            out.append({"point": point, "weight": w})
    return out if out else None


def merge_weighted_client_seed(seed_raw: Any, ai_normalized: List[Dict]) -> List[Dict]:
    """
    Preserve client core/functional rows exactly when they are provided as weighted lists.

    - If seed weights sum to 100: return seed only (exact points and weights).
    - If sum < 100: keep all seed rows, then add 2–3 AI rows (not duplicate points) whose
      weights are scaled to fill the remainder to 100.
    - If sum > 100: proportionally scale seed only to 100 (no AI merge).
    - If no valid seed: return ai_normalized unchanged.
    """
    seed = _parse_client_weighted_seed(seed_raw)
    if not seed:
        return ai_normalized
    seed_sum = sum(int(x["weight"]) for x in seed)
    
    if seed_sum == 100:
        return [{"point": x["point"], "weight": int(x["weight"])} for x in seed]
    if seed_sum > 100:
        raw_w = [int(x["weight"]) for x in seed]
        new_w = _scale_integer_weights_to_target(raw_w, 100)
        return [{"point": x["point"], "weight": nw} for x, nw in zip(seed, new_w)]

    remainder = 100 - seed_sum
    if remainder <= 0:
        return [{"point": x["point"], "weight": int(x["weight"])} for x in seed]

    seed_keys = {_norm_point_key(x["point"]) for x in seed}
    ai_list = ai_normalized if isinstance(ai_normalized, list) else []
    candidates = [dict(x) for x in ai_list if _norm_point_key(str(x.get("point", ""))) not in seed_keys]

    if not candidates and ai_list:
        # LLM echoed only client points — take tail rows as filler candidates anyway
        half = max(1, len(ai_list) // 2)
        candidates = [dict(x) for x in ai_list[half:]]

    if not candidates:
        raw_w = [max(1, int(s["weight"])) for s in seed]
        new_w = _scale_integer_weights_to_target(raw_w, 100)
        return [{"point": x["point"], "weight": nw} for x, nw in zip(seed, new_w)]

    n_extra = len(candidates)
    if n_extra == 0:
        return [{"point": x["point"], "weight": int(x["weight"])} for x in seed]
    n_pick = min(n_extra, max(2, min(3, n_extra)))
    chosen = candidates[:n_pick]
    raw_weights = [max(1, int(c.get("weight", 1))) for c in chosen]
    alloc = _scale_integer_weights_to_target(raw_weights, remainder)
    extras = [{"point": str(c["point"]).strip(), "weight": w} for c, w in zip(chosen, alloc)]
    
    return [{"point": x["point"], "weight": int(x["weight"])} for x in seed] + extras


def _apply_competency_seed_merge(data: dict, parsed: dict) -> None:
    """Mutates parsed in place: core/functional honour client seed rules."""
    parsed["core_competencies"] = merge_weighted_client_seed(
        data.get("core_competencies"), parsed.get("core_competencies") or []
    )
    parsed["functional_competencies"] = merge_weighted_client_seed(
        data.get("functional_competencies"), parsed.get("functional_competencies") or []
    )


def flatten_to_point_weight(items: Any, section_key: str) -> List[Dict]:
    """Normalises a list of items into the standard {point, weight} format."""
    if not isinstance(items, list):
        return []

    normalised = []
    for item in items:
        if isinstance(item, dict):
            point = str(item.get("point") or item.get("text") or item.get("value") or "").strip()
            try:
                weight = int(float(item.get("weight") or item.get("w") or 0))
            except (TypeError, ValueError):
                weight = 0
            if point:
                normalised.append({"point": point, "weight": weight})
        elif isinstance(item, str) and item.strip():
            normalised.append({"point": item.strip(), "weight": 0})

    if not normalised:
        return []

    total = sum(i["weight"] for i in normalised)
    if total != 100 or any(i["weight"] == 0 for i in normalised):
        computed = compute_weights_for_n(len(normalised))
        for idx, item in enumerate(normalised):
            item["weight"] = computed[idx] if idx < len(computed) else 1
        diff = 100 - sum(i["weight"] for i in normalised)
        normalised[0]["weight"] += diff

    return normalised


def normalise_payload(parsed: dict) -> dict:
    """Coerces LLM output fields into the expected types and shapes."""
    string_fields = ["summary", "essential_duties_and_responsibilities", "eeo_statement"]
    array_fields = [
        "key_duties", "core_competencies", "functional_competencies",
        "qualifications_required", "qualifications_preferred",
    ]
    for field in string_fields:
        v = parsed.get(field)
        if isinstance(v, list):
            parsed[field] = " ".join(
                item.get("point", "") if isinstance(item, dict) else str(item)
                for item in v
            ).strip()
        elif not isinstance(v, str):
            parsed[field] = str(v or "").strip()
    for field in array_fields:
        parsed[field] = flatten_to_point_weight(parsed.get(field, []), field)
    if not isinstance(parsed.get("eeoc_flags"), list):
        parsed["eeoc_flags"] = []
    return parsed


def has_duplicate_points(items: List[Dict], threshold: float = 0.70) -> bool:
    """Returns True if any two items in the list are suspiciously similar."""
    points = [i.get("point", "") for i in items if isinstance(i, dict)]
    for i in range(len(points)):
        for j in range(i + 1, len(points)):
            if similarity_ratio(points[i], points[j]) > threshold:
                return True
    return False


def essential_duties_is_prose(text: str) -> bool:
    """Returns False if the essential duties field looks like a bullet list."""
    lines = [ln.strip() for ln in str(text).split("\n") if ln.strip()]
    if len(lines) > 10:
        return False
    if sum(1 for ln in lines if re.match(r"^[•\-*\d\u2022]", ln)) >= 3:
        return False
    return True


def has_double_title(text: str, seniority: str, title: str) -> bool:
    """Detects the common LLM mistake of writing 'As a Senior Senior Engineer'."""
    if not seniority or not title:
        return False
    pattern = re.compile(
        rf"as\s+a\s+{re.escape(seniority.lower())}\s+{re.escape(seniority.lower())}\s+",
        re.IGNORECASE,
    )
    return bool(pattern.search(text))


def array_word_count(items: List[Dict]) -> int:
    """Sums the word counts across all point fields in an array."""
    return sum(word_count(i.get("point", "")) for i in items if isinstance(i, dict))


def compute_total_word_count(content: dict) -> int:
    """Returns the total character count across all sections of the generated JD."""
    def extract(val: Any) -> str:
        if isinstance(val, str):
            return val
        if isinstance(val, list):
            return " ".join(
                item.get("point", "") if isinstance(item, dict) else str(item)
                for item in val
            )
        return str(val or "")

    chunks = []
    for k, v in (content or {}).items():
        if k.endswith("_view") or k.startswith("weight_view_") or k in ("_section_order", "sections_metadata", "sections_order"):
            continue
        if k.startswith("section_") and isinstance(v, dict) and "section_data" in v:
            chunks.append(extract(v["section_data"]))
        else:
            chunks.append(extract(v))
            
    return len(" ".join(chunks))


def check_hallucinated_compliance(payload: dict, input_tokens: frozenset) -> List[str]:
    """Flags any named compliance frameworks in the output that weren't in the input."""
    failures = []
    combined_output = collect_output_text(payload).lower()
    for framework in NAMED_COMPLIANCE_FRAMEWORKS:
        fw_lower = framework.lower()
        if fw_lower in combined_output and fw_lower not in input_tokens:
            if re.search(r"\b" + re.escape(fw_lower) + r"\b", combined_output):
                failures.append(f"hallucinated_compliance:{framework}")
    return failures


def run_validation(payload: dict, limits: dict, seniority: str, title: str, input_tokens: frozenset) -> List[str]:
    """Validates the generated payload and returns a list of failure codes."""
    failures = []

    if not isinstance(payload.get("summary"), str):
        failures.append("summary_not_string")
    if not isinstance(payload.get("essential_duties_and_responsibilities"), str):
        failures.append("essential_duties_not_string")
    if not isinstance(payload.get("eeo_statement"), str):
        failures.append("eeo_not_string")

    for arr_field in ("key_duties", "core_competencies", "functional_competencies",
                      "qualifications_required", "qualifications_preferred"):
        arr = payload.get(arr_field, [])
        if not isinstance(arr, list):
            failures.append(f"{arr_field}_not_array")
            continue
        if not all(isinstance(x, dict) and "point" in x and "weight" in x for x in arr):
            failures.append(f"{arr_field}_wrong_shape")
        weight_sum = sum(x.get("weight", 0) for x in arr if isinstance(x, dict))
        if weight_sum != 100:
            failures.append(f"{arr_field}_weight_sum_{weight_sum}")

    if len(payload.get("key_duties", [])) < 3:
        failures.append("key_duties_too_few")
    if len(payload.get("qualifications_required", [])) < 3:
        failures.append("qualifications_required_too_few")
    if len(payload.get("qualifications_preferred", [])) < 2:
        failures.append("qualifications_preferred_too_few")

    if not essential_duties_is_prose(payload.get("essential_duties_and_responsibilities", "")):
        failures.append("essential_duties_contains_bullets")

    if has_double_title(payload.get("essential_duties_and_responsibilities", ""), seniority, title):
        failures.append("essential_duties_double_title")

    banned_found = has_banned_language(collect_output_text(payload))
    if banned_found:
        unique_banned = list(dict.fromkeys(banned_found))[:10]
        failures.append(f"banned_words_detected:{','.join(unique_banned)}")

    for arr_field in ("key_duties", "qualifications_required"):
        if has_duplicate_points(payload.get(arr_field, [])):
            failures.append(f"{arr_field}_duplicate_points")

    if word_count(payload.get("eeo_statement", "")) < limits["eeo_statement"]["min"]:
        failures.append("eeo_too_short")

    failures.extend(check_hallucinated_compliance(payload, input_tokens))
    return failures


def jd_context_from(jd_data: dict) -> dict:
    """Extracts a normalised context dict from a stored JD record."""
    if not isinstance(jd_data, dict):
        return {
            "title": "Position", "department": "Unknown", "industry": "Technology",
            "seniority": "Mid-level", "location": "", "country_code": "",
            "key_skills": "", "core_competencies": "", "functional_competencies": "",
            "additional_context": "",
        }
    content = jd_data.get("content") or {}

    def get(*keys: str) -> str:
        return next(
            (jd_data.get(k) or content.get(k) for k in keys if jd_data.get(k) or content.get(k)),
            ""
        )

    return {
        "title": get("title", "job_title") or "Position",
        "department": get("department") or "Unknown",
        "industry": get("industry") or "Technology",
        "seniority": get("seniority") or "Mid-level",
        "employment_type": get("employment_type") or "Full-Time",
        "location": get("location") or "",
        "country_code": get("country_code") or "",
        "key_skills": get("key_skills", "key_skills_and_requirements", "skills") or "",
        "core_competencies": get("core_competencies") or "",
        "functional_competencies": get("functional_competencies") or "",
        "additional_context": get("additional_context", "context") or "",
    }


def build_policy_block(country_ctx: dict, limits: dict, salary_display: str, eeo_statement: str, is_regulated: bool, is_engineering: bool = False) -> str:
    """Builds the policy and jurisdiction block that prefixes every prompt."""
    has_salary = bool(salary_display and salary_display.strip() not in ("", "Not provided"))
    salary_rule = (
        "Do not disclose the salary or compensation details in the summary section."
        if has_salary
        else "Salary not provided. Omit all compensation references."
    )

    if is_regulated:
        compliance_note = (
            "The input indicates a regulated domain. "
            "Compliance and security language is appropriate throughout the JD."
        )
    elif is_engineering:
        compliance_note = (
            "This is a general engineering role. Do not make the JD security-heavy or compliance-heavy. "
            "Use only: 'security best practices', 'code quality standards', 'system reliability'. "
            "Do not reference SOC 2, ISO 27001, GDPR, HIPAA, PCI-DSS, NIST, OWASP, "
            "or any named compliance framework."
        )
    else:
        compliance_note = (
            "This is a general role. Do not make the JD security-heavy or compliance-heavy. "
            "Do not reference SOC 2, ISO 27001, GDPR, HIPAA, PCI-DSS, NIST, OWASP, "
            "or any named compliance framework."
        )

    rules_text = "\n".join(f"  - {r}" for r in country_ctx.get("writing_rules", []))
    ed_min = limits["essential_duties_and_responsibilities"]["min"]
    ed_max = limits["essential_duties_and_responsibilities"]["max"]
    
    # Calculate target word counts (20% above minimum to ensure validation passes)
    def calc_target(min_words, max_words, boost_pct=0.20):
        """Calculate target word count with buffer above minimum"""
        target = int(min_words * (1 + boost_pct))
        return min(target, max_words)  
    
    summary_target = calc_target(limits["summary"]["min"], limits["summary"]["max"])
    ed_target = calc_target(ed_min, ed_max)
    kd_target = calc_target(limits["key_duties"]["min"], limits["key_duties"]["max"])
    cc_target = calc_target(limits["core_competencies"]["min"], limits["core_competencies"]["max"])
    fc_target = calc_target(limits["functional_competencies"]["min"], limits["functional_competencies"]["max"])
    qr_target = calc_target(limits["qualifications_required"]["min"], limits["qualifications_required"]["max"])
    qp_target = calc_target(limits["qualifications_preferred"]["min"], limits["qualifications_preferred"]["max"])
    eeo_target = calc_target(limits["eeo_statement"]["min"], limits["eeo_statement"]["max"])

    return f"""JURISDICTION: {country_ctx.get("label", "Global")} | Currency: {country_ctx.get("currency", "local")}
SALARY: {salary_rule}
COMPLIANCE: {compliance_note}

JURISDICTION WRITING RULES:
{rules_text}

EEO STATEMENT (copy verbatim into eeo_statement, do not alter a single character):
{eeo_statement}

WORD COUNT TARGETS (Do not exceed these targets significantly):
  summary                               : TARGET {summary_target} words (min {limits["summary"]["min"]}, max {limits["summary"]["max"]}) | 4-6 sentences
  essential_duties_and_responsibilities : TARGET {ed_target} words (min {ed_min}, max {ed_max}) | 4 paragraphs | no bullets
  key_duties                            : TARGET {kd_target} words (min {limits["key_duties"]["min"]}, max {limits["key_duties"]["max"]}) | 4-6 items | weights sum to 100
  core_competencies                     : TARGET {cc_target} words (min {limits["core_competencies"]["min"]}, max {limits["core_competencies"]["max"]}) | 4-5 items | weights sum to 100
  functional_competencies               : TARGET {fc_target} words (min {limits["functional_competencies"]["min"]}, max {limits["functional_competencies"]["max"]}) | 3 items | weights sum to 100
  qualifications_required               : TARGET {qr_target} words (min {limits["qualifications_required"]["min"]}, max {limits["qualifications_required"]["max"]}) | 5-7 items | weights sum to 100
  qualifications_preferred              : TARGET {qp_target} words (min {limits["qualifications_preferred"]["min"]}, max {limits["qualifications_preferred"]["max"]}) | 3-5 items | weights sum to 100
  eeo_statement                         : TARGET {eeo_target} words (min {limits["eeo_statement"]["min"]}, max {limits["eeo_statement"]["max"]}) | verbatim only

IMPORTANT: Write high-impact content. Avoid fluff. Adhere strictly to the word count ranges."""


def _competency_seed_instruction_block(data: dict) -> str:
    """Extra LLM instructions when the client sends weighted core/functional seeds."""
    lines: List[str] = []
    for label, key in (
        ("CORE_COMPETENCIES", "core_competencies"),
        ("FUNCTIONAL_COMPETENCIES", "functional_competencies"),
    ):
        seed = _parse_client_weighted_seed(data.get(key))
        if not seed:
            continue
        s = sum(int(x["weight"]) for x in seed)
        seed_json = json.dumps(seed, ensure_ascii=False)
        if s == 100:
            lines.append(
                f"{label}: The client supplied the final list (weights sum to 100). "
                f"Return this JSON array exactly — same points, same weights, same order:\n{seed_json}"
            )
        elif s < 100:
            remaining = 100 - s
            lines.append(
                f"{label}: These rows are FIXED — copy point text and weights exactly, same order "
                f"(they sum to {s}):\n{seed_json}\n"
                f"Add new competency descriptions (no duplicate or paraphrase of the fixed points) "
                f"so the full array sums to exactly 100. The new competencies must use exactly {remaining} "
                f"total weight distributed among them. Place the fixed rows first. Prefer fewer, "
                f"meaningful additions rather than many small ones."
            )
        else:
            lines.append(
                f"{label}: Client rows sum to {s} (>100). In your output, use the same competencies "
                f"but scale weights proportionally so the array sums to 100."
            )
    if not lines:
        return ""
    return "\nCLIENT-DEFINED COMPETENCIES (MANDATORY):\n" + "\n\n".join(lines) + "\n"


def build_jd_user_prompt(data: dict) -> str:
    """Builds the user-facing prompt for full JD generation."""
    if hasattr(data, "dict"):
        data = data.dict()

    salary_display = get_salary_display(data, data.get("salary_range") or "")
    context = _safe_field_str(data, "additional_context") or _safe_field_str(data, "context")
    context = context[:800] if context else ""
    seniority = _safe_field_str(data, "seniority") or "Mid-level"
    title = _safe_field_str(data, "title")

    return f"""ROLE DETAILS:
  Title            : {title}
  Seniority        : {seniority}
  Employment Type  : {_safe_field_str(data, "employment_type") or "Full-Time"}
  Company          : {_safe_field_str(data, "company_name") or "Not specified"}
  Job ID           : {_safe_field_str(data, "job_id") or "Not specified"}
  Job Family       : {_safe_field_str(data, "job_family") or "Infer from title"}
  Job Level        : {_safe_field_str(data, "job_level") or "Not specified"}
  Department       : {_safe_field_str(data, "department")}
  Location         : {_safe_field_str(data, "location")}
  Industry         : {_safe_field_str(data, "industry") or "Technology"}
  Compensation     : {salary_display or "Not provided"}
  Date             : {get_current_date()}

SKILLS AND REQUIREMENTS (the only named items permitted in the output):
  Key Skills / Tech Stack : {data.get("key_skills_and_requirements") or data.get("skills") or "Not provided"}
  Core Competencies       : {data.get("core_competencies") or "Infer from role and seniority"}
  Functional Competencies : {data.get("functional_competencies") or "Infer from role"}
  Additional Context      : {context or "None."}
{_competency_seed_instruction_block(data)}HARD RULES:
  - Only the tools and skills listed above may appear as named items
  - Write CONCISE, high-impact content - aim for 8-12 words per bullet point
  - essential_duties must be at least 120 words total, 4 paragraphs, each paragraph at least 30 words
  - Do not invent numbers, percentages, metrics, client names, or business claims
  - Do not add compliance frameworks not in the input
  - Do not open essential_duties as "As a {seniority.lower()} {title}" — write "As a {title}" or "In this role..."
  - Every preferred qualification must stay within the technical scope of the input stack
  - Weights in every array must sum to exactly 100
  - Be concise and direct - avoid unnecessary fluff

OUTPUT SCHEMA:
{{
  "summary": "string",
  "essential_duties_and_responsibilities": "string",
  "key_duties": [{{"point": "string", "weight": integer}}],
  "core_competencies": [{{"point": "string", "weight": integer}}],
  "functional_competencies": [{{"point": "string", "weight": integer}}],
  "qualifications_required": [{{"point": "string", "weight": integer}}],
  "qualifications_preferred": [{{"point": "string", "weight": integer}}],
  "eeo_statement": "string",
  "eeoc_flags": []
}}"""


def build_repair_prompt(original_prompt: str, bad_output: str, failed_checks: List[str], allowed_skills: str) -> str:
    """Builds a targeted repair prompt based on which validation checks failed."""
    checks_text = "\n".join(f"  - {c}" for c in failed_checks) if failed_checks else "  - See general rules"
    targeted_fixes = []

    if any("essential_duties_too_short" in c for c in failed_checks):
        targeted_fixes.append(
            "ESSENTIAL DUTIES: Rewrite with exactly 4 paragraphs. Each paragraph must be at least "
            "45 words. Total must exceed 200 words. No bullet points. Each paragraph covers a "
            "different scope: P1=strategic ownership, P2=daily execution with provided tools only, "
            "P3=collaboration, P4=quality and mentorship."
        )
    if any("essential_duties_contains_bullets" in c for c in failed_checks):
        targeted_fixes.append(
            "BULLETS: essential_duties_and_responsibilities must be flowing prose paragraphs. "
            "Remove all bullet points, dashes, and numbered lists."
        )
    if any("weight_sum" in c for c in failed_checks):
        targeted_fixes.append(
            "WEIGHTS: Every array must have weights summing to exactly 100. "
            "Recompute every array. Adjust the first item to absorb any rounding error."
        )
    if any(("hallucinated" in c or "too_few" in c) for c in failed_checks):
        targeted_fixes.append(
            f"TOOL FIDELITY: Only these named items may appear in the output:\n  {allowed_skills}\n"
            f"Remove any tool, framework, or technology not in that list."
        )
    if any("banned_words" in c for c in failed_checks):
        targeted_fixes.append(
            "BANNED WORDS: Remove every instance of the banned terms flagged above. "
            "Replace with neutral, specific, professional language."
        )
    if any("summary_too_short" in c for c in failed_checks):
        targeted_fixes.append("SUMMARY: Must be at least 60 words across 4-6 complete sentences.")

    fixes_block = "\n\n".join(targeted_fixes)

    return f"""The previous generation failed validation. Fix every issue listed below and produce a
complete, correct replacement.

FAILED CHECKS:
{checks_text}

TARGETED FIXES:
{fixes_block}

ALLOWED TOOLS AND SKILLS (only these may appear as named items in the output):
  {allowed_skills}

GENERAL REMINDERS:
  - Array weights must sum to exactly 100 per array
  - essential_duties: 4 paragraphs, each at least 45 words, total at least 200 words, no bullets
  - No tools introduced that are not in the allowed list
  - No compliance frameworks not in the allowed list
  - No invented numbers, percentages, client names, or business claims
  - No banned hollow words or discriminatory phrases
  - eeo_statement must be verbatim from the policy section

PREVIOUS INVALID OUTPUT (study what went wrong — do not copy its structure or content):
{bad_output[:2000]}

ORIGINAL REQUEST:
{original_prompt}

Produce the complete, corrected JSON now."""


def build_point_user_prompt(ctx: dict, section: str, user_instruction: str, point_data: Any) -> str:
    """Builds the user-facing prompt for single-point regeneration."""
    skills_lines = "\n  ".join(filter(None, [
        f"Key Skills / Tech Stack   : {ctx.get('key_skills')}" if ctx.get("key_skills") else "",
        f"Core Competencies         : {ctx.get('core_competencies')}" if ctx.get("core_competencies") else "",
        f"Functional Competencies   : {ctx.get('functional_competencies')}" if ctx.get("functional_competencies") else "",
        f"Additional Context        : {ctx.get('additional_context')}" if ctx.get("additional_context") else "",
    ])) or "None provided."

    return f"""ROLE DETAILS:
  Title           : {ctx.get("title", "professional")}
  Seniority       : {ctx.get("seniority", "Mid-level")}
  Employment Type : {ctx.get("employment_type", "Full-Time")}
  Department      : {ctx.get("department", "")}
  Industry        : {ctx.get("industry", "")}

SKILLS AND CONTEXT:
  {skills_lines}

TARGET SECTION: {section}

CURRENT POINT DATA:
{json.dumps(point_data, indent=2)}

USER INSTRUCTION:
{user_instruction}
"""


def build_section_user_prompt(ctx: dict, section: str, user_instruction: Optional[str], salary_display: str, current_content: Any = None, section_label: Optional[str] = None, section_type: Optional[str] = None) -> str:
    """Builds the user-facing prompt for single-section regeneration."""
    skills_lines = "\n  ".join(filter(None, [
        f"Key Skills / Tech Stack   : {ctx['key_skills']}" if ctx.get("key_skills") else "",
        f"Core Competencies         : {ctx['core_competencies']}" if ctx.get("core_competencies") else "",
        f"Functional Competencies   : {ctx['functional_competencies']}" if ctx.get("functional_competencies") else "",
        f"Additional Context        : {ctx['additional_context']}" if ctx.get("additional_context") else "",
    ])) or "None provided."

    display_name = (section_label or section.replace("_", " ").replace("section ", "Section ")).strip()
    array_sections = {"key_duties", "core_competencies", "functional_competencies", "qualifications_required", "qualifications_preferred"}
    weighted_labels = ("competenc", "performance area", "key performance", "dut", "responsibilit")

    if isinstance(current_content, dict) and "section_data" in current_content:
        if not section_type:
            section_type = current_content.get("type")
        current_content = current_content.get("section_data")

    is_list = False
    is_weighted = section_type == "weighted_list"
    if section_type in ("points", "weighted_list"):
        is_list = True
        is_weighted = section_type == "weighted_list"
    elif section in array_sections:
        is_list = True
        is_weighted = True
    elif any(token in display_name.lower() for token in weighted_labels):
        is_list = True
        is_weighted = True
    elif isinstance(current_content, list):
        is_list = True
        if current_content and isinstance(current_content[0], dict) and "weight" in current_content[0]:
            is_weighted = True
    elif isinstance(current_content, dict) and any(k in current_content for k in ("point", "points", "weight")):
        is_list = True
        is_weighted = "weight" in current_content

    if section in SECTION_SPECS and is_list and is_weighted:
        spec = SECTION_SPECS[section]
    elif is_list and is_weighted:
        spec = (
            f'Array of {{"point", "weight"}} for "{display_name}". '
            f'Return {{"{section}": [{{"point": "string", "weight": integer}}]}}. '
            "4-6 substantive items. Weights must sum to 100. "
            "Generate real competency/duty content grounded in the role context. "
            "Do NOT return the section title, section name, or job title as content."
        )
    elif is_list:
        spec = (
            f'Array of bullet points for "{display_name}". '
            f'Return {{"{section}": ["string", ...]}}. '
            "Generate substantive content — not the section title or job title."
        )
    elif section in SECTION_SPECS:
        spec = SECTION_SPECS[section]
    else:
        spec = (
            f'Plain string for "{display_name}". Return {{"{section}": "string"}}. '
            "Generate substantive section content — not the section title or job title alone."
        )

    seniority = ctx.get("seniority", "Mid-level")
    title = ctx.get("title", "professional")
    current_display = json.dumps(current_content, indent=2) if current_content not in (None, "", []) else ("[]" if is_list else '""')

    return f"""ROLE DETAILS:
  Title           : {title}
  Seniority       : {seniority}
  Employment Type : {ctx.get("employment_type", "Full-Time")}
  Department      : {ctx["department"]}
  Industry        : {ctx["industry"]}
  Location        : {ctx["location"]}
  Salary     : {salary_display or "Not provided"}
  Date       : {get_current_date()}

SKILLS AND REQUIREMENTS (only these may be referenced, no additions):
  {skills_lines}

INSTRUCTION: {user_instruction or "Rewrite this section. Reference only provided skills and tools. No generic language. No invented numbers. Follow all jurisdiction rules."}

CURRENT CONTENT ({display_name}):
{current_display}

SECTION TO REWRITE: {display_name.upper()} (key: {section})
FORMAT: {spec}
REMINDER: Do not open essential_duties as "As a {seniority.lower()} {title}".
REMINDER: Do not add tools, frameworks, or compliance standards not listed above.
REMINDER: Never echo the section heading "{display_name}" or the job title "{title}" as the generated content.
REMINDER: Preserve ALL numbers, values, salary figures, salary ranges, grades, codes, version numbers, and identifiers found in CURRENT CONTENT exactly as-is. Do NOT omit them. Do NOT replace them with placeholders.

Return only: {{"{section}": <value>}}"""


class AIService:

    def __init__(self):
        self.max_wait_time = float(getattr(settings, "ai_timeout_read", 55.0))
        self.retry_attempts = int(getattr(settings, "ai_retry_attempts", 3))
        self.retry_min = float(getattr(settings, "ai_retry_min", 0.5))
        self.retry_max = float(getattr(settings, "ai_retry_max", 6.0))
        self.retry_multiplier = float(getattr(settings, "ai_retry_multiplier", 1.0))
        self.temperature = float(getattr(settings, "ai_temperature", 0.35))
        self.top_p = float(getattr(settings, "ai_top_p", 0.90))
        self.client: ChatMistralAI | None = None
        self.model_id : str | None = None

        try:
            self.model_id = settings.ai_model
            # Note: We pass ai_base_url as endpoint if it's set.
            kwargs = {
                "mistral_api_key": settings.ai_api_key,
                "model": self.model_id,
                "temperature": self.temperature,
                "top_p": self.top_p,
            }
            if settings.ai_base_url:
                kwargs["endpoint"] = settings.ai_base_url
                
            # Configure guardrails to prevent harmful content generation
            kwargs["model_kwargs"] = {
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
                
            self.client = ChatMistralAI(**kwargs)
            logger.info(f"AI client initialised. Model: {self.model_id} via LangChain MistralAI")
        except Exception as e:
            import traceback
            logger.error(f"Failed to initialise AI client: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")

    
    def _is_quota_exhausted(self, error: Exception) -> bool:
        """Check if the error indicates daily quota exhaustion (not temporary rate limit)."""
        error_str = str(error).lower()
        # Check for quota exhaustion patterns
        quota_patterns = [
            "free-models-per-day",
            "quota exceeded",
            "daily limit",
            "add credits",
            "unlock",
        ]
        return any(pattern in error_str for pattern in quota_patterns)

    def _should_retry_rate_limit(self, error: Exception) -> bool:
        """Custom retry condition that only retries rate limit errors (429)."""
        if self._is_quota_exhausted(error):
            return False
        if isinstance(error, HTTPException):
            return error.status_code == 429
        # Catch standard HTTP errors that might indicate rate limits
        if hasattr(error, 'response') and hasattr(error.response, 'status_code'):
            return error.response.status_code == 429
        return False

    def _map_provider_error(self, error: Exception) -> Optional[HTTPException]:
        """Converts known provider errors into appropriate HTTPExceptions."""
        msg = str(error).lower()
        code = getattr(error, "status_code", None)
        if hasattr(error, 'response') and hasattr(error.response, 'status_code'):
            code = error.response.status_code
        logger.error(f"DEBUG: Mapping error - type: {type(error)}, code: {code}, msg: {msg}")
        
        if code == 429 or any(k in msg for k in ("resource_exhausted", "quota exceeded", "rate limit", "too many requests", "free-models-per-day")):
            detail = "Rate limit reached or quota exceeded. Please retry shortly."
            if "free-models-per-day" in msg or "quota exceeded" in msg:
                detail = "Provider quota exceeded. Please add credits to your account or retry tomorrow."
            return HTTPException(status_code=429, detail=detail)
        if any(k in msg for k in ("moderation", "guardrail", "policy", "block")):
            return HTTPException(status_code=422, detail="unprocessible data found which is against the guardrils")
        return None

    def _retry_condition(self, retry_state):
        """Custom retry condition that handles rate limits and other retryable errors."""
        if retry_state.outcome.failed:
            exception = retry_state.outcome.exception()
            if isinstance(exception, (asyncio.TimeoutError, OSError, ValueError)):
                return True
            if self._is_quota_exhausted(exception):
                logger.warning("Daily quota exhausted - skipping remaining retries")
                return False
            
            code = getattr(exception, "status_code", None)
            if hasattr(exception, 'response') and hasattr(exception.response, 'status_code'):
                code = exception.response.status_code
            
            if code and 500 <= code <= 599:
                logger.warning(f"AI provider returned HTTP {code} - triggering retry")
                return True

            return self._should_retry_rate_limit(exception)
        return False

    async def _call_with_model(self, system_prompt: str, user_prompt: str, max_tokens: int, model_id: str = None) -> str:
        """Calls the LLM with a specific model and retry logic."""
        if not self.client:
            raise HTTPException(status_code=503, detail="Service not initialised")

        async def _one_attempt_with_model() -> str:
            current_model = model_id or self.model_id
            
            model_lower = current_model.lower()
            if "gemma" in model_lower or "google" in model_lower:
                messages = [HumanMessage(content=f"SYSTEM INSTRUCTIONS:\n{system_prompt}\n\nUSER REQUEST:\n{user_prompt}")]
            else:
                messages = [
                    SystemMessage(content=system_prompt),
                    HumanMessage(content=user_prompt),
                ]

            # In LangChain, we can pass model-specific kwargs to ainvoke, but ChatMistralAI might not accept max_tokens in ainvoke directly if it wasn't init'd.
            # We can bind it or pass it. We'll pass it to ainvoke.
            try:
                resp = await self.client.ainvoke(messages)
                text = (resp.content or "").strip()
                if not text:
                    raise ValueError("Empty response received")
                return text
            except Exception as e:
                logger.error(f"AI Provider error: {e}")
                raise e

        try:
            async for attempt in AsyncRetrying(
                stop=stop_after_attempt(max(self.retry_attempts, 1)),
                wait=wait_exponential_jitter(initial=self.retry_min,max=self.retry_max,exp_base=max(self.retry_multiplier, 1.0)),retry=self._retry_condition,reraise=True):
                with attempt:
                    logger.info(f"LLM call attempt {attempt.retry_state.attempt_number}/{self.retry_attempts} with model: {model_id or self.model_id}")
                    # add timeout via asyncio.wait_for
                    return await asyncio.wait_for(_one_attempt_with_model(), timeout=self.max_wait_time)
        except RetryError as exc:
            raise HTTPException(status_code=504, detail="Generation failed after retries") from exc
        except Exception as exc:
            mapped = self._map_provider_error(exc)
            if mapped:
                raise mapped from exc
            raise

    async def _call(self, system_prompt: str, user_prompt: str, max_tokens: int) -> str:
        """Calls the LLM with retry logic and returns the raw text response."""
        return await self._call_with_model(system_prompt, user_prompt, max_tokens)

    def _parse(self, raw: str) -> Dict[str, Any]:
        """Parses the LLM's raw string response into a dict, repairing JSON if needed."""
        clean = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw.strip(), flags=re.MULTILINE).strip()
        brace_idx = clean.find("{")
        if brace_idx > 0:
            clean = clean[brace_idx:]
        try:
            return json.loads(clean)
        except Exception:
            repaired = repair_json(clean)
            if isinstance(repaired, str):
                return json.loads(repaired)
            if isinstance(repaired, dict):
                return repaired
            raise ValueError("Could not parse response as JSON")

    def _apply_word_limits(self, parsed: dict, limits: dict) -> dict:
        """Truncates string fields to their configured maximum word counts."""
        for field, max_w in [
            ("summary", limits["summary"]["max"]),
            ("essential_duties_and_responsibilities", limits["essential_duties_and_responsibilities"]["max"]),
            ("eeo_statement", limits["eeo_statement"]["max"]),
        ]:
            parsed[field] = truncate_text(parsed.get(field, ""), max_w)
        return parsed

    
        
    async def generate_job_description(self, data: Dict, model_name: str = None) -> Dict:
        """Generates a complete job description with one repair pass if validation fails."""
        if not self.client:
            raise HTTPException(status_code=500, detail="Service not initialised")

        try:
            limits = resolve_limits(data.get("word_count_limits") or {})
            country_ctx = resolve_country(str(data.get("country_code") or ""))
            salary_display = get_salary_display(data, data.get("salary_range") or "")
            company = (data.get("company_name") or "").strip()
            seniority = (data.get("seniority") or "Mid-level").strip()
            title = (data.get("title") or "").strip()
            eeo_statement = build_eeo_statement(company, country_ctx)
            input_tokens = extract_input_tokens(data)
            regulated = is_regulated_industry(data)
            allowed_skills = (data.get("key_skills_and_requirements")or data.get("skills")or "core technical skills provided in input")

            is_eng = False
            title_lower = title.lower()
            industry_lower = str(data.get("industry") or "").lower()
            for keyword in ("eng", "developer", "software", "tech", "code", "programming", "architect"):
                if keyword in title_lower or keyword in industry_lower:
                    is_eng = True
                    break

            policy_block = build_policy_block(country_ctx, limits, salary_display, eeo_statement, regulated, is_engineering=is_eng)
            user_prompt = build_jd_user_prompt(data)
            combined_prompt = f"{policy_block}\n\n{user_prompt}"

            raw = await self._call_with_model(WRITER_SYSTEM_PROMPT, combined_prompt, settings.ai_max_tokens, model_name)
            parsed = self._parse(raw)

            if not isinstance(parsed, dict):
                raise HTTPException(status_code=500, detail="Invalid response structure")

            parsed = normalise_payload(parsed)
            _apply_competency_seed_merge(data, parsed)
            failures = run_validation(parsed, limits, seniority, title, input_tokens)

            # Apply in-memory fixes for common issues to avoid repair LLM calls
            weight_failures = [f for f in failures if "weight_sum" in f]
            eeo_failures = [f for f in failures if "eeo_" in f]
            
            if weight_failures and not eeo_failures and not any("banned_words" in f for f in failures):
                # Fix weight sums in-memory - adjust first item to absorb rounding error
                for arr_field in ("key_duties", "core_competencies", "functional_competencies", "qualifications_required", "qualifications_preferred"):
                    arr = parsed.get(arr_field, [])
                    if isinstance(arr, list) and arr:
                        weight_sum = sum(item.get("weight", 0) for item in arr if isinstance(item, dict))
                        if weight_sum != 100 and arr:
                            # Adjust first item to absorb the difference
                            diff = 100 - weight_sum
                            arr[0]["weight"] = arr[0].get("weight", 0) + diff
                            logger.info(f"Fixed {arr_field} weight sum from {weight_sum} to 100 in-memory")
                
                # Re-run validation to confirm weight fixes
                failures = run_validation(parsed, limits, seniority, title, input_tokens)
            
            if failures:
                logger.warning(f"Validation failures: {failures} — running repair pass")
                try:
                    repair_prompt = build_repair_prompt(combined_prompt, raw, failures, allowed_skills)
                    repair_raw = await self._call_with_model(WRITER_SYSTEM_PROMPT, repair_prompt, settings.ai_max_tokens, model_name)
                    parsed = self._parse(repair_raw)
                    parsed = normalise_payload(parsed)
                    _apply_competency_seed_merge(data, parsed)

                    second_pass = run_validation(parsed, limits, seniority, title, input_tokens)
                    if second_pass:
                        logger.warning(f"Remaining failures after repair: {second_pass}")
                except HTTPException as e:
                    if e.status_code == 429:
                        logger.warning("Rate limit hit during repair pass - using original content with fallbacks")
                    else:
                        raise

            parsed = self._apply_word_limits(parsed, limits)
            parsed["word_count"] = compute_total_word_count(parsed)
            logger.info(f"Successfully generated JD with LLM: {title} ({parsed['word_count']} words)")
            return parsed

        except HTTPException as e:
            # Handle 429 rate limit errors - directly send error after all retries exhausted
            if e.status_code == 429:
                # Check if this is quota exhaustion vs temporary rate limit
                if self._is_quota_exhausted(e):
                    logger.error(f"Daily LLM quota exhausted for {data.get('title', 'unknown')}. "f"Add credits to your OpenRouter account to unlock 1000+ requests per day.")
                    raise HTTPException(status_code=429,detail="Daily LLM quota exhausted. Add credits to your OpenRouter account to continue.")
                else:
                    logger.error(f"LLM rate limit hit after all retries for {data.get('title', 'unknown')}. Retry in a few minutes or add credits to your OpenRouter account.")
                    raise HTTPException(status_code=429,detail="LLM rate limit exceeded. Please retry in a few minutes.")
            raise
        except (asyncio.TimeoutError, HTTPException):
            raise
        except Exception as e:
            log_exception_one_line("JD generation error", e)
            raise HTTPException(status_code=500, detail=str(e))

    async def regenerate_section(self, jd_data: Dict, section: str, context: Optional[str] = None, model_name: str = None, section_label: Optional[str] = None, section_type: Optional[str] = None) -> Dict:
        """Regenerates a single section of an existing job description."""
        ctx = jd_context_from(jd_data)
        limits = resolve_limits(jd_data.get("word_count_limits") or {})
        country_ctx = resolve_country(ctx.get("country_code") or "")
        salary_display = get_salary_display(jd_data, str(jd_data.get("salary_range") or ""))
        company = (jd_data.get("company_name") or ctx.get("title") or "").strip()
        eeo_statement = build_eeo_statement(company, country_ctx)
        regulated = is_regulated_industry(ctx)

        is_eng = False
        title_lower = (ctx.get("title") or "").lower()
        industry_lower = (ctx.get("industry") or "").lower()
        for keyword in ("eng", "developer", "software", "tech", "code", "programming", "architect"):
            if keyword in title_lower or keyword in industry_lower:
                is_eng = True
                break

        policy_block = build_policy_block(country_ctx, limits, salary_display, eeo_statement, regulated, is_engineering=is_eng)
        policy_block += f"\n\nSingle-section regeneration. Calibrate all content to {ctx['seniority']} seniority."
        current_val = jd_data.get("content", {}).get(section)
        if isinstance(current_val, dict) and "section_data" in current_val:
            if not section_type:
                section_type = current_val.get("type")
            current_val = current_val.get("section_data")
        user_prompt = build_section_user_prompt(
            ctx, section, context, salary_display, current_val,
            section_label=section_label, section_type=section_type,
        )

        try:
            # Use specific model for regenerate section - default to configured model
            specific_model = model_name or settings.ai_model
            raw = await self._call_with_model(EDITOR_SYSTEM_PROMPT, f"{policy_block}\n\n{user_prompt}", 2048, specific_model)
            parsed = self._parse(raw)
            # 1. Resolve the value from parsed dictionary, handling case-insensitive keys
            value = None
            if isinstance(parsed, dict):
                # Try exact match first
                value = parsed.get(section)
                if value is None:
                    # Try case-insensitive matching
                    for k, v in parsed.items():
                        if k.lower().replace("_", "").replace(" ", "") == section.lower().replace("_", "").replace(" ", ""):
                            value = v
                            break
                if value is None and len(parsed) == 1:
                    # If LLM returned a single-keyed dictionary with a different key, extract it
                    value = list(parsed.values())[0]
            if value is None:
                value = parsed

            string_sections = {"summary", "essential_duties_and_responsibilities", "eeo_statement"}
            array_sections = {"key_duties", "core_competencies", "functional_competencies","qualifications_required", "qualifications_preferred"}
            str_max_map = {
                "summary": limits["summary"]["max"],
                "essential_duties_and_responsibilities": limits["essential_duties_and_responsibilities"]["max"],
                "eeo_statement": limits["eeo_statement"]["max"],
            }

            # 2. Determine if section is array/list or plain text string
            is_array = False
            is_weighted = section_type == "weighted_list"
            weighted_labels = ("competenc", "performance area", "key performance", "dut", "responsibilit")
            display_name = (section_label or section).lower()
            if section_type in ("points", "weighted_list"):
                is_array = True
            elif section in array_sections:
                is_array = True
                is_weighted = True
            elif any(token in display_name for token in weighted_labels):
                is_array = True
                is_weighted = True
            elif section not in string_sections:
                if isinstance(value, list):
                    is_array = True
                elif isinstance(current_val, list):
                    is_array = True
                elif isinstance(value, dict) and any(k in value for k in ("point", "points", "weight")):
                    is_array = True
                    is_weighted = "weight" in value

            # 3. Normalize value based on type
            if not is_array:
                # Treat as string
                if isinstance(value, dict) or isinstance(value, list):
                    if isinstance(value, dict):
                        # Extract first text value or list values flattened
                        extracted = None
                        for k, v in value.items():
                            if isinstance(v, str):
                                extracted = v
                                break
                        if extracted is None:
                            value = json.dumps(value)
                        else:
                            value = extracted
                    else:
                        value = "\n".join([str(item.get("point", item) if isinstance(item, dict) else item) for item in value])
                if not isinstance(value, str):
                    value = str(value)
                value = truncate_text(value, str_max_map.get(section, 1000))
            else:
                # Treat as array/list of points
                if isinstance(value, dict):
                    # If nested under a key
                    for k, v in value.items():
                        if isinstance(v, list):
                            value = v
                            break
                if not isinstance(value, list):
                    value = []
                value = flatten_to_point_weight(value, section)

            wc = array_word_count(value) if isinstance(value, list) else word_count(str(value))
            return {section: value, "word_count": wc}

        except asyncio.TimeoutError:
            logger.error(f"Section regeneration timed out after {self.max_wait_time}s")
            raise HTTPException(status_code=504, detail="Section regeneration timed out")
        except HTTPException:
            raise
        except Exception as e:
            log_exception_one_line("Section regeneration failed", e)
            raise HTTPException(status_code=500, detail="Failed to regenerate section")

    async def regenerate_point(self, jd_data: Dict, section: str, point_data: Any, context: str, model_name: str = None) -> Dict:
        """Regenerates a single point within a section."""
        ctx = jd_context_from(jd_data)
        regulated = is_regulated_industry(ctx)

        policy_block = f"Calibrate content to {ctx.get('seniority', 'Mid-level')} seniority."
        if regulated:
            policy_block += "\nUse compliance-appropriate language."
            
        user_prompt = build_point_user_prompt(ctx, section, context, point_data)

        try:
            specific_model = model_name or settings.ai_model
            raw = await self._call_with_model(POINT_EDITOR_SYSTEM_PROMPT, f"{policy_block}\n\n{user_prompt}", 1024, specific_model)
            parsed = self._parse(raw)
            value = parsed.get("refined_point", parsed)

            return {"section": section, "new_point": value}

        except asyncio.TimeoutError:
            logger.error(f"Point regeneration timed out after {self.max_wait_time}s")
            raise HTTPException(status_code=504, detail="Point regeneration timed out")
        except HTTPException:
            raise
        except Exception as e:
            log_exception_one_line("Point regeneration failed", e)
            raise HTTPException(status_code=500, detail="Failed to regenerate point")

    async def analyze_dei(self, text: str) -> dict:
        """Scan text for diversity, equity, and inclusion (DEI) issues and suggest rephrasings."""
        system_prompt = (
            "You are an expert HR DEI consultant. Analyze the provided job description text for non-inclusive language "
            "(e.g., gender-biased terms, ageist phrases, coded terms like 'rockstar' or 'ninja', or references "
            "that exclude disabled individuals). "
            "Return a JSON object with: \n"
            "{\n"
            "  \"score\": 0 to 100,\n"
            "  \"findings\": [\n"
            "    {\n"
            "      \"original\": \"original text fragment\",\n"
            "      \"issue_type\": \"gender-bias / ageism / exclusion / coded-language\",\n"
            "      \"explanation\": \"why this term is non-inclusive\",\n"
            "      \"suggested_rephrasing\": \"inclusive alternative\"\n"
            "    }\n"
            "  ]\n"
            "}"
        )
        user_prompt = f"Analyze the following job description text:\n\n{text}"
        try:
            raw = await self._call_with_model(system_prompt, user_prompt, 2048)
            return self._parse(raw)
        except Exception as e:
            logger.error(f"DEI scan failed: {e}")
            raise HTTPException(status_code=500, detail="Failed to complete DEI scan")

    async def analyze_compliance(self, text: str, country_code: str) -> dict:
        """Scan text for regional/jurisdictional labor law compliance (EEO, salary disclosure, ADA, etc.)."""
        country = country_code.upper()
        country_info = COUNTRY_CONTEXT.get(country, {"label": country, "writing_rules": []})
        rules_str = "\n".join([f"- {r}" for r in country_info.get("writing_rules", [])])
        
        system_prompt = (
            f"You are a labor law compliance specialist for {country_info.get('label')}. "
            "Analyze the provided job description text for compliance issues relative to local labor laws, "
            "specifically checking for:\n"
            "- Age criteria or discrimination\n"
            "- Gender preferences or gendered pronouns\n"
            "- Discouraged physical requirements (unless genuinely essential for the role)\n"
            "- Discriminatory nationality, caste, religion, or mother-tongue criteria\n"
            "- Missing salary disclosures (if required in that jurisdiction)\n"
            "Return a JSON object with:\n"
            "{\n"
            "  \"is_compliant\": true/false,\n"
            "  \"findings\": [\n"
            "    {\n"
            "      \"original\": \"problematic text fragment\",\n"
            "      \"rule_violated\": \"Local law or guideline violated\",\n"
            "      \"severity\": \"high/medium/low\",\n"
            "      \"explanation\": \"why this violates compliance rules\",\n"
            "      \"fix\": \"how to correct this wording\"\n"
            "    }\n"
            "  ]\n"
            "}"
        )
        if rules_str:
            system_prompt += f"\n\nLocal Writing Rules to enforce:\n{rules_str}"
            
        user_prompt = f"Analyze the following job description text:\n\n{text}"
        try:
            raw = await self._call_with_model(system_prompt, user_prompt, 2048)
            return self._parse(raw)
        except Exception as e:
            logger.error(f"Compliance scan failed: {e}")
            raise HTTPException(status_code=500, detail="Failed to complete compliance scan")

    async def translate_jd(self, content: dict, target_language: str) -> dict:
        """Translate the job description content JSON into the target language, preserving JSON keys and structure."""
        system_prompt = (
            f"You are a professional HR translator. Translate all string values in the provided JSON job description "
            f"into {target_language}. Keep all JSON keys exactly the same. Do not translate the keys. "
            f"Preserve the structure, list elements, and professional tone appropriate for HR. "
            f"Return only the valid translated JSON object."
        )
        user_prompt = json.dumps(content, ensure_ascii=False)
        try:
            raw = await self._call_with_model(system_prompt, user_prompt, 4096)
            return self._parse(raw)
        except Exception as e:
            logger.error(f"JD translation failed: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to translate JD to {target_language}")


ai_service = AIService()


async def generate_job_description(data: Dict, model_name: str = None) -> Dict:
    """Public entry point for full JD generation."""
    return await ai_service.generate_job_description(data, model_name)


async def regenerate_section(jd_data: Dict, section: str, context: Optional[str] = None, model_name: str = None, section_label: Optional[str] = None, section_type: Optional[str] = None) -> Dict:
    """Public entry point for single-section regeneration."""
    return await ai_service.regenerate_section(jd_data, section, context, model_name, section_label=section_label, section_type=section_type)


async def regenerate_point(jd_data: Dict, section: str, point_data: Any, context: str, model_name: str = None) -> Dict:
    """Public entry point for single-point regeneration."""
    return await ai_service.regenerate_point(jd_data, section, point_data, context, model_name)


async def analyze_dei(text: str) -> dict:
    """Public entry point for DEI scanner."""
    return await ai_service.analyze_dei(text)


async def analyze_compliance(text: str, country_code: str) -> dict:
    """Public entry point for compliance scanner."""
    return await ai_service.analyze_compliance(text, country_code)


async def translate_jd(content: dict, target_language: str) -> dict:
    """Public entry point for JD translation."""
    return await ai_service.translate_jd(content, target_language)
