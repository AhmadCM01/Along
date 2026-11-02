"""Abuja Multilingual & Phonetic ASR Post-Correction Engine (`app/ai/asr_normalizer.py`).

Combines:
1. Zero-latency deterministic phonetic normalization for Nigerian English, Nigerian Pidgin,
   Hausa, and Abuja FCT landmark homophones commonly misrecognized by speech-to-text models
   (e.g., "do say" / "duste" -> "Dutse", "who say" -> "Wuse", "just sing" -> "zan je Wuse",
   "da ga" / "dagger" -> "daga", "so kale" -> "Sokale", "cat amp" -> "Katampe").
2. Meta AI (`meta-models/muse-spark-open-1026` / `meta/llama-3.2`) context-aware ASR
   phonetic reconstruction for noisy microphone transcripts.
"""

from __future__ import annotations

import re
from typing import Literal

from app.ai.llm import MetaLLMClient
from app.core.logging import get_logger

logger = get_logger(__name__)

# Ordered regex rules mapping common English Web-Speech / Whisper phonetic misrecognitions
# of Hausa, Nigerian Pidgin, and Abuja FCT landmarks to their canonical forms.
_PHONETIC_REPLACEMENTS: list[tuple[re.Pattern[str], str]] = [
    # Sub-word glued Hausa & Pidgin expressions observed in live Whisper voice notes
    (
        re.compile(r"\b(?:inawko\s*ana|inakwana|ina\s+ko\s+ana)\b", re.I),
        "Ina kwana",
    ),
    (
        re.compile(r"\binabwari(?:ye|ne)?\b", re.I),
        "ina Bwari",
    ),
    (
        re.compile(r"\bina+(?:dusi|duse|duste|dutse|dutsay)\b", re.I),
        "Ina Dutse",
    ),
    (
        re.compile(r"\b(?:ina\s+)?(?:awu\s*sene|awuse\s*ne|a\s+wuse\s+ne)\b", re.I),
        "Ina Wuse",
    ),
    (
        re.compile(r"\bzanje\b", re.I),
        "zan je",
    ),
    (
        re.compile(r"\buzu\b", re.I),
        "yanzu",
    ),
    # Full-phrase Hausa misrecognitions observed in live testing ("zan wuse daga dutse" -> "just sing")
    (
        re.compile(
            r"^\s*(?:just\s+sing|john\s+sing|zahn\s+sing|zan\s+sing|jang\s+sing)\s*$",
            re.I,
        ),
        "Zan je Wuse daga Dutse",
    ),
    (
        re.compile(
            r"\b(?:just\s+sing|zahn\s+we\s+say|zan\s+we\s+say|zan\s+who\s+say|san\s+who\s+say|zahn\s+wuse)\b",
            re.I,
        ),
        "zan je Wuse",
    ),
    # Hausa directional prepositions ("daga" = from, "zuwa" = to, "zan je" = I am going to, "kujera" = seat)
    (
        re.compile(
            r"\b(?:da\s+ga|dagga|dagger|dogger|dogo|dugger)\s+(?=[a-z])",
            re.I,
        ),
        "daga ",
    ),
    (
        re.compile(
            r"\b(?:zoo\s+wa|zu\s+wa|zua)\s+(?=[a-z])",
            re.I,
        ),
        "zuwa ",
    ),
    (
        re.compile(
            r"\b(?:coochie\s*ra|ku\s+jera|kujira|coojera|coach\s+era)\b",
            re.I,
        ),
        "kujera",
    ),
    (
        re.compile(r"\bkujera\s+(?:be\s+you|bee\s+you|biu|view)\b", re.I),
        "kujera biyu",
    ),
    (
        re.compile(r"\bkujera\s+(?:die\s+ya|diya)\b", re.I),
        "kujera daya",
    ),
    # Nigerian Pidgin common phonetic confusions
    (
        re.compile(r"\b(?:aupa\s+abos|alpha\s+boss|how\s+far\s+abos|aupa\s+boss|alpha\s+abos)\b", re.I),
        "How far boss",
    ),
    (
        re.compile(r"\b(?:awafa|alpha|aupa)\b", re.I),
        "How far",
    ),
    (
        re.compile(r"^\s*(?:are\s+begging|a\s+beg|i\s+beg|abeg)\b", re.I),
        "Abeg",
    ),
    (
        re.compile(r"\b(?:aidee|aide|ai\s+dey|i\s+day|i\s+they|ah\s+dey)\b", re.I),
        "I dey",
    ),
    (
        re.compile(r"\b(?:aongo|awango|a\s+won\s+go|i\s+won\s+go|i\s+wan\s+go|a\s+wan\s+go)\b", re.I),
        "I wan go",
    ),
    (
        re.compile(r"\bnao\b", re.I),
        "now",
    ),
    (
        re.compile(r"\b(?:mbenga|benga)\b", re.I),
        "Berger",
    ),
    # Abuja Landmarks: Dutse ("do say", "du say", "do stay", "duste", "dusi", "duse", "duche", "dutsay", "dutsi")
    (
        re.compile(
            r"\b(?:do\s+say|du\s+say|do\s+stay|do\s+see|dutsay|duche|duste|dutsi|dusi|duse|dot\s+say|dutsch|du\s+che)\b",
            re.I,
        ),
        "Dutse",
    ),
    (
        re.compile(r"\bDutse\s+(?:fast\s+gate|fest\s+gate|1st\s+get|first\s+get)\b", re.I),
        "Dutse First Gate",
    ),
    # Abuja Landmarks: Wuse & Kasuwar Wuse ("who say", "we say", "wu say", "wusay", "use market")
    (
        re.compile(
            r"\b(?:cashew\s+war|kasuwa|kasuwan|ka\s+suwar)\s+(?:who\s+say|we\s+say|wu\s+say|wusay|wuse)\b",
            re.I,
        ),
        "Kasuwar Wuse",
    ),
    (
        re.compile(
            r"\b(?:who\s+say|we\s+say|wu\s+say|wusay|woosay|use)\s+market\b",
            re.I,
        ),
        "Wuse Market",
    ),
    (
        re.compile(
            r"\b(?:who\s+say|we\s+say|wu\s+say|wusay|woosay)\b",
            re.I,
        ),
        "Wuse",
    ),
    # Abuja Landmarks: Bwari ("barry", "buari", "bwari", "bohari", "buhari")
    (
        re.compile(
            r"\b(?:buari|bohari|buhari|bwari|barry)\b",
            re.I,
        ),
        "Bwari",
    ),
    # Abuja Landmarks: Sokale ("so kale", "so call", "sokali", "so kali", "so carry")
    (
        re.compile(
            r"\b(?:so\s+kale|so\s+call(?:ed)?|sokali|so\s+kali|so\s+carry|socali)\b",
            re.I,
        ),
        "Sokale",
    ),
    # Abuja Landmarks: Katampe ("cat amp", "cut amp", "ka tampe", "katampi")
    (
        re.compile(
            r"\b(?:cat\s+amp(?:e|y)?|cut\s+amp(?:e|y)?|ka\s+tampe|katampi|cat\s+tampe)\b",
            re.I,
        ),
        "Katampe",
    ),
    # Abuja Landmarks: Mabushi ("ma bushi", "ma bushy", "mabushi")
    (
        re.compile(
            r"\b(?:ma\s+bushi|ma\s+bushy|mabushi|mabooshi)\b",
            re.I,
        ),
        "Mabushi",
    ),
    # Abuja Landmarks: Berger & Gadar Berger ("badger", "baja", "barja", "burger", "gada")
    (
        re.compile(
            r"\b(?:gada|gadar|gather)\s+(?:badger|baja|barja|burger|berger)\b",
            re.I,
        ),
        "Gadar Berger",
    ),
    (
        re.compile(
            r"\b(?:badger|baja|barja|burger)\b",
            re.I,
        ),
        "Berger",
    ),
    # Abuja Landmarks: Oando ("oh and oh", "o and o", "wando", "orando")
    (
        re.compile(
            r"\b(?:oh\s+and\s+oh|o\s+and\s+o|wando|orando)\b",
            re.I,
        ),
        "Oando",
    ),
    # Abuja Landmarks: Lugbe ("look be", "lug bay", "lugbi", "loogbe")
    (
        re.compile(
            r"\b(?:look\s+be|lug\s+bay|lugbi|loogbe)\b",
            re.I,
        ),
        "Lugbe",
    ),
    # Abuja Landmarks: Kubwa ("cuba", "koobwa", "kubua")
    (
        re.compile(
            r"\b(?:cuba|koobwa|kubua)\b",
            re.I,
        ),
        "Kubwa",
    ),
    # Abuja Landmarks: Gwagwalada ("gwa gwa lada", "gwagwa lada", "gagalada")
    (
        re.compile(
            r"\b(?:gwa\s*gwa\s*lada|gagalada|gwagwalada)\b",
            re.I,
        ),
        "Gwagwalada",
    ),
    # Abuja Landmarks: Mararaba & Nyanya ("mara raba", "maraba", "niya niya")
    (
        re.compile(
            r"\b(?:mara\s*raba|maraba)\b",
            re.I,
        ),
        "Mararaba",
    ),
    (
        re.compile(
            r"\b(?:niya\s*niya|nyanya|nanya)\b",
            re.I,
        ),
        "Nyanya",
    ),
    # Abuja Landmarks: Gwarinpa, Utako, Jabi, Zuba, Dei-Dei
    (
        re.compile(
            r"\b(?:gwa\s*rinpa|gwarimpa|guarimpa)\b",
            re.I,
        ),
        "Gwarinpa",
    ),
    (
        re.compile(
            r"\b(?:oo\s*tako|utako|otako)\b",
            re.I,
        ),
        "Utako",
    ),
    (
        re.compile(
            r"\b(?:day\s+day|dei\s+dei|deidei)\b",
            re.I,
        ),
        "Dei-Dei",
    ),
    # Abuja Landmarks: Mpape, Banex, Galadima, Dawaki, Ushafa, Usman Dam, Muko Junction
    (
        re.compile(
            r"\b(?:mpape|m\s+pape|em\s+pape|impape|mpappe)\b",
            re.I,
        ),
        "Mpape",
    ),
    (
        re.compile(
            r"\b(?:banex|bar\s+next|bannex|ban\s+ex)\b",
            re.I,
        ),
        "Banex",
    ),
    (
        re.compile(
            r"\b(?:gala\s*dima(?:wa)?)\b",
            re.I,
        ),
        "Galadima",
    ),
    (
        re.compile(
            r"\b(?:da\s*waki|dawa\s*ki)\b",
            re.I,
        ),
        "Dawaki",
    ),
    (
        re.compile(
            r"\b(?:oo\s*shafa|u\s*shafa|ushafa)\b",
            re.I,
        ),
        "Ushafa",
    ),
    (
        re.compile(
            r"\b(?:usman\s+dam|usuma\s+dam|osman\s+dam)\b",
            re.I,
        ),
        "Usman Dam",
    ),
    (
        re.compile(
            r"\b(?:muko|mu\s+ko|muco)\s+junction\b",
            re.I,
        ),
        "Muko Junction",
    ),
    # Hausa verb normalization: "zan Wuse" (when "je" is omitted before an Abuja landmark) -> "zan je Wuse"
    (
        re.compile(
            r"\bzan\s+(?!je\b|zuwa\b)(?P<place>Wuse|Kasuwar\s+Wuse|Banex|Dutse|Bwari|Ushafa|Usman\s+Dam|Muko|Sokale|Galadima|Dawaki|Gwarinpa|Katampe|Oando|Mabushi|Berger|Gadar\s+Berger|Mpape|Kubwa|Zuba|Dei-Dei|Jabi|Utako|Gwagwalada|Lugbe|Area\s*1|AYA|Mararaba|Nyanya)\b",
            re.I,
        ),
        r"zan je \g<place>",
    ),
]


