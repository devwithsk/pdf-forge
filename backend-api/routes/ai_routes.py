from fastapi import APIRouter, Depends
from pydantic import BaseModel
from database.db_interface import DatabaseService
from dependencies import get_db_service

# Define the APIRouter for AI tools
ai_router = APIRouter(prefix="/api/ai", tags=["AI Tools"])

class ChatRequest(BaseModel):
    prompt: str
    email: str  # Basic string validation for email


@ai_router.post("/chat")
async def chat(request: ChatRequest, db: DatabaseService = Depends(get_db_service)):
    """
    Dummy chat endpoint that utilizes dependency injection to retrieve
    user information from the DatabaseService.
    """
    # Retrieve user by email to verify dependency injection works
    user_info = db.get_user_by_email(request.email)
    
    return {
        "success": True,
        "message": "AI features initialized successfully. Connection with database service verified.",
        "received_prompt": request.prompt,
        "retrieved_user": user_info
    }
