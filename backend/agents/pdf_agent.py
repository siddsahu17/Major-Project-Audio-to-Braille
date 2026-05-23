import os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Agent 8: PDF Generation
def generate_braille_pdf(results: dict, output_filename: str = "study_material.pdf") -> str:
    """
    Generates a PDF book with vernacular text and corresponding Braille.
    Returns the absolute path to the generated PDF.
    """
    print(f"[PDFAgent] Generating PDF: {output_filename}")
    
    # Path setup
    # Determine safe output directory (e.g., inside backend/static or temp)
    # For now, let's put it in the backend root or a 'downloads' folder
    current_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(current_dir, "..", "downloads")
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    output_path = os.path.join(output_dir, output_filename)
    output_path = os.path.abspath(output_path)

    doc = SimpleDocTemplate(output_path, pagesize=A4)
    story = []
    
    # Font Registration
    # Attempt to find a font that supports Braille and Indic scripts
    # Windows typically has 'Nirmala UI' or 'Arial Unicode MS'
    font_name = "Helvetica" # Fallback
    braille_font_name = "Helvetica"
    
    try:
        # Check for Windows Fonts
        font_paths = [
            r"C:\Windows\Fonts\Nirmala.ttf", # Good for Indic
            r"C:\Windows\Fonts\arialuni.ttf",
            r"C:\Windows\Fonts\seguiemj.ttf" # Braille might be here
        ]
        
        registered_font = None
        for path in font_paths:
            if os.path.exists(path):
                # Basic font name from filename
                f_name = os.path.basename(path).split(".")[0]
                # Avoid re-registering if already done in a previous run logic (though agent is fresh usually)
                try:
                    pdfmetrics.registerFont(TTFont(f_name, path))
                    registered_font = f_name
                    break
                except:
                    continue
        
        if registered_font:
            font_name = registered_font
            # Braille support usually requires a specific font, but Nirmala might handle standard unicode braille
            # If not, we fall back to boxes
            braille_font_name = registered_font
            print(f"[PDFAgent] Using Font: {font_name}")
            
    except Exception as e:
        print(f"[PDFAgent] Font registration warning: {e}")

    styles = getSampleStyleSheet()
    
    # Custom Styles
    title_style = ParagraphStyle(
        'Title',
        parent=styles['Title'],
        fontName=font_name,
        fontSize=24,
        spaceAfter=20
    )
    
    heading_style = ParagraphStyle(
        'Heading',
        parent=styles['Heading2'],
        fontName=font_name,
        fontSize=18,
        spaceBefore=15,
        spaceAfter=10,
        textColor=colors.darkblue
    )
    
    text_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName=font_name,
        fontSize=12,
        spaceAfter=6,
        leading=14
    )
    
    braille_style = ParagraphStyle(
        'Braille',
        parent=styles['Normal'],
        fontName=braille_font_name, # Ideally a braille font
        fontSize=14,
        spaceAfter=12,
        textColor=colors.dimgray,
        leading=16
    )

    # 1. Title Page
    context = results.get('context', {})
    topic = context.get('topic', 'Study Material')
    
    story.append(Paragraph(topic, title_style))
    story.append(Spacer(1, 12))
    story.append(Paragraph(f"Language: {results.get('language', 'Unknown')}", text_style))
    story.append(Spacer(1, 24))
    
    # 2. Executive Summary Section
    story.append(Paragraph("1. Executive Summary", heading_style))
    summary_text = results.get('summary', "No summary.")
    story.append(Paragraph(summary_text, text_style))
    
    # Braille Summary
    braille_data = results.get('braille', {})
    braille_summary = braille_data.get('braille_summary', '')
    if braille_summary:
        story.append(Spacer(1, 5))
        story.append(Paragraph(braille_summary, braille_style))
    
    story.append(PageBreak())

    # 3. Study Notes Section
    story.append(Paragraph("2. Study Notes", heading_style))
    notes = results.get('notes', [])
    braille_notes = braille_data.get('braille_notes', [])
    
    for i, note in enumerate(notes):
        # Text Note
        story.append(Paragraph(f"• {note}", text_style))
        
        # Braille Note
        if i < len(braille_notes):
            story.append(Paragraph(braille_notes[i], braille_style))
        
        story.append(Spacer(1, 8))
        
    story.append(PageBreak())
    
    # 4. Q&A Section
    story.append(Paragraph("3. Exam Questions", heading_style))
    qa_list = results.get('qa', [])
    braille_qa = braille_data.get('braille_qa', [])
    
    for i, item in enumerate(qa_list):
        q_text = item.get('question', '')
        a_text = item.get('answer', '')
        
        # Question
        story.append(Paragraph(f"Q{i+1}: {q_text}", text_style))
        
        # Braille Question
        if i < len(braille_qa):
            bq = braille_qa[i].get('question', '')
            if bq: story.append(Paragraph(bq, braille_style))
            
        story.append(Spacer(1, 4))
        
        # Answer
        story.append(Paragraph(f"<b>Answer:</b> {a_text}", text_style))
        
        # Braille Answer
        if i < len(braille_qa):
            ba = braille_qa[i].get('answer', '')
            if ba: story.append(Paragraph(ba, braille_style))
            
        story.append(Spacer(1, 12))

    try:
        doc.build(story)
        print(f"[PDFAgent] PDF generated successfully: {output_path}")
        return output_path
    except Exception as e:
        print(f"[PDFAgent] Error building PDF: {e}")
        return ""
