# Viking GenAI Automation Framework - Architecture

## Overview

The Viking GenAI Automation Framework is a full-stack application designed to automate the evaluation of AI prompts against the Viking Pump AI backend. It calculates match scores, generates judgment reasoning, and supports both document-based and RAG-based evaluation modes.

## Components

### 1. Frontend (React + Vite)

- **UI Theme:** Dark theme (Obsidian/Black background with white and green accent highlights).
- **Setup Tab:** Handles prompt file uploads (Excel/CSV), mode selection (Document vs. RAG), and runtime Viking configuration.
- **Results Tab:** Displays a results dashboard with prompt rows, AI responses, match scores, pass/fail status, analytics, and export controls.
- **Export Controls:** XLSX and PDF export buttons are styled with green background and black text for strong visual emphasis.
- **Live Feedback:** Real-time notifications and execution logs are streamed via WebSocket from the backend.
- **Settings Modal:** Manages persistent configuration for Viking, Gemini, and evaluation mapping.

### 2. Backend (FastAPI)

- **Main API:** Provides endpoints for evaluation, export, config persistence, health checks, and RAG connectivity tests.
- **Validation & Safety:** Ensures request payloads are validated, export formats are constrained, and RAG endpoints are verified before use.
- **Viking API Wrapper:** Handles session management, requests, and response streaming against the Viking Pump service.
- **Evaluator Service:** Uses Gemini via DeepEval to score and reason over AI outputs.
  - **Document Mode:** Compares AI response against expected output using semantic matching.
  - **RAG Mode:** Validates AI output against retrieved context and indexes.
- **Config Manager:** Persists settings safely to local JSON and protects config path handling.

### 3. Runtime Orchestration

- **Startup Script:** `run_app.py` orchestrates application launch in development, including dependency validation, frontend dependency install, port cleanup, and cross-platform process startup.
- **Process Control:** Uses explicit command arguments with `shell=False` to improve reliability and compatibility.

## Data Flow

1. User uploads a prompt file and optional expected response file in the **Setup Tab**.
2. User chooses **Document** or **RAG** mode and clicks **RUN**.
3. Frontend sends a multipart form request to `/api/evaluate`.
4. Backend processes the request:
   - Reads the uploaded file using Pandas.
   - Persists or loads runtime config through the Config Manager.
   - Creates a Viking session and sends prompts to the Viking API.
   - Receives AI responses and retrieval context.
   - Passes the data to the Evaluator Service for Gemini-based scoring.
5. Backend returns evaluation results to the frontend.
6. Frontend renders the report table, analytics dashboard, and export controls.

## Architecture Diagram

```mermaid
flowchart LR
  subgraph User[User Interaction]
    Browser["/User Browser/"]
    Frontend["React + Vite Frontend"]
  end

  subgraph Backend[FastAPI Backend]
    FileParser["File Parser<br/>(Pandas)"]
    ConfigManager["Config Manager<br/>(JSON persistence)"]
    VikingAPI["Viking API Wrapper"]
    Evaluator["Evaluator Service<br/>(Gemini + DeepEval)"]
    Health["Health & Ops Endpoint"]
  end

  subgraph External[External Services]
    VikingService["Viking Pump API"]
    Gemini["Google Gemini / DeepEval"]
  end

  subgraph Orchestration[Runtime Orchestration]
    RunApp["run_app.py startup orchestrator"]
  end

  Browser -->|Uploads XLSX/CSV| Frontend
  Browser -->|Views results / triggers export| Frontend

  Frontend -->|POST /api/evaluate| Backend
  Frontend -->|POST /api/export| Backend
  Frontend -->|GET /api/config| Backend
  Frontend -->|POST /api/config| Backend
  Frontend -->|POST /api/test-rag| Backend
  Frontend -->|WS /ws/logs| Backend

  Backend -->|Returns JSON results| Frontend
  Backend -->|Streams export file| Browser

  Backend -->|Reads files| FileParser
  Backend -->|Loads/stores settings| ConfigManager
  Backend -->|Calls Viking API| VikingAPI
  Backend -->|Runs semantic scoring| Evaluator
  Backend -->|Reports health| Health

  VikingAPI -->|External request| VikingService
  Evaluator -->|Semantic scoring| Gemini
  RunApp --> Backend
  RunApp --> Frontend

  style User fill:#FFFFFF,stroke:#38BDF8,stroke-width:2px
  style Backend fill:#FFFFFF,stroke:#10B981,stroke-width:2px
  style External fill:#FFFFFF,stroke:#F97316,stroke-width:2px
  style Orchestration fill:#FFFFFF,stroke:#A855F7,stroke-width:2px
  style Browser fill:#FFFFFF,stroke:#60A5FA,stroke-width:2px
  style Frontend fill:#FFFFFF,stroke:#38BDF8,stroke-width:2px
  style FileParser fill:#FFFFFF,stroke:#22C55E,stroke-width:2px
  style ConfigManager fill:#FFFFFF,stroke:#22C55E,stroke-width:2px
  style VikingAPI fill:#FFFFFF,stroke:#FBBF24,stroke-width:2px
  style Evaluator fill:#FFFFFF,stroke:#818CF8,stroke-width:2px
  style Health fill:#FFFFFF,stroke:#94A3B8,stroke-width:1px,stroke-dasharray: 5 5
  style VikingService fill:#FFFFFF,stroke:#34D399,stroke-width:2px
  style Gemini fill:#FFFFFF,stroke:#93C5FD,stroke-width:2px
  style RunApp fill:#FFFFFF,stroke:#C084FC,stroke-width:2px
```

## Implemented Enhancements

- **Export UX:** XLSX and PDF exports use green background with black text for strong visual emphasis.
- **Backend Validation:** Added format validation, body validation, and safe export/export error handling.
- **RAG Checks:** Added explicit RAG endpoint validation with test connectivity support.
- **Live Logs:** WebSocket `/ws/logs` supports real-time execution telemetry on the frontend.
- **Startup Reliability:** `run_app.py` now checks and installs dependencies, cleans ports, and starts backend/frontend safely.
- **Config Safety:** Uses a robust local JSON config manager with path checks.

## Technology Stack

- **Frontend:** React, Tailwind CSS, Lucide Icons, Vite.
- **Backend:** FastAPI, Uvicorn, Pandas, DeepEval, Google Gemini.
- **Persistence:** Local JSON configuration storage.
- **Runtime Orchestration:** `run_app.py` for cross-platform startup.
- **Diagram:** `Guide/architect_diagram.mmd` contains the source Mermaid markup.
