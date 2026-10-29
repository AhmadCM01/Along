"""Benchmark both LLM levels and probe image input support.

Usage (from backend/):
    python -m scripts.benchmark_llm_levels [--out report.json]

- 5 sequential calls per level with the real merged extraction prompt (extract_v1.md)
  on short inputs (English, Pidgin, relational landmark), max_tokens=400, 90 s per call.
- Reports latency, success, valid JSON, and whether the answer is in the final answer
  field (message.content), plus p50 and p95.
- Checks for separate reasoning output and probes the documented `reasoning_effort` control.
- Sends a tiny generated PNG to each level to test image input.

Never prints API keys. Only provider display names, model ids and redacted errors.
"""

from __future__ import annotations

import argparse
import asyncio
import base64
import json
import statistics
import struct
import time
import zlib
from typing import Any

from app.ai.extraction import _load_system_prompt
from app.ai.llm import LLMCallResult, LLMEndpoint, MetaLLMClient, label_model
from app.ai.schemas import ExtractionOutput

MAX_TOKENS = 400
CALL_TIMEOUT_S = 90.0

INPUTS: list[tuple[str, str]] = [
    ("en", "I am at Berger, going to Wuse Market, one seat"),
    ("pcm", "Abeg I dey Kubwa NNPC, carry me reach Utako, two seats"),
    ("relational", "From Dutse Alhaji, drop me for the second Total after Mabushi bridge"),
]


def _percentile(values: list[float], pct: float) -> float:
    """Nearest-rank percentile."""
    if not values:
        return float("nan")
    ordered = sorted(values)
    rank = max(1, int(-(-pct * len(ordered) // 100)))  # ceil
    return ordered[min(rank, len(ordered)) - 1]


def _tiny_png(size: int = 32, rgb: tuple[int, int, int] = (220, 20, 20)) -> bytes:
    """Build a solid-colour RGB PNG without third-party libraries."""
    raw = b"".join(b"\x00" + bytes(rgb) * size for _ in range(size))

    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b"")


async def _timed_call(client: MetaLLMClient, ep: LLMEndpoint, **kwargs: Any) -> LLMCallResult | str:
    try:
        return await asyncio.wait_for(
            client.call_endpoint(ep, timeout_sec=CALL_TIMEOUT_S, **kwargs), timeout=CALL_TIMEOUT_S + 2
        )
    except asyncio.TimeoutError:
        return f"test timeout after {CALL_TIMEOUT_S:.0f}s"


def _schema_ok(parsed: dict[str, Any] | None) -> bool:
    if parsed is None:
        return False
    try:
        ExtractionOutput.model_validate(parsed)
        return True
    except Exception:
        return False


async def benchmark_level(client: MetaLLMClient, ep: LLMEndpoint, system_prompt: str) -> dict[str, Any]:
    rows: list[dict[str, Any]] = []
    for i in range(5):
        kind, text = INPUTS[i % len(INPUTS)]
        wall_start = time.perf_counter()
        res = await _timed_call(
            client,
            ep,
            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": text}],
            max_tokens=MAX_TOKENS,
        )
        wall_ms = round((time.perf_counter() - wall_start) * 1000.0, 1)
        if isinstance(res, str):
            rows.append({"call": i + 1, "input": kind, "latency_ms": wall_ms, "success": False, "error": res})
            continue
        rows.append(
            {
                "call": i + 1,
                "input": kind,
                "latency_ms": wall_ms,
                "success": res.ok,
                "http_status": res.http_status,
                "valid_json": res.parsed_json is not None,
                "schema_valid": _schema_ok(res.parsed_json),
                "answer_in_final_field": bool(res.content.strip()) and res.parsed_json is not None,
                "finish_reason": res.finish_reason,
                "reasoning_present": res.reasoning_present,
                "reasoning_chars": res.reasoning_chars,
                "reasoning_tokens": res.reasoning_tokens,
                "completion_tokens": res.completion_tokens,
                "response_model_id": res.model_used if res.ok else None,
                "provider": res.provider,
                "error": res.error,
            }
        )
    lat = [r["latency_ms"] for r in rows]
    ok_lat = [r["latency_ms"] for r in rows if r.get("success")]
    return {
        "level": ep.level,
        "provider": ep.display(call_succeeded=any(r.get("success") for r in rows)),
        "requested_model": ep.model,
        "rows": rows,
        "p50_ms_all": _percentile(lat, 50),
        "p95_ms_all": _percentile(lat, 95),
        "p50_ms_success": _percentile(ok_lat, 50) if ok_lat else None,
        "p95_ms_success": _percentile(ok_lat, 95) if ok_lat else None,
        "mean_ms_all": round(statistics.fmean(lat), 1) if lat else None,
    }


async def probe_reasoning_control(client: MetaLLMClient, ep: LLMEndpoint, system_prompt: str) -> list[dict[str, Any]]:
    """Send the documented `reasoning_effort` parameter and observe what changes."""
    out = []
    _kind, text = INPUTS[0]
    for effort in ("low", "none"):
        res = await _timed_call(
            client,
            ep,
            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": text}],
            max_tokens=MAX_TOKENS,
            extra_body={"reasoning_effort": effort},
        )
        if isinstance(res, str):
            out.append({"reasoning_effort": effort, "success": False, "error": res})
            continue
        out.append(
            {
                "reasoning_effort": effort,
                "success": res.ok,
                "http_status": res.http_status,
                "latency_ms": res.latency_ms,
                "reasoning_present": res.reasoning_present,
                "reasoning_chars": res.reasoning_chars,
                "reasoning_tokens": res.reasoning_tokens,
                "completion_tokens": res.completion_tokens,
                "valid_json": res.parsed_json is not None,
                "error": res.error,
            }
        )
    return out


async def probe_image(client: MetaLLMClient, ep: LLMEndpoint) -> dict[str, Any]:
    png = _tiny_png()
    b64 = base64.b64encode(png).decode("ascii")
    res = await _timed_call(
        client,
        ep,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": 'What is the single dominant colour of this image? Reply with JSON only: {"color": "<name>"}',
                    },
                    {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}},
                ],
            }
        ],
        max_tokens=MAX_TOKENS,
    )
    if isinstance(res, str):
        return {"level": ep.level, "accepted": False, "error": res, "image_bytes": len(png)}
    color = str((res.parsed_json or {}).get("color", "")).lower() if res.parsed_json else ""
    return {
        "level": ep.level,
        "image_bytes": len(png),
        "http_status": res.http_status,
        "accepted": res.ok,
        "answer": (res.content or "")[:120],
        "identified_red": "red" in color or "red" in (res.content or "").lower(),
        "response_model_id": res.model_used if res.ok else None,
        "label": label_model(res.model_used) if res.ok else "none",
        "provider": res.provider,
        "latency_ms": res.latency_ms,
        "error": res.error,
    }


