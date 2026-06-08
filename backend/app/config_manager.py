import json
from pathlib import Path
from copy import deepcopy

WORKING_DIR = Path(__file__).resolve().parent.parent
CONFIG_FILE = WORKING_DIR / "config.json"

DEFAULT_CONFIG = {
    "viking_base_url": "https://dev.select.vikingpump.com",
    "viking_bearer_token": "",
    "viking_token_expires": "",
    "manual_token_active": False,
    "viking_cookie": "",
    "rag_config": {
        "name": "",
        "description": "",
        "provider": "PostgreSQL",
        "endpoint": "",
        "index_name": "",
        "namespace": "",
        "top_k": 3,
        "similarity_threshold": 0.0
    },
    "viking_api_endpoint": "https://dev.select.vikingpump.com/api/proxy?endpoint=/api/v1/query/stream/async&method=POST",
    "viking_api_key": "",
    
    # Auth configuration
    "auth_endpoint": "/api/auth/session",
    "token_json_path": "accessToken",
    "expiry_json_path": "expires",
    
    # Request/Response Mapping
    "request_mapping": {
        "query": "query",
        "session_id": "session_id",
        "request_type": "request_type",
        "user_filter": "user_filter"
    },
    "response_mapping": {
        "content": ["content", "answer", "text", "response"],
        "message_id": ["message_id", "result.message_id"],
        "retrieval_context": ["result.raw_response.retrievalResults", "result.raw_response.source_documents"]
    },

    "llm_provider": "Gemini",
    "llm_model": "gemini-1.5-flash",
    "custom_models": [],
    "google_api_key": "",
    "headless_mode": True,
    "use_combined_evaluator": True,
    "eval_mode": "Standard",
    "eval_metrics": {
        "relevancy": True,
        "faithfulness": True,
        "precision": False,
        "recall": False,
        "hallucination": True,
        "toxicity": False,
        "bias": False,
        "similarity": True
    },
    "thresholds": {
        "relevancy": 0.75,
        "faithfulness": 0.8,
        "precision": 0.75,
        "recall": 0.75,
        "hallucination": 0.2,
        "toxicity": 0.1,
        "bias": 0.1,
        "similarity": 0.75
    }
}


def get_config():
    if not CONFIG_FILE.exists():
        save_config(DEFAULT_CONFIG)
        return deepcopy(DEFAULT_CONFIG)

    try:
        with CONFIG_FILE.open("r", encoding="utf-8") as f:
            config = json.load(f)
    except (json.JSONDecodeError, FileNotFoundError):
        return deepcopy(DEFAULT_CONFIG)

    merged_config = deepcopy(DEFAULT_CONFIG)
    if isinstance(config, dict):
        merged_config.update(config)
    else:
        config = {}

    changed = False
    if "viking_endpoints" in config:
        merged_config.pop("viking_endpoints", None)
        changed = True

    if not isinstance(merged_config.get("thresholds"), dict):
        merged_config["thresholds"] = deepcopy(DEFAULT_CONFIG["thresholds"])
        changed = True
    else:
        for key, value in DEFAULT_CONFIG["thresholds"].items():
            if key not in merged_config["thresholds"]:
                merged_config["thresholds"][key] = value
                changed = True

    if not isinstance(merged_config.get("eval_metrics"), dict):
        merged_config["eval_metrics"] = deepcopy(DEFAULT_CONFIG["eval_metrics"])
        changed = True
    else:
        for key, value in DEFAULT_CONFIG["eval_metrics"].items():
            if key not in merged_config["eval_metrics"]:
                merged_config["eval_metrics"][key] = value
                changed = True

    if changed:
        save_config(merged_config)

    return merged_config


def save_config(config):
    try:
        CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)
        with CONFIG_FILE.open("w", encoding="utf-8") as f:
            json.dump(config, f, indent=4)
    except OSError as exc:
        raise RuntimeError(f"Unable to persist configuration: {exc}")
