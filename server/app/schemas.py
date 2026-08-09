from pydantic import BaseModel, Field
from datetime import datetime

class FallEvent(BaseModel):
    device_id: str = Field(..., alias="deviceId")
    confidence: float
    detected_at: datetime = Field(..., alias="detectedAt")

    class Config:
        populate_by_name = True