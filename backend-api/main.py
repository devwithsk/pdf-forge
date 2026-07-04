import sys
import os
import uuid
import time
import json
import shutil
import secrets
from typing import List
import zipfile

from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

# Append python-engine/modules directory to sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
engine_modules_path = os.path.abspath(os.path.join(current_dir, '../python-engine/modules'))
if engine_modules_path not in sys.path:
    sys.path.append(engine_modules_path)

# Import module functions directly
from image_convert import pdf_to_jpg, jpg_to_pdf
from doc_convert import (
    word_to_pdf, 
    excel_to_pdf, 
    pdf_to_word, 
    pdf_to_excel, 
    pdf_to_ppt, 
    ppt_to_pdf, 
    html_to_pdf
)
from basic_manipulation import (
    add_page_numbers, 
    compress_pdf, 
    repair_pdf, 
    merge_pdfs, 
    split_pdf, 
    rotate_pdf, 
    reorder_pdf_pages
)
from security import protect_pdf, unlock_pdf, watermark_pdf

app = FastAPI(title="PDF Forge Python API")

# Configure CORS
allowed_origins = [
    "https://pfdforge.netlify.app",
    "https://pdf-forge.pages.dev",
    "http://localhost:5173",
    "http://127.0.0.1:5173"
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Temporary directories
JOBS_DIR = os.path.join(current_dir, 'jobs')
os.makedirs(JOBS_DIR, exist_ok=True)

# Secure download token map
download_tokens = {}

def create_download_token(file_path: str, file_name: str) -> str:
    token = secrets.token_hex(32)
    # 30-minute token expiry
    download_tokens[token] = {
        "file_path": file_path,
        "file_name": file_name,
        "expires_at": time.time() + 30 * 60
    }
    return token

def get_download_record(token: str):
    record = download_tokens.get(token)
    if record:
        if record["expires_at"] > time.time():
            return record
        else:
            del download_tokens[token]
    return None

def remove_file_or_dir(path: str):
    if os.path.isdir(path):
        shutil.rmtree(path, ignore_errors=True)
    elif os.path.isfile(path):
        try:
            os.remove(path)
        except Exception:
            pass

def zip_files(files_list: List[dict], zip_path: str):
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for f in files_list:
            zip_file.write(f["path"], f["name"])

@app.get("/")
def read_root():
    return {"message": "PDF Utility Platform API (FastAPI) is running successfully."}

@app.get("/api/analytics")
def get_analytics():
    return {
        "success": True,
        "totalProcessed": 24810,
        "totalMerges": 12450,
        "totalConversions": 8120
    }

@app.get("/download/{token}")
async def secure_download(token: str, background_tasks: BackgroundTasks):
    record = get_download_record(token)
    if not record:
        raise HTTPException(status_code=404, detail="Download token is invalid or has expired.")
        
    file_path = record["file_path"]
    file_name = record["file_name"]
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="The requested file no longer exists.")
        
    ext = os.path.splitext(file_name)[1].lower()
    content_type = "application/octet-stream"
    if ext == ".zip":
        content_type = "application/zip"
    elif ext in (".jpg", ".jpeg"):
        content_type = "image/jpeg"
    elif ext == ".png":
        content_type = "image/png"
    elif ext == ".pdf":
        content_type = "application/pdf"
        
    # Queue directory cleanup
    job_dir = os.path.dirname(file_path)
    if os.path.basename(job_dir).startswith("job-"):
        background_tasks.add_task(remove_file_or_dir, job_dir)
        
    return FileResponse(file_path, media_type=content_type, filename=file_name)

@app.post("/api/pdf2jpg")
async def pdf_to_jpg_endpoint(
    files: List[UploadFile] = File(...),
    settings: str = Form(default="{}")
):
    job_id = f"job-{uuid.uuid4()}"
    job_dir = os.path.join(JOBS_DIR, job_id)
    os.makedirs(job_dir, exist_ok=True)
    
    try:
        settings_dict = json.loads(settings)
    except Exception:
        settings_dict = {}
        
    img_format = settings_dict.get("format", "jpg")
    dpi = int(settings_dict.get("dpi", 120))
    quality = int(settings_dict.get("quality", 82))
    
    input_paths = []
    for upload_file in files:
        temp_path = os.path.join(job_dir, upload_file.filename)
        with open(temp_path, "wb") as f:
            shutil.copyfileobj(upload_file.file, f)
        input_paths.append(temp_path)
        
    total_files = len(input_paths)
    if total_files == 0:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise HTTPException(status_code=400, detail="Please upload at least one PDF file.")
        
    try:
        if total_files == 1:
            result_path = pdf_to_jpg(
                file_path=input_paths[0],
                output_dir=job_dir,
                img_format=img_format,
                dpi=dpi,
                quality=quality
            )
            
            output_filename = os.path.basename(result_path)
            token = create_download_token(result_path, output_filename)
            
            return {
                "success": True,
                "downloadUrl": f"/download/{token}",
                "fileName": output_filename,
                "size": os.path.getsize(result_path)
            }
        else:
            processed_files = []
            for i, input_path in enumerate(input_paths):
                sub_dir = os.path.join(job_dir, f"file-{i}")
                os.makedirs(sub_dir, exist_ok=True)
                
                result_path = pdf_to_jpg(
                    file_path=input_path,
                    output_dir=sub_dir,
                    img_format=img_format,
                    dpi=dpi,
                    quality=quality
                )
                
                processed_files.append({
                    "path": result_path,
                    "name": os.path.basename(result_path)
                })
                
            zip_filename = f"pdf2jpg-results-{uuid.uuid4()}.zip"
            zip_path = os.path.join(job_dir, zip_filename)
            zip_files(processed_files, zip_path)
            
            token = create_download_token(zip_path, zip_filename)
            
            return {
                "success": True,
                "downloadUrl": f"/download/{token}",
                "fileName": zip_filename,
                "size": os.path.getsize(zip_path)
            }
    except Exception as e:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/word2pdf")
