from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, List
from uuid import uuid4
from pymongo import MongoClient
from dotenv import load_dotenv
import os
import asyncio
import json
import random

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME")

if not MONGO_URI:
    raise RuntimeError("MONGO_URI missing in .env")

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
conversations_collection = db["conversations"]

app = FastAPI(title="Mock LLM Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # replace with frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------------
# Available Models
# ------------------------------------------------------------------

AVAILABLE_MODELS = {
    "gpt-4.1": {
        "id": "gpt-4.1",
        "name": "GPT 4.1",
        "provider": "openai"
    },
    "claude-sonnet": {
        "id": "claude-sonnet",
        "name": "Claude Sonnet",
        "provider": "anthropic"
    },
    "gemini-pro": {
        "id": "gemini-pro",
        "name": "Gemini Pro",
        "provider": "google"
    }
}


# ------------------------------------------------------------------
# Models
# ------------------------------------------------------------------

class PromptRequest(BaseModel):
    model_id: str
    prompt: str
    temp_user_id: str
    conversation_id: Optional[str] = None


# ------------------------------------------------------------------
# Mock LLM
# ------------------------------------------------------------------

async def generate_llm_stream(model_id: str, prompt: str):
    """
    Abstract mock LLM streaming generator.

    Replace this later with:
    - OpenAI
    - Anthropic
    - Gemini
    - Local model
    - vLLM
    - Ollama
    etc.
    """

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


# ------------------------------------------------------------------
# Routes
# ------------------------------------------------------------------

@app.get("/")
async def root():
    return {
        "status": "ok",
        "service": "mock-llm-backend"
    }


@app.post("/identify")
async def identify():
    temp_user_id = f"tmp_{uuid4().hex}"

    return {
        "temp_user_id": temp_user_id
    }


@app.get("/models")
async def list_models():
    return list(AVAILABLE_MODELS.values())


@app.get("/list-conversations/{temp_user_id}")
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


@app.get("/conversation/{conversation_id}")
async def get_conversation(conversation_id: str):
    conversation = conversations_collection.find_one({
        "id": conversation_id
    })

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    return conversation["messages"]


@app.post("/prompt")
async def prompt(req: PromptRequest):
    if req.model_id not in AVAILABLE_MODELS:
        raise HTTPException(status_code=400, detail="Invalid model_id")

    conversation_id = req.conversation_id

    # Create conversation if missing
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

    # Store user message
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
        # Send conversation ID immediately
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


# ------------------------------------------------------------------
# Local dev entrypoint
# ------------------------------------------------------------------

# Run with:
# uvicorn main:app --reload
