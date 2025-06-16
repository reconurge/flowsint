from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import os
from mistralai import Mistral
from mistralai.models import UserMessage
import json

router = APIRouter()

class ChatRequest(BaseModel):
    prompt: str

@router.post("/stream")
async def stream_chat(request: ChatRequest):
    try:
        api_key = os.environ.get("MISTRAL_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="Mistral API key not configured")
        
        client = Mistral(api_key=api_key)
        model = "mistral-small-latest"

        async def generate():
            response = await client.chat.stream_async(
                model=model,
                messages=[
                    UserMessage(content=request.prompt)
                ]
            )
            
            async for chunk in response:
                if chunk.data.choices[0].delta.content is not None:
                    yield f"data: {json.dumps({'content': chunk.data.choices[0].delta.content})}\n\n"
            
            yield "data: [DONE]\n\n"

        return StreamingResponse(
            generate(),
            media_type="text/event-stream"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))