"""Multilingual WhatsApp response template renderer (`app/ai/templates.py`).

Loads `en.yaml`, `pcm.yaml`, and `ha.yaml` and renders localized messages with
zero LLM generation latency on outbound responses.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml

_TEMPLATES_DIR = Path(__file__).resolve().parents[1] / "templates"


@lru_cache(maxsize=8)
def _load_locale_dict(locale: str) -> dict[str, str]:
    safe_locale = locale if locale in ("en", "pcm", "ha") else "en"
    path = _TEMPLATES_DIR / f"{safe_locale}.yaml"
    if not path.exists():
        path = _TEMPLATES_DIR / "en.yaml"
    raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(raw, dict):
        return {}
    return {str(k): str(v).strip() for k, v in raw.items()}


def render_template(key: str, locale: str = "en", **kwargs: Any) -> str:
    """Render a localized WhatsApp message template in `en`, `pcm`, or `ha`."""
    catalog = _load_locale_dict(locale)
    template_str = catalog.get(key)
    if not template_str:
        en_catalog = _load_locale_dict("en")
        template_str = en_catalog.get(key, f"[{key}]")
    try:
        return template_str.format(**kwargs)
    except KeyError:
        return template_str
