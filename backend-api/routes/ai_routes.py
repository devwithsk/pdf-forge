import os
import shutil
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from database.db_interface import DatabaseService
from dependencies import get_db_service
from services.ai import extract_and_chunk_pdf, store_document_chunks, retrieve_relevant_context, generate_rag_prompt, generate_answer

# Define the APIRouter for AI tools
ai_router = APIRouter(tags=["AI Tools"])

class ChatRequest(BaseModel):
    prompt: str
    email: str
    document_name: str = ""  # Document filter option


@ai_router.post("/upload")
async def upload_pdf_for_rag(
    email: str = Form(...),
    file: UploadFile = File(...),
    db: DatabaseService = Depends(get_db_service)
):
    """
    Uploads a PDF document, extracts and chunks its text, generates embeddings,
    and inserts the data into Supabase's vector database.
    """
    user_info = db.get_user_by_email(email)
    if not user_info:
        raise HTTPException(status_code=404, detail="User not found")
        
    user_id = user_info.get("id")
    
    # Temporary storage path for processing the uploaded PDF
    temp_dir = os.path.join(os.getcwd(), "temp_uploads")
    os.makedirs(temp_dir, exist_ok=True)
    temp_file_path = os.path.join(temp_dir, file.filename)
    
    try:
        # Save uploaded file chunk to temp file
        with open(temp_file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
            
        # Parse and chunk PDF
        chunks = extract_and_chunk_pdf(temp_file_path)
        if not chunks:
            raise HTTPException(status_code=400, detail="Could not extract any readable text from the PDF.")
        
        # Store embeddings in Supabase
        if hasattr(db, "client") and db.client:
            store_document_chunks(db.client, user_id, file.filename, chunks)
        else:
            raise HTTPException(status_code=500, detail="Database client is not initialized.")
            
        return {
            "success": True,
            "message": f"Successfully parsed and stored embeddings for '{file.filename}'.",
            "chunks_count": len(chunks)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Cleanup temp file
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)


@ai_router.post("/chat")
async def chat(request: ChatRequest, db: DatabaseService = Depends(get_db_service)):
    """
    Retrieves semantic matches for the user prompt and generates context-aware RAG prompt.
    """
    user_info = db.get_user_by_email(request.email)
    if not user_info:
        raise HTTPException(status_code=404, detail="User not found")
        
    user_id = user_info.get("id")
    
    if not hasattr(db, "client") or not db.client:
        raise HTTPException(status_code=500, detail="Database client is not initialized.")
        
    try:
        # Retrieve context from Supabase Vector Database
        context_docs = retrieve_relevant_context(
            supabase_client=db.client,
            user_id=user_id,
            query=request.prompt,
            document_name=request.document_name,
            match_count=4
        )
        
        # Optionally filter matching documents by document name
        if request.document_name:
            context_docs = [
                doc for doc in context_docs 
                if doc.metadata.get("document_name") == request.document_name
            ]
            
        # Generate complete prompt
        rag_prompt = generate_rag_prompt(request.prompt, context_docs)
        
        # Generate answer using Gemini LLM
        answer = generate_answer(request.prompt, context_docs)
        
        # Prepare context snippets
        snippets = [doc.page_content for doc in context_docs]
            
        return {
            "success": True,
            "answer": answer,
            "rag_prompt": rag_prompt,
            "retrieved_chunks": snippets
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