async def word_to_pdf_endpoint(
    files: List[UploadFile] = File(...),
    settings: str = Form(default="{}")
):
    job_id = f"job-{uuid.uuid4()}"
    job_dir = os.path.join(JOBS_DIR, job_id)
    os.makedirs(job_dir, exist_ok=True)
    
    try:
        settings_dict = json.loads(settings)
    except Exception:
        settings_dict = {}
        
    orientation = settings_dict.get("orientation", "auto")
    layout_mode = settings_dict.get("layoutMode", "fit")
    
    input_paths = []
    for upload_file in files:
        temp_path = os.path.join(job_dir, upload_file.filename)
        with open(temp_path, "wb") as f:
            shutil.copyfileobj(upload_file.file, f)
        input_paths.append(temp_path)
        
    total_files = len(input_paths)
    if total_files == 0:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise HTTPException(status_code=400, detail="Please upload at least one Word file (.docx).")
        
    try:
        if total_files == 1:
            output_filename = f"docx-converted-{uuid.uuid4()}.pdf"
            output_path = os.path.join(job_dir, output_filename)
            
            result_path = word_to_pdf(
                file_path=input_paths[0],
                output_path=output_path,
                orientation=orientation,
                layout_mode=layout_mode
            )
            
            token = create_download_token(result_path, output_filename)
            
            return {
                "success": True,
                "downloadUrl": f"/download/{token}",
                "fileName": output_filename,
                "size": os.path.getsize(result_path)
            }
        else:
            processed_files = []
            for i, input_path in enumerate(input_paths):
                orig_name = os.path.splitext(os.path.basename(input_path))[0]
                output_name = f"{orig_name}-converted-{uuid.uuid4()}.pdf"
                output_path = os.path.join(job_dir, output_name)
                
                result_path = word_to_pdf(
                    file_path=input_path,
                    output_path=output_path,
                    orientation=orientation,
                    layout_mode=layout_mode
                )
                
                processed_files.append({
                    "path": result_path,
                    "name": f"{orig_name}-converted.pdf"
                })
                
            zip_filename = f"word2pdf-results-{uuid.uuid4()}.zip"
            zip_path = os.path.join(job_dir, zip_filename)
            zip_files(processed_files, zip_path)
            
            token = create_download_token(zip_path, zip_filename)
            
            return {
                "success": True,
                "downloadUrl": f"/download/{token}",
                "fileName": zip_filename,
                "size": os.path.getsize(zip_path)
            }
    except Exception as e:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/merge")
async def merge_endpoint(
    files: List[UploadFile] = File(...),
    settings: str = Form(default="{}")
):
    job_id = f"job-{uuid.uuid4()}"
    job_dir = os.path.join(JOBS_DIR, job_id)
    os.makedirs(job_dir, exist_ok=True)
    
    try:
        settings_dict = json.loads(settings)
    except Exception:
        settings_dict = {}
        
    add_blank_page = settings_dict.get("addBlankPage", False)
    compress = settings_dict.get("compress", False)
    
    input_paths = []
    for upload_file in files:
        temp_path = os.path.join(job_dir, upload_file.filename)
        with open(temp_path, "wb") as f:
            shutil.copyfileobj(upload_file.file, f)
        input_paths.append(temp_path)
        
    if len(input_paths) < 2:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise HTTPException(status_code=400, detail="At least two PDF files are required for merging.")
        
    try:
        output_filename = f"merged-{uuid.uuid4()}.pdf"
        output_path = os.path.join(job_dir, output_filename)
        
        result_path = merge_pdfs(
            files=input_paths,
            output_path=output_path,
            add_blank_page=add_blank_page,
            compress=compress
        )
        
        token = create_download_token(result_path, output_filename)
        return {
            "success": True,
            "downloadUrl": f"/download/{token}",
            "fileName": output_filename,
            "size": os.path.getsize(result_path)
        }
    except Exception as e:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/split")
async def split_endpoint(
    files: List[UploadFile] = File(...),
    settings: str = Form(default="{}")
):
    job_id = f"job-{uuid.uuid4()}"
    job_dir = os.path.join(JOBS_DIR, job_id)
    os.makedirs(job_dir, exist_ok=True)
    
    try:
        settings_dict = json.loads(settings)
    except Exception:
        settings_dict = {}
        
    split_mode = settings_dict.get("splitMode", "all")
    range_str = settings_dict.get("range", "")
    
    input_paths = []
    for upload_file in files:
        temp_path = os.path.join(job_dir, upload_file.filename)
        with open(temp_path, "wb") as f:
            shutil.copyfileobj(upload_file.file, f)
        input_paths.append(temp_path)
        
    total_files = len(input_paths)
    if total_files == 0:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise HTTPException(status_code=400, detail="Please upload at least one PDF file.")
        
    try:
        if total_files == 1:
            result_path = split_pdf(
                file_path=input_paths[0],
                output_dir=job_dir,
                split_mode=split_mode,
                range_str=range_str
            )
            
            output_filename = os.path.basename(result_path)
            token = create_download_token(result_path, output_filename)
            return {
                "success": True,
                "downloadUrl": f"/download/{token}",
                "fileName": output_filename,
                "size": os.path.getsize(result_path)
            }
        else:
            processed_files = []
            for i, input_path in enumerate(input_paths):
                sub_dir = os.path.join(job_dir, f"file-{i}")
                os.makedirs(sub_dir, exist_ok=True)
                
                result_path = split_pdf(
                    file_path=input_path,
                    output_dir=sub_dir,
                    split_mode=split_mode,
                    range_str=range_str
                )
                
                processed_files.append({
                    "path": result_path,
                    "name": os.path.basename(result_path)
                })
                
            zip_filename = f"split-results-{uuid.uuid4()}.zip"
            zip_path = os.path.join(job_dir, zip_filename)
            zip_files(processed_files, zip_path)
            
            token = create_download_token(zip_path, zip_filename)
            return {
                "success": True,
                "downloadUrl": f"/download/{token}",
                "fileName": zip_filename,
                "size": os.path.getsize(zip_path)
            }
    except Exception as e:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/rotate")
