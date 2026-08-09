import httpx
from app.config import FRONTEND_INGEST_URL, INGEST_SECRET

async def forward_fall_event(device_id: str, confidence: float, detected_at: str):
    async with httpx.AsyncClient(timeout=5.0) as client:
        response = await client.post(
            FRONTEND_INGEST_URL,
            json={
                "deviceId": device_id,
                "confidence": confidence,
                "detectedAt": detected_at,
                "eventType": "fall",
            },
            headers={"Authorization": f"Bearer {INGEST_SECRET}"},
        )
        response.raise_for_status()
        return response.json()