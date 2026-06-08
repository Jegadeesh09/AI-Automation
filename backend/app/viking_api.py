import requests
import json
import time
import threading
import logging
from urllib.parse import urlparse
from .config_manager import get_config, save_config
from datetime import datetime, timezone

logger = logging.getLogger("truthcheck.viking")

class VikingPumpAPI:
    _lock = threading.Lock()
    _token_cache = {} # Used for in-memory persistence during execution

    def __init__(self, base_url=None):
        config = get_config()
        api_endpoint = config.get("viking_api_endpoint", "")
        
        if api_endpoint and api_endpoint.startswith("http"):
            parsed = urlparse(api_endpoint)
            self.base_url = f"{parsed.scheme}://{parsed.netloc}"
        else:
            self.base_url = config.get("viking_base_url", base_url or "https://dev.select.vikingpump.com").rstrip('/')
            
        self.auth_endpoint = config.get("auth_endpoint", "/api/auth/session")
        self.token_path = config.get("token_json_path", "accessToken")
        self.expiry_path = config.get("expiry_json_path", "expires")

    def _get_nested_value(self, data, path):
        """Helper to get value from nested dictionary using dot notation."""
        keys = path.split('.')
        for key in keys:
            if isinstance(data, dict):
                data = data.get(key)
            else:
                return None
        return data

    def _mask_sensitive_headers(self, headers):
        masked = {}
        for key, value in (headers or {}).items():
            lower_key = key.lower()
            if lower_key == "authorization":
                masked[key] = "Bearer ***"
            elif lower_key in {"cookie", "x-api-key"}:
                masked[key] = "***"
            else:
                masked[key] = value
        return masked

    def _log_request(self, method, url, headers, params=None, json_data=None, files=None):
        try:
            sanitized_headers = self._mask_sensitive_headers(headers)
            logger.debug("Outgoing Viking request: %s %s", method, url)
            logger.debug("Outgoing Viking headers: %s", sanitized_headers)
            if params:
                logger.debug("Outgoing Viking query params: %s", params)
            if json_data is not None:
                logger.debug("Outgoing Viking JSON payload: %s", json.dumps(json_data, indent=2, default=str))
            if files is not None:
                parsed_files = {}
                for key, value in files.items():
                    if isinstance(value, tuple) and len(value) > 1:
                        parsed_files[key] = value[1]
                    else:
                        parsed_files[key] = value
                logger.debug("Outgoing Viking multipart/form-data fields: %s", parsed_files)
        except Exception:
            logger.exception("Failed to log outgoing Viking request.")

    def _log_response(self, response):
        try:
            logger.debug("Viking response status: %s", response.status_code)
            logger.debug("Viking response headers: %s", dict(response.headers))
            text = response.text
            if text:
                if len(text) > 2000:
                    text = text[:2000] + " ...[truncated]"
                logger.debug("Viking response body: %s", text)
        except Exception:
            logger.exception("Failed to log Viking response.")

    def is_token_expired(self):
        """Checks if the stored token is expired or about to expire within 100 seconds."""
        config = get_config()
        
        # JMX Logic: If manual bearer is provided, do NOT refresh, ignore expiry.
        if config.get("manual_token_active"):
            return False

        expires_str = config.get("viking_token_expires")
        if not expires_str:
            return True
            
        try:
            # JMX Alignment: Proper ISO parsing and epoch comparison
            if expires_str.endswith('Z'):
                clean_date = expires_str.replace('Z', '+00:00')
            else:
                clean_date = expires_str

            exp_dt = datetime.fromisoformat(clean_date)
            exp_millis = exp_dt.timestamp() * 1000
            now_millis = datetime.now(timezone.utc).timestamp() * 1000
            
            # JMX: (now >= (exp - 100000))
            is_expired = now_millis >= (exp_millis - 100000)
            
            logger.debug("Token Expiry: %s | Exp Millis: %s | Now Millis: %s | Refresh Required: %s", expires_str, exp_millis, now_millis, is_expired)
            return is_expired
        except Exception as e:
            logger.warning("Expiry parsing failed for '%s': %s", expires_str, e)
            return True

    def refresh_token(self, force=False):
        """Attempts to refresh the session token only if needed."""
        with self._lock:
            config = get_config()
            
            # CRITICAL: Do NOT refresh if a manual token is being used
            if config.get("manual_token_active"):
                print("[DEBUG] Manual token active, skipping refresh.")
                return config.get("viking_bearer_token")

            if not force and not self.is_token_expired():
                print("[DEBUG] Token still valid, skipping refresh.")
                return config.get("viking_bearer_token")

            try:
                headers = self._get_headers()
                if config.get("viking_cookie"):
                    headers["cookie"] = config.get("viking_cookie")

                url = f"{self.base_url}{self.auth_endpoint}"
                resp = requests.get(url, headers=headers, timeout=15)
                if resp.ok:
                    data = resp.json()
                    token = self._get_nested_value(data, self.token_path)
                    expires = self._get_nested_value(data, self.expiry_path)

                    if token:
                        config["viking_bearer_token"] = token
                        if expires:
                            config["viking_token_expires"] = expires
                        config["manual_token_active"] = False
                        save_config(config)
                        return token
            except Exception as e:
                logger.warning("Token refresh failed at %s: %s", url, e)

    def _get_headers(self, api_key=None):
        config = get_config()
        token = api_key or config.get("viking_bearer_token")
        cookie = config.get("viking_cookie")
        
        headers = {
            "accept": "*/*",
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
            "referer": f"{self.base_url}/",
            "origin": self.base_url,
            "sec-ch-ua": '"Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"Windows"',
        }
        
        if token:
            headers["authorization"] = f"Bearer {token.replace('Bearer ', '')}"
        
        if cookie:
            headers["cookie"] = cookie

        if config.get("viking_api_key"):
            headers["x-api-key"] = config.get("viking_api_key").strip()
            
        return headers

    def _request(self, method, path, api_key=None, stream=False, json_data=None, files=None, retry_count=0, rag_api=None):
        config = get_config()
        api_endpoint = rag_api or config.get("viking_api_endpoint", "")
        
        target_url = None
        params = None
        
        # Determine if we use proxy or direct
        if api_endpoint and api_endpoint.startswith("http"):
            if "/api/proxy" in api_endpoint:
                proxy_base = api_endpoint.split('?')[0]
                target_url = proxy_base
                params = {"endpoint": path, "method": method.upper()}
            else:
                if path and not api_endpoint.rstrip('/').endswith(path.lstrip('/')):
                    target_url = api_endpoint.rstrip('/') + path
                else:
                    target_url = api_endpoint
        else:
            target_url = f"{self.base_url}/api/proxy"
            params = {"endpoint": path, "method": method.upper()}

        if json_data == {}:
            json_data = None

        headers = self._get_headers(api_key=api_key)
        
        # Check for expiration before making the request (only for system tokens)
        if not config.get("manual_token_active") and self.is_token_expired() and retry_count < 1:
            self.refresh_token()
            headers = self._get_headers()

        self._log_request(method, target_url, headers, params=params, json_data=json_data, files=files)

        try:
            req_method = "POST" if params else method
            response = requests.request(
                method=req_method,
                url=target_url,
                params=params,
                headers=headers,
                json=json_data if (json_data is not None and files is None) else None,
                files=files,
                stream=stream,
                timeout=120 if stream else 30
            )

            self._log_response(response)

            if response.status_code == 503 and retry_count < 3:
                logger.warning("Received 503 from %s. Retrying %s/%s.", target_url, retry_count + 1, 3)
                time.sleep((retry_count + 1) * 5)
                return self._request(method, path, api_key=api_key, stream=stream,
                                       json_data=json_data, files=files, retry_count=retry_count + 1, rag_api=rag_api)

            if response.status_code in [401, 403] and not config.get("manual_token_active") and retry_count < 1:
                new_token = self.refresh_token(force=True)
                if new_token:
                    return self._request(method, path, api_key=new_token, stream=stream,
                                       json_data=json_data, files=files, retry_count=retry_count + 1, rag_api=rag_api)

            try:
                response.raise_for_status()
            except requests.HTTPError as http_exc:
                error_body = response.text or "<empty>"
                logger.error("API Error response from %s: status=%s body=%s", target_url, response.status_code, error_body)
                raise Exception(f"API Error {response.status_code} for {req_method} {target_url}: {error_body}") from http_exc

            return response
        except requests.RequestException as e:
            logger.error("RequestException to %s: %s", target_url, str(e))
            raise
        except Exception as e:
            if "503" in str(e) and retry_count < 3:
                logger.warning("Retrying due to 503 error: %s", e)
                time.sleep((retry_count + 1) * 5)
                return self._request(method, path, api_key=api_key, stream=stream,
                                       json_data=json_data, files=files, retry_count=retry_count + 1)
            logger.error("Request failed to %s: %s", target_url, e)
            raise

    def create_session(self, api_key=None):
        config = get_config()
        
        # If user provides a key manually via the 'Evaluate' UI button
        if api_key:
            # Check if it matches existing bearer token to avoid redundant config writes
            if config.get("viking_bearer_token") != api_key:
                config["viking_bearer_token"] = api_key
                config["manual_token_active"] = True
                save_config(config)

        headers = self._get_headers(api_key=api_key)
        if not headers.get("authorization"):
            raise ValueError("Create session requires a valid Authorization bearer token.")

        req_map = config.get("request_mapping", {})
        files = {
            req_map.get("request_type", "request_type"): (None, "conversation"),
            req_map.get("query", "query"): (None, ""),
            req_map.get("user_filter", "user_filter"): (None, "{}"),
            req_map.get("session_id", "session_id"): (None, ""),
            "liquid_type": (None, "conversation")
        }

        missing_fields = [field for field, value in files.items() if value is None or (isinstance(value, tuple) and value[1] is None)]
        if missing_fields:
            raise ValueError(f"Missing required create_session multipart fields: {missing_fields}")

        path = "/api/v1/conversations/session/create"
        response = self._request("POST", path, api_key=api_key, files=files)

        try:
            payload = response.json()
        except json.JSONDecodeError as exc:
            raise ValueError(f"Invalid JSON response from Viking session creation: {exc}; response body={response.text}") from exc

        session_id = payload.get("session_id")
        if not session_id:
            raise ValueError(f"Viking session creation returned no session_id: {payload}")

        return session_id

    def send_message(self, session_id, prompt, api_key=None, index_name=None, rag_api=None):
        if not session_id:
            raise ValueError("send_message requires a valid session_id.")

        config = get_config()
        req_map = config.get("request_mapping", {})
        res_map = config.get("response_mapping", {})
        
        # Prepare multipart fields dynamically
        files = {
            req_map.get("request_type", "request_type"): (None, "conversation"),
            req_map.get("query", "query"): (None, f"{prompt}\r\n\r\n"),
            req_map.get("user_filter", "user_filter"): (None, "{}"),
            req_map.get("session_id", "session_id"): (None, session_id)
        }
        if index_name:
            files["index_name"] = (None, index_name)

        path = "/api/v1/query/stream/async"
        response = self._request("POST", path, api_key=api_key, files=files, stream=True, rag_api=rag_api)
        
        full_answer = ""
        retrieval_context = []
        message_id = None
        start_time = time.time()

        for line in response.iter_lines():
            if line is None or len(line) == 0:
                continue

            line_str = line.decode('utf-8', errors='ignore')
            if line_str.startswith("data:"):
                payload = line_str[5:].rstrip('\r\n')
            elif line_str.startswith("event:"):
                continue
            else:
                payload = line_str.rstrip('\r\n')

            if payload == "[DONE]":
                break
            if not payload:
                continue

            try:
                data = json.loads(payload)

                for content_path in res_map.get("content", []):
                    val = self._get_nested_value(data, content_path)
                    if val:
                        full_answer += str(val)
                        break

                for id_path in res_map.get("message_id", []):
                    val = self._get_nested_value(data, id_path)
                    if val:
                        message_id = val
                        break

                for context_path in res_map.get("retrieval_context", []):
                    val = self._get_nested_value(data, context_path)
                    if isinstance(val, list):
                        for item in val:
                            txt = None
                            if isinstance(item, dict):
                                txt = item.get("content", {}).get("text") or item.get("page_content") or item.get("text")
                            elif isinstance(item, str):
                                txt = item
                            if txt:
                                retrieval_context.append(txt)
                        if retrieval_context:
                            break

            except json.JSONDecodeError:
                if payload and not payload.startswith(("{", "[")):
                    full_answer += payload

        latency = round(time.time() - start_time, 2)
        if not full_answer.strip() and not retrieval_context:
            raise Exception("Empty response from Viking AI: No content found in stream.")
            
        return full_answer.strip(), list(set(retrieval_context)), message_id, latency
