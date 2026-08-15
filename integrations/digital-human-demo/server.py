from __future__ import annotations

import argparse
import json
import os
import threading
import time
import urllib.error
import urllib.request
import webbrowser
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parent
DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8765
DEFAULT_API_URL = "https://api.deepseek.com/chat/completions"
DEFAULT_MODEL = "deepseek-chat"
SYSTEM_PROMPT = (
    "你是元知己的数字人心理陪伴伙伴。语气温柔、耐心、口语化，每次回复不超过80字。"
    "先共情再回应，少说教，不诊断疾病，不宣称替代专业心理咨询。"
    "如用户表达自伤、伤人或紧急危险，明确建议立即联系身边可信任的人和当地紧急服务。"
)


def load_local_env() -> None:
    env_file = ROOT / ".env.local"
    if not env_file.exists():
        return
    for raw_line in env_file.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        name, value = line.split("=", 1)
        os.environ.setdefault(name.strip(), value.strip().strip('"').strip("'"))


load_local_env()

CONFIG_LOCK = threading.RLock()
RUNTIME_CONFIG = {
    "baseUrl": os.getenv("LLM_BASE_URL", DEFAULT_API_URL).strip() or DEFAULT_API_URL,
    "model": os.getenv("LLM_MODEL", DEFAULT_MODEL).strip() or DEFAULT_MODEL,
    "apiKey": (
        os.getenv("LLM_API_KEY", "").strip()
        or os.getenv("DEEPSEEK_API_KEY", "").strip()
    ),
    "source": "environment",
}


def public_config() -> dict:
    with CONFIG_LOCK:
        cfg = dict(RUNTIME_CONFIG)
    return {
        "baseUrl": cfg["baseUrl"],
        "model": cfg["model"],
        "configured": bool(cfg["apiKey"]),
        "source": cfg["source"],
    }


