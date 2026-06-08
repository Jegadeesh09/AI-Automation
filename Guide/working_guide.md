# Viking GenAI Automation Framework - Working Guide

## Overview

This guide explains the end-to-end behavior of the Viking GenAI Automation application. It covers installation, execution flow, API behavior, runtime orchestration, file handling, evaluation modes, export capabilities, and troubleshooting.

## Prerequisites

- Python 3.9 or higher
- Node.js and npm
- Google Gemini API Key for evaluation judgment
- Viking Pump API Key for session creation and prompt execution
- Optional: a compatible browser for the Vite-powered UI

## Installation

### Backend Setup

1. Open a terminal in the repository root.
2. Install backend dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```
3. Verify the backend packages include `fastapi`, `uvicorn`, `pandas`, `fpdf2`, and any `deepeval` integration.

### Frontend Setup

1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Confirm `vite`, `react`, `tailwindcss`, and `lucide-react` are installed.

## Application Startup

### Unified Runner

From the repository root, start the application using:

```bash
python run_app.py
```

What `run_app.py` does:

- checks and verifies Python dependencies
- installs frontend packages if `node_modules` is missing
- kills conflicting processes on ports `8000` and `3000`
- launches the FastAPI backend on `http://localhost:8000`
- launches the Vite frontend on `http://localhost:3000`
- monitors both processes and stops them gracefully on interrupt

### Manual Startup

If required, start the backend manually from the root:

