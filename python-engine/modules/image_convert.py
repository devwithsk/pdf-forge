import os
import sys
import json
import zipfile
import traceback
from PIL import Image
from pdf2image import convert_from_path
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, letter
from limits import assert_pdf_limits, MAX_IMAGE_PIXELS

Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS

def pdf_to_jpg(file_path, output_dir, img_format='jpg', dpi=120, quality=82, poppler_path=None):
    reader = assert_pdf_limits(file_path)
    os.makedirs(output_dir, exist_ok=True)
    
    base_name = os.path.splitext(os.path.basename(file_path))[0]
    zip_path = os.path.join(output_dir, f"{base_name}_images.zip")
    
    kwargs = {}
    if poppler_path and os.path.exists(poppler_path):
        kwargs["poppler_path"] = poppler_path
        
    total_pages = len(reader.pages)
    
    try:
        if total_pages == 1:
            pages = convert_from_path(
                file_path, 
                dpi=dpi, 
                first_page=1, 
                last_page=1, 
                thread_count=1, 
                **kwargs
            )
            if pages:
                img_name = f"{base_name}.{img_format}"
                img_path = os.path.join(output_dir, img_name)
                save_format = 'PNG' if img_format.lower() == 'png' else 'JPEG'
                if save_format == 'PNG':
                    pages[0].save(img_path, save_format)
                else:
                    pages[0].save(img_path, save_format, quality=quality, optimize=True)
                return img_path
            else:
                raise RuntimeError("Failed to convert the single page PDF.")

        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for page_no in range(1, total_pages + 1):
                # Convert pages one by one to prevent loading everything into RAM
                pages = convert_from_path(
                    file_path, 
                    dpi=dpi, 
                    first_page=page_no, 
                    last_page=page_no, 
                    thread_count=1, 
                    **kwargs
                )
                if not pages:
                    continue
                img_name = f"{base_name}_page_{page_no}.{img_format}"
                img_path = os.path.join(output_dir, img_name)
                save_format = 'PNG' if img_format.lower() == 'png' else 'JPEG'
                if save_format == 'PNG':
                    pages[0].save(img_path, save_format)
                else:
                    pages[0].save(img_path, save_format, quality=quality, optimize=True)
                zip_file.write(img_path, img_name)
                os.remove(img_path)
    except Exception as e:
        # Provide a descriptive error message indicating poppler requirements
        raise RuntimeError(
            "PDF to JPG conversion failed. Please ensure 'poppler' is installed and configured correctly. "
            f"Original Error: {str(e)}"
        )
        
    return zip_path

def create_pdf_from_images(image_paths, output_pdf_path, paper_size, orientation):
    c = canvas.Canvas(output_pdf_path)
    
    # 20mm margin in points (1 mm = 72 / 25.4 points)
    margin = 20.0 * 72.0 / 25.4
    
    for img_path in image_paths:
        if not os.path.exists(img_path):
            raise FileNotFoundError(f"Image not found: {img_path}")
            
        with Image.open(img_path) as img:
            img_w, img_h = img.size
            
        # Determine page size based on paper_size and orientation
        p_size = paper_size.lower()
        if p_size == 'a4':
            base_w, base_h = A4
        elif p_size == 'letter':
            base_w, base_h = letter
        else: # 'auto'
            base_w, base_h = img_w, img_h
            
        if p_size in ['a4', 'letter']:
            if orientation.lower() == 'landscape':
                page_w, page_h = max(base_w, base_h), min(base_w, base_h)
            else: # portrait
                page_w, page_h = min(base_w, base_h), max(base_w, base_h)
        else: # auto
            if orientation.lower() == 'landscape':
                page_w, page_h = max(base_w, base_h), min(base_w, base_h)
            elif orientation.lower() == 'portrait':
                page_w, page_h = min(base_w, base_h), max(base_w, base_h)
            else:
                page_w, page_h = base_w, base_h
                
        # Margin is 0 for auto, 20mm for others
        m = 0.0 if p_size == 'auto' else margin
        
        avail_w = page_w - 2.0 * m
        avail_h = page_h - 2.0 * m
        
        # Avoid zero or negative size
        if avail_w <= 0: avail_w = 1.0
        if avail_h <= 0: avail_h = 1.0
        
        scale_w = avail_w / img_w
        scale_h = avail_h / img_h
        scale = min(scale_w, scale_h)
        
        new_w = img_w * scale
        new_h = img_h * scale
        
        x_offset = m + (avail_w - new_w) / 2.0
        y_offset = m + (avail_h - new_h) / 2.0
        
        c.setPageSize((page_w, page_h))
        c.drawImage(img_path, x_offset, y_offset, width=new_w, height=new_h)
        c.showPage()
        
    c.save()

