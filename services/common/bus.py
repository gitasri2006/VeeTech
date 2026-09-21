"""
Discovery Message Bus Interface
Compliant with TRD Section 3 (Redis Streams) and TRD Section 4 (Event topics)
"""
import asyncio
import json
import logging
from typing import Any, Callable, Dict, List, Optional
import os

logger = logging.getLogger("discovery.bus")


class MessageBus:
    """
    Unified Message Bus supporting Redis Streams when available,
    with an asynchronous in-memory broker for isolated test harnesses and local mock workflows.
    """

    def __init__(self, redis_url: Optional[str] = None):
        self.redis_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379/0")
        self._redis = None
        self._in_memory_topics: Dict[str, List[Dict[str, Any]]] = {}
        self._subscribers: Dict[str, List[Callable]] = {}
        self._use_redis = False

    async def connect(self):
        try:
            import redis.asyncio as aioredis
            client = aioredis.from_url(self.redis_url, decode_responses=True)
            await client.ping()
            self._redis = client
            self._use_redis = True
            logger.info("Connected to Redis Streams at %s", self.redis_url)
        except Exception as e:
            logger.warning("Redis not available (%s); operating in in-memory event bus mode.", e)
            self._use_redis = False

    async def publish(self, topic: str, message: Dict[str, Any]) -> str:
        """Publish a message payload to a Redis Streams topic or in-memory queue."""
        if self._use_redis and self._redis:
            try:
                msg_id = await self._redis.xadd(topic, {"data": json.dumps(message, default=str)})
                return msg_id
            except Exception as e:
                logger.error("Error publishing to Redis (%s), falling back to memory", e)

        # In-memory storage & subscriber notification
        if topic not in self._in_memory_topics:
            self._in_memory_topics[topic] = []
        self._in_memory_topics[topic].append(message)

        if topic in self._subscribers:
            for handler in self._subscribers[topic]:
                try:
                    if asyncio.iscoroutinefunction(handler):
                        asyncio.create_task(handler(message))
                    else:
                        handler(message)
                except Exception as ex:
                    logger.error("Error invoking subscriber for %s: %s", topic, ex)

        return f"mem-{len(self._in_memory_topics[topic])}"

    async def subscribe(self, topic: str, handler: Callable):
        """Register a subscriber callback for a topic."""
        if topic not in self._subscribers:
            self._subscribers[topic] = []
        self._subscribers[topic].append(handler)

    def get_messages(self, topic: str) -> List[Dict[str, Any]]:
        """Retrieve in-memory message history for a topic (used for test assertions)."""
        return self._in_memory_topics.get(topic, [])

    def clear(self):
        """Clear message queues."""
        self._in_memory_topics.clear()


# Global default bus singleton
bus = MessageBus()
