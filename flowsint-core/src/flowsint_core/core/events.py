from typing import Dict, Set
import uuid
from fastapi import FastAPI
import json
import asyncio
from uuid import UUID
import redis.asyncio as redis
import os


class EventEmitter:
    def __init__(self):
        self.id = uuid.uuid4()
        self.redis = redis.from_url(os.environ["REDIS_URL"])
        self.pubsubs: Dict[str, redis.client.PubSub] = {}

    async def subscribe(self, channel: str):
        """Subscribe to Redis channel"""
        if channel not in self.pubsubs:
            pubsub = self.redis.pubsub()
            await pubsub.subscribe(channel)
            self.pubsubs[channel] = pubsub

    async def unsubscribe(self, channel: str):
        """Unsubscribe from Redis channel"""
        if channel in self.pubsubs:
            await self.pubsubs[channel].unsubscribe(channel)
            await self.pubsubs[channel].close()
            del self.pubsubs[channel]

    async def get_message(self, channel: str = None):
        """Get the next message from Redis for a specific channel"""
        if channel not in self.pubsubs:
            return None

        message = await self.pubsubs[channel].get_message(
            ignore_subscribe_messages=True
        )
        if message is None:
            await asyncio.sleep(0.1)
            return None

        if message:
            data = message["data"]
            if isinstance(data, bytes):
                decoded = data.decode("utf-8")
                return decoded
            return str(data)
        return None

    async def emit(self, channel: str, data: any):
        """Emit an event to a Redis channel"""
        await self.redis.publish(channel, json.dumps(data))

    def _is_valid_uuid(self, uuid_str: str) -> bool:
        """Validate if the string is a valid UUID"""
        try:
            UUID(uuid_str)
            return True
        except ValueError:
            return False


event_emitter = EventEmitter()


def init_events(app: FastAPI):
    """Initialize the event system in the FastAPI app"""
    print("[EventEmitter] Events initialized in FastAPI app")
