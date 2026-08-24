# TalentForge Platform

An enterprise multi-tenant platform featuring dynamic AI analytics, automated job description intelligence, compliance auditing, and emergency containment systems.

## Project Structure
- ackend/: FastAPI backend with SQLAlchemy async ORM, LangChain Mistral AI integration, and CSOD connectors.
- rontend/: React frontend with Tailwind CSS, Lucide icons, Framer Motion, and Recharts.

## Getting Started

### Backend
`ash
cd backend
python -m venv .venv
source .venv/bin/activate  # Or on Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
`

### Frontend
`ash
cd frontend
npm install
npm run dev
`
