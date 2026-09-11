#!/usr/bin/env python3
"""
Web Server cho Demo Giao Diện LLM Lab 01 (K4-Day1)
Cung cấp API cho Chatbot Streaming, So sánh Model, Đếm Token và Thử nghiệm Retry.
"""

import json
import os
import sys
import time

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from dotenv import load_dotenv

# Load env variables
load_dotenv()

# Import logic from template.py
import template

WEB_DIR = Path(__file__).parent / "web"


class LLMDemoHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WEB_DIR), **kwargs)

    def _send_json(self, status: int, data: dict):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/status":
            is_nim = bool(os.getenv("OPENAI_BASE_URL"))
            data = {
                "status": "ready",
                "provider": "NVIDIA NIM" if is_nim else "OpenAI",
                "base_url": os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"),
                "large_model": template.OPENAI_MODEL,
                "mini_model": template.OPENAI_MINI_MODEL,
                "has_key": bool(os.getenv("OPENAI_API_KEY")),
            }
            self._send_json(200, data)
            return

        # Default static file serving
        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        content_length = int(self.headers.get("Content-Length", 0))
        body_bytes = self.rfile.read(content_length) if content_length > 0 else b"{}"

        try:
            body = json.loads(body_bytes.decode("utf-8")) if body_bytes else {}
        except Exception:
            body = {}

        if parsed.path == "/api/chat":
            self.handle_chat_stream(body)
            return
        elif parsed.path == "/api/compare":
            self.handle_compare(body)
            return
        elif parsed.path == "/api/tokens":
            self.handle_tokens(body)
            return
        elif parsed.path == "/api/retry-demo":
            self.handle_retry_demo(body)
            return
        else:
            self._send_json(404, {"error": f"Endpoint not found: {parsed.path}"})

    def handle_chat_stream(self, body: dict):
        """Xử lý streaming chat qua Server-Sent Events (SSE)"""
        persona = body.get("persona", "Bạn là trợ giảng thân thiện của khóa AI, trả lời ngắn gọn bằng tiếng Việt.")
        user_message = body.get("message", "")
        history = body.get("history", [])
        temperature = float(body.get("temperature", 0.7))
        max_tokens = int(body.get("max_tokens", 256))
        req_model = body.get("model")
        if req_model == "mini":
            model = template.OPENAI_MINI_MODEL
        elif req_model and req_model != "large":
            model = req_model
        else:
            model = template.OPENAI_MODEL

        from openai import OpenAI
        base_url = os.getenv("OPENAI_BASE_URL")
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"), base_url=base_url) if base_url else OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

        # Build messages with persona and capped history
        capped_history = history[-6:] if len(history) > 6 else history
        messages = [{"role": "system", "content": persona}] + capped_history + [{"role": "user", "content": user_message}]

        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "keep-alive")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()

        start_time = time.perf_counter()
        full_reply = ""

        try:
            stream = template.retry_with_backoff(
                lambda: client.chat.completions.create(
                    model=model,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    stream=True,
                )
            )

            for chunk in stream:
                delta = chunk.choices[0].delta.content or ""
                if delta:
                    full_reply += delta
                    payload = json.dumps({"delta": delta}, ensure_ascii=False)
                    self.wfile.write(f"data: {payload}\n\n".encode("utf-8"))
                    self.wfile.flush()

            latency = time.perf_counter() - start_time
            cost_info = template.estimate_cost(user_message, full_reply, model=model)

            end_data = {
                "done": True,
                "reply": full_reply,
                "latency": latency,
                "input_tokens": cost_info["input_tokens"],
                "output_tokens": cost_info["output_tokens"],
                "total_tokens": cost_info["input_tokens"] + cost_info["output_tokens"],
                "total_cost": cost_info["total_cost"],
            }
            self.wfile.write(f"data: {json.dumps(end_data, ensure_ascii=False)}\n\n".encode("utf-8"))
            self.wfile.flush()

        except Exception as e:
            print(f"[ERROR] Chat stream error: {e}", flush=True)
            err_data = {"error": str(e)}
            self.wfile.write(f"data: {json.dumps(err_data, ensure_ascii=False)}\n\n".encode("utf-8"))
            self.wfile.flush()

    def handle_compare(self, body: dict):
        """So sánh trực tiếp model lớn vs model nhỏ"""
        prompt = body.get("prompt", "Giải thích khác biệt giữa AI và Machine Learning.")
        temp = float(body.get("temperature", 0.7))
        top_p = float(body.get("top_p", 0.9))
        max_tokens = int(body.get("max_tokens", 256))

        try:
            t0 = time.perf_counter()
            g4o_text, g4o_lat = template.call_openai(
                prompt, model=template.OPENAI_MODEL, temperature=temp, top_p=top_p, max_tokens=max_tokens
            )
            mini_text, mini_lat = template.call_openai_mini(
                prompt, temperature=temp, top_p=top_p, max_tokens=max_tokens
            )

            g4o_tokens = template.count_tokens(g4o_text, model=template.OPENAI_MODEL)
            mini_tokens = template.count_tokens(mini_text, model=template.OPENAI_MINI_MODEL)
            g4o_cost = template.estimate_cost(prompt, g4o_text, model=template.OPENAI_MODEL)
            mini_cost = template.estimate_cost(prompt, mini_text, model=template.OPENAI_MINI_MODEL)

            self._send_json(200, {
                "prompt": prompt,
                "gpt4o_response": g4o_text,
                "mini_response": mini_text,
                "gpt4o_latency": round(g4o_lat, 2),
                "mini_latency": round(mini_lat, 2),
                "gpt4o_tokens": g4o_tokens,
                "mini_tokens": mini_tokens,
                "gpt4o_cost": g4o_cost["total_cost"],
                "mini_cost": mini_cost["total_cost"],
                "model_large_name": template.OPENAI_MODEL,
                "model_mini_name": template.OPENAI_MINI_MODEL,
            })
        except Exception as e:
            self._send_json(500, {"error": str(e)})

    def handle_tokens(self, body: dict):
        """Đếm token và tính chi phí chi tiết"""
        text = body.get("text", "")
        model = body.get("model", template.OPENAI_MODEL)
        tokens = template.count_tokens(text, model=model)
        words = len(text.split())
        chars = len(text)
        est_words = round(words / 0.75, 1)
        pricing = template.PRICING_PER_1K_TOKENS.get(model, template.PRICING_PER_1K_TOKENS["gpt-4o"])

        self._send_json(200, {
            "tokens": tokens,
            "words": words,
            "chars": chars,
            "estimated_by_words": est_words,
            "diff_percent": round(abs(tokens - est_words) / max(tokens, 1) * 100, 1),
            "input_cost": (tokens / 1000) * pricing["input"],
            "output_cost": (tokens / 1000) * pricing["output"],
        })

    def handle_retry_demo(self, body: dict):
        """Mô phỏng cơ chế retry with backoff"""
        attempts_log = []
        fail_times = int(body.get("fail_times", 2))
        counter = [0]

        def flaky_action():
            counter[0] += 1
            cur_attempt = counter[0]
            if cur_attempt <= fail_times:
                msg = f"Lần {cur_attempt}: Lỗi kết nối tạm thời (503 Service Unavailable)"
                attempts_log.append({"attempt": cur_attempt, "status": "fail", "msg": msg})
                raise ConnectionError(msg)
            msg = f"Lần {cur_attempt}: Kết nối thành công tới LLM API!"
            attempts_log.append({"attempt": cur_attempt, "status": "success", "msg": msg})
            return "Thành công"

        try:
            res = template.retry_with_backoff(flaky_action, max_retries=3, base_delay=0.15)
            self._send_json(200, {"success": True, "result": res, "logs": attempts_log})
        except Exception as e:
            self._send_json(200, {"success": False, "error": str(e), "logs": attempts_log})


def run_server(port: int = 8000):
    server = HTTPServer(("0.0.0.0", port), LLMDemoHandler)
    print(f"🚀 LLM Lab Server đang chạy tại: http://localhost:{port}")
    print(f"📁 Phục vụ giao diện tại: {WEB_DIR}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nĐã dừng server.")
        server.server_close()


if __name__ == "__main__":
    port = 8000
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass
    run_server(port)
