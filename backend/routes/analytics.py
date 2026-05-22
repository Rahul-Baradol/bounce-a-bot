from repos.collections import model_metadata_collection
from repos.collections import conversation_metadata_collection
from repos.collections import user_metadata_collection
from repos.collections import global_metadata_collection
from fastapi import APIRouter

router = APIRouter()

@router.get("/analytics")
async def get_analytics():
    global_data = global_metadata_collection.find_one(
        {"_id": "global"},
        {"_id": 0},
    )

    users = list(
        user_metadata_collection.find(
            {},
            {"_id": 0},
        )
    )

    conversations = list(
        conversation_metadata_collection.find(
            {},
            {"_id": 0},
        )
    )

    models = list(
        model_metadata_collection.find(
            {},
            {"_id": 0},
        )
    )

    # derive averages safely
    for user in users:
        total_messages = user.get("total_messages", 0)
        total_latency = user.get("total_latency_ms", 0)

        user["average_latency_ms"] = (
            total_latency / total_messages
            if total_messages > 0
            else 0
        )

    for conversation in conversations:
        message_count = conversation.get("message_count", 0)
        total_latency = conversation.get("total_latency_ms", 0)

        conversation["average_latency_ms"] = (
            total_latency / message_count
            if message_count > 0
            else 0
        )

    for model in models:
        total_requests = model.get("total_requests", 0)
        total_latency = model.get("total_latency_ms", 0)

        model["average_latency_ms"] = (
            total_latency / total_requests
            if total_requests > 0
            else 0
        )

    if global_data:
        total_requests = global_data.get("total_requests", 0)
        total_latency = global_data.get("total_latency_ms", 0)

        global_data["average_latency_ms"] = (
            total_latency / total_requests
            if total_requests > 0
            else 0
        )

    return {
        "global": global_data,
        "users": users,
        "conversations": conversations,
        "models": models,
    }