def _fmt(v: Any) -> str:
    if v is None:
        return "n/a"
    if isinstance(v, bool):
        return "yes" if v else "no"
    if isinstance(v, float):
        return f"{v:.0f}"
    return str(v)


def _print_report(report: dict[str, Any]) -> None:
    for bench in report["benchmarks"]:
        print(f"\n## {bench['level']} ({bench['provider']}, requested {bench['requested_model']})")
        print("| call | input | latency ms | success | valid JSON | schema valid | answer in final field | finish | reasoning chars | response model |")
        print("|---|---|---|---|---|---|---|---|---|---|")
        for r in bench["rows"]:
            print(
                f"| {r['call']} | {r['input']} | {_fmt(r['latency_ms'])} | {_fmt(r.get('success'))} | "
                f"{_fmt(r.get('valid_json'))} | {_fmt(r.get('schema_valid'))} | {_fmt(r.get('answer_in_final_field'))} | "
                f"{_fmt(r.get('finish_reason'))} | {_fmt(r.get('reasoning_chars'))} | {_fmt(r.get('response_model_id'))} |"
            )
        print(
            f"p50 all={_fmt(bench['p50_ms_all'])} ms, p95 all={_fmt(bench['p95_ms_all'])} ms, "
            f"p50 success={_fmt(bench['p50_ms_success'])} ms, p95 success={_fmt(bench['p95_ms_success'])} ms"
        )
        errs = {r.get("error") for r in bench["rows"] if r.get("error")}
        for e in errs:
            print(f"error: {e}")
    print("\n## reasoning_effort probe (primary)")
    print(json.dumps(report.get("reasoning_probe"), indent=2))
    print("\n## image probe")
    print(json.dumps(report.get("image_probe"), indent=2))


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default=None)
    parser.add_argument("--skip-bench", action="store_true")
    args = parser.parse_args()

    client = MetaLLMClient()
    system_prompt = _load_system_prompt()
    report: dict[str, Any] = {
        "max_tokens": MAX_TOKENS,
        "call_timeout_s": CALL_TIMEOUT_S,
        "inputs": INPUTS,
        "benchmarks": [],
        "image_probe": [],
    }
    for level in ("primary", "fallback"):
        ep = client.endpoint(level)  # type: ignore[arg-type]
        if ep is None:
            report["benchmarks"].append({"level": level, "provider": "not configured", "requested_model": "n/a",
                                          "rows": [], "p50_ms_all": None, "p95_ms_all": None,
                                          "p50_ms_success": None, "p95_ms_success": None})
            continue
        if not args.skip_bench:
            report["benchmarks"].append(await benchmark_level(client, ep, system_prompt))
        if level == "primary":
            report["reasoning_probe"] = await probe_reasoning_control(client, ep, system_prompt)
        report["image_probe"].append(await probe_image(client, ep))

    _print_report(report)
    if args.out:
        with open(args.out, "w", encoding="utf-8") as fh:
            json.dump(report, fh, indent=2)


if __name__ == "__main__":
    asyncio.run(main())
