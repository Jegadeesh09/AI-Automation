# Viking GenAI Automation - User Guide

This framework is designed to automate the evaluation of Viking Pump's AI applications using semantic similarity scoring and RAG performance metrics.

## Setup & Configuration

### 1. API Keys

- **Viking API Key**: Required for RAG-based mode and session history. This key is used in the `x-api-key` header for all requests to the Viking platform.
- **Google API Key**: Required for the evaluation engine (Gemini). Go to [Google AI Studio](https://aistudio.google.com/) to obtain a key. Configure this in the **System Settings** (gear icon).

### 2. Comparison Modes

- **Document Based**: Compares the AI's response against an "Expected Response" provided in an Excel/CSV file.
  - Metrics: Semantic Similarity (Meaning-based matching).
- **RAG Based**: Compares the AI's response against the retrieved context from the connected RAG source.
  - Metrics: Faithfulness (Groundedness) and Answer Relevancy.

## How to Run an Evaluation

### Step 1: Upload Prompts

Upload an Excel (.xlsx) or CSV file containing a column named **"Prompt"**.

### Step 2: Provide Expected Responses (Document Mode Only)

- Either include an **"Expected Response"** column in your prompt file,
- Or upload a separate document with an **"Expected Response"** column.

### Step 3: Configure Viking Connection (RAG Mode Only)

- Enter your **Viking API Key**.
- Enter the **Target Index Name** (e.g., `viking-pump-knowledge`).
- Use the **"Test Connection"** button to verify connectivity.

### Step 4: Execute

Click the **RUN** button. The system will:

1. Create a new Viking session.
2. Send each prompt sequentially.
3. Capture the response and retrieval context.
4. Perform semantic evaluation using DeepEval.
5. Sync the match scores back to the Viking platform via metadata updates.

## Analyzing Results

### Report Table

A row-by-row breakdown of each prompt, the AI's response, the match score, and the reasoning provided by the evaluation judge.

### Analytics Dashboard

- **Average Match**: Overall performance of the dataset.
- **Success Rate**: Percentage of responses scoring 80% or higher.
- **Execution Console**: Real-time telemetry and error logs from the backend.

### Session History

The left sidebar tracks all active sessions on the Viking platform, allowing you to review previous execution contexts. Use the **chevron button** to collapse or expand the sidebar for more screen space in the Results table.

## Technical Specifications

- **Backend**: FastAPI with WebSocket support.
- **Frontend**: React (Emerald/Obsidian Theme).
- **Evaluation Engine**: DeepEval + Gemini-1.5-Flash.
- **Branding**: Viking GenAI Automation Enterprise Engine V2.0.
- **Architecture Reference**: See `Guide/architect.md` for the full system architecture, data flow, and embedded Mermaid diagram.
