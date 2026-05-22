from fastapi import HTTPException
from repos.conversation import conversations_collection
from constants import AVAILABLE_MODELS
from fastapi import APIRouter

router = APIRouter()

@router.get("/models")
async def list_models():
    return list(AVAILABLE_MODELS.values())

@router.get("/list-conversations/{temp_user_id}")
async def list_conversations(temp_user_id: str):
    conversations = []

    docs = conversations_collection.find({
        "temp_user_id": temp_user_id
    })

    for conversation in docs:
        conversations.append({
            "id": conversation["id"],
            "title": conversation["title"]
        })

    return conversations


@router.get("/conversation/{conversation_id}")
async def get_conversation(conversation_id: str):
    conversation = conversations_collection.find_one({
        "id": conversation_id
    })

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    return conversation["messages"]
