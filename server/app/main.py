from fastapi import FastAPI, HTTPException
from app.schemas import FallEvent
from app.frontend_client import forward_fall_event
import httpx

app = FastAPI(title="FallDetect Ingest Server")

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/events/fall")
async def receive_fall_event(event: FallEvent):
    """
    Called by the detection model when a fall is identified.
    Forwards to the Next.js /api/monitor/ingest route.
    """
    try:
        result = await forward_fall_event(
            device_id=event.device_id,
            confidence=event.confidence,
            detected_at=event.detected_at.isoformat(),
        )
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
    except httpx.RequestError:
        raise HTTPException(status_code=502, detail="Could not reach frontend ingest endpoint")

    return result