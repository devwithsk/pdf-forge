import os
import sys
import json
from pdf2docx import Converter
from reportlab.lib.pagesizes import letter, landscape
from limits import assert_pdf_limits
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

# Try to import Windows COM libraries for high-fidelity conversion if running on Windows with Office installed
COM_AVAILABLE = False
if sys.platform == "win32":
    try:
        import win32com.client
        import comtypes.client
        COM_AVAILABLE = True
    except ImportError:
        pass

def convert_word_to_pdf_com(file_path, output_path):
    """Converts DOCX to PDF using Word COM automation on Windows."""
    # Ensure absolute paths
    abs_input = os.path.abspath(file_path)
    abs_output = os.path.abspath(output_path)
    
    # We initialize COM and open Word
    import comtypes.client
    word = comtypes.client.CreateObject("Word.Application")
    word.Visible = False
    try:
        doc = word.Documents.Open(abs_input)
        # 17 represents wdFormatPDF
        doc.SaveAs(abs_output, FileFormat=17)
        doc.Close()
    finally:
        word.Quit()

def convert_excel_to_pdf_com(file_path, output_path):
    """Converts XLSX to PDF using Excel COM automation on Windows."""
    abs_input = os.path.abspath(file_path)
    abs_output = os.path.abspath(output_path)
    
    import win32com.client
    excel = win32com.client.Dispatch("Excel.Application")
    excel.Visible = False
    try:
        wb = excel.Workbooks.Open(abs_input)
        # Type=0 represents xlTypePDF
        wb.ExportAsFixedFormat(0, abs_output)
        wb.Close(False)
    finally:
        excel.Quit()

def word_to_pdf_portable(file_path, output_path):
    """Fallback cross-platform docx to pdf renderer using python-docx and reportlab."""
    import docx
    
    doc = docx.Document(file_path)
    if len(doc.paragraphs) > 1000:
        raise ValueError("Word document exceeds 1000 paragraph limit.")
    doc_template = SimpleDocTemplate(
        output_path, 
        pagesize=letter,
        rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40
    )
    
    styles = getSampleStyleSheet()
    story = []
    
    # Custom heading styles
    heading1_style = ParagraphStyle(
        name='DocxHeading1',
        parent=styles['Heading1'],
        fontSize=18,
        leading=22,
        spaceAfter=8
    )
    heading2_style = ParagraphStyle(
        name='DocxHeading2',
        parent=styles['Heading2'],
        fontSize=14,
        leading=18,
        spaceAfter=6
    )
    normal_style = ParagraphStyle(
        name='DocxNormal',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        spaceAfter=6
    )
    
    for paragraph in doc.paragraphs:
        text = paragraph.text.strip()
        if not text:
            story.append(Spacer(1, 10))
            continue
            
        style_name = paragraph.style.name.lower()
        if "heading 1" in style_name:
            story.append(Paragraph(text, heading1_style))
        elif "heading 2" in style_name:
            story.append(Paragraph(text, heading2_style))
        else:
            story.append(Paragraph(text, normal_style))
            
    # Also parse tables if present
    for table in doc.tables:
        table_data = []
        for row in table.rows:
            row_text = [cell.text.strip() for cell in row.cells]
            table_data.append(row_text)
            
        if table_data:
            t = Table(table_data)
            t.setStyle(TableStyle([
                ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
                ('BACKGROUND', (0,0), (-1,0), colors.lightgrey),
                ('PADDING', (0,0), (-1,-1), 6),
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('FONTSIZE', (0,0), (-1,-1), 9),
            ]))
            story.append(Spacer(1, 10))
            story.append(t)
            story.append(Spacer(1, 10))

    if not story:
        story.append(Paragraph("Empty Document", normal_style))
        
    doc_template.build(story)

