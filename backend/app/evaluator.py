import os
import json
import re
import logging
from deepeval.test_case import LLMTestCase
from deepeval.metrics import BaseMetric
from deepeval.models.llms.gemini_model import GeminiModel
from .config_manager import get_config

logger = logging.getLogger("truthcheck.evaluator")

class CombinedMetric(BaseMetric):
    def __init__(self, name: str, model, mode: str = "Standard", threshold: float = 0.7):
        self.name = name
        self.model = model
        self.mode = mode # Light, Standard, Full
        self.threshold = threshold
        self.score = 0
        self.reason = ""
        self.individual_scores = {}
        self.full_data = {}

    def _extract_json_object(self, text: str):
        if not isinstance(text, str):
            return None

        # Strip markdown fences and extra whitespace
        candidate = re.sub(r"```[a-zA-Z0-9]*\n|```", "", text)
        candidate = candidate.strip()

        start = candidate.find("{")
        if start == -1:
            return None

        depth = 0
        in_string = False
        escape = False
        for idx, ch in enumerate(candidate[start:]):
            if escape:
                escape = False
                continue
            if ch == "\\":
                escape = True
                continue
            if ch == '"':
                in_string = not in_string
                continue
            if in_string:
                continue
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    return candidate[start:start + idx + 1]

        return None

    def _normalize_raw_response(self, raw_res):
        if raw_res is None:
            return ""
        if not isinstance(raw_res, str):
            raw_res = str(raw_res)
        return raw_res.strip()

    def measure(self, test_case: LLMTestCase):
        context_str = "\n".join(test_case.retrieval_context) if test_case.retrieval_context else "NOT PROVIDED"
        expected_str = test_case.expected_output if test_case.expected_output else "NOT PROVIDED"
        
        if self.mode == "Light":
            metrics_desc = "1. Correctness (vs Expected)\n2. Relevancy (vs Question)\n3. Hallucination (Grounding)"
            json_fields = '"correctness": <float>, "relevancy": <float>, "hallucination": <float>'
            weights = {"correctness": 0.45, "relevancy": 0.35, "hallucination": 0.20}
        elif self.mode == "Full":
            metrics_desc = "1. Correctness, 2. Relevancy, 3. Faithfulness, 4. Hallucination, 5. Context Precision, 6. Context Recall, 7. Toxicity, 8. Bias"
            json_fields = '"correctness": <float>, "relevancy": <float>, "faithfulness": <float|null>, "hallucination": <float>, "context_precision": <float|null>, "context_recall": <float|null>, "toxicity": <float>, "bias": <float>'
            weights = {
                "correctness": 0.25, "faithfulness": 0.20, "relevancy": 0.15, "hallucination": 0.15,
                "context_precision": 0.10, "context_recall": 0.10, "toxicity": 0.03, "bias": 0.02
            }
        else: # Standard
            metrics_desc = "1. Correctness, 2. Relevancy, 3. Faithfulness, 4. Hallucination"
            json_fields = '"correctness": <float>, "relevancy": <float>, "faithfulness": <float|null>, "hallucination": <float>'
            weights = {"correctness": 0.35, "relevancy": 0.25, "faithfulness": 0.25, "hallucination": 0.15}

        prompt = f"""
        You are an expert AI evaluator assessing response quality for the TruthCheck AI framework.
        Evaluate the following output based on the '{self.mode}' mode.

        INPUT DATA:
        User Question: {test_case.input}
        Retrieved Context: {context_str}
        Actual AI Response: {test_case.actual_output}
        Expected Response: {expected_str}

        EVALUATION CRITERIA (0.0 to 1.0):
        {metrics_desc}

        RULES:
        - Return ONLY valid JSON.
        - Evaluate whether the meaning of the Actual AI Response is equivalent to the Expected Response.
        - Do not penalize different wording if the meaning and required details are preserved.
        - Explicitly identify any missing details or information that is present in the Expected Response but absent in the Actual AI Response.
        - List extra or incorrect details if the response contains information not supported by the Expected Response.
        - Root Cause Detection: If the score is low, identify if it's due to Retrieval Failure, Logic Failure, or Hallucination.
        - Hallucination Flag: Explicitly state if any info in the response is not grounded in the context.

        REQUIRED JSON OUTPUT FORMAT:
        {{
          "overall_score": <float>,
          "status": "PASS | WARNING | FAIL",
          "semantic_comparison": {{
             "match_status": "FULL_MATCH | PARTIAL_MATCH | MISMATCH",
             "details": "<detailed differences>"
          }},
          "root_cause": "<detected root cause or 'N/A'>",
          "hallucination_detected": <boolean>,
          "metrics": {{ {json_fields} }},
          "summary": "<executive summary of reasoning>",
          "judge_reasoning": "<explicit reasoning about missing or extra content>",
          "issues": ["<specific issue 1>", ...],
          "suggestions": ["<improvement suggestion 1>", ...]
        }}
        """
        
        try:
            raw_res = self.model.generate(prompt)
            raw_res = self._normalize_raw_response(raw_res)
            logger.debug("Evaluator raw response: %s", raw_res[:2000] if len(raw_res) > 2000 else raw_res)

            json_str = self._extract_json_object(raw_res)
            if not json_str:
                logger.warning("Evaluator output did not contain a valid JSON object. Raw response: %s", raw_res[:2000])
                self.reason = "Failed to parse evaluation JSON from model output."
                return

            try:
                data = json.loads(json_str)
            except json.JSONDecodeError as exc:
                logger.warning("Failed to decode evaluator JSON object: %s; extracted JSON: %s", exc, json_str[:2000])
                self.reason = f"Failed to decode evaluation JSON: {exc}."
                return

            m = data.get("metrics", {})
            raw_metrics = {}
            formatted_metrics = {}

            for key, value in m.items():
                if value is None:
                    raw_metrics[key] = None
                    formatted_metrics[key] = None
                    continue
                try:
                    numeric = float(value)
                except (TypeError, ValueError):
                    raw_metrics[key] = None
                    formatted_metrics[key] = None
                    continue

                raw_metrics[key] = numeric
                percent_value = numeric if numeric > 1 else numeric * 100
                formatted_metrics[key] = int(round(percent_value)) if percent_value.is_integer() else round(percent_value, 2)

            # Weighted Score Calculation
            total_weighted = 0
            available_weight = 0
            for k, w in weights.items():
                val = raw_metrics.get(k)
                if val is not None:
                    total_weighted += (float(val) * w)
                    available_weight += w

            final_score = (total_weighted / available_weight) if available_weight > 0 else 0
            data["overall_score"] = round(final_score, 3)

            if final_score >= 0.8:
                data["status"] = "PASS"
            elif final_score >= 0.5:
                data["status"] = "WARNING"
            else:
                data["status"] = "FAIL"

            data["metrics"] = formatted_metrics
            data["judge_reasoning"] = data.get("judge_reasoning", data.get("summary", ""))
            self.full_data = data
            self.score = final_score
            self.individual_scores = raw_metrics
            self.reason = data.get("summary", "")
        except Exception as e:
            logger.exception("Evaluator failure.")
            self.reason = f"Evaluation error: {str(e)}"
            self.score = 0

    def is_successful(self) -> bool:
        return self.score >= self.threshold

    @property
    def __name__(self):
        return self.name

