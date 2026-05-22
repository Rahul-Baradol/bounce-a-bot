from my_types import IngestEventRequest
from util import push_event_log
from datetime import datetime
from fastapi import APIRouter

router = APIRouter()

@router.post("/ingest")
async def ingest(req: IngestEventRequest):
    event = {
        "event": req.event,
        "timestamp": datetime.utcnow().isoformat(),
        "payload": req.payload
    }

    await push_event_log(event)

    return {
        "success": True
    }