```bash
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

And the frontend manually from `frontend`:

```bash
npm run dev
```

## Application Architecture

The application consists of:

- Frontend: React + Vite user interface
- Backend: FastAPI service with REST and WebSocket endpoints
- Runtime orchestration: `run_app.py`
- Config persistence: local JSON via `backend/app/config_manager.py`
- Viking API integration: `backend/app/viking_api.py`
- Evaluation: `backend/app/evaluator.py`

## User Interface Behavior

### Setup Tab

- Upload a prompt file in `.csv`, `.xls`, or `.xlsx` format.
- The app requires a `Prompt` column; this can be matched case-insensitively.
- If `Document` mode is selected, an expected response file or embedded expected response metadata is required.
- If `RAG` mode is selected, the user must provide RAG connection details and test the endpoint.

### Mode Selection

- **Document Based**: Compares model output against an expected response using semantic scoring.
- **RAG Based**: Retrieves context from a configured retrieval provider and uses it to validate the response.

### Configuration Modal

- Enter and save the Viking API Key or bearer token.
- Configure the Gemini provider and model, such as `gemini-1.5-flash`.
- The frontend saves configuration through `/api/config` and persists it to `backend/config.json`.

### Execution Flow

- Click **RUN** to submit the prompt file and selected mode.
- The frontend sends a multipart request to `/api/evaluate`.
- While running, the UI receives real-time progress and logs through `/ws/logs`.
- Once complete, results appear in the **Results** tab with scores and reasoning.
- Export buttons are visible for XLSX and PDF output.

### Reporting and Export

- Export controls use green background and black text for high visibility.
- XLSX export produces a detailed report and summary sheet.
- PDF export generates an executive summary and row-level table with metrics.

## Backend Behavior

### API Endpoints

- `GET /api/config` — returns persisted app config
- `POST /api/config` — saves config settings
- `GET /api/sessions` — returns stored execution sessions
- `GET /api/health` — returns service health status
- `POST /api/export` — exports results as XLSX or PDF
- `POST /api/test-rag` — validates RAG provider connectivity
- `POST /api/evaluate` — processes evaluation jobs
- `WS /ws/logs` — streams execution logs to the UI

### Evaluation Request Handling

The `/api/evaluate` endpoint accepts:

- `prompt_file`: uploaded CSV/XLS/XLSX file
- `expected_file`: optional expected responses file
- `mode`: `doc` or `rag`
- `eval_mode`: `Light`, `Standard`, or `Full`
- `viking_api_key`: optional runtime Viking API key
- `rag_config`: optional RAG provider configuration JSON

### File Parsing and Normalization

- CSV files are parsed with `pandas.read_csv`
- Excel files are parsed with `pandas.ExcelFile` and all sheets are merged
- Each sheet gets a `Category` column matching the sheet name
- The prompt column is detected case-insensitively
- Expected response matching uses fuzzy column selection for words like `expected`, `response`, or `ground truth`
- Missing expected values are padded as empty strings

### Document Mode Behavior

- Prompts are sent to the Viking API
- Expected responses are included as ground truth
- The evaluator compares actual output vs expected output with semantic metrics

### RAG Mode Behavior

- Validates provider, endpoint URL and index name
- Uses a mocked retrieval routine to simulate retrieval context from supported providers
- Augments the prompt with retrieved context prior to sending it to Viking
- Evaluates response against retrieval context for faithfulness and relevance

### Viking API Integration

`backend/app/viking_api.py` manages:

- bearer token authentication and refresh logic
- fallback from manual token usage
- session creation via `/api/v1/conversations/session/create`
- streaming prompt submission to `/api/v1/query/stream/async`
- parsing chunked response payloads for answer text, message IDs, and retrieval context
- retry logic on transient HTTP 503 and auth failures

### Evaluation Engine

- The Evaluator uses Gemini through DeepEval to compute:
  - score
  - status (`PASS` / `FAIL`)
  - reasoning text
  - metrics, issues, suggestions, root cause, hallucination detection
- Evaluation details are packaged into the result object and returned to the frontend

### Execution History

- The backend stores the last 100 session summaries in memory
- Each session record contains `sessionId`, `createdAt`, and evaluation mode

## Configuration Persistence

### Config Manager

Stored in `backend/config.json`, the config manager:

- initializes default values if missing
- merges partial configs with defaults
- preserves thresholds and metric settings
- saves changes safely using Python `pathlib`

### Default Config Targets

- Viking base URL and endpoint mapping
- RAG provider defaults and thresholds
- request/response field mappings for Viking API
- evaluation metric toggles
- Gemini provider, model, and Google API key

## Export and Reporting

### XLSX Export

- Creates `Detailed Report` sheet with every result row
- Flattens nested `metrics` into individual columns
- Adds a `Summary` sheet with total prompts, average score, pass rate, PASS count, and FAIL count

### PDF Export

- Generates an A4 landscape report with:
  - executive summary
  - total prompts, average score, success rate, pass/fail counts
  - a row-level table of status, prompt, response, expected output, score, semantic match, root cause, and reasoning
- Uses the `fpdf2` library for PDF creation

## Runtime Notes

- The startup script handles dependency checks and cross-platform compatibility
- The backend runs on `localhost:8000`
- The frontend runs on `localhost:3000`
- WebSockets provide live log updates during evaluation runs
- Export endpoints support both binary and JSON result delivery

## Troubleshooting

- **Frontend fails to start**: re-run `npm install` in `frontend`
- **Backend fails to start**: ensure Python packages in `backend/requirements.txt` are installed
- **Invalid prompt file**: file must be `.csv`, `.xls`, or `.xlsx`
- **Missing expected response in document mode**: upload a supporting expected file or include the expected column in the prompt spreadsheet
- **RAG connection fails**: verify endpoint URL, provider selection, and required request fields
- **API errors**: check `/api/health` and the backend logs printed by `run_app.py`
- **Port conflict**: free or change ports 3000 / 8000 before starting

## Presentation Notes

- The app is designed to test AI prompt responses against both normal expected answers and retrieved context.
- It uses Viking Pump as the prompt execution engine and Gemini plus DeepEval as the evaluation judge.
- Export is available in both XLSX and PDF formats for easy reporting.
- The runtime orchestrator simplifies local development and ensures faster startup validation.
