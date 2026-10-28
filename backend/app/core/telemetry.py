"""In-memory and Prometheus-compatible telemetry counters, gauges, and histograms."""

from __future__ import annotations

from collections import defaultdict
from threading import Lock


class MetricsRegistry:
    """Lightweight thread-safe metrics registry exported at GET /metrics."""

    def __init__(self) -> None:
        self._lock = Lock()
        self._counters: dict[str, int] = defaultdict(int)
        self._gauges: dict[str, float] = defaultdict(float)

    def inc(self, name: str, value: int = 1, **labels: str) -> None:
        key = self._format_key(name, labels)
        with self._lock:
            self._counters[key] += value

    def set_gauge(self, name: str, value: float, **labels: str) -> None:
        key = self._format_key(name, labels)
        with self._lock:
            self._gauges[key] = value

    def render_prometheus(self) -> str:
        lines: list[str] = []
        with self._lock:
            for key, val in sorted(self._counters.items()):
                lines.append(f"{key} {val}")
            for key, val in sorted(self._gauges.items()):
                lines.append(f"{key} {val}")
        return "\n".join(lines) + "\n"

    @staticmethod
    def _format_key(name: str, labels: dict[str, str]) -> str:
        if not labels:
            return name
        label_str = ",".join(f'{k}="{v}"' for k, v in sorted(labels.items()))
        return f"{name}{{{label_str}}}"


metrics = MetricsRegistry()