def normalize_abuja_asr_transcript(
    raw_text: str,
    *,
    locale_hint: str | None = None,
) -> str:
    """Apply deterministic Abuja phonetic and trilingual (Hausa/Pidgin/English) normalization."""
    if not raw_text or not raw_text.strip():
        return ""

    text = raw_text.strip()
    for pattern, replacement in _PHONETIC_REPLACEMENTS:
        text = pattern.sub(replacement, text)

    # Collapse extra spaces
    text = re.sub(r"\s{2,}", " ", text).strip()
    return text


async def reconstruct_asr_with_meta_llm(
    raw_transcript: str,
    *,
    locale_hint: str | None = None,
    llm_client: MetaLLMClient | None = None,
) -> tuple[str, str | None]:
    """Use Meta AI (`meta-models/muse-spark-open-1026`) to reconstruct phonetic ASR errors.

    Returns `(corrected_transcript, model_used)`. Never raises; falls back to
    deterministic `normalize_abuja_asr_transcript` if no live LLM is configured or if
    the transcript is already clean.
    """
    deterministic_clean = normalize_abuja_asr_transcript(raw_transcript, locale_hint=locale_hint)
    if not deterministic_clean:
        return "", None

    # Check if the deterministic pass already resolved known Abuja landmarks cleanly
    from app.ai.extraction import _match_known_landmarks_in_order

    hits = _match_known_landmarks_in_order(deterministic_clean)
    if len(hits) >= 2:
        return deterministic_clean, None

    client = llm_client or MetaLLMClient()
    if not client.is_live_api_configured():
        return deterministic_clean, None

    sys_prompt = (
        "You are Along AI's Abuja Speech-to-Text Phonetic Reconstruction Engine powered by Meta AI. "
        "A Nigerian commuter spoke a short voice note in Hausa, Nigerian Pidgin, or Nigerian English "
        "to book a shared ride in Abuja FCT, and the browser/ASR engine produced a raw phonetic transcript. "
        "Known Abuja landmarks: Bwari, Ushafa, Dutse, Dutse First Gate, Sokale, Kubwa, Katampe, Oando Mabushi, "
        "Gwarinpa, Berger, Gadar Berger, Wuse, Wuse Market, Kasuwar Wuse, Zuba, Dei-Dei, Karimo, Life Camp, "
        "Jabi, Utako, Gwagwalada, Giri, Lugbe, Police Signboard, City Gate, Area 1, Mararaba, Orange Market, "
        "Nyanya, Kugbo, AYA Asokoro, Federal Secretariat. "
        "Common Hausa phrases: 'Ina <origin> zan je <dest>', 'Zan je <dest> daga <origin>', 'kujera daya/biyu'. "
        "Common Pidgin phrases: 'Abeg I dey <origin>, two seats go <dest>', 'drop me for <dest>'. "
        f"Active user locale hint: {locale_hint or 'auto'}. "
        "Reconstruct the exact intended utterance with corrected Abuja landmark names and Hausa/Pidgin spelling. "
        'Respond with valid JSON only: {"corrected_transcript": "<clean text>", "detected_locale": "en|pcm|ha"}'
    )

    try:
        res = await client.complete_json(
            system_prompt=sys_prompt,
            user_message=f"Raw ASR transcript: {raw_transcript}\nDeterministic pre-pass: {deterministic_clean}",
            temperature=0.0,
            max_tokens=200,
            timeout_sec=5.0,
            validate=lambda d: str(d["corrected_transcript"]).strip(),
        )
        if res.parsed_json and res.parsed_json.get("corrected_transcript"):
            reconstructed = normalize_abuja_asr_transcript(
                str(res.parsed_json["corrected_transcript"]),
                locale_hint=locale_hint,
            )
            if reconstructed:
                return reconstructed, res.model_used
    except Exception as exc:
        logger.warning("meta_llm_asr_reconstruction_fallback", error=str(exc))

    return deterministic_clean, None