def excel_to_pdf_portable(file_path, output_path):
    """Fallback cross-platform xlsx to pdf renderer using openpyxl and reportlab."""
    import openpyxl
    
    wb = openpyxl.load_workbook(file_path, data_only=True)
    if len(wb.sheetnames) > 20:
        raise ValueError("Excel file exceeds 20 sheet limit.")
    doc_template = SimpleDocTemplate(
        output_path, 
        pagesize=landscape(letter),
        rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30
    )
    
    styles = getSampleStyleSheet()
    story = []
    
    title_style = ParagraphStyle(
        name='SheetTitle', 
        parent=styles['Heading2'], 
        fontSize=12, 
        leading=16,
        spaceAfter=10
    )
    
    normal_style = ParagraphStyle(
        name='ExcelNormal',
        parent=styles['Normal'],
        fontSize=8,
        leading=10
    )
    
    for sheet_idx, sheet_name in enumerate(wb.sheetnames):
        sheet = wb[sheet_name]
        if sheet_idx > 0:
            story.append(PageBreak())
            
        story.append(Paragraph(f"Sheet: {sheet_name}", title_style))
        
        # Read grid data
        data = []
        for row in sheet.iter_rows(values_only=True):
            if not any(row is not None and str(row_cell).strip() for row_cell in row if row_cell is not None):
                continue # Skip empty row
            row_data = [str(cell) if cell is not None else "" for cell in row]
            data.append(row_data)
            
        if not data:
            story.append(Paragraph("Empty Sheet", styles['Normal']))
            continue
            
        # Chop cols to prevent overflowing width
        max_cols = 10
        data_sliced = [r[:max_cols] for r in data]
        
        # Wrap strings in Paragraphs to auto-wrap inside table cells
        wrapped_data = []
        for r_idx, row_list in enumerate(data_sliced):
            wrapped_row = []
            for col_val in row_list:
                wrapped_row.append(Paragraph(col_val, normal_style))
            wrapped_data.append(wrapped_row)
            
        t = Table(wrapped_data)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0F62FE")),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.lightgrey),
            ('PADDING', (0,0), (-1,-1), 4),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        story.append(t)
        
    doc_template.build(story)

def word_to_pdf(file_path, output_path):
    if COM_AVAILABLE:
        try:
            convert_word_to_pdf_com(file_path, output_path)
            return output_path
        except Exception as com_err:
            # Fall back to python-docx + reportlab
            word_to_pdf_portable(file_path, output_path)
            return output_path
    else:
        word_to_pdf_portable(file_path, output_path)
        return output_path

def excel_to_pdf(file_path, output_path):
    if COM_AVAILABLE:
        try:
            convert_excel_to_pdf_com(file_path, output_path)
            return output_path
        except Exception as com_err:
            excel_to_pdf_portable(file_path, output_path)
            return output_path
    else:
        excel_to_pdf_portable(file_path, output_path)
        return output_path

def pdf_to_word(file_path, output_path):
    assert_pdf_limits(file_path)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    cv = Converter(file_path)
    # Convert all pages
    cv.convert(output_path, start=0, end=None)
    cv.close()
    return output_path

def pdf_to_excel(file_path, output_path):
    import openpyxl
    import re
    
    reader = assert_pdf_limits(file_path)
    wb = openpyxl.Workbook()
    
    # Remove default sheet
    default_sheet = wb.active
    wb.remove(default_sheet)
    
    for idx, page in enumerate(reader.pages):
        ws = wb.create_sheet(title=f"Page {idx+1}")
        text = page.extract_text()
        if not text:
            continue
        
        row_num = 1
        for line in text.split('\n'):
            line = line.strip()
            if not line:
                continue
            parts = re.split(r'\t| {2,}', line)
            for col_num, part in enumerate(parts):
                ws.cell(row=row_num, column=col_num+1, value=part)
            row_num += 1
            
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    wb.save(output_path)
    return output_path

def pdf_to_ppt(file_path, output_path):
    from pptx import Presentation
    from pptx.util import Inches, Pt
    
    reader = assert_pdf_limits(file_path)
    prs = Presentation()
    blank_layout = prs.slide_layouts[6] # Blank slide
    
    for idx, page in enumerate(reader.pages):
        slide = prs.slides.add_slide(blank_layout)
        text = page.extract_text()
        if not text:
            continue
        
        # Sizing box
        left = Inches(0.75)
        top = Inches(0.75)
        width = Inches(8.5)
        height = Inches(6.0)
        
        txBox = slide.shapes.add_textbox(left, top, width, height)
        tf = txBox.text_frame
        tf.word_wrap = True
        
        for i, line in enumerate(text.split('\n')):
            line = line.strip()
            if not line:
                continue
            if i == 0:
                p = tf.paragraphs[0]
                p.text = line
                p.font.bold = True
                p.font.size = Pt(20)
                p.space_after = Pt(14)
            else:
                p = tf.add_paragraph()
                p.text = line
                p.font.size = Pt(12)
                p.space_after = Pt(6)
                
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    prs.save(output_path)
    return output_path

def convert_ppt_to_pdf_com(file_path, output_path):
    abs_input = os.path.abspath(file_path)
    abs_output = os.path.abspath(output_path)
    
    import win32com.client
    powerpoint = win32com.client.Dispatch("PowerPoint.Application")
    try:
        pres = powerpoint.Presentations.Open(abs_input, WithWindow=False)
        # ppSaveAsPDF is 32
        pres.SaveAs(abs_output, FileFormat=32)
        pres.Close()
    finally:
        powerpoint.Quit()

