import os
import sys
import json
import tempfile
from pypdf import PdfReader, PdfWriter
import pikepdf
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor

def protect_pdf(file_path, output_path, password):
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")
    if not password:
        raise ValueError("Password cannot be empty.")
        
    # Use pikepdf for strong encryption support
    with pikepdf.open(file_path) as pdf:
        enc = pikepdf.Encryption(user=password, owner=password, allow=pikepdf.Permissions(accessibility=True))
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        pdf.save(output_path, encryption=enc)
    return output_path

def unlock_pdf(file_path, output_path, password):
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")
        
    try:
        # Try pikepdf decryption
        with pikepdf.open(file_path, password=password) as pdf:
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            pdf.save(output_path)
        return output_path
    except Exception as pikepdf_err:
        # Try pypdf fallback
        try:
            reader = PdfReader(file_path)
            if reader.is_encrypted:
                decrypt_success = reader.decrypt(password)
                if decrypt_success == 0:
                    raise ValueError("Incorrect password.")
            writer = PdfWriter()
            for page in reader.pages:
                writer.add_page(page)
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            with open(output_path, "wb") as f:
                writer.write(f)
            return output_path
        except Exception as pypdf_err:
            clean_err = str(pikepdf_err).replace(file_path, os.path.basename(file_path))
            if "password" in clean_err.lower() or "decrypt" in clean_err.lower() or "unauthorized" in clean_err.lower():
                raise ValueError("Failed to decrypt PDF: invalid password")
            else:
                raise ValueError(f"Failed to decrypt PDF: {clean_err}")

def create_watermark_pdf(text, width, height, font_name="Helvetica", font_size=40, opacity=0.3, color="#888888"):
    temp_fd, temp_path = tempfile.mkstemp(suffix=".pdf")
    os.close(temp_fd)
    
    c = canvas.Canvas(temp_path, pagesize=(width, height))
    c.translate(width / 2, height / 2)
    c.rotate(45)
    
    # Configure color with opacity
    try:
        base_color = HexColor(color)
    except Exception:
        base_color = HexColor("#888888")
        
    c.setFillColor(base_color, alpha=opacity)
    c.setFont(font_name, font_size)
    c.drawCentredString(0, 0, text)
    c.save()
    return temp_path

def watermark_pdf(file_path, output_path, text, font_size=40, opacity=0.3, color="#888888"):
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")
        
    reader = PdfReader(file_path)
    writer = PdfWriter()
    
    # Store dynamic watermark paths to clean up
    temp_watermarks = {}
    
    for i, page in enumerate(reader.pages):
        mediabox = page.mediabox
        width = float(mediabox.width)
        height = float(mediabox.height)
        
        # Avoid creating duplicate watermark PDFs of the same size
        dims = (width, height)
        if dims not in temp_watermarks:
            wm_path = create_watermark_pdf(text, width, height, font_size=font_size, opacity=opacity, color=color)
            temp_watermarks[dims] = wm_path
            
        wm_path = temp_watermarks[dims]
        wm_reader = PdfReader(wm_path)
        wm_page = wm_reader.pages[0]
        
        page.merge_page(wm_page)
        writer.add_page(page)
        
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "wb") as f:
        writer.write(f)
        
    # Clean up temp watermarks
    for path in temp_watermarks.values():
        try:
            os.remove(path)
        except Exception:
            pass
            
    return output_path

def main():
    try:
        input_data = sys.stdin.read()
        if not input_data:
            print(json.dumps({"success": False, "error": "No input arguments provided."}))
            return
            
        params = json.loads(input_data)
        action = params.get("action")
        
        if action == "protect":
            file_path = params.get("file")
            output = params.get("output")
            password = params.get("password")
            result = protect_pdf(file_path, output, password)
            print(json.dumps({"success": True, "output": result}))
            
        elif action == "unlock":
            file_path = params.get("file")
            output = params.get("output")
            password = params.get("password")
            result = unlock_pdf(file_path, output, password)
            print(json.dumps({"success": True, "output": result}))
            
        elif action == "watermark":
            file_path = params.get("file")
            output = params.get("output")
            text = params.get("text", "CONFIDENTIAL")
            font_size = int(params.get("font_size", 40))
            opacity = float(params.get("opacity", 0.3))
            color = params.get("color", "#888888")
            result = watermark_pdf(file_path, output, text, font_size, opacity, color)
            print(json.dumps({"success": True, "output": result}))
            
        else:
            print(json.dumps({"success": False, "error": f"Unknown action: {action}"}))
            
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))

if __name__ == "__main__":
    main()
