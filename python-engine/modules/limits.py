import os
from pypdf import PdfReader
from PIL import Image

# Cap for Pillow image pixels to prevent decompression bombs (40 megapixels)
MAX_IMAGE_PIXELS = 40_000_000
Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS

MAX_PDF_PAGES = 100

def assert_pdf_limits(file_path, max_pages=MAX_PDF_PAGES):
    """
    Reads a PDF file and asserts it is within the allowed page limit.
    Returns the PdfReader instance if valid.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"PDF file not found: {file_path}")
    
    reader = PdfReader(file_path, strict=False)
    pages = len(reader.pages)
    if pages > max_pages:
        raise ValueError(f"PDF exceeds {max_pages} page limit (has {pages} pages).")
        
    return reader