class Evaluator:
    def _get_model(self):
        config = get_config()
        api_key = config.get("google_api_key") or os.getenv("GOOGLE_API_KEY")
        model_name = config.get("llm_model", "gemini-1.5-flash")
        
        if not api_key:
            raise Exception("Gemini API Key not configured in Settings.")
        
        clean_model_name = model_name.split('/')[-1]
        return GeminiModel(model=clean_model_name, api_key=api_key)

    def evaluate(self, prompt, actual_output, retrieval_context=None, expected_output=None):
        config = get_config()
        mode = config.get("eval_mode", "Standard")
        model = self._get_model()
        
        if not isinstance(retrieval_context, list):
            retrieval_context = [str(retrieval_context)] if retrieval_context else []

        test_case = LLMTestCase(
            input=prompt,
            actual_output=actual_output,
            expected_output=expected_output,
            retrieval_context=retrieval_context
        )

        combined = CombinedMetric(f"{mode} Evaluator", model, mode=mode)
        combined.measure(test_case)
        
        full = combined.full_data
        return {
            "score": round(combined.score * 100),
            "reason": full.get("summary", combined.reason),
            "judge_reasoning": full.get("judge_reasoning", full.get("summary", combined.reason)),
            "status": full.get("status", "FAIL"),
            "metrics": full.get("metrics", {}),
            "issues": full.get("issues", []),
            "suggestions": full.get("suggestions", []),
            "semantic_comparison": full.get("semantic_comparison", {}),
            "root_cause": full.get("root_cause", "N/A"),
            "hallucination_detected": full.get("hallucination_detected", False)
        }
