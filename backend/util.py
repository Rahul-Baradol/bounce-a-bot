from repos.collections import global_metadata_collection
from repos.collections import model_metadata_collection
from repos.collections import conversation_metadata_collection
from repos.collections import user_metadata_collection
from datetime import datetime
from repos.collections import logs_collection
from my_types import EVENT_MODE
import asyncio
import random

async def generate_llm_stream(model_id: str, prompt: str):
    model_responses = {
        "gpt-4.1": [
            f"Analyzing your prompt '{prompt}' with structured reasoning. ",
            "This response is optimized for coding and accuracy. ",
            "GPT style systems are usually concise and analytical. "
        ],
        "claude-sonnet": [
            f"That's a thoughtful question about '{prompt}'. ",
            "Let me break this down in a more conversational way. ",
            "Claude style responses are usually warm and detailed. "
        ],
        "gemini-pro": [
            f"Processing multimodal style reasoning for '{prompt}'. ",
            "Gemini style systems often focus on broad context understanding. ",
            "This is a simulated Gemini response stream. "
        ]
    }

    selected = random.choice(
        model_responses.get(
            model_id,
            ["Unknown model generated this response. "]
        )
    )

    words = selected.split(" ")

    for word in words:
        await asyncio.sleep(0.08)
        yield word + " "

async def push_event_log(event: dict):
    print(
        f"[event] type={event['event']} "
        f"conversation={event['payload'].get('conversation_id')} "
        f"user={event['payload'].get('temp_user_id')}"
    )

    if EVENT_MODE in ["mongo", "hybrid"]:
        logs_collection.insert_one(event)

    if EVENT_MODE in ["sqs", "hybrid"]:
        # TODO:
        # await sqs_client.send_message(...)
        pass

    await process_event_metadata(event)

async def process_event_metadata(event: dict):
    event_type = event.get("event")
    payload = event.get("payload", {})

    now = datetime.utcnow()

    # -----------------------------
    # USER IDENTIFIED
    # -----------------------------
    if event_type == "user.identified":
        temp_user_id = payload.get("temp_user_id")

        if not temp_user_id:
            return

        user_metadata_collection.update_one(
            {"temp_user_id": temp_user_id},
            {
                "$setOnInsert": {
                    "temp_user_id": temp_user_id,
                    "created_at": now,
                    "total_messages": 0,
                    "successful_requests": 0,
                    "failed_requests": 0,
                    "total_tokens": 0,
                    "total_latency_ms": 0,
                    "models_used": [],
                },
                "$set": {
                    "last_active_at": now,
                },
            },
            upsert=True,
        )

        return

    # -----------------------------
    # MESSAGE COMPLETED
    # -----------------------------
    if event_type != "message.completed":
        return

    model = payload.get("model")
    status = payload.get("status")

    conversation_id = payload.get("conversation_id")
    latency_ms = payload.get("latency_ms", 0)

    token_usage = payload.get("token_usage") or {}
    total_tokens = (
        token_usage.get("total_tokens")
        or token_usage.get("total")
        or 0
    )

    timestamps = payload.get("timestamps", {})

    started_at = timestamps.get("started")
    completed_at = timestamps.get("completed")

    temp_user_id = payload.get("temp_user_id")

    # -----------------------------
    # USER METADATA
    # -----------------------------
    if temp_user_id:
        user_metadata_collection.update_one(
            {"temp_user_id": temp_user_id},
            {
                "$inc": {
                    "total_messages": 1,
                    "successful_requests": 1 if status == "success" else 0,
                    "failed_requests": 1 if status == "error" else 0,
                    "total_tokens": total_tokens,
                    "total_latency_ms": latency_ms,
                },
                "$set": {
                    "last_active_at": now,
                },
                "$addToSet": {
                    "models_used": model,
                },
                "$setOnInsert": {
                    "created_at": now,
                },
            },
            upsert=True,
        )

    # -----------------------------
    # CONVERSATION METADATA
    # -----------------------------
    if conversation_id:
        conversation_metadata_collection.update_one(
            {"conversation_id": conversation_id},
            {
                "$inc": {
                    "message_count": 1,
                    "total_tokens": total_tokens,
                    "total_latency_ms": latency_ms,
                },
                "$set": {
                    "last_message_at": now,
                },
                "$addToSet": {
                    "models_used": model,
                    "participants": temp_user_id,
                },
                "$setOnInsert": {
                    "conversation_id": conversation_id,
                    "started_at": now,
                },
            },
            upsert=True,
        )

    # -----------------------------
    # MODEL METADATA
    # -----------------------------
    if model:
        model_metadata_collection.update_one(
            {"model": model},
            {
                "$inc": {
                    "total_requests": 1,
                    "success_count": 1 if status == "success" else 0,
                    "failure_count": 1 if status == "error" else 0,
                    "total_tokens": total_tokens,
                    "total_latency_ms": latency_ms,
                },
                "$set": {
                    "last_used_at": now,
                },
                "$setOnInsert": {
                    "model": model,
                    "created_at": now,
                },
            },
            upsert=True,
        )

    # -----------------------------
    # GLOBAL METADATA
    # -----------------------------
    global_metadata_collection.update_one(
        {"_id": "global"},
        {
            "$inc": {
                "total_requests": 1,
                "successful_requests": 1 if status == "success" else 0,
                "failed_requests": 1 if status == "error" else 0,
                "total_tokens": total_tokens,
                "total_latency_ms": latency_ms,
            },
            "$set": {
                "last_event_at": now,
            },
            "$setOnInsert": {
                "created_at": now,
            },
        },
        upsert=True,
    )