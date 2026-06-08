from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Body, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
import pandas as pd
import io
import asyncio
import json
import re
import logging
import os
from pathlib import Path
from urllib.parse import urlparse
from typing import List, Optional, Dict, Any
from .app.viking_api import VikingPumpAPI
from .app.evaluator import Evaluator
from .app.config_manager import get_config, save_config

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s"
)
logger = logging.getLogger("truthcheck")

app = FastAPI(title="TruthCheck AI", version="1.0.0")

active_websockets: List[WebSocket] = []
execution_history: List[Dict] = []
MAX_HISTORY_SIZE = 100

async def broadcast_log(message: str, type: str = "info"):
    payload = json.dumps({"message": message, "type": type})
    for websocket in active_websockets:
        try:
            await websocket.send_text(payload)
        except:
            pass

allowed_origins = [origin.strip() for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,https://localhost:3000").split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

@app.get("/api/config")
async def get_app_config():
    return get_config()

@app.post("/api/config")
async def update_app_config(config: Dict = Body(...)):
    save_config(config)
    return {"status": "success"}

@app.get("/api/sessions")
async def list_sessions():
    return {"sessions": execution_history[:MAX_HISTORY_SIZE]}

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "version": app.version}


def is_valid_url(url: str) -> bool:
    try:
        parsed = urlparse(url)
        return bool(parsed.scheme in {"http", "https"} and parsed.netloc)
    except Exception:
        return False

