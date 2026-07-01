import os
import sys
import json
import zipfile
from PIL import Image
from pdf2image import convert_from_path

def pdf_to_jpg(file_path, output_dir, poppler_path=None):
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")
        
    try:
        # Convert PDF pages to PIL images
        kwargs = {}
        if poppler_path and os.path.exists(poppler_path):
            kwargs["poppler_path"] = poppler_path
            
        pages = convert_from_path(file_path, dpi=150, **kwargs)
    except Exception as e:
        # Provide a descriptive error message indicating poppler requirements
        raise RuntimeError(
            "PDF to JPG conversion failed. Please ensure 'poppler' is installed and configured correctly. "
            f"Original Error: {str(e)}"
        )
        
    base_name = os.path.splitext(os.path.basename(file_path))[0]
    zip_path = os.path.join(output_dir, f"{base_name}_images.zip")
    
    os.makedirs(output_dir, exist_ok=True)
    
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for idx, page in enumerate(pages):
            img_name = f"{base_name}_page_{idx+1}.jpg"
            img_path = os.path.join(output_dir, img_name)
            page.save(img_path, 'JPEG', quality=85)
            zip_file.write(img_path, img_name)
            os.remove(img_path) # remove temp file
            
    return zip_path

def jpg_to_pdf(image_paths, output_path):
    if not image_paths:
        raise ValueError("At least one image is required for PDF conversion.")
        
    # Standard A4 size in points (72 points per inch: 8.27 x 11.69 inches)
    A4_WIDTH = 595
    A4_HEIGHT = 842
    MARGIN = 36 # 0.5 inch margins
    
    max_w = A4_WIDTH - (2 * MARGIN)
    max_h = A4_HEIGHT - (2 * MARGIN)
    
    try:
        resample_method = Image.Resampling.LANCZOS
    except AttributeError:
        resample_method = Image.ANTIALIAS
        
    processed_pages = []
    
    for path in image_paths:
        if not os.path.exists(path):
            raise FileNotFoundError(f"Image not found: {path}")
            
        img = Image.open(path)
        
        # Create a blank white A4 canvas
        canvas = Image.new("RGB", (A4_WIDTH, A4_HEIGHT), "white")
        
        # Calculate scaling to fit within margins while preserving aspect ratio
        img_w, img_h = img.size
        scale_w = max_w / img_w
        scale_h = max_h / img_h
        scale = min(scale_w, scale_h)
        
        new_w = int(img_w * scale)
        new_h = int(img_h * scale)
        
        # Resize and center on the A4 page
        resized_img = img.resize((new_w, new_h), resample=resample_method)
        
        paste_x = (A4_WIDTH - new_w) // 2
        paste_y = (A4_HEIGHT - new_h) // 2
        
        canvas.paste(resized_img, (paste_x, paste_y))
        processed_pages.append(canvas)
        
        # Close original image to release memory
        img.close()
        
    if not processed_pages:
        raise ValueError("Failed to process uploaded images.")
        
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # Save the A4 sheets as PDF
    first_page = processed_pages[0]
    first_page.save(output_path, "PDF", save_all=True, append_images=processed_pages[1:])
    
    # Close generated canvas images
    for page in processed_pages:
        page.close()
        
    return output_path

def main():
    try:
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
            result = pdf_to_jpg(file_path, output_dir, poppler_path)
            print(json.dumps({"success": True, "output": result}))
            
        elif action == "jpg2pdf":
            images = params.get("images")
            output = params.get("output")
            result = jpg_to_pdf(images, output)
            print(json.dumps({"success": True, "output": result}))
            
        else:
            print(json.dumps({"success": False, "error": f"Unknown action: {action}"}))
            
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))

if __name__ == "__main__":
    main()
