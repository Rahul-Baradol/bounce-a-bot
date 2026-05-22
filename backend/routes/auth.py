from uuid import uuid4
from fastapi import APIRouter

router = APIRouter()

@router.post("/identify")
async def identify():
    temp_user_id = f"tmp_{uuid4().hex}"

    return {
        "temp_user_id": temp_user_id
    }