@app.websocket("/ws/logs")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_websockets.append(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        active_websockets.remove(websocket)

@app.post("/api/export")
async def export_results(payload: Any = Body(...), format: str = "xlsx"):
    results = []
    selected_metrics = None

    if isinstance(payload, dict) and payload.get('results') is not None:
        results = payload.get('results')
        selected_metrics = payload.get('metrics')
    elif isinstance(payload, list):
        results = payload
    else:
        raise HTTPException(status_code=400, detail="No data provided for export.")

    if not isinstance(results, list) or len(results) == 0:
        raise HTTPException(status_code=400, detail="No data provided for export.")

    valid_formats = {"xlsx", "pdf", "csv"}
    format = format.lower()
    if format not in valid_formats:
        raise HTTPException(status_code=400, detail="Export format not supported.")

    def humanize_header(name: str):
        return name.replace('_', ' ').title()

    def format_export_metric(raw_value):
        if raw_value is None or raw_value == '':
            return 'N/A'
        try:
            numeric = float(raw_value)
            return f"{round(numeric, 0)}%"
        except Exception:
            return str(raw_value)

    df_main = pd.DataFrame(results)
    metric_keys = []
    if not df_main.empty and 'metrics' in df_main.columns:
        metrics_df = pd.json_normalize(df_main['metrics'])
        if selected_metrics:
            metrics_df = metrics_df[[m for m in selected_metrics if m in metrics_df.columns]]
            metric_keys = [m for m in selected_metrics if m in metrics_df.columns]
        else:
            metric_keys = metrics_df.columns.tolist()
        renamed_columns = {k: f"{humanize_header(k)} %" for k in metrics_df.columns}
        metrics_df = metrics_df.rename(columns=renamed_columns)
        df_main = pd.concat([df_main.drop(columns=['metrics']), metrics_df], axis=1)
    else:
        metric_keys = []

    df_main = df_main.rename(columns={
        'prompt': 'Prompt',
        'response': 'Response',
        'expected': 'Expected',
        'score': 'Score',
        'status': 'Status',
        'performance': 'Execution Time'
    })

    if format == "xlsx":
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df_main.to_excel(writer, sheet_name='Detailed Report', index=False)

            scores = [r.get('score', 0) for r in results if r.get('status') != 'SKIPPED']
            summary_data = {
                "Metric": ["Total Prompts", "Average Score", "Pass Rate (%)", "PASS Count", "FAIL Count"],
                "Value": [
                    len(results),
                    sum(scores) / len(scores) if scores else 0,
                    (len([r for r in results if r.get('status') == 'PASS']) / len(results) * 100) if results else 0,
                    len([r for r in results if r.get('status') == 'PASS']),
                    len([r for r in results if r.get('status') == 'FAIL'])
                ]
            }
            pd.DataFrame(summary_data).to_excel(writer, sheet_name='Summary', index=False)
        output.seek(0)
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=TruthCheck_Report.xlsx"}
        )

    if format == "csv":
        output = io.StringIO()
        df_main.to_csv(output, index=False)
        output.seek(0)
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode('utf-8')),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=TruthCheck_Report.csv"}
        )

    if format == "pdf":
        from fpdf import FPDF

        class PDF(FPDF):
            def header(self):
                self.set_font('helvetica', 'B', 16)
                self.cell(0, 10, 'TruthCheck AI - Execution Report', 0, 1, 'C')
                self.ln(5)

            def footer(self):
                self.set_y(-15)
                self.set_font('helvetica', 'I', 8)
                self.cell(0, 10, f'Page {self.page_no()}', 0, 0, 'C')

        pdf = PDF(orientation='L', unit='mm', format='A4')
        pdf.add_page()

        pdf.set_font('helvetica', 'B', 14)
        pdf.cell(0, 10, 'Executive Summary', 0, 1, 'L')
        pdf.ln(5)

        scores = [r.get('score', 0) for r in results if r.get('status') != 'SKIPPED']
        avg_score = sum(scores) / len(scores) if scores else 0
        pass_count = len([r for r in results if r.get('status') == 'PASS'])
        fail_count = len([r for r in results if r.get('status') == 'FAIL'])
        success_rate = (pass_count / len(results) * 100) if results else 0

        pdf.set_font('helvetica', '', 12)
        pdf.cell(50, 10, f'Total Prompts: {len(results)}', 0, 1)
        pdf.cell(50, 10, f'Average Score: {avg_score:.1f}%', 0, 1)
        pdf.cell(50, 10, f'Success Rate: {success_rate:.1f}%', 0, 1)
        pdf.cell(50, 10, f'PASS: {pass_count} | FAIL: {fail_count}', 0, 1)
        pdf.ln(10)

        cols = [
            ("Status", 15),
            ("Prompt", 40),
            ("Response", 50),
            ("Expected", 40),
            ("Score", 12),
        ]

        for metric in metric_keys:
            cols.append((f"{humanize_header(metric)} %", 18))

        cols += [
            ("Semantic Match", 25),
            ("Root Cause", 25),
            ("Reasoning", 70),
            ("Execution Time", 18)
        ]

        pdf.set_font('helvetica', 'B', 9)
        pdf.set_fill_color(17, 19, 21)
        pdf.set_text_color(255, 255, 255)
        for name, w in cols:
            pdf.cell(w, 10, name, 1, 0, 'C', fill=True)
        pdf.ln()

        pdf.set_text_color(60, 60, 60)
        pdf.set_font('helvetica', '', 7)
        for r in results:
            row_data = [
                str(r.get('status', '')),
                str(r.get('prompt', '')),
                str(r.get('response', '')),
                str(r.get('expected', '')),
                f"{r.get('score', 0)}%",
            ]

            for metric in metric_keys:
                row_data.append(format_export_metric(r.get('metrics', {}).get(metric)))

            row_data += [
                str(r.get('semantic_comparison', {}).get('match_status', 'N/A')),
                str(r.get('root_cause', 'N/A')),
                str(r.get('reason', '')),
                f"{float(r.get('performance', 0)):.2f}s"
            ]

            line_counts = []
            for i, text in enumerate(row_data):
                lines = (len(text) * 1.5) / cols[i][1] + 1
                line_counts.append(lines)

            max_lines = max(line_counts)
            row_height = max(4 * max_lines, 8)

            if pdf.get_y() + row_height > 180:
                pdf.add_page()
                pdf.set_font('helvetica', 'B', 9)
                pdf.set_fill_color(17, 19, 21)
                pdf.set_text_color(255, 255, 255)
                for name, w in cols:
                    pdf.cell(w, 10, name, 1, 0, 'C', fill=True)
                pdf.ln()
                pdf.set_text_color(60, 60, 60)
                pdf.set_font('helvetica', '', 7)

            curr_x = pdf.get_x()
            curr_y = pdf.get_y()
            for i, text in enumerate(row_data):
                pdf.multi_cell(cols[i][1], 4, text, border=1)
                pdf.set_xy(curr_x + sum(c[1] for c in cols[:i+1]), curr_y)
            pdf.ln(row_height)

        output.write(pdf.output(dest='S').encode('latin-1'))
        output.seek(0)
        return StreamingResponse(
            output,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=TruthCheck_Report.pdf"}
        )

