import os
import json
import numpy as np
from typing import List
from langchain_core.documents import Document
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from .embedding import get_embedding_model

def store_document_chunks(supabase_client, user_id: str, document_name: str, chunks: List[str]):
    """
    Generates embeddings for each text chunk and inserts them into the document_embeddings table.
    """
    if not chunks:
        return
        
    # Get embedding model
    embedding_model = get_embedding_model()
    
    # Generate embeddings
    embeddings = embedding_model.embed_documents(chunks)
    
    # Prepare records for insertion
    records = []
    for idx, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        records.append({
            "user_id": user_id,
            "document_name": document_name,
            "content": chunk,
            "embedding": embedding
        })
        
    # Insert in batches of 100 to avoid request size limits
    batch_size = 100
    for i in range(0, len(records), batch_size):
        batch = records[i:i+batch_size]
        supabase_client.table("document_embeddings").insert(batch).execute()

def retrieve_relevant_context(
    supabase_client, 
    user_id: str, 
    query: str, 
    document_name: str = "", 
    match_count: int = 4
) -> List[Document]:
    """
    Retrieves the most semantically relevant text chunks for a query by fetching
    chunks from public.document_embeddings and calculating cosine similarity in Python.
    """
    try:
        # Fetch document embeddings for this user
        query_builder = supabase_client.table("document_embeddings") \
            .select("content, embedding, document_name") \
            .eq("user_id", user_id)
            
        if document_name:
            query_builder = query_builder.eq("document_name", document_name)
            
        response = query_builder.execute()
    except Exception as e:
        print(f"Error fetching from document_embeddings: {e}")
        return []
        
    records = response.data
    if not records:
        return []
        
    # Embed the query
    embedding_model = get_embedding_model()
    query_vector = np.array(embedding_model.embed_query(query), dtype=float)
    
    # Calculate cosine similarity for each record
    scored_docs = []
    for record in records:
        content = record.get("content")
        doc_name = record.get("document_name")
        emb_list = record.get("embedding")
        
        if not content or not emb_list:
            continue
            
        if isinstance(emb_list, str):
            try:
                emb_list = json.loads(emb_list)
            except (ValueError, TypeError):
                continue
                
        try:
            emb_vector = np.array(emb_list, dtype=float)
        except (ValueError, TypeError):
            continue
        
        # Compute cosine similarity: (A . B) / (||A|| * ||B||)
        dot_product = np.dot(query_vector, emb_vector)
        query_norm = np.linalg.norm(query_vector)
        emb_norm = np.linalg.norm(emb_vector)
        
        if query_norm > 0 and emb_norm > 0:
            similarity = dot_product / (query_norm * emb_norm)
        else:
            similarity = 0.0
            
        # Create langchain Document object
        doc = Document(
            page_content=content,
            metadata={"document_name": doc_name, "score": float(similarity)}
        )
        scored_docs.append((doc, similarity))
        
    # Sort by similarity descending
    scored_docs.sort(key=lambda x: x[1], reverse=True)
    
    # Extract the Document objects for top match_count
    results = [doc for doc, score in scored_docs[:match_count]]
    return results

def generate_rag_prompt(query: str, context_docs: List[Document]) -> str:
    """
    Formats the retrieved document context and the user query into a prompt for the LLM.
    """
    context_text = "\n\n".join([
        f"--- Document Chunk ({doc.metadata.get('document_name', 'Unknown')}) ---\n{doc.page_content}"
        for doc in context_docs
    ])
    
    prompt = f"""You are a helpful AI assistant. Answer the user's question based strictly on the provided document context below.
If the context does not contain the answer, say "I cannot find the answer in the provided documents." Do not try to make up an answer.

--- Context ---
{context_text}

--- Question ---
{query}

Answer:"""
    return prompt

def generate_answer(query: str, context_docs: List[Document]) -> str:
    """
    Given a query and retrieved documents, formats them into a prompt template,
    invokes Gemini LLM, and returns the generated answer.
    """
    google_api_key = os.getenv("GOOGLE_API_KEY")
    if not google_api_key:
        return "System Error: GOOGLE_API_KEY is missing from the environment variables."
        
    try:
        llm = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            google_api_key=google_api_key,
            temperature=0.2
        )
        
        # Prepare context text
        context_text = "\n\n".join([
            f"--- Document Chunk ---\n{doc.page_content}"
            for doc in context_docs
        ])
        
        prompt_template = """You are a helpful assistant specialized in answering questions about uploaded PDF documents.
Use the following pieces of retrieved context to answer the question.
If the answer cannot be found in the context, say "I cannot find the answer in the provided documents." Do not make up answers.

--- Context ---
{context}

--- Question ---
{question}

Answer:"""
        
        prompt = PromptTemplate.from_template(prompt_template)
        chain = prompt | llm
        
        response = chain.invoke({
            "context": context_text if context_text else "No relevant context found.",
            "question": query
        })
        
        return response.content
    except Exception as e:
        return f"Error invoking Gemini LLM: {str(e)}"