def validate_config(incoming: dict, *, keep_existing_key: bool) -> dict:
    with CONFIG_LOCK:
        current = dict(RUNTIME_CONFIG)

    base_url = str(incoming.get("baseUrl", current["baseUrl"])).strip()
    model = str(incoming.get("model", current["model"])).strip()
    supplied_key = str(incoming.get("apiKey", "")).strip()
    api_key = supplied_key or (current["apiKey"] if keep_existing_key else "")

    parsed = urlparse(base_url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("invalid_base_url")
    if parsed.username or parsed.password:
        raise ValueError("base_url_credentials_not_allowed")
    if len(base_url) > 500:
        raise ValueError("base_url_too_long")
    if not model or len(model) > 120:
        raise ValueError("invalid_model")
    if not api_key:
        raise ValueError("api_key_required")
    if len(api_key) > 500:
        raise ValueError("api_key_too_long")

    return {
        "baseUrl": base_url,
        "model": model,
        "apiKey": api_key,
        "source": "web",
    }


def request_completion(config: dict, messages: list[dict], *, max_tokens: int = 200) -> str:
    request_body = json.dumps(
        {
            "model": config["model"],
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": 0.8,
        },
        ensure_ascii=False,
    ).encode("utf-8")
    request = urllib.request.Request(
        config["baseUrl"],
        data=request_body,
        method="POST",
        headers={
            "Authorization": f"Bearer {config['apiKey']}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "NeuroMate-Digital-Human-Demo/1.1",
        },
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        result = json.loads(response.read().decode("utf-8"))
    return str(result["choices"][0]["message"]["content"]).strip()


def local_fallback_reply(message: str, mood: str = "平静", quiet: bool = False) -> str:
    text = message.strip()
    if any(word in text for word in ("自杀", "不想活", "伤害自己", "伤人", "死了算了")):
        return "这听起来很危险。请立刻联系身边可信任的人，或拨打当地紧急电话寻求现实帮助。"
    if any(word in text for word in ("累", "疲惫", "撑不住", "没力气")):
        return "听起来你真的消耗了很多。先停一下，喝点水，给身体一点恢复空间。"
    if any(word in text for word in ("焦虑", "紧张", "担心", "压力", "慌")):
        return "我听见你的紧张了。我们先把事情放慢，只看眼前最小的一步。"
    if any(word in text for word in ("开心", "完成", "成功", "好消息")):
        return "这是值得被记住的好消息。谢谢你把它告诉我。"
    if quiet:
        return "嗯，我在。你不用急着说完整，我会安静陪着你。"
    return f"我在认真听。现在是{mood}状态，我们可以慢慢把这件事说清楚。"


class DemoHandler(SimpleHTTPRequestHandler):
    server_version = "NeuroMateDemo/1.1"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, fmt: str, *args) -> None:
        print(f"[{self.log_date_time_string()}] {fmt % args}")

    def send_json(self, payload: dict, status: int = HTTPStatus.OK) -> None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def read_json(self, *, max_length: int = 64 * 1024) -> dict:
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0 or length > max_length:
            raise ValueError("invalid_content_length")
        value = json.loads(self.rfile.read(length).decode("utf-8"))
        if not isinstance(value, dict):
            raise ValueError("invalid_json_object")
        return value

    def do_GET(self) -> None:
        if self.path == "/api/health":
            config = public_config()
            self.send_json({
                "ok": True,
                "apiConfigured": config["configured"],
                "model": config["model"],
            })
            return
        if self.path == "/api/config":
            self.send_json(public_config())
            return
        super().do_GET()

    def do_POST(self) -> None:
        try:
            if self.path == "/api/config":
                incoming = self.read_json(max_length=8 * 1024)
                config = validate_config(incoming, keep_existing_key=True)
                with CONFIG_LOCK:
                    RUNTIME_CONFIG.update(config)
                self.send_json({"ok": True, **public_config()})
                return

            if self.path == "/api/config/test":
                incoming = self.read_json(max_length=8 * 1024)
                config = validate_config(incoming, keep_existing_key=True)
                started = time.perf_counter()
                reply = request_completion(
                    config,
                    [
                        {"role": "system", "content": "这是连接测试，请只回复 OK。"},
                        {"role": "user", "content": "ping"},
                    ],
                    max_tokens=8,
                )
                latency_ms = round((time.perf_counter() - started) * 1000)
                self.send_json({
                    "ok": True,
                    "model": config["model"],
                    "latencyMs": latency_ms,
                    "reply": reply[:40],
                })
                return

            if self.path != "/api/chat":
                self.send_json({"error": "not_found"}, HTTPStatus.NOT_FOUND)
                return

            incoming = self.read_json()
            message = str(incoming.get("message", "")).strip()
            if not message:
                raise ValueError("empty_message")

            avatar = incoming.get("avatar") or {}
            avatar_name = str(avatar.get("name", "元安"))[:20]
            avatar_role = str(avatar.get("role", "心理陪伴伙伴"))[:60]
            context = incoming.get("context") or {}
            mood = str(context.get("mood", "平静"))[:20]
            outfit = str(context.get("outfit", "基础陪伴装"))[:40]
            quiet = bool(context.get("quiet", False))
            memory = context.get("memory") or {}
            focus = str(memory.get("focus", ""))[:60]
            preference = str(memory.get("preference", ""))[:60]

            with CONFIG_LOCK:
                config = dict(RUNTIME_CONFIG)
            if not config["apiKey"]:
                self.send_json({
                    "reply": local_fallback_reply(message, mood, quiet),
                    "mode": "local-fallback",
                    "model": config["model"],
                    "fallbackReason": "api_not_configured",
                })
                return

            history = incoming.get("history") or []
            safe_history = []
            for item in history[-20:]:
                role = item.get("role")
                item_content = str(item.get("content", "")).strip()
                if role in {"user", "assistant"} and item_content:
                    safe_history.append({"role": role, "content": item_content[:1000]})

            prompt = (
                f"{SYSTEM_PROMPT}你当前名叫{avatar_name}，角色定位是：{avatar_role}。"
                f"当前用户状态：{mood}；当前装扮：{outfit}；"
                f"安静陪伴模式：{'开启' if quiet else '关闭'}；"
                f"最近关注点：{focus or '暂无'}；偏好：{preference or '温和回应'}。"
                "如果安静陪伴模式开启，回复要更短、更轻，不要连续追问。"
            )
            try:
                reply = request_completion(
                    config,
                    [
                        {"role": "system", "content": prompt},
                        *safe_history,
                        {"role": "user", "content": message[:2000]},
                    ],
                )
                self.send_json({"reply": reply, "mode": "api", "model": config["model"]})
            except urllib.error.HTTPError as exc:
                detail = exc.read().decode("utf-8", errors="replace")[:300]
                print(f"LLM HTTP {exc.code}: {detail}")
                self.send_json({
                    "reply": local_fallback_reply(message, mood, quiet),
                    "mode": "local-fallback",
                    "model": config["model"],
                    "fallbackReason": "llm_http_error",
                })
            except (urllib.error.URLError, TimeoutError) as exc:
                print(f"LLM network error: {exc}")
                self.send_json({
                    "reply": local_fallback_reply(message, mood, quiet),
                    "mode": "local-fallback",
                    "model": config["model"],
                    "fallbackReason": "llm_network_error",
                })
        except ValueError as exc:
            self.send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")[:300]
            print(f"LLM HTTP {exc.code}: {detail}")
            self.send_json({"error": "llm_http_error", "status": exc.code}, HTTPStatus.BAD_GATEWAY)
        except (urllib.error.URLError, TimeoutError) as exc:
            print(f"LLM network error: {exc}")
            self.send_json({"error": "llm_network_error"}, HTTPStatus.BAD_GATEWAY)
        except Exception as exc:
            print(f"API proxy error: {exc}")
            self.send_json({"error": "api_proxy_error"}, HTTPStatus.INTERNAL_SERVER_ERROR)


def main() -> None:
    parser = argparse.ArgumentParser(description="元知己数字人独立 Demo 本地服务")
    parser.add_argument("--host", default=DEFAULT_HOST)
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    parser.add_argument("--open", action="store_true", help="启动后自动打开浏览器")
    args = parser.parse_args()

    url = f"http://{args.host}:{args.port}"
    server = ThreadingHTTPServer((args.host, args.port), DemoHandler)
    config = public_config()
    print(f"元知己数字人 Demo：{url}")
    print("对话 API：" + (f"已配置（{config['model']}）" if config["configured"] else "未配置，将使用本地回复"))
    if args.open:
        threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
