from typing import Any, Dict, Optional
from enum import Enum
import os
from pydantic import BaseModel

EVENT_MODE = os.getenv("EVENT_MODE", "local")

class PromptRequest(BaseModel):
    model_id: str
    prompt: str
    temp_user_id: str
    conversation_id: Optional[str] = None

class EventType(str, Enum):
    CONVERSATION_CREATED = "conversation.created"
    MESSAGE_CREATED = "message.created"
    MESSAGE_COMPLETED = "message.completed"

class IngestEventRequest(BaseModel):
    event: EventType
    payload: Dict[str, Any]