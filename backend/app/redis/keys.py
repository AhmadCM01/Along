"""Single source of truth for all Redis key patterns (§6.1 of MASTER_IMPLEMENTATION_PLAN.md).

Uses cluster-safe hash tags `{...}` so keys belonging to the same corridor/direction/anchor
pool co-locate in the same Redis hash slot for multi-key Lua scripts.
"""

from __future__ import annotations


def pool_hashtag(corridor_id: str, direction: str, anchor_id: str) -> str:
    """Return cluster hash tag `{corr:dir:anchor}`."""
    return f"{{{corridor_id}:{direction}:{anchor_id}}}"


def geo_anchors_key(corridor_id: str, direction: str) -> str:
    """GEO set of active anchors per corridor and direction."""
    return f"geo:anchors:{{{corridor_id}}}:{direction}"


def geo_drivers_key(corridor_id: str) -> str:
    """GEO set of live driver positions on a corridor."""
    return f"geo:drivers:{{{corridor_id}}}"


def driver_hash_key(driver_id: str) -> str:
    """HASH storing live driver status, location, corridor, and active pod."""
    return f"drv:{driver_id}"


def drivers_heartbeat_key() -> str:
    """ZSET of driver heartbeats (member=driver_id, score=last_seen_ms)."""
    return "drivers:heartbeat"


def anchor_driver_queue_key(corridor_id: str, direction: str, anchor_id: str) -> str:
    """FIFO LIST of drivers queued at a Virtual Anchor Point forecourt."""
    tag = pool_hashtag(corridor_id, direction, anchor_id)
    return f"anchorq:{tag}"


def rider_pool_key(corridor_id: str, direction: str, anchor_id: str) -> str:
    """ZSET of paid, queued ride requests at an anchor (score = priority-adjusted enqueue_ms)."""
    tag = pool_hashtag(corridor_id, direction, anchor_id)
    return f"pool:{tag}"


def ride_request_hash_key(
    corridor_id: str,
    direction: str,
    anchor_id: str,
    ride_request_id: str,
) -> str:
    """HASH mirror of a queued ride request co-located in the same hash slot as its pool."""
    tag = pool_hashtag(corridor_id, direction, anchor_id)
    return f"req:{tag}:{ride_request_id}"


def pod_hash_key(pod_id: str) -> str:
    """HASH mirror of an active pod."""
    return f"pod:{pod_id}"


def offer_key(pod_id: str) -> str:
    """STRING holding the driver_id currently offered a pod (with TTL)."""
    return f"offer:{pod_id}"


def offer_declined_set_key(pod_id: str) -> str:
    """SET of driver_ids who declined or timed out on a pod offer."""
    return f"offer:declined:{pod_id}"


def thread_lock_key(wa_id: str) -> str:
    """Per-conversation serialization lock key."""
    return f"lock:thread:{wa_id}"


def pod_lock_key(pod_id: str) -> str:
    """Per-pod state transition lock key."""
    return f"lock:pod:{pod_id}"


def scheduler_lock_key() -> str:
    """Leader election lock key for the background scheduler."""
    return "lock:scheduler"


def idem_whatsapp_key(wamid: str) -> str:
    """Idempotency key for WhatsApp inbound message delivery."""
    return f"idem:wa:{wamid}"


def idem_paystack_key(event_key: str) -> str:
    """Idempotency key for Paystack webhook event."""
    return f"idem:ps:{event_key}"


def idem_outbox_key(msg_key: str) -> str:
    """Idempotency key for outbound WhatsApp message send."""
    return f"idem:out:{msg_key}"


def rate_limit_wa_key(wa_id: str) -> str:
    """Sliding-window ZSET rate limit key for a WhatsApp user."""
    return f"rl:wa:{wa_id}"


def rate_limit_llm_global_key() -> str:
    """Global LLM token bucket counter key."""
    return "rl:llm:global"


def rate_limit_otp_key(ride_request_id: str) -> str:
    """OTP verification attempt counter key."""
    return f"rl:otp:{ride_request_id}"


def stream_inbound_key() -> str:
    return "stream:inbound"


def stream_payments_key() -> str:
    return "stream:payments"


def stream_dispatch_key() -> str:
    return "stream:dispatch"


def stream_outbox_key() -> str:
    return "stream:outbox"


def stream_dlq_key() -> str:
    return "stream:dlq"


def delayed_jobs_key() -> str:
    """ZSET of scheduled delayed jobs (score = due_ms)."""
    return "jobs:delayed"


def pubsub_ops_channel() -> str:
    return "ev:ops"


def pubsub_driver_channel(driver_id: str) -> str:
    return f"ev:driver:{driver_id}"


def pubsub_emulator_channel(wa_id: str = "all") -> str:
    return f"ev:emu:{wa_id}"


def faiss_version_key() -> str:
    return "faiss:version"


def pool_wait_metrics_key(corridor_id: str, direction: str, anchor_id: str) -> str:
    tag = pool_hashtag(corridor_id, direction, anchor_id)
    return f"metrics:pool_wait:{tag}"


def wa_session_key(wa_id_hash: str) -> str:
    """Serialized ConversationSessionState key for a WhatsApp user."""
    return f"along:v1:session:wa:{wa_id_hash}"


class RedisKeys:
    """Namespace wrapper exposing all Redis key builders."""

    wa_session = staticmethod(wa_session_key)
    wa_msg_dedup = staticmethod(idem_whatsapp_key)
    paystack_dedup = staticmethod(idem_paystack_key)
    thread_lock = staticmethod(thread_lock_key)
    rider_pool = staticmethod(rider_pool_key)
    ride_request_hash = staticmethod(ride_request_hash_key)
    pod_hash = staticmethod(pod_hash_key)
    offer = staticmethod(offer_key)
    offer_declined_set = staticmethod(offer_declined_set_key)

