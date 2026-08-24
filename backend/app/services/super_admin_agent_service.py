import re
import json
import time
import base64
from typing import Any, Dict, List, Optional
from datetime import datetime, date
from uuid import UUID
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from langchain_mistralai import ChatMistralAI
from langchain_core.messages import SystemMessage, HumanMessage
from json_repair import repair_json
from app.core.config import settings
from app.core.logging import get_logger
from app.models.models import Base

logger = get_logger()

def generate_dynamic_schema_prompt() -> str:
    """
    Dynamically reflects all SQLAlchemy ORM models from Base.metadata
    to construct a comprehensive, up-to-date PostgreSQL schema prompt for Mistral AI.
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

DYNAMIC_DB_SCHEMA = generate_dynamic_schema_prompt()

FORBIDDEN_SQL_KEYWORDS = [
    'DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'TRUNCATE', 'GRANT', 'REVOKE',
    'CREATE', 'REPLACE', 'EXECUTE', 'UPSERT', 'MERGE', 'CALL', 'VACUUM', 'REINDEX'
]

class SuperAdminAgentService:
    def __init__(self):
        self.default_model = "codestral-latest"

    def _get_llm(self, model_name: Optional[str] = None):
        from app.services.enhanced_ai_service import get_llm_client
        return get_llm_client(model_name=model_name or self.default_model, temperature=0.1, max_tokens=3000)

    def _validate_sql_safety(self, sql: str) -> bool:
        cleaned_sql = sql.strip().upper()
        if not (cleaned_sql.startswith('SELECT') or cleaned_sql.startswith('WITH')):
            return False
        for kw in FORBIDDEN_SQL_KEYWORDS:
            if re.search(rf'\b{kw}\b', cleaned_sql):
                return False
        return True

    def _json_serializable(self, val: Any) -> Any:
        if isinstance(val, (datetime, date)):
            return val.isoformat()
        if isinstance(val, UUID):
            return str(val)
        if isinstance(val, (bytes, bytearray)):
            return str(val)
        return val

    def _compute_real_kpis_and_insights(self,rows: List[Dict[str, Any]],columns: List[str],user_prompt: str) -> tuple[List[Dict[str, Any]], List[str]]:
        """
        Derives 100% accurate, factual KPIs and insights directly from the actual database rows.
        No hallucinations or mock numbers.
        """
        if not rows:
            return ([{"label": "Total Records", "value": "0"}], ["No matching records found in the database for this inquiry."])

        kpi_cards = []
        insights = []

        total_records = len(rows)
        
        # Check distinct count for primary column to avoid misleading labels when grouped by (company, role)
        if columns:
            primary_col = columns[0]
            distinct_primary = len(set(r.get(primary_col) for r in rows if r.get(primary_col) is not None))
            col_label = primary_col.replace('_', ' ').title()
            
            if distinct_primary < total_records and len(columns) > 1:
                entity_label = "Unique Companies" if any(k in primary_col.lower() for k in ["company", "org", "tenant"]) else f"Unique {col_label}"
                kpi_cards.append({
                    "label": entity_label,
                    "value": f"{distinct_primary:,}"
                })
                kpi_cards.append({
                    "label": "Total Breakdown Rows",
                    "value": f"{total_records:,}"
                })
            else:
                kpi_cards.append({
                    "label": f"Total {col_label}",
                    "value": f"{total_records:,}"
                })
        else:
            kpi_cards.append({
                "label": "Total Records",
                "value": f"{total_records:,}"
            })

        # Identify numeric columns for factual aggregations
        numeric_col_stats = {}
        for col in columns:
            numeric_vals = [
                r[col] for r in rows
                if isinstance(r.get(col), (int, float)) and not isinstance(r.get(col), bool)
            ]
            if len(numeric_vals) == len(rows) and len(numeric_vals) > 0:
                total_sum = sum(numeric_vals)
                avg_val = total_sum / len(numeric_vals) if len(numeric_vals) else 0
                max_val = max(numeric_vals)
                min_val = min(numeric_vals)
                zero_count = sum(1 for v in numeric_vals if v == 0)
                
                # Find row with max value
                top_row = next((r for r in rows if r.get(col) == max_val), None)
                top_name = top_row.get(columns[0]) if top_row and columns else None

                numeric_col_stats[col] = {
                    "sum": total_sum,
                    "avg": avg_val,
                    "max": max_val,
                    "min": min_val,
                    "zero_count": zero_count,
                    "top_name": top_name
                }

        # Add genuine calculated KPI cards
        for col, stat in list(numeric_col_stats.items())[:2]:
            col_label = col.replace('_', ' ').title()
            kpi_cards.append({
                "label": f"Total {col_label}",
                "value": f"{stat['sum']:,}" if isinstance(stat['sum'], int) else f"{stat['sum']:,.2f}"
            })
            if len(rows) > 1 and len(kpi_cards) < 4:
                kpi_cards.append({
                    "label": f"Average {col_label}",
                    "value": f"{stat['avg']:,.1f}"
                })

        # Derive genuine insights based strictly on the data
        if columns and len(columns) > 1 and distinct_primary < total_records:
            insights.append(f"Retrieved {distinct_primary} unique {primary_col.replace('_', ' ')} across {total_records} categorical breakdowns.")

        for col, stat in numeric_col_stats.items():
            col_name_clean = col.replace('_', ' ').lower()
            if stat["top_name"] and stat["max"] > 0:
                insights.append(f"Highest {col_name_clean} is held by {stat['top_name']} with {stat['max']:,} {col_name_clean}.")
            if stat["zero_count"] > 0:
                insights.append(f"{stat['zero_count']} out of {total_records} {columns[0].replace('_', ' ')} have zero {col_name_clean}.")
            if stat["sum"] > 0 and len(rows) > 0:
                insights.append(f"Platform-wide total {col_name_clean} across these records is {stat['sum']:,}.")

        if not insights:
            insights.append(f"Successfully retrieved {total_records} record{'s' if total_records != 1 else ''} matching your inquiry.")

        return (kpi_cards[:4], insights[:4])

    async def generate_sql_and_analysis(self,db: AsyncSession,user_prompt: str,chat_history: Optional[List[Dict[str, str]]] = None,model_name: Optional[str] = None) -> Dict[str, Any]:
        llm = self._get_llm(model_name)

        system_instruction = f"""You are the Elite Super Admin Intelligence & SQL Agent for the TalentForge multi-tenant platform.