def jpg_to_pdf(image_paths, output_path, paper_size='A4', orientation='Portrait', merge_mode='merge'):
    try:
        if not image_paths:
            raise ValueError("At least one image is required for PDF conversion.")
        if len(image_paths) > 100:
            raise ValueError("Exceeds maximum limit of 100 images.")
            
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        if merge_mode == 'merge':
            create_pdf_from_images(image_paths, output_path, paper_size, orientation)
        else: # 'individual'
            # output_path is a ZIP file.
            # We will create temporary PDFs in the same output directory, zip them, and clean up.
            temp_files = []
            base_dir = os.path.dirname(output_path)
            base_name = os.path.splitext(os.path.basename(output_path))[0]
            
            zip_path = output_path
            
            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                added_names = {}
                for idx, img_path in enumerate(image_paths):
                    # get original filename without extension or use standard indexing
                    orig_name = os.path.splitext(os.path.basename(img_path))[0]
                    
                    # Deduplicate name inside ZIP
                    if orig_name in added_names:
                        added_names[orig_name] += 1
                        pdf_name = f"{orig_name}_{added_names[orig_name]}.pdf"
                    else:
                        added_names[orig_name] = 0
                        pdf_name = f"{orig_name}.pdf"
                    
                    temp_pdf_name = f"{base_name}_{idx}_{orig_name}.pdf"
                    temp_pdf_path = os.path.join(base_dir, temp_pdf_name)
                    
                    # Convert this single image
                    create_pdf_from_images([img_path], temp_pdf_path, paper_size, orientation)
                    
                    # Add to ZIP under clean filename
                    zip_file.write(temp_pdf_path, pdf_name)
                    
                    # Track for cleanup
                    temp_files.append(temp_pdf_path)
                    
            # Clean up temp PDFs
            for temp_file in temp_files:
                try:
                    os.remove(temp_file)
                except OSError:
                    pass
                    
        return output_path
    except Exception as e:
        print("Python Exception Traceback:", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        raise e

def main():
    try:
        # Check command line arguments first
        if len(sys.argv) >= 2:
            action = sys.argv[1]
            if action == "jpg2pdf":
                # Positional command line arguments:
                # sys.argv[1]: "jpg2pdf"
                # sys.argv[2]: comma-separated image paths
                # sys.argv[3]: output path
                # sys.argv[4]: paper size
                # sys.argv[5]: orientation
                # sys.argv[6]: merge mode (merge | individual)
                images = sys.argv[2].split(",")
                output = sys.argv[3]
                paper_size = sys.argv[4] if len(sys.argv) > 4 else "A4"
                orientation = sys.argv[5] if len(sys.argv) > 5 else "portrait"
                merge_mode = sys.argv[6] if len(sys.argv) > 6 else "merge"
                
                result = jpg_to_pdf(images, output, paper_size, orientation, merge_mode)
                print(json.dumps({"success": True, "output": result}))
                return
            elif action == "pdf2jpg":
                # sys.argv[2]: input pdf path
                # sys.argv[3]: output directory
                # sys.argv[4]: image format (jpg/png)
                # sys.argv[5]: dpi
                # sys.argv[6]: quality
                file_path = sys.argv[2]
                output_dir = sys.argv[3]
                img_format = sys.argv[4] if len(sys.argv) > 4 else "jpg"
                dpi = int(sys.argv[5]) if len(sys.argv) > 5 else 120
                quality = int(sys.argv[6]) if len(sys.argv) > 6 else 82
                result = pdf_to_jpg(file_path, output_dir, img_format=img_format, dpi=dpi, quality=quality)
                print(json.dumps({"success": True, "output": result}))
                return

        # Fallback to stdin JSON payload
        input_data = sys.stdin.read()
        if not input_data:
            print(json.dumps({"success": False, "error": "No input arguments provided."}))
            return
            
        params = json.loads(input_data)
        action = params.get("action")
        
        if action == "pdf2jpg":
            file_path = params.get("file")
            output_dir = params.get("output_dir")
            poppler_path = params.get("poppler_path")
            img_format = params.get("format", "jpg")
            dpi = int(params.get("dpi", 120))
            quality = int(params.get("quality", 82))
            result = pdf_to_jpg(file_path, output_dir, img_format=img_format, dpi=dpi, quality=quality, poppler_path=poppler_path)
            print(json.dumps({"success": True, "output": result}))
            
        elif action == "jpg2pdf":
            images = params.get("images")
            output = params.get("output")
            paper_size = params.get("paperSize", "A4")
            orientation = params.get("orientation", "Portrait")
            merge_mode = params.get("mergeMode", "merge")
            result = jpg_to_pdf(images, output, paper_size, orientation, merge_mode)
            print(json.dumps({"success": True, "output": result}))
            
        else:
            print(json.dumps({"success": False, "error": f"Unknown action: {action}"}))
            
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))

if __name__ == "__main__":
    main()
