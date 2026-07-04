import os
import sys
import json
import zipfile
import subprocess
import shutil
import pikepdf
from pypdf import PdfReader, PdfWriter
from limits import assert_pdf_limits
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor

def add_page_numbers(input_path, output_path, position='bottom_center', starting_number=1):
    reader = assert_pdf_limits(input_path)
    total_pages = len(reader.pages)
    
    # We will generate a temp PDF containing just the page numbers overlay,
    # then merge page by page.
    temp_num_path = input_path + ".temp_nums.pdf"
    
    try:
        c = canvas.Canvas(temp_num_path)
        
        for idx in range(total_pages):
            page = reader.pages[idx]
            # Get width and height of the page to position dynamically
            width = float(page.mediabox.width)
            height = float(page.mediabox.height)
            
            c.setPageSize((width, height))
            c.setFont("Helvetica", 10)
            c.setFillColor(HexColor("#333333"))
            
            page_num_str = str(starting_number + idx)
            
            # Position coordinates
            margin = 36 # 0.5 inch margins
            
            if position == 'bottom_center':
                x = width / 2.0
                y = margin
                c.drawCentredString(x, y, page_num_str)
            elif position == 'bottom_right':
                x = width - margin
                y = margin
                c.drawRightString(x, y, page_num_str)
            elif position == 'bottom_left':
                x = margin
                y = margin
                c.drawString(x, y, page_num_str)
            elif position == 'top_center':
                x = width / 2.0
                y = height - margin
                c.drawCentredString(x, y, page_num_str)
            elif position == 'top_right':
                x = width - margin
                y = height - margin
                c.drawRightString(x, y, page_num_str)
            elif position == 'top_left':
                x = margin
                y = height - margin
                c.drawString(x, y, page_num_str)
            else: # default bottom_center
                x = width / 2.0
                y = margin
                c.drawCentredString(x, y, page_num_str)
                
            c.showPage()
            
        c.save()
        
        # Merge the numbers PDF onto the original
        num_reader = PdfReader(temp_num_path)
        writer = PdfWriter()
        
        for idx in range(total_pages):
            orig_page = reader.pages[idx]
            num_page = num_reader.pages[idx]
            orig_page.merge_page(num_page)
            writer.add_page(orig_page)
            
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "wb") as f:
            writer.write(f)
            
    finally:
        if os.path.exists(temp_num_path):
            try:
                os.remove(temp_num_path)
            except OSError:
                pass
                
    return output_path

def compress_pdf(input_path, output_path):
    # Check if input path exists and limits
    assert_pdf_limits(input_path)
    
    # Try different executable names for Ghostscript depending on platform
    gs_executable = None
    for exe in ["gs", "gswin64c", "gswin32c"]:
        if shutil.which(exe):
            gs_executable = exe
            break
            
    if gs_executable:
        try:
            subprocess.run([
                gs_executable, 
                '-sDEVICE=pdfwrite', 
                '-dCompatibilityLevel=1.4', 
                '-dPDFSETTINGS=/screen', 
                '-dNOPAUSE', 
                '-dQUIET', 
                '-dBATCH', 
                f'-sOutputFile={output_path}', 
                input_path
            ], check=True)
            return output_path
        except subprocess.CalledProcessError as e:
            # If gs fails, let's fall back to basic pypdf content stream compression
            pass

    # Fallback to pypdf content stream compression
    reader = assert_pdf_limits(input_path)
    writer = PdfWriter()
    for page in reader.pages:
        page.compress_content_streams()
        writer.add_page(page)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "wb") as f:
        writer.write(f)
    return output_path

def repair_pdf(input_path, output_path):
    assert_pdf_limits(input_path)
    try:
        with pikepdf.Pdf.open(input_path, recover=True) as pdf:
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            pdf.save(output_path)
        return output_path
    except Exception as e:
        # Fallback to simple copy or pypdf re-writing if pikepdf fails
        reader = assert_pdf_limits(input_path)
        writer = PdfWriter()
        for page in reader.pages:
            writer.add_page(page)
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "wb") as f:
            writer.write(f)
        return output_path


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

def merge_pdfs(files, output_path, add_blank_page=False, compress=False):
    if not files or len(files) < 2:
        raise ValueError("At least two files are required for merging.")
    
    merger = PdfWriter()
    total_pages = 0
    for file in files:
        reader = assert_pdf_limits(file)
        file_pages = len(reader.pages)
        total_pages += file_pages
        if total_pages > 100:
            raise ValueError("Merged PDF exceeds 100 page limit.")
        
        merger.append(file)
        
        # If add_blank_page is enabled and file has an odd number of pages, append a blank page
        if add_blank_page and (file_pages % 2 != 0):
            merger.add_blank_page()
            total_pages += 1

    if compress:
        for page in merger.pages:
            page.compress_content_streams()
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "wb") as f:
        merger.write(f)
    merger.close()
    return output_path