def ppt_to_pdf_portable(file_path, output_path):
    from pptx import Presentation
    
    prs = Presentation(file_path)
    if len(prs.slides) > 100:
        raise ValueError("PowerPoint presentation exceeds 100 slide limit.")
    doc_template = SimpleDocTemplate(
        output_path, 
        pagesize=landscape(letter),
        rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40
    )
    
    styles = getSampleStyleSheet()
    story = []
    
    normal_style = ParagraphStyle(
        name='PptNormal',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        spaceAfter=6
    )
    
    title_style = ParagraphStyle(
        name='PptTitle',
        parent=styles['Heading2'],
        fontSize=16,
        leading=20,
        spaceAfter=12
    )
    
    for idx, slide in enumerate(prs.slides):
        if idx > 0:
            story.append(PageBreak())
            
        story.append(Paragraph(f"Slide {idx+1}", title_style))
        
        # Read text shapes
        for shape in slide.shapes:
            if shape.has_text_frame:
                for paragraph in shape.text_frame.paragraphs:
                    text = paragraph.text.strip()
                    if text:
                        story.append(Paragraph(text, normal_style))
                        
    if not story:
        story.append(Paragraph("Empty Presentation", normal_style))
        
    doc_template.build(story)

def ppt_to_pdf(file_path, output_path):
    if COM_AVAILABLE:
        try:
            convert_ppt_to_pdf_com(file_path, output_path)
            return output_path
        except Exception:
            ppt_to_pdf_portable(file_path, output_path)
            return output_path
    else:
        ppt_to_pdf_portable(file_path, output_path)
        return output_path

from html.parser import HTMLParser

class SimpleHTMLParser(HTMLParser):
    def __init__(self, styles):
        super().__init__()
        self.styles = styles
        self.story = []
        self.current_tag = None
        self.current_text = ""
        
    def handle_starttag(self, tag, attrs):
        self.current_tag = tag
        self.current_text = ""
        
    def handle_endtag(self, tag):
        text = self.current_text.strip()
        if text:
            if tag == 'h1':
                self.story.append(Paragraph(text, self.styles['Heading1']))
                self.story.append(Spacer(1, 10))
            elif tag == 'h2':
                self.story.append(Paragraph(text, self.styles['Heading2']))
                self.story.append(Spacer(1, 8))
            elif tag == 'p':
                self.story.append(Paragraph(text, self.styles['Normal']))
                self.story.append(Spacer(1, 6))
            elif tag == 'li':
                self.story.append(Paragraph(f"• {text}", self.styles['Normal']))
                self.story.append(Spacer(1, 4))
        self.current_tag = None
        
    def handle_data(self, data):
        if self.current_tag:
            self.current_text += data
        else:
            text = data.strip()
            if text:
                self.story.append(Paragraph(text, self.styles['Normal']))
                self.story.append(Spacer(1, 6))

def html_to_pdf(file_path, output_path):
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        html_content = f.read()
        
    doc_template = SimpleDocTemplate(
        output_path, 
        pagesize=letter,
        rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40
    )
    
    styles = getSampleStyleSheet()
    parser = SimpleHTMLParser(styles)
    parser.feed(html_content)
    
    if not parser.story:
        parser.story.append(Paragraph("Empty HTML Document", styles['Normal']))
        
    doc_template.build(parser.story)
    return output_path

def main():
    try:
        input_data = sys.stdin.read()
        if not input_data:
            print(json.dumps({"success": False, "error": "No input arguments provided."}))
            return
            
        params = json.loads(input_data)
        action = params.get("action")
        
        if action == "word2pdf":
            file_path = params.get("file")
            output = params.get("output")
            result = word_to_pdf(file_path, output)
            print(json.dumps({"success": True, "output": result}))
            
        elif action == "excel2pdf":
            file_path = params.get("file")
            output = params.get("output")
            result = excel_to_pdf(file_path, output)
            print(json.dumps({"success": True, "output": result}))
            
        elif action == "pdf2word":
            file_path = params.get("file")
            output = params.get("output")
            result = pdf_to_word(file_path, output)
            print(json.dumps({"success": True, "output": result}))

        elif action == "pdf2excel":
            file_path = params.get("file")
            output = params.get("output")
            result = pdf_to_excel(file_path, output)
            print(json.dumps({"success": True, "output": result}))

        elif action == "pdf2ppt":
            file_path = params.get("file")
            output = params.get("output")
            result = pdf_to_ppt(file_path, output)
            print(json.dumps({"success": True, "output": result}))

        elif action == "ppt2pdf":
            file_path = params.get("file")
            output = params.get("output")
            result = ppt_to_pdf(file_path, output)
            print(json.dumps({"success": True, "output": result}))

        elif action == "html2pdf":
            file_path = params.get("file")
            output = params.get("output")
            result = html_to_pdf(file_path, output)
            print(json.dumps({"success": True, "output": result}))
            
        else:
            print(json.dumps({"success": False, "error": f"Unknown action: {action}"}))
            
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))

if __name__ == "__main__":
    main()
