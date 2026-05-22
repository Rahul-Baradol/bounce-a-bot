from my_types import EventType
from util import push_event_log
from my_types import PromptRequest
from fastapi.responses import StreamingResponse
from util import generate_llm_stream
import json
from repos.collections import conversations_collection
from uuid import uuid4
from fastapi import HTTPException
from constants import AVAILABLE_MODELS
from fastapi import APIRouter

router = APIRouter()

@router.post("/prompt")
async def prompt(req: PromptRequest):
    if req.model_id not in AVAILABLE_MODELS:
        raise HTTPException(status_code=400, detail="Invalid model_id")

    conversation_id = req.conversation_id

    if not conversation_id:
        conversation_id = f"conv_{uuid4().hex}"

        conversation_doc = {
            "id": conversation_id,
            "temp_user_id": req.temp_user_id,
            "title": req.prompt[:40],
            "messages": []
        }

        conversations_collection.insert_one(conversation_doc)

    conversation = conversations_collection.find_one({
        "id": conversation_id
    })

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    user_message = {
        "recipient": "user",
        "message": req.prompt
    }

    conversations_collection.update_one(
        {"id": conversation_id},
        {
            "$push": {
                "messages": user_message
            }
        }
    )

    async def event_stream():
        yield (
            f"event: conversation.created\n"
            f"data: {json.dumps({'conversation_id': conversation_id})}\n\n"
        )

        collected_response = ""

        async for chunk in generate_llm_stream(req.model_id, req.prompt):
            collected_response += chunk

            yield (
                f"event: message.delta\n"
                f"data: {json.dumps({'token': chunk})}\n\n"
            )

        # Store assistant message
        assistant_message = {
            "recipient": "bot",
            "message": collected_response.strip()
        }

        conversations_collection.update_one(
            {"id": conversation_id},
            {
                "$push": {
                    "messages": assistant_message
                }
            }
        )

        yield (
            f"event: message.completed\n"
            f"data: {json.dumps({'done': True})}\n\n"
        )

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream"
    )