async def rotate_endpoint(
    files: List[UploadFile] = File(...),
    settings: str = Form(default="{}")
):
    job_id = f"job-{uuid.uuid4()}"
    job_dir = os.path.join(JOBS_DIR, job_id)
    os.makedirs(job_dir, exist_ok=True)
    
    try:
        settings_dict = json.loads(settings)
    except Exception:
        settings_dict = {}
        
    degrees = int(settings_dict.get("degrees", 90))
    
    input_paths = []
    for upload_file in files:
        temp_path = os.path.join(job_dir, upload_file.filename)
        with open(temp_path, "wb") as f:
            shutil.copyfileobj(upload_file.file, f)
        input_paths.append(temp_path)
        
    total_files = len(input_paths)
    if total_files == 0:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise HTTPException(status_code=400, detail="Please upload at least one PDF file.")
        
    try:
        if total_files == 1:
            output_filename = f"rotated-{uuid.uuid4()}.pdf"
            output_path = os.path.join(job_dir, output_filename)
            result_path = rotate_pdf(
                file_path=input_paths[0],
                output_path=output_path,
                degrees=degrees
            )
            
            token = create_download_token(result_path, output_filename)
            return {
                "success": True,
                "downloadUrl": f"/download/{token}",
                "fileName": output_filename,
                "size": os.path.getsize(result_path)
            }
        else:
            processed_files = []
            for i, input_path in enumerate(input_paths):
                orig_name = os.path.splitext(os.path.basename(input_path))[0]
                output_name = f"{orig_name}-rotated-{uuid.uuid4()}.pdf"
                output_path = os.path.join(job_dir, output_name)
                
                result_path = rotate_pdf(
                    file_path=input_path,
                    output_path=output_path,
                    degrees=degrees
                )
                
                processed_files.append({
                    "path": result_path,
                    "name": f"{orig_name}-rotated.pdf"
                })
                
            zip_filename = f"rotate-results-{uuid.uuid4()}.zip"
            zip_path = os.path.join(job_dir, zip_filename)
            zip_files(processed_files, zip_path)
            
            token = create_download_token(zip_path, zip_filename)
            return {
                "success": True,
                "downloadUrl": f"/download/{token}",
                "fileName": zip_filename,
                "size": os.path.getsize(zip_path)
            }
    except Exception as e:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/remove-pages")
async def remove_pages_endpoint(
    file: UploadFile = File(...),
    settings: str = Form(default="{}")
):
    job_id = f"job-{uuid.uuid4()}"
    job_dir = os.path.join(JOBS_DIR, job_id)
    os.makedirs(job_dir, exist_ok=True)
    
    try:
        settings_dict = json.loads(settings)
    except Exception:
        settings_dict = {}
        
    page_order = settings_dict.get("pageOrder", [])
    
    temp_path = os.path.join(job_dir, file.filename)
    with open(temp_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
        
    try:
        output_filename = f"removed-pages-{uuid.uuid4()}.pdf"
        output_path = os.path.join(job_dir, output_filename)
        result_path = reorder_pdf_pages(
            input_path=temp_path,
            output_path=output_path,
            page_order=page_order
        )
        
        token = create_download_token(result_path, output_filename)
        return {
            "success": True,
            "downloadUrl": f"/download/{token}",
            "fileName": output_filename,
            "size": os.path.getsize(result_path)
        }
    except Exception as e:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/organize-pdf")
async def organize_pdf_endpoint(
    file: UploadFile = File(...),
    settings: str = Form(default="{}")
):
    job_id = f"job-{uuid.uuid4()}"
    job_dir = os.path.join(JOBS_DIR, job_id)
    os.makedirs(job_dir, exist_ok=True)
    
    try:
        settings_dict = json.loads(settings)
    except Exception:
        settings_dict = {}
        
    page_order = settings_dict.get("pageOrder", [])
    
    temp_path = os.path.join(job_dir, file.filename)
    with open(temp_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
        
    try:
        output_filename = f"organized-{uuid.uuid4()}.pdf"
        output_path = os.path.join(job_dir, output_filename)
        result_path = reorder_pdf_pages(
            input_path=temp_path,
            output_path=output_path,
            page_order=page_order
        )
        
        token = create_download_token(result_path, output_filename)
        return {
            "success": True,
            "downloadUrl": f"/download/{token}",
            "fileName": output_filename,
            "size": os.path.getsize(result_path)
        }
    except Exception as e:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/compress")
async def compress_endpoint(
    files: List[UploadFile] = File(...),
    settings: str = Form(default="{}")
):
    job_id = f"job-{uuid.uuid4()}"
    job_dir = os.path.join(JOBS_DIR, job_id)
    os.makedirs(job_dir, exist_ok=True)
    
    try:
        settings_dict = json.loads(settings)
    except Exception:
        settings_dict = {}
        
    compression_level = settings_dict.get("compressionLevel", "recommended")
    
    input_paths = []
    for upload_file in files:
        temp_path = os.path.join(job_dir, upload_file.filename)
        with open(temp_path, "wb") as f:
            shutil.copyfileobj(upload_file.file, f)
        input_paths.append(temp_path)
        
    total_files = len(input_paths)
    if total_files == 0:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise HTTPException(status_code=400, detail="Please upload at least one PDF file.")
        
    try:
        if total_files == 1:
            output_filename = f"compressed-{uuid.uuid4()}.pdf"
            output_path = os.path.join(job_dir, output_filename)
            result_path = compress_pdf(
                input_path=input_paths[0],
                output_path=output_path,
                compression_level=compression_level
            )
            
            token = create_download_token(result_path, output_filename)
            return {
                "success": True,
                "downloadUrl": f"/download/{token}",
                "fileName": output_filename,
                "size": os.path.getsize(result_path)
            }
        else:
            processed_files = []
            for i, input_path in enumerate(input_paths):
                orig_name = os.path.splitext(os.path.basename(input_path))[0]
                output_name = f"{orig_name}-compressed-{uuid.uuid4()}.pdf"
                output_path = os.path.join(job_dir, output_name)
                
                result_path = compress_pdf(
                    input_path=input_path,
                    output_path=output_path,
                    compression_level=compression_level
                )
                
                processed_files.append({
                    "path": result_path,
                    "name": f"{orig_name}-compressed.pdf"
                })
                
            zip_filename = f"compress-results-{uuid.uuid4()}.zip"
            zip_path = os.path.join(job_dir, zip_filename)
            zip_files(processed_files, zip_path)
            
            token = create_download_token(zip_path, zip_filename)
            return {
                "success": True,
                "downloadUrl": f"/download/{token}",
                "fileName": zip_filename,
                "size": os.path.getsize(zip_path)
            }
    except Exception as e:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/repair")
async def repair_endpoint(
    files: List[UploadFile] = File(...),
    settings: str = Form(default="{}")
):
    job_id = f"job-{uuid.uuid4()}"
    job_dir = os.path.join(JOBS_DIR, job_id)
    os.makedirs(job_dir, exist_ok=True)
    
    input_paths = []
    for upload_file in files:
        temp_path = os.path.join(job_dir, upload_file.filename)
        with open(temp_path, "wb") as f:
            shutil.copyfileobj(upload_file.file, f)
        input_paths.append(temp_path)
        
    total_files = len(input_paths)
    if total_files == 0:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise HTTPException(status_code=400, detail="Please upload at least one PDF file.")
        
    try:
        if total_files == 1:
            output_filename = f"repaired-{uuid.uuid4()}.pdf"
            output_path = os.path.join(job_dir, output_filename)
            result_path = repair_pdf(
                input_path=input_paths[0],
                output_path=output_path
            )
            
            token = create_download_token(result_path, output_filename)
            return {
                "success": True,
                "downloadUrl": f"/download/{token}",
                "fileName": output_filename,
                "size": os.path.getsize(result_path)
            }
        else:
            processed_files = []
            for i, input_path in enumerate(input_paths):
                orig_name = os.path.splitext(os.path.basename(input_path))[0]
                output_name = f"{orig_name}-repaired-{uuid.uuid4()}.pdf"
                output_path = os.path.join(job_dir, output_name)
                
                result_path = repair_pdf(
                    input_path=input_path,
                    output_path=output_path
                )
                
                processed_files.append({
                    "path": result_path,
                    "name": f"{orig_name}-repaired.pdf"
                })
                
            zip_filename = f"repair-results-{uuid.uuid4()}.zip"
            zip_path = os.path.join(job_dir, zip_filename)
            zip_files(processed_files, zip_path)
            
            token = create_download_token(zip_path, zip_filename)
            return {
                "success": True,
                "downloadUrl": f"/download/{token}",
                "fileName": zip_filename,
                "size": os.path.getsize(zip_path)
            }
    except Exception as e:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/protect")
async def protect_endpoint(
    files: List[UploadFile] = File(...),
    settings: str = Form(default="{}")
):
    job_id = f"job-{uuid.uuid4()}"
    job_dir = os.path.join(JOBS_DIR, job_id)
    os.makedirs(job_dir, exist_ok=True)
    
    try:
        settings_dict = json.loads(settings)
    except Exception:
        settings_dict = {}
        
    password = settings_dict.get("password", "")
    if not password:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise HTTPException(status_code=400, detail="Password must be specified to protect PDF.")
        
    input_paths = []
    for upload_file in files:
        temp_path = os.path.join(job_dir, upload_file.filename)
        with open(temp_path, "wb") as f:
            shutil.copyfileobj(upload_file.file, f)
        input_paths.append(temp_path)
        
    total_files = len(input_paths)
    if total_files == 0:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise HTTPException(status_code=400, detail="Please upload at least one PDF file.")
        
    try:
        if total_files == 1:
            output_filename = f"protected-{uuid.uuid4()}.pdf"
            output_path = os.path.join(job_dir, output_filename)
            result_path = protect_pdf(
                file_path=input_paths[0],
                output_path=output_path,
                password=password
            )
            
            token = create_download_token(result_path, output_filename)
            return {
                "success": True,
                "downloadUrl": f"/download/{token}",
                "fileName": output_filename,
                "size": os.path.getsize(result_path)
            }
        else:
            processed_files = []
            for i, input_path in enumerate(input_paths):
                orig_name = os.path.splitext(os.path.basename(input_path))[0]
                output_name = f"{orig_name}-protected-{uuid.uuid4()}.pdf"
                output_path = os.path.join(job_dir, output_name)
                
                result_path = protect_pdf(
                    file_path=input_path,
                    output_path=output_path,
                    password=password
                )
                
                processed_files.append({
                    "path": result_path,
                    "name": f"{orig_name}-protected.pdf"
                })
                
            zip_filename = f"protect-results-{uuid.uuid4()}.zip"
            zip_path = os.path.join(job_dir, zip_filename)
            zip_files(processed_files, zip_path)
            
            token = create_download_token(zip_path, zip_filename)
            return {
                "success": True,
                "downloadUrl": f"/download/{token}",
                "fileName": zip_filename,
                "size": os.path.getsize(zip_path)
            }
    except Exception as e:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/unlock")
async def unlock_endpoint(
    files: List[UploadFile] = File(...),
    settings: str = Form(default="{}")
):
    job_id = f"job-{uuid.uuid4()}"
    job_dir = os.path.join(JOBS_DIR, job_id)
    os.makedirs(job_dir, exist_ok=True)
    
    try:
        settings_dict = json.loads(settings)
    except Exception:
        settings_dict = {}
        
    password = settings_dict.get("password", "")
    
    input_paths = []
    for upload_file in files:
        temp_path = os.path.join(job_dir, upload_file.filename)
        with open(temp_path, "wb") as f:
            shutil.copyfileobj(upload_file.file, f)
        input_paths.append(temp_path)
        
    total_files = len(input_paths)
    if total_files == 0:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise HTTPException(status_code=400, detail="Please upload at least one PDF file.")
        
    try:
        if total_files == 1:
            output_filename = f"unlocked-{uuid.uuid4()}.pdf"
            output_path = os.path.join(job_dir, output_filename)
            result_path = unlock_pdf(
                file_path=input_paths[0],
                output_path=output_path,
                password=password
            )
            
            token = create_download_token(result_path, output_filename)
            return {
                "success": True,
                "downloadUrl": f"/download/{token}",
                "fileName": output_filename,
                "size": os.path.getsize(result_path)
            }
        else:
            processed_files = []
            for i, input_path in enumerate(input_paths):
                orig_name = os.path.splitext(os.path.basename(input_path))[0]
                output_name = f"{orig_name}-unlocked-{uuid.uuid4()}.pdf"
                output_path = os.path.join(job_dir, output_name)
                
                result_path = unlock_pdf(
                    file_path=input_path,
                    output_path=output_path,
                    password=password
                )
                
                processed_files.append({
                    "path": result_path,
                    "name": f"{orig_name}-unlocked.pdf"
                })
                
            zip_filename = f"unlock-results-{uuid.uuid4()}.zip"
            zip_path = os.path.join(job_dir, zip_filename)
            zip_files(processed_files, zip_path)
            
            token = create_download_token(zip_path, zip_filename)
            return {
                "success": True,
                "downloadUrl": f"/download/{token}",
                "fileName": zip_filename,
                "size": os.path.getsize(zip_path)
            }
    except Exception as e:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/watermark")
async def watermark_endpoint(
    files: List[UploadFile] = File(...),
    settings: str = Form(default="{}")
):
    job_id = f"job-{uuid.uuid4()}"
    job_dir = os.path.join(JOBS_DIR, job_id)
    os.makedirs(job_dir, exist_ok=True)
    
    try:
        settings_dict = json.loads(settings)
    except Exception:
        settings_dict = {}
        
    text = settings_dict.get("text", "CONFIDENTIAL")
    font_size = int(settings_dict.get("fontSize", 40))
    opacity = float(settings_dict.get("opacity", 0.3))
    color = settings_dict.get("color", "#888888")
    
    input_paths = []
    for upload_file in files:
        temp_path = os.path.join(job_dir, upload_file.filename)
        with open(temp_path, "wb") as f:
            shutil.copyfileobj(upload_file.file, f)
        input_paths.append(temp_path)
        
    total_files = len(input_paths)
    if total_files == 0:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise HTTPException(status_code=400, detail="Please upload at least one PDF file.")
        
    try:
        if total_files == 1:
            output_filename = f"watermarked-{uuid.uuid4()}.pdf"
            output_path = os.path.join(job_dir, output_filename)
            result_path = watermark_pdf(
                file_path=input_paths[0],
                output_path=output_path,
                text=text,
                font_size=font_size,
                opacity=opacity,
                color=color
            )
            
            token = create_download_token(result_path, output_filename)
            return {
                "success": True,
                "downloadUrl": f"/download/{token}",
                "fileName": output_filename,
                "size": os.path.getsize(result_path)
            }
        else:
            processed_files = []
            for i, input_path in enumerate(input_paths):
                orig_name = os.path.splitext(os.path.basename(input_path))[0]
                output_name = f"{orig_name}-watermarked-{uuid.uuid4()}.pdf"
                output_path = os.path.join(job_dir, output_name)
                
                result_path = watermark_pdf(
                    file_path=input_path,
                    output_path=output_path,
                    text=text,
                    font_size=font_size,
                    opacity=opacity,
                    color=color
                )
                
                processed_files.append({
                    "path": result_path,
                    "name": f"{orig_name}-watermarked.pdf"
                })
                
            zip_filename = f"watermark-results-{uuid.uuid4()}.zip"
            zip_path = os.path.join(job_dir, zip_filename)
            zip_files(processed_files, zip_path)
            
            token = create_download_token(zip_path, zip_filename)
            return {
                "success": True,
                "downloadUrl": f"/download/{token}",
                "fileName": zip_filename,
                "size": os.path.getsize(zip_path)
            }
    except Exception as e:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/add-page-numbers")
async def add_page_numbers_endpoint(
    files: List[UploadFile] = File(...),
    settings: str = Form(default="{}")
):
    job_id = f"job-{uuid.uuid4()}"
    job_dir = os.path.join(JOBS_DIR, job_id)
    os.makedirs(job_dir, exist_ok=True)
    
    try:
        settings_dict = json.loads(settings)
    except Exception:
        settings_dict = {}
        
    position = settings_dict.get("position", "bottom_center")
    starting_number = int(settings_dict.get("startingNumber", 1))
    
    input_paths = []
    for upload_file in files:
        temp_path = os.path.join(job_dir, upload_file.filename)
        with open(temp_path, "wb") as f:
            shutil.copyfileobj(upload_file.file, f)
        input_paths.append(temp_path)
        
    total_files = len(input_paths)
    if total_files == 0:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise HTTPException(status_code=400, detail="Please upload at least one PDF file.")
        
    try:
        if total_files == 1:
            output_filename = f"numbered-{uuid.uuid4()}.pdf"
            output_path = os.path.join(job_dir, output_filename)
            result_path = add_page_numbers(
                input_path=input_paths[0],
                output_path=output_path,
                position=position,
                starting_number=starting_number
            )
            
            token = create_download_token(result_path, output_filename)
            return {
                "success": True,
                "downloadUrl": f"/download/{token}",
                "fileName": output_filename,
                "size": os.path.getsize(result_path)
            }
        else:
            processed_files = []
            for i, input_path in enumerate(input_paths):
                orig_name = os.path.splitext(os.path.basename(input_path))[0]
                output_name = f"{orig_name}-numbered-{uuid.uuid4()}.pdf"
                output_path = os.path.join(job_dir, output_name)
                
                result_path = add_page_numbers(
                    input_path=input_path,
                    output_path=output_path,
                    position=position,
                    starting_number=starting_number
                )
                
                processed_files.append({
                    "path": result_path,
                    "name": f"{orig_name}-numbered.pdf"
                })
                
            zip_filename = f"numbered-results-{uuid.uuid4()}.zip"
            zip_path = os.path.join(job_dir, zip_filename)
            zip_files(processed_files, zip_path)
            
            token = create_download_token(zip_path, zip_filename)
            return {
                "success": True,
                "downloadUrl": f"/download/{token}",
                "fileName": zip_filename,
                "size": os.path.getsize(zip_path)
            }
    except Exception as e:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/jpg2pdf")
async def jpg_to_pdf_endpoint(
    images: List[UploadFile] = File(...),
    settings: str = Form(default="{}")
):
    job_id = f"job-{uuid.uuid4()}"
    job_dir = os.path.join(JOBS_DIR, job_id)
    os.makedirs(job_dir, exist_ok=True)
    
    try:
        settings_dict = json.loads(settings)
    except Exception:
        settings_dict = {}
        
    paper_size = settings_dict.get("paperSize", "A4")
    orientation = settings_dict.get("orientation", "Portrait")
    mode = settings_dict.get("mode", "merge")
    
    input_paths = []
    for upload_file in images:
        temp_path = os.path.join(job_dir, upload_file.filename)
        with open(temp_path, "wb") as f:
            shutil.copyfileobj(upload_file.file, f)
        input_paths.append(temp_path)
        
    if len(input_paths) == 0:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise HTTPException(status_code=400, detail="Please upload at least one image.")
        
    try:
        if mode == "merge":
            output_filename = f"converted-{uuid.uuid4()}.pdf"
            output_path = os.path.join(job_dir, output_filename)
            result_path = jpg_to_pdf(
                image_paths=input_paths,
                output_path=output_path,
                paper_size=paper_size,
                orientation=orientation,
                merge_mode="merge"
            )
        else:
            output_filename = f"converted-images-{uuid.uuid4()}.zip"
            output_path = os.path.join(job_dir, output_filename)
            result_path = jpg_to_pdf(
                image_paths=input_paths,
                output_path=output_path,
                paper_size=paper_size,
                orientation=orientation,
                merge_mode="individual"
            )
            
        token = create_download_token(result_path, output_filename)
        return {
            "success": True,
            "downloadUrl": f"/download/{token}",
            "fileName": output_filename,
            "size": os.path.getsize(result_path)
        }
    except Exception as e:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/excel2pdf")
async def excel_to_pdf_endpoint(
    files: List[UploadFile] = File(...),
    settings: str = Form(default="{}")
):
    job_id = f"job-{uuid.uuid4()}"
    job_dir = os.path.join(JOBS_DIR, job_id)
    os.makedirs(job_dir, exist_ok=True)
    
    try:
        settings_dict = json.loads(settings)
    except Exception:
        settings_dict = {}
        
    orientation = settings_dict.get("orientation", "landscape")
    layout_mode = settings_dict.get("layoutMode", "fit")
    
    input_paths = []
    for upload_file in files:
        temp_path = os.path.join(job_dir, upload_file.filename)
        with open(temp_path, "wb") as f:
            shutil.copyfileobj(upload_file.file, f)
        input_paths.append(temp_path)
        
    total_files = len(input_paths)
    if total_files == 0:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise HTTPException(status_code=400, detail="Please upload at least one Excel file (.xlsx).")
        
    try:
        if total_files == 1:
            output_filename = f"excel-converted-{uuid.uuid4()}.pdf"
            output_path = os.path.join(job_dir, output_filename)
            result_path = excel_to_pdf(
                file_path=input_paths[0],
                output_path=output_path,
                orientation=orientation,
                layout_mode=layout_mode
            )
            
            token = create_download_token(result_path, output_filename)
            return {
                "success": True,
                "downloadUrl": f"/download/{token}",
                "fileName": output_filename,
                "size": os.path.getsize(result_path)
            }
        else:
            processed_files = []
            for i, input_path in enumerate(input_paths):
                orig_name = os.path.splitext(os.path.basename(input_path))[0]
                output_name = f"{orig_name}-converted-{uuid.uuid4()}.pdf"
                output_path = os.path.join(job_dir, output_name)
                
                result_path = excel_to_pdf(
                    file_path=input_path,
                    output_path=output_path,
                    orientation=orientation,
                    layout_mode=layout_mode
                )
                
                processed_files.append({
                    "path": result_path,
                    "name": f"{orig_name}-converted.pdf"
                })
                
            zip_filename = f"excel2pdf-results-{uuid.uuid4()}.zip"
            zip_path = os.path.join(job_dir, zip_filename)
            zip_files(processed_files, zip_path)
            
            token = create_download_token(zip_path, zip_filename)
            return {
                "success": True,
                "downloadUrl": f"/download/{token}",
                "fileName": zip_filename,
                "size": os.path.getsize(zip_path)
            }
    except Exception as e:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/pdf2word")
async def pdf_to_word_endpoint(
    files: List[UploadFile] = File(...),
    settings: str = Form(default="{}")
):
    job_id = f"job-{uuid.uuid4()}"
    job_dir = os.path.join(JOBS_DIR, job_id)
    os.makedirs(job_dir, exist_ok=True)
    
    try:
        settings_dict = json.loads(settings)
    except Exception:
        settings_dict = {}
        
    mode = settings_dict.get("mode", "flowing")
    ocr = settings_dict.get("ocr", False)
    
    input_paths = []
    for upload_file in files:
        temp_path = os.path.join(job_dir, upload_file.filename)
        with open(temp_path, "wb") as f:
            shutil.copyfileobj(upload_file.file, f)
        input_paths.append(temp_path)
        
    total_files = len(input_paths)
    if total_files == 0:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise HTTPException(status_code=400, detail="Please upload at least one PDF file.")
        
    try:
        if total_files == 1:
            output_filename = f"pdf-converted-{uuid.uuid4()}.docx"
            output_path = os.path.join(job_dir, output_filename)
            result_path = pdf_to_word(
                file_path=input_paths[0],
                output_path=output_path,
                mode=mode,
                ocr=ocr
            )
            
            token = create_download_token(result_path, output_filename)
            return {
                "success": True,
                "downloadUrl": f"/download/{token}",
                "fileName": output_filename,
                "size": os.path.getsize(result_path)
            }
        else:
            processed_files = []
            for i, input_path in enumerate(input_paths):
                orig_name = os.path.splitext(os.path.basename(input_path))[0]
                output_name = f"{orig_name}-converted-{uuid.uuid4()}.docx"
                output_path = os.path.join(job_dir, output_name)
                
                result_path = pdf_to_word(
                    file_path=input_path,
                    output_path=output_path,
                    mode=mode,
                    ocr=ocr
                )
                
                processed_files.append({
                    "path": result_path,
                    "name": f"{orig_name}-converted.docx"
                })
                
            zip_filename = f"pdf2word-results-{uuid.uuid4()}.zip"
            zip_path = os.path.join(job_dir, zip_filename)
            zip_files(processed_files, zip_path)
            
            token = create_download_token(zip_path, zip_filename)
            return {
                "success": True,
                "downloadUrl": f"/download/{token}",
                "fileName": zip_filename,
                "size": os.path.getsize(zip_path)
            }
    except Exception as e:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/pdf2excel")
async def pdf_to_excel_endpoint(
    files: List[UploadFile] = File(...),
    settings: str = Form(default="{}")
):
    job_id = f"job-{uuid.uuid4()}"
    job_dir = os.path.join(JOBS_DIR, job_id)
    os.makedirs(job_dir, exist_ok=True)
    
    try:
        settings_dict = json.loads(settings)
    except Exception:
        settings_dict = {}
        
    mode = settings_dict.get("mode", "auto")
    single_sheet = settings_dict.get("singleSheet", False)
    
    input_paths = []
    for upload_file in files:
        temp_path = os.path.join(job_dir, upload_file.filename)
        with open(temp_path, "wb") as f:
            shutil.copyfileobj(upload_file.file, f)
        input_paths.append(temp_path)
        
    total_files = len(input_paths)
    if total_files == 0:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise HTTPException(status_code=400, detail="Please upload at least one PDF file.")
        
    try:
        if total_files == 1:
            output_filename = f"pdf-converted-{uuid.uuid4()}.xlsx"
            output_path = os.path.join(job_dir, output_filename)
            result_path = pdf_to_excel(
                file_path=input_paths[0],
                output_path=output_path,
                mode=mode,
                single_sheet=single_sheet
            )
            
            token = create_download_token(result_path, output_filename)
            return {
                "success": True,
                "downloadUrl": f"/download/{token}",
                "fileName": output_filename,
                "size": os.path.getsize(result_path)
            }
        else:
            processed_files = []
            for i, input_path in enumerate(input_paths):
                orig_name = os.path.splitext(os.path.basename(input_path))[0]
                output_name = f"{orig_name}-converted-{uuid.uuid4()}.xlsx"
                output_path = os.path.join(job_dir, output_name)
                
                result_path = pdf_to_excel(
                    file_path=input_path,
                    output_path=output_path,
                    mode=mode,
                    single_sheet=single_sheet
                )
                
                processed_files.append({
                    "path": result_path,
                    "name": f"{orig_name}-converted.xlsx"
                })
                
            zip_filename = f"pdf2excel-results-{uuid.uuid4()}.xlsx.zip"
            zip_path = os.path.join(job_dir, zip_filename)
            zip_files(processed_files, zip_path)
            
            token = create_download_token(zip_path, zip_filename)
            return {
                "success": True,
                "downloadUrl": f"/download/{token}",
                "fileName": zip_filename,
                "size": os.path.getsize(zip_path)
            }
    except Exception as e:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/pdf2ppt")
async def pdf_to_ppt_endpoint(
    files: List[UploadFile] = File(...),
    settings: str = Form(default="{}")
):
    job_id = f"job-{uuid.uuid4()}"
    job_dir = os.path.join(JOBS_DIR, job_id)
    os.makedirs(job_dir, exist_ok=True)
    
    try:
        settings_dict = json.loads(settings)
    except Exception:
        settings_dict = {}
        
    slide_size = settings_dict.get("slideSize", "16:9")
    vector_mode = settings_dict.get("vectorMode", False)
    
    input_paths = []
    for upload_file in files:
        temp_path = os.path.join(job_dir, upload_file.filename)
        with open(temp_path, "wb") as f:
            shutil.copyfileobj(upload_file.file, f)
        input_paths.append(temp_path)
        
    total_files = len(input_paths)
    if total_files == 0:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise HTTPException(status_code=400, detail="Please upload at least one PDF file.")
        
    try:
        if total_files == 1:
            output_filename = f"pdf-converted-{uuid.uuid4()}.pptx"
            output_path = os.path.join(job_dir, output_filename)
            result_path = pdf_to_ppt(
                file_path=input_paths[0],
                output_path=output_path,
                slide_size=slide_size,
                vector_mode=vector_mode
            )
            
            token = create_download_token(result_path, output_filename)
            return {
                "success": True,
                "downloadUrl": f"/download/{token}",
                "fileName": output_filename,
                "size": os.path.getsize(result_path)
            }
        else:
            processed_files = []
            for i, input_path in enumerate(input_paths):
                orig_name = os.path.splitext(os.path.basename(input_path))[0]
                output_name = f"{orig_name}-converted-{uuid.uuid4()}.pptx"
                output_path = os.path.join(job_dir, output_name)
                
                result_path = pdf_to_ppt(
                    file_path=input_path,
                    output_path=output_path,
                    slide_size=slide_size,
                    vector_mode=vector_mode
                )
                
                processed_files.append({
                    "path": result_path,
                    "name": f"{orig_name}-converted.pptx"
                })
                
            zip_filename = f"pdf2ppt-results-{uuid.uuid4()}.zip"
            zip_path = os.path.join(job_dir, zip_filename)
            zip_files(processed_files, zip_path)
            
            token = create_download_token(zip_path, zip_filename)
            return {
                "success": True,
                "downloadUrl": f"/download/{token}",
                "fileName": zip_filename,
                "size": os.path.getsize(zip_path)
            }
    except Exception as e:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ppt2pdf")
async def ppt_to_pdf_endpoint(
    files: List[UploadFile] = File(...),
    settings: str = Form(default="{}")
):
    job_id = f"job-{uuid.uuid4()}"
    job_dir = os.path.join(JOBS_DIR, job_id)
    os.makedirs(job_dir, exist_ok=True)
    
    try:
        settings_dict = json.loads(settings)
    except Exception:
        settings_dict = {}
        
    orientation = settings_dict.get("orientation", "auto")
    layout_mode = settings_dict.get("layoutMode", "fit")
    
    input_paths = []
    for upload_file in files:
        temp_path = os.path.join(job_dir, upload_file.filename)
        with open(temp_path, "wb") as f:
            shutil.copyfileobj(upload_file.file, f)
        input_paths.append(temp_path)
        
    total_files = len(input_paths)
    if total_files == 0:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise HTTPException(status_code=400, detail="Please upload at least one PowerPoint file (.pptx).")
        
    try:
        if total_files == 1:
            output_filename = f"ppt-converted-{uuid.uuid4()}.pdf"
            output_path = os.path.join(job_dir, output_filename)
            result_path = ppt_to_pdf(
                file_path=input_paths[0],
                output_path=output_path,
                orientation=orientation,
                layout_mode=layout_mode
            )
            
            token = create_download_token(result_path, output_filename)
            return {
                "success": True,
                "downloadUrl": f"/download/{token}",
                "fileName": output_filename,
                "size": os.path.getsize(result_path)
            }
        else:
            processed_files = []
            for i, input_path in enumerate(input_paths):
                orig_name = os.path.splitext(os.path.basename(input_path))[0]
                output_name = f"{orig_name}-converted-{uuid.uuid4()}.pdf"
                output_path = os.path.join(job_dir, output_name)
                
                result_path = ppt_to_pdf(
                    file_path=input_path,
                    output_path=output_path,
                    orientation=orientation,
                    layout_mode=layout_mode
                )
                
                processed_files.append({
                    "path": result_path,
                    "name": f"{orig_name}-converted.pdf"
                })
                
            zip_filename = f"ppt2pdf-results-{uuid.uuid4()}.zip"
            zip_path = os.path.join(job_dir, zip_filename)
            zip_files(processed_files, zip_path)
            
            token = create_download_token(zip_path, zip_filename)
            return {
                "success": True,
                "downloadUrl": f"/download/{token}",
                "fileName": zip_filename,
                "size": os.path.getsize(zip_path)
            }
    except Exception as e:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/html2pdf")
async def html_to_pdf_endpoint(
    files: List[UploadFile] = File(...),
    settings: str = Form(default="{}")
):
    job_id = f"job-{uuid.uuid4()}"
    job_dir = os.path.join(JOBS_DIR, job_id)
    os.makedirs(job_dir, exist_ok=True)
    
    try:
        settings_dict = json.loads(settings)
    except Exception:
        settings_dict = {}
        
    orientation = settings_dict.get("orientation", "auto")
    layout_mode = settings_dict.get("layoutMode", "fit")
    
    input_paths = []
    for upload_file in files:
        temp_path = os.path.join(job_dir, upload_file.filename)
        with open(temp_path, "wb") as f:
            shutil.copyfileobj(upload_file.file, f)
        input_paths.append(temp_path)
        
    total_files = len(input_paths)
    if total_files == 0:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise HTTPException(status_code=400, detail="Please upload at least one HTML file (.html).")
        
    try:
        if total_files == 1:
            output_filename = f"html-converted-{uuid.uuid4()}.pdf"
            output_path = os.path.join(job_dir, output_filename)
            result_path = html_to_pdf(
                file_path=input_paths[0],
                output_path=output_path,
                orientation=orientation,
                layout_mode=layout_mode
            )
            
            token = create_download_token(result_path, output_filename)
            return {
                "success": True,
                "downloadUrl": f"/download/{token}",
                "fileName": output_filename,
                "size": os.path.getsize(result_path)
            }
        else:
            processed_files = []
            for i, input_path in enumerate(input_paths):
                orig_name = os.path.splitext(os.path.basename(input_path))[0]
                output_name = f"{orig_name}-converted-{uuid.uuid4()}.pdf"
                output_path = os.path.join(job_dir, output_name)
                
                result_path = html_to_pdf(
                    file_path=input_path,
                    output_path=output_path,
                    orientation=orientation,
                    layout_mode=layout_mode
                )
                
                processed_files.append({
                    "path": result_path,
                    "name": f"{orig_name}-converted.pdf"
                })
                
            zip_filename = f"html2pdf-results-{uuid.uuid4()}.zip"
            zip_path = os.path.join(job_dir, zip_filename)
            zip_files(processed_files, zip_path)
            
            token = create_download_token(zip_path, zip_filename)
            return {
                "success": True,
                "downloadUrl": f"/download/{token}",
                "fileName": zip_filename,
                "size": os.path.getsize(zip_path)
            }
    except Exception as e:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=str(e))
