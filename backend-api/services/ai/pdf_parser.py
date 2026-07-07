from langchain_text_splitters import RecursiveCharacterTextSplitter
from pypdf import PdfReader
from typing import List

def extract_and_chunk_pdf(file_path: str, chunk_size: int = 1000, chunk_overlap: int = 200) -> List[str]:
    """
    Extracts text from a PDF file using pypdf and splits it into overlapping chunks
    using LangChain's RecursiveCharacterTextSplitter.
    """
    reader = PdfReader(file_path)
    text = ""
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text + "\n"
            
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len
    )
    chunks = text_splitter.split_text(text)
    return chunks
