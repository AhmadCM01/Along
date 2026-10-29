"""Pytest fixtures including a full-featured in-memory async Redis server supporting ZSET, HASH, SET, LIST, STRING, and GEO."""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

import pytest

_BACKEND_ROOT = str(Path(__file__).resolve().parents[1])
_REPO_ROOT = str(Path(__file__).resolve().parents[2])
if _BACKEND_ROOT not in sys.path:
    sys.path.insert(0, _BACKEND_ROOT)
if _REPO_ROOT not in sys.path:
    sys.path.insert(0, _REPO_ROOT)

from app.matching.corridor import haversine_distance_m


class InMemoryAsyncRedis:
    """Deterministic async Redis emulator supporting ZSET, HASH, SET, LIST, STRING, and GEO commands."""

    def __init__(self) -> None:
        self._strings: dict[str, str] = {}
        self._hashes: dict[str, dict[str, str]] = {}
        self._zsets: dict[str, dict[str, float]] = {}
        self._sets: dict[str, set[str]] = {}
        self._lists: dict[str, list[str]] = {}
        self._geo: dict[str, dict[str, tuple[float, float]]] = {}
        self._streams: dict[str, list[tuple[str, dict[str, str]]]] = {}
        self._stream_seq: int = 0

    async def get(self, key: str) -> str | None:
        return self._strings.get(key)

    async def set(
        self,
        key: str,
        value: str,
        nx: bool = False,
        ex: int | None = None,
        px: int | None = None,
    ) -> bool:
        _ = (ex, px)
        if nx and key in self._strings:
            return False
        self._strings[key] = str(value)
        return True

    async def delete(self, *keys: str) -> int:
        deleted = 0
        for k in keys:
            if k in self._strings:
                del self._strings[k]
                deleted += 1
            if k in self._hashes:
                del self._hashes[k]
                deleted += 1
            if k in self._zsets:
                del self._zsets[k]
                deleted += 1
            if k in self._sets:
                del self._sets[k]
                deleted += 1
            if k in self._lists:
                del self._lists[k]
                deleted += 1
        return deleted

    async def expire(self, key: str, seconds: int) -> bool:
        _ = (key, seconds)
        return True

    async def pexpire(self, key: str, ms: int) -> bool:
        _ = (key, ms)
        return True

    async def hset(
        self,
        key: str,
        key_field: str | None = None,
        value: str | None = None,
        mapping: dict[str, Any] | None = None,
    ) -> int:
        bucket = self._hashes.setdefault(key, {})
        count = 0
        if key_field is not None and value is not None:
            bucket[str(key_field)] = str(value)
            count += 1
        if mapping:
            for f_k, f_v in mapping.items():
                bucket[str(f_k)] = str(f_v)
                count += 1
        return count

    async def hget(self, key: str, field: str) -> str | None:
        return self._hashes.get(key, {}).get(field)

    async def hgetall(self, key: str) -> dict[str, str]:
        return dict(self._hashes.get(key, {}))

    async def zadd(self, key: str, mapping: dict[str, float | int]) -> int:
        zset = self._zsets.setdefault(key, {})
        added = 0
        for member, score in mapping.items():
            if member not in zset:
                added += 1
            zset[str(member)] = float(score)
        return added

    async def zcard(self, key: str) -> int:
        return len(self._zsets.get(key, {}))

    async def zrange(self, key: str, start: int, stop: int) -> list[str]:
        zset = self._zsets.get(key, {})
        ordered = [m for m, _s in sorted(zset.items(), key=lambda item: (item[1], item[0]))]
        if stop < 0:
            stop = len(ordered) + stop
        return ordered[start : stop + 1]

    async def zrangebyscore(
        self,
        key: str,
        min_score: float | int | str,
        max_score: float | int | str,
        start: int = 0,
        num: int | None = None,
    ) -> list[str]:
        lo = float("-inf") if min_score == "-inf" else float(min_score)
        hi = float("inf") if max_score == "+inf" else float(max_score)
        zset = self._zsets.get(key, {})
        matched = [
            m
            for m, s in sorted(zset.items(), key=lambda item: (item[1], item[0]))
            if lo <= s <= hi
        ]
        if num is not None:
            return matched[start : start + num]
        return matched[start:]

    async def zrem(self, key: str, *members: str) -> int:
        zset = self._zsets.get(key, {})
        removed = 0
        for m in members:
            if m in zset:
                del zset[m]
                removed += 1
        return removed

    async def zremrangebyscore(
        self,
        key: str,
        min_score: float | int | str,
        max_score: float | int | str,
    ) -> int:
        to_remove = await self.zrangebyscore(key, min_score, max_score)
        return await self.zrem(key, *to_remove)

    async def sadd(self, key: str, *members: str) -> int:
        s = self._sets.setdefault(key, set())
        before = len(s)
        for m in members:
            s.add(str(m))
        return len(s) - before

    async def sismember(self, key: str, member: str) -> bool:
        return str(member) in self._sets.get(key, set())

    async def rpush(self, key: str, *values: str) -> int:
        lst = self._lists.setdefault(key, [])
        for v in values:
            lst.append(str(v))
        return len(lst)

    async def lpop(self, key: str) -> str | None:
        lst = self._lists.get(key, [])
        if not lst:
            return None
        return lst.pop(0)

    async def lrem(self, key: str, count: int, value: str) -> int:
        _ = count
        lst = self._lists.get(key, [])
        before = len(lst)
        self._lists[key] = [item for item in lst if item != str(value)]
        return before - len(self._lists[key])

    async def geoadd(self, key: str, values: tuple[float, float, str] | list[Any]) -> int:
        geo_bucket = self._geo.setdefault(key, {})
        lng, lat, member = float(values[0]), float(values[1]), str(values[2])
        is_new = member not in geo_bucket
        geo_bucket[member] = (lng, lat)
        return 1 if is_new else 0

    async def geosearch(
        self,
        key: str,
        longitude: float,
        latitude: float,
        radius: float,
        unit: str = "m",
        sort: str = "ASC",
        count: int = 3,
    ) -> list[tuple[str, float, tuple[float, float]]]:
        factor = 1000.0 if unit == "km" else 1.0
        max_dist_m = radius * factor
        geo_bucket = self._geo.get(key, {})
        hits: list[tuple[str, float, tuple[float, float]]] = []
        for member, (lng, lat) in geo_bucket.items():
            dist_m = haversine_distance_m(latitude, longitude, lat, lng)
            if dist_m <= max_dist_m:
                hits.append((member, dist_m, (lng, lat)))
        hits.sort(key=lambda item: item[1], reverse=(sort.upper() == "DESC"))
        return hits[:count]

    async def xadd(
        self,
        stream_key: str,
        fields: dict[str, str],
        maxlen: int | None = None,
        approximate: bool = True,
    ) -> str:
        _ = (maxlen, approximate)
        self._stream_seq += 1
        entry_id = f"{self._stream_seq}-0"
        stream = self._streams.setdefault(stream_key, [])
        stream.append((entry_id, dict(fields)))
        return entry_id

    async def xack(self, stream_key: str, group_name: str, entry_id: str) -> int:
        _ = (stream_key, group_name, entry_id)
        return 1


@pytest.fixture
def fake_redis() -> InMemoryAsyncRedis:
    """Provide a fresh isolated in-memory async Redis instance per test."""
    return InMemoryAsyncRedis()