Your task is to analyze Super Admin questions and write a precise, highly optimized PostgreSQL query across the platform's database tables.

{DYNAMIC_DB_SCHEMA}

RULES:
1. ONLY produce safe, read-only SELECT queries (JOINs, GROUP BYs, aggregates, date truncations, CTEs, filters, subqueries are encouraged).
2. NEVER write INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, or schema-mutating queries.
3. Always wrap queries with a reasonable LIMIT (default 100 max) unless it is an aggregate query.
4. Handle NULLs gracefully (e.g. COALESCE(industry, 'Unspecified')).
5. DEDUPLICATION & GROUP BY: When calculating metrics per company/organization, department, user, or category, ALWAYS use `GROUP BY` (e.g. `GROUP BY o.id, o.name`) and aggregate functions (e.g. `COUNT(DISTINCT ...)`, `SUM(...)`, `AVG(...)`). NEVER produce multiple unaggregated rows repeating the same company or organization name on chart axes!
6. EXCEL / SPREADSHEET / TABLE REQUESTS: If the user mentions "excel", "xlsx", "csv", "spreadsheet", "table", "sheet", "export", "download", or asks for tabular data or lists, ALWAYS set `"suggested_chart_type": "table"`. Use clean, human-friendly column aliases in SQL (e.g. `o.name AS company_name`, `COUNT(j.id) AS total_jobs`).
7. Return your response in STRICT JSON format matching this schema:
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

        messages = [
            SystemMessage(content=system_instruction),
        ]

        if chat_history:
            for item in chat_history[-6:]:
                role = item.get("role", "user")
                content = item.get("content", "")
                if role == "user":
                    messages.append(HumanMessage(content=content))
                else:
                    messages.append(SystemMessage(content=f"Previous Context: {content}"))

        messages.append(HumanMessage(content=f"Super Admin Query: {user_prompt}"))

        start_time = time.perf_counter()
        try:
            ai_response = await llm.ainvoke(messages)
            raw_text = ai_response.content if hasattr(ai_response, 'content') else str(ai_response)
        except Exception as e:
            logger.error(f"Mistral LLM call failed: {e}")
            return {
                "success": False,
                "error": f"AI Model Error: {str(e)}",
                "message": "Could not reach the Mistral LLM engine. Please verify the AI API key and model availability."
            }

        # Parse JSON
        parsed_data = {}
        try:
            repaired = repair_json(raw_text)
            parsed_data = json.loads(repaired)
        except Exception:
            match = re.search(r'\{[\s\S]*\}', raw_text)
            if match:
                try:
                    parsed_data = json.loads(repair_json(match.group(0)))
                except Exception:
                    pass

        sql_query = parsed_data.get("sql_query", "").strip()
        explanation = parsed_data.get("explanation", "Analytics query processed.")
        suggested_chart_type = parsed_data.get("suggested_chart_type", "bar")
        chart_config = parsed_data.get("chart_config", {})

        # Deterministic Excel / Table detection
        lower_prompt = user_prompt.lower()
        is_table_requested = any(kw in lower_prompt for kw in ["excel", "xlsx", "csv", "spreadsheet", "sheet", "table", "tabular", "export", "download", "rows"])
        if is_table_requested:
            suggested_chart_type = "table"

        # Execute SQL safely
        rows = []
        columns = []
        execution_time_ms = 0

        if sql_query:
            cleaned_query = sql_query.strip().rstrip(';')
            if not self._validate_sql_safety(cleaned_query):
                return {
                    "success": False,
                    "error": "Security Guardrail: The generated query contained restricted operations or was not a valid SELECT statement.",
                    "sql_query": sql_query
                }

            sql_start = time.perf_counter()
            try:
                result = await db.execute(text(cleaned_query))
                if result.returns_rows:
                    columns = list(result.keys())
                    raw_rows = result.fetchall()
                    rows = [
                        {col: self._json_serializable(val) for col, val in zip(columns, row)}
                        for row in raw_rows
                    ]
                sql_end = time.perf_counter()
                execution_time_ms = round((sql_end - sql_start) * 1000, 2)
            except Exception as sql_err:
                logger.error(f"Super Admin Agent SQL Execution failed: {sql_err}\nQuery: {sql_query}")
                return {
                    "success": False,
                    "error": f"Database Execution Error: {str(sql_err)}",
                    "sql_query": sql_query,
                    "explanation": explanation
                }

        # Derive genuine KPIs and insights directly from the returned database records!
        kpi_cards, insights = self._compute_real_kpis_and_insights(rows, columns, user_prompt)

        total_time_ms = round((time.perf_counter() - start_time) * 1000, 2)

        # Smart fallback for chart config if missing or incomplete
        if rows and columns:
            if not chart_config.get("x_key") and len(columns) >= 1:
                chart_config["x_key"] = columns[0]
            if not chart_config.get("y_keys") and len(columns) >= 2:
                numeric_cols = [
                    col for col in columns[1:]
                    if any(isinstance(r.get(col), (int, float)) for r in rows if r.get(col) is not None)
                ]
                chart_config["y_keys"] = numeric_cols if numeric_cols else columns[1:3]
            if not chart_config.get("title"):
                chart_config["title"] = explanation
            if not chart_config.get("tooltip"):
                chart_config["tooltip"] = {
                    "contentStyle": {
                        "backgroundColor": "#0f172a",
                        "borderColor": "#334155",
                        "borderRadius": "8px",
                        "color": "#ffffff"
                    },
                    "itemStyle": {
                        "color": "#93c5fd"
                    },
                    "labelStyle": {
                        "color": "#ffffff",
                        "fontWeight": "600"
                    }
                }

        # Generate base64 excel payload if requested or if data exists
        excel_base64 = None
        excel_filename = f"analytics_export_{int(time.time())}.xlsx"
        if rows and (is_table_requested or suggested_chart_type == "table"):
            try:
                excel_bytes = self.export_data_to_excel_bytes(rows, columns, title=explanation[:25])
                excel_base64 = base64.b64encode(excel_bytes).decode('utf-8')
            except Exception as ex:
                logger.error(f"Failed to generate base64 excel export: {ex}")

        return {
            "success": True,
            "sql_query": sql_query,
            "explanation": explanation,
            "suggested_chart_type": suggested_chart_type,
            "chart_config": chart_config,
            "kpi_cards": kpi_cards,
            "insights": insights,
            "data": rows,
            "columns": columns,
            "row_count": len(rows),
            "execution_time_ms": execution_time_ms,
            "total_time_ms": total_time_ms,
            "is_table_requested": is_table_requested,
            "excel_base64": excel_base64,
            "excel_filename": excel_filename,
            "model_used": model_name or getattr(settings, 'ai_model', 'codestral-latest')
        }

    def export_data_to_excel_bytes(self, data: List[Dict[str, Any]], columns: Optional[List[str]] = None, title: str = "Analytics Export") -> bytes:
        """Export dataset to formatted Excel file bytes using pandas and openpyxl."""
        import io
        import pandas as pd
        
        if not data:
            df = pd.DataFrame(columns=columns or ["Message"])
            if not columns:
                df.loc[0] = ["No data found"]
        else:
            df = pd.DataFrame(data)
            if columns:
                df = df[[c for c in columns if c in df.columns]]

        # Clean column names for presentation
        df.columns = [c.replace('_', ' ').title() for c in df.columns]

        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            sheet_title = (title[:28] if title else "Analytics")
            df.to_excel(writer, index=False, sheet_name=sheet_title)
            
            # Format sheet columns width nicely
            workbook = writer.book
            worksheet = writer.sheets[sheet_title]
            for col_idx, col in enumerate(df.columns, 1):
                max_len = max(
                    df[col].astype(str).map(len).max() if len(df) > 0 else 0,
                    len(col)
                ) + 4
                col_letter = chr(64 + col_idx) if col_idx <= 26 else 'A'
                worksheet.column_dimensions[col_letter].width = min(max(max_len, 12), 50)

        output.seek(0)
        return output.getvalue()

    def get_quick_suggestions(self) -> List[Dict[str, str]]:
        return [
            {
                "id": "tenant_growth",
                "category": "Tenants & Growth",
                "title": "Tenant Distribution & Activity",
                "prompt": "Show me all organizations with their active status, industry, created date, and total members count.",
                "icon": "Building2"
            },
            {
                "id": "jd_velocity",
                "category": "JD Analytics",
                "title": "JD Creation Velocity by Month",
                "prompt": "Calculate monthly Job Description creation volume over the last 12 months, grouped by month and status.",
                "icon": "BarChart2"
            },
            {
                "id": "ai_vs_templates",
                "category": "AI & Technology",
                "title": "AI vs Template Generation Mode",
                "prompt": "Break down Job Descriptions by generation_mode (ai, template, saba, manual) and show total counts with percentage distribution.",
                "icon": "Zap"
            },
            {
                "id": "user_role_census",
                "category": "User Census",
                "title": "Platform User Census by Role",
                "prompt": "Count total users across the platform grouped by role (Super_Admin, Admin, Manager, HR, User) with active vs inactive breakdowns.",
                "icon": "Users"
            },
            {
                "id": "csod_pipelines",
                "category": "Integrations & CSOD",
                "title": "CSOD Synchronization Telemetry",
                "prompt": "Show status breakdown of CSOD pipeline pushes and connections by organization.",
                "icon": "Layers"
            },
            {
                "id": "competencies_skills",
                "category": "Competency & Skills",
                "title": "Competencies & Skill Sets",
                "prompt": "List the top competencies and job skill sets with their associated category and usage.",
                "icon": "Activity"
            }
        ]

super_admin_agent_service = SuperAdminAgentService()
