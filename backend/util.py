from my_types import EventType
from my_types import EVENT_MODE
from repos.conversation import conversations_collection
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

    if EVENT_MODE in ["local", "hybrid"]:
        event_type = event["event"]
        payload = event["payload"]

        if event_type == EventType.CONVERSATION_CREATED:
            conversations_collection.insert_one({
                "id": payload["conversation_id"],
                "temp_user_id": payload["temp_user_id"],
                "title": payload["title"],
                "messages": []
            })

        elif event_type == EventType.MESSAGE_CREATED:
            conversations_collection.update_one(
                {"id": payload["conversation_id"]},
                {
                    "$push": {
                        "messages": {
                            "recipient": payload["recipient"],
                            "message": payload["message"]
                        }
                    }
                }
            )

        elif event_type == EventType.MESSAGE_COMPLETED:
            conversations_collection.update_one(
                {"id": payload["conversation_id"]},
                {
                    "$push": {
                        "messages": {
                            "recipient": "bot",
                            "message": payload["message"]
                        }
                    }
                }
            )

    if EVENT_MODE in ["sqs", "hybrid"]:
        # TODO:
        # await sqs_client.send_message(...)
        pass