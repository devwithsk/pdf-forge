import os
import sys
import json
import zipfile
from pypdf import PdfReader, PdfWriter

def parse_range(range_str, max_pages):
    """
    Parses a page range string (e.g., '1-3, 5, 7-10') and returns a list of 0-based page indices.
    """
    pages = set()
    parts = range_str.split(",")
    for part in parts:
        part = part.strip()
        if "-" in part:
            start, end = part.split("-")
            start = int(start.strip()) - 1
            end = int(end.strip()) - 1
            # Clamp to valid page range
            start = max(0, min(start, max_pages - 1))
            end = max(0, min(end, max_pages - 1))
            for i in range(min(start, end), max(start, end) + 1):
                pages.add(i)
        else:
            p = int(part.strip()) - 1
            if 0 <= p < max_pages:
                pages.add(p)
    return sorted(list(pages))

def merge_pdfs(files, output_path):
    if not files or len(files) < 2:
        raise ValueError("At least two files are required for merging.")
    
    merger = PdfWriter()
    for file in files:
        if not os.path.exists(file):
            raise FileNotFoundError(f"File not found: {file}")
        merger.append(file)
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "wb") as f:
        merger.write(f)
    merger.close()
    return output_path

def split_pdf(file_path, output_dir, split_mode="all", range_str=""):
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")
    
    reader = PdfReader(file_path)
    total_pages = len(reader.pages)
    os.makedirs(output_dir, exist_ok=True)
    
    output_files = []
    
    if split_mode == "range":
        if not range_str:
            raise ValueError("Page range must be specified for range split mode.")
        target_pages = parse_range(range_str, total_pages)
        if not target_pages:
            raise ValueError("No valid pages found in the specified range.")
        
        writer = PdfWriter()
        for idx in target_pages:
            writer.add_page(reader.pages[idx])
        
        out_name = f"split_{os.path.basename(file_path)}"
        out_path = os.path.join(output_dir, out_name)
        with open(out_path, "wb") as f:
            writer.write(f)
        return out_path
    
    elif split_mode == "all":
        # Split every page into separate files and ZIP them
        base_name = os.path.splitext(os.path.basename(file_path))[0]
        zip_path = os.path.join(output_dir, f"split_{base_name}.zip")
        
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for i in range(total_pages):
                writer = PdfWriter()
                writer.add_page(reader.pages[i])
                page_name = f"{base_name}_page_{i+1}.pdf"
                page_path = os.path.join(output_dir, page_name)
                
                with open(page_path, "wb") as f:
                    writer.write(f)
                
                zip_file.write(page_path, page_name)
                os.remove(page_path) # Clean up individual page
                
        return zip_path
    else:
        raise ValueError(f"Unknown split mode: {split_mode}")

def rotate_pdf(file_path, output_path, degrees=90):
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")
    
    if degrees not in [90, 180, 270]:
        raise ValueError("Rotation angle must be 90, 180, or 270 degrees.")
        
    reader = PdfReader(file_path)
    writer = PdfWriter()
    
    for page in reader.pages:
        # pypdf's rotate takes degrees to add (clockwise)
        page.rotate(degrees)
        writer.add_page(page)
        
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "wb") as f:
        writer.write(f)
    return output_path

def main():
    try:
        # Read parameters from stdin
        input_data = sys.stdin.read()
        if not input_data:
            print(json.dumps({"success": False, "error": "No input arguments provided."}))
            return
            
        params = json.loads(input_data)
        action = params.get("action")
        
        if action == "merge":
            files = params.get("files")
            output = params.get("output")
            result = merge_pdfs(files, output)
            print(json.dumps({"success": True, "output": result}))
            
        elif action == "split":
            file_path = params.get("file")
            output_dir = params.get("output_dir")
            split_mode = params.get("split_mode", "all")
            range_str = params.get("range", "")
            result = split_pdf(file_path, output_dir, split_mode, range_str)
            print(json.dumps({"success": True, "output": result}))
            
        elif action == "rotate":
            file_path = params.get("file")
            output = params.get("output")
            degrees = int(params.get("degrees", 90))
            result = rotate_pdf(file_path, output, degrees)
            print(json.dumps({"success": True, "output": result}))
            
        else:
            print(json.dumps({"success": False, "error": f"Unknown action: {action}"}))
            
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))

if __name__ == "__main__":
    main()
