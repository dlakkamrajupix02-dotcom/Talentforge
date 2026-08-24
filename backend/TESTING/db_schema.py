import sys
import os

# Force UTF-8 encoding for Windows terminals
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.models.models import Base

def generate_dynamic_schema_prompt() -> str:
    """
    Constructs the exact schema description sent to Mistral AI
    by reflecting Base.metadata.tables.
    """
    lines = ["Comprehensive PostgreSQL Schema for TalentForge Platform:\n"]
    for table_name, table in Base.metadata.tables.items():
        lines.append(f"{table_name}:")
        for col in table.columns:
            col_type = str(col.type)
            fk_str = ""
            if col.foreign_keys:
                fks = [f"FK -> {fk.target_fullname}" for fk in col.foreign_keys]
                fk_str = f" ({', '.join(fks)})"
            pk_str = " [PK]" if col.primary_key else ""
            lines.append(f"   - {col.name}: {col_type}{pk_str}{fk_str}")
        lines.append("")
    return "\n".join(lines)

def print_exact_ai_payload(sample_user_prompt="Show top 5 organizations with their JD count and total users"):
    schema_text = generate_dynamic_schema_prompt()

    # The exact system instruction sent in SystemMessage
    system_instruction = f"""You are the Elite Super Admin Intelligence & SQL Agent for the TalentForge multi-tenant platform.
Your task is to analyze Super Admin questions and write a precise, highly optimized PostgreSQL query across the platform's database tables.

{schema_text}
RULES:
1. ONLY produce safe, read-only SELECT queries (JOINs, GROUP BYs, aggregates, date truncations, CTEs, filters, subqueries are encouraged).
2. NEVER write INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, or schema-mutating queries.
3. Always wrap queries with a reasonable LIMIT (default 100 max) unless it is an aggregate query.
4. Handle NULLs gracefully (e.g. COALESCE(industry, 'Unspecified')).
5. Return your response in STRICT JSON format matching this schema:
{{
  "sql_query": "SELECT ...;",
  "explanation": "Brief explanation of what the query calculates",
  "suggested_chart_type": "bar | line | area | pie | radar | table",
  "chart_config": {{
    "x_key": "column_name_for_x_axis",
    "y_keys": ["column_name_for_y_axis"],
    "labels": {{"column_name_for_y_axis": "Display Label"}},
    "title": "Chart Title"
  }}
}}
"""

    human_prompt = f"Super Admin Query: {sample_user_prompt}"

    print("=" * 90)
    print("EXACT PAYLOAD SENT TO MISTRAL AI (CODESTRAL)")
    print("=" * 90)
    print(f"Total Registered Database Tables Included: {len(Base.metadata.tables)}")
    print(f"Total Payload Size: ~{len(system_instruction) + len(human_prompt):,} characters")
    print("=" * 90)
    print("\n--- [1] SYSTEM MESSAGE (Instructions + Database Blueprint) ---\n")
    print(system_instruction)
    print("=" * 90)
    print("\n--- [2] HUMAN MESSAGE (User Question) ---\n")
    print(human_prompt)
    print("\n" + "=" * 90)
    print("NOTICE: Zero database rows, zero passwords, and zero user records are in this payload.")
    print("=" * 90)

if __name__ == "__main__":
    prompt = sys.argv[1] if len(sys.argv) > 1 else "Show top 5 organizations with their JD count and total users"
    print_exact_ai_payload(prompt)