def split_pdf(file_path, output_dir, split_mode="all", range_str=""):
    reader = assert_pdf_limits(file_path)
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
    if degrees not in [90, 180, 270]:
        raise ValueError("Rotation angle must be 90, 180, or 270 degrees.")
        
    reader = assert_pdf_limits(file_path)
    writer = PdfWriter()
    
    for page in reader.pages:
        # pypdf's rotate takes degrees to add (clockwise)
        page.rotate(degrees)
        writer.add_page(page)
        
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "wb") as f:
        writer.write(f)
    return output_path

def reorder_pdf_pages(input_path, output_path, page_order):
    """
    Writes a new PDF containing exactly the pages specified in page_order.
    page_order is a list of 0-based page indices in the desired output order.
    This serves both 'remove-pages' (subset with same order) and
    'organize-pdf' (full set with different order) tools.
    """
    reader = assert_pdf_limits(input_path)
    total_pages = len(reader.pages)
    
    if not page_order:
        raise ValueError("page_order must contain at least one page index.")
    
    for idx in page_order:
        if not isinstance(idx, int) or idx < 0 or idx >= total_pages:
            raise ValueError(
                f"Invalid page index {idx}. PDF has {total_pages} pages (0-indexed)."
            )
    
    writer = PdfWriter()
    for idx in page_order:
        writer.add_page(reader.pages[idx])
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "wb") as f:
        writer.write(f)
    return output_path

def main():
    try:
        # Check command line arguments first
        if len(sys.argv) >= 3:
            action = sys.argv[1]
            if action == "merge":
                files = sys.argv[2].split(",")
                output = sys.argv[3]
                add_blank_page = (sys.argv[4].lower() == "true") if len(sys.argv) > 4 else False
                compress = (sys.argv[5].lower() == "true") if len(sys.argv) > 5 else False
                result = merge_pdfs(files, output, add_blank_page=add_blank_page, compress=compress)
                print(json.dumps({"success": True, "output": result}))
                return
            elif action == "split":
                file_path = sys.argv[2]
                output_dir = sys.argv[3]
                split_mode = sys.argv[4] if len(sys.argv) > 4 else "all"
                range_str = sys.argv[5] if len(sys.argv) > 5 else ""
                result = split_pdf(file_path, output_dir, split_mode, range_str)
                print(json.dumps({"success": True, "output": result}))
                return
            elif action == "rotate":
                file_path = sys.argv[2]
                output = sys.argv[3]
                degrees = int(sys.argv[4]) if len(sys.argv) > 4 else 90
                result = rotate_pdf(file_path, output, degrees)
                print(json.dumps({"success": True, "output": result}))
                return
            elif action == "reorder":
                file_path = sys.argv[2]
                output = sys.argv[3]
                page_order = [int(x) for x in sys.argv[4].split(",")] if len(sys.argv) > 4 else []
                result = reorder_pdf_pages(file_path, output, page_order)
                print(json.dumps({"success": True, "output": result}))
                return
            elif action == "compress":
                file_path = sys.argv[2]
                output = sys.argv[3]
                result = compress_pdf(file_path, output)
                print(json.dumps({"success": True, "output": result}))
                return
            elif action == "repair":
                file_path = sys.argv[2]
                output = sys.argv[3]
                result = repair_pdf(file_path, output)
                print(json.dumps({"success": True, "output": result}))
                return
            elif action == "numbers":
                file_path = sys.argv[2]
                output = sys.argv[3]
                position = sys.argv[4] if len(sys.argv) > 4 else "bottom_center"
                starting_number = int(sys.argv[5]) if len(sys.argv) > 5 else 1
                result = add_page_numbers(file_path, output, position, starting_number)
                print(json.dumps({"success": True, "output": result}))
                return

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
            add_blank_page = params.get("add_blank_page", False)
            compress = params.get("compress", False)
            result = merge_pdfs(files, output, add_blank_page=add_blank_page, compress=compress)
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
        
        elif action == "reorder":
            file_path = params.get("file")
            output = params.get("output")
            page_order = [int(i) for i in params.get("page_order", [])]
            result = reorder_pdf_pages(file_path, output, page_order)
            print(json.dumps({"success": True, "output": result}))
            
        elif action == "compress":
            file_path = params.get("file")
            output = params.get("output")
            result = compress_pdf(file_path, output)
            print(json.dumps({"success": True, "output": result}))
            
        elif action == "repair":
            file_path = params.get("file")
            output = params.get("output")
            result = repair_pdf(file_path, output)
            print(json.dumps({"success": True, "output": result}))
            
        elif action == "numbers":
            file_path = params.get("file")
            output = params.get("output")
            position = params.get("position", "bottom_center")
            starting_number = int(params.get("starting_number", 1))
            result = add_page_numbers(file_path, output, position, starting_number)
            print(json.dumps({"success": True, "output": result}))
            
        else:
            print(json.dumps({"success": False, "error": f"Unknown action: {action}"}))
            
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))

if __name__ == "__main__":
    main()