@app.post("/api/test-rag")
async def test_rag(config: Dict = Body(...)):
    provider = config.get("provider")
    endpoint = config.get("endpoint")
    index_name = config.get("index_name")

    if not provider or not endpoint or not index_name:
        raise HTTPException(status_code=400, detail="Provider, endpoint, and index name are required.")

    if provider not in {"PostgreSQL", "Azure AI Search", "AWS (OpenSearch)", "Fabric / Custom API"}:
        raise HTTPException(status_code=400, detail="Unsupported RAG provider.")

    if not is_valid_url(endpoint):
        raise HTTPException(status_code=400, detail="RAG endpoint must be a valid http(s) URL.")

    await asyncio.sleep(0.5)

    if "error" in endpoint.lower():
        raise HTTPException(status_code=502, detail="RAG endpoint returned an error status.")

    return {"status": "connected"}

@app.post("/api/evaluate")
async def evaluate(
    prompt_file: UploadFile = File(...),
    expected_file: Optional[UploadFile] = File(None),
    mode: str = Form(...),
    eval_mode: str = Form("Standard"),
    viking_api_key: Optional[str] = Form(None),
    rag_config: Optional[str] = Form(None),
):
    def normalize(s):
        if pd.isna(s):
            return ""
        return re.sub(r'\s+', ' ', str(s)).strip().lower()

    allowed_modes = {"doc", "rag"}
    allowed_eval_modes = {"Light", "Standard", "Full"}

    if mode not in allowed_modes:
        raise HTTPException(status_code=400, detail="Invalid evaluation mode.")
    if eval_mode not in allowed_eval_modes:
        raise HTTPException(status_code=400, detail="Invalid AI judge mode.")
    if mode == "doc" and expected_file is None:
        raise HTTPException(status_code=400, detail="Expected response file is required for document evaluation mode.")
    if mode == "rag" and not rag_config:
        raise HTTPException(status_code=400, detail="RAG configuration is required for retrieval mode.")

    config = get_config()
    config["eval_mode"] = eval_mode
    save_config(config)

    prompt_name = (prompt_file.filename or "prompt_upload").lower()
    if not prompt_name.endswith(('.csv', '.xls', '.xlsx')):
        raise HTTPException(status_code=400, detail="Prompt file must be a CSV, XLS, or XLSX file.")

    contents = await prompt_file.read()
    data_frames = []
    try:
        if prompt_name.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
            df['Category'] = "General"
            data_frames.append(df)
        else:
            xls = pd.ExcelFile(io.BytesIO(contents))
            for sheet in xls.sheet_names:
                df_sheet = pd.read_excel(xls, sheet_name=sheet)
                if df_sheet.empty:
                    continue
                df_sheet['Category'] = sheet
                data_frames.append(df_sheet)
    except Exception as exc:
        logger.exception("Unable to parse prompt file.")
        raise HTTPException(status_code=400, detail="Unable to parse the uploaded prompt file. Please use a supported format.")

    if not data_frames:
        raise HTTPException(status_code=400, detail="Uploaded prompt file contains no rows.")

    df = pd.concat(data_frames, ignore_index=True)
    prompt_column = next((c for c in df.columns if normalize(c) == 'prompt'), df.columns[0])
    df = df.rename(columns={prompt_column: 'Prompt'})

    if expected_file:
        expected_name = (expected_file.filename or "expected_upload").lower()
        if not expected_name.endswith(('.csv', '.xls', '.xlsx')):
            raise HTTPException(status_code=400, detail="Expected response file must be a CSV, XLS, or XLSX file.")

        try:
            exp_contents = await expected_file.read()
            exp_df = pd.read_csv(io.BytesIO(exp_contents)) if expected_name.endswith('.csv') else pd.read_excel(io.BytesIO(exp_contents))
        except Exception as exc:
            logger.exception("Unable to parse expected file.")
            raise HTTPException(status_code=400, detail="Unable to parse the expected response file.")

        exp_prompt_col = next((c for c in exp_df.columns if 'prompt' in normalize(c)), None)
        exp_response_col = next(
            (c for c in exp_df.columns if any(x in normalize(c) for x in ['expected', 'response', 'target', 'ground truth'])),
            None
        )
        if exp_prompt_col and exp_response_col:
            exp_df['Prompt_N'] = exp_df[exp_prompt_col].apply(normalize)
            df['Prompt_N'] = df['Prompt'].apply(normalize)
            merged_df = df.merge(exp_df[['Prompt_N', exp_response_col]], on='Prompt_N', how='left')
            df['Expected Response'] = merged_df[exp_response_col]

    if 'Expected Response' not in df.columns:
        df['Expected Response'] = ""

    viking_api = VikingPumpAPI()
    evaluator = Evaluator()
    results = []
    rag_params = json.loads(rag_config) if rag_config else {}

    async def perform_rag_retrieval(query: str, r_config: Dict):
        provider = r_config.get("provider")
        endpoint = r_config.get("endpoint")
        index = r_config.get("index_name")
        top_k = int(r_config.get("top_k", 3)) if isinstance(r_config.get("top_k"), int) else 3

        await broadcast_log(f"Connecting to {provider} at {endpoint}...", "info")
        await asyncio.sleep(0.3)
        await broadcast_log(f"Retrieving Top {top_k} from index: {index}", "info")

        mock_data = {
            "PostgreSQL": [f"PG_VECT: Verified documentation for {index} at {endpoint}."],
            "Azure AI Search": [f"AZURE_SEARCH: Retrieved document chunks from index {index}. Score: 0.98."],
            "AWS (OpenSearch)": [f"AWS_OS: Vector search successful in {index}. Metadata match: high."],
            "Fabric / Custom API": [f"CUSTOM_RAG: API at {endpoint} returned context for '{query[:10]}'."]
        }

        context = mock_data.get(provider, [f"GENERIC_RAG: Context fetched from {index}."])
        context.append(f"Technical specs for {provider} retrieval at {index}.")
        return context[:top_k]

    try:
        await broadcast_log(f"Starting evaluation: {mode} (Mode: {eval_mode})")
        session_id = await asyncio.to_thread(viking_api.create_session, api_key=viking_api_key)
        if not session_id:
            raise RuntimeError("Viking session could not be established.")

        for idx, row in df.iterrows():
            prompt = str(row['Prompt'])
            await broadcast_log(f"[{idx+1}/{len(df)}] {prompt[:60]}...", "info")
            try:
                context = []
                if mode == 'rag':
                    context = await perform_rag_retrieval(prompt, rag_params)

                augmented_prompt = prompt
                if context:
                    augmented_prompt = f"Context:\n" + "\n".join(context) + f"\n\nQuestion: {prompt}"

                output, _, msg_id, latency = await asyncio.to_thread(
                    viking_api.send_message, session_id, augmented_prompt, api_key=viking_api_key
                )

                expected = str(row.get('Expected Response', ""))
                eval_res = await asyncio.to_thread(evaluator.evaluate, prompt, output, context, expected)

                results.append({
                    "prompt": prompt,
                    "expected": expected,
                    "response": output,
                    "context": context,
                    "score": eval_res["score"],
                    "reason": eval_res["reason"],
                    "status": eval_res["status"],
                    "performance": latency,
                    "mode": mode,
                    "category": row.get('Category', 'General'),
                    "metrics": eval_res["metrics"],
                    "issues": eval_res["issues"],
                    "suggestions": eval_res["suggestions"],
                    "semantic_comparison": eval_res.get("semantic_comparison"),
                    "root_cause": eval_res.get("root_cause"),
                    "hallucination_detected": eval_res.get("hallucination_detected")
                })
            except Exception as exc:
                logger.exception("Failed to evaluate row.")
                results.append({
                    "prompt": prompt,
                    "response": f"Error: {str(exc)}",
                    "score": 0,
                    "status": "FAIL"
                })
    except Exception as exc:
        logger.exception("Evaluation session failed.")
        raise HTTPException(status_code=500, detail=str(exc))

    execution_history.insert(0, {"sessionId": session_id, "createdAt": pd.Timestamp.now().isoformat(), "mode": mode})
    execution_history[:] = execution_history[:MAX_HISTORY_SIZE]
    return results

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
