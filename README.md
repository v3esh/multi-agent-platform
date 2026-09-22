# Multi-Agent Social Networking Automation Platform

> **Project Brief — Reddit Pilot**  
> A hosted multi-agent platform for managing AI-driven personas, orchestrating background social network activity, enforcing capability policy guardrails, and tracking audit logs.

---

## 🚀 Quick Start (For Evaluators)

### 1. Clone Repository & Setup Environment
```bash
# Copy the environment template
cp .env.example .env
```

### 2. Launch Docker Stack
Ensure Docker Desktop is running, then execute:
```bash
docker compose up -d --build
```
*This command automatically compiles Next.js frontend, Python FastAPI backend, Celery workers, PostgreSQL, and Redis.*

### 3. Run Database Seed
```bash
docker compose exec backend python seed.py
```

### 4. Access the Application Portal
- **Frontend Portal**: [http://localhost:3000](http://localhost:3000)
  - **Email**: `admin@platform.com`
  - **Password**: `admin123`
- **FastAPI Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Adminer DB Viewer**: [http://localhost:8080](http://localhost:8080)

---

## ✨ Key Features & Architecture

1. **Multi-Agent Portal (`/agents`)**: Create, monitor, edit, and toggle agent statuses. Features a Central Safeguards Control Bar with Emergency Pause All / Stop All / Resume All kill-switches.
2. **AI Persona Engine (`/personas`)**: LLM-assisted persona synthesis for distinct communication styles, behavioral profiles, and agent binding.
3. **Reddit Account Integration**: Direct handle linking (dev/testing mode) and OAuth authorization callback support.
4. **Policy & Permission Profiles (`/permissions`)**: Configurable capability profiles (**Standard**, **Autonomous Scout**, **High Security**) enforcing human-in-the-loop review approvals vs auto-posting.
5. **Decoupled Task Orchestration**: Celery Beat + Celery Worker + Redis task queue executing 60-second autonomous cycle loops across 50+ concurrent agents.
6. **Audit & Activity Tracking (`/logs`)**: Real-time filterable log stream tracking every timestamped action, policy check, and status update.

---

## 🛠️ Technology Stack

- **Frontend**: Next.js 16 (React 19 + TypeScript + Tailwind CSS)
- **Backend**: FastAPI (Python 3.11 + Async SQLAlchemy + Pydantic v2)
- **Database**: PostgreSQL 15 + AsyncPG
- **Task Queue**: Redis 7 + Celery + Celery Beat
- **AI Integration**: Groq API (Llama 3.3 70B / Mixtral)
