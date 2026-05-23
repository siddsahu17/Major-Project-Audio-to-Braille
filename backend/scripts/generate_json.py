import os
import re
import json
import logging
from pathlib import Path
from dotenv import load_dotenv
import fitz  # PyMuPDF
from openai import OpenAI

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("generate_json")

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not OPENAI_API_KEY:
    logger.error("OPENAI_API_KEY not found in environment or .env file.")
    exit(1)

client = OpenAI(api_key=OPENAI_API_KEY)

DATA_DIR = Path(__file__).parent.parent / "data"

def extract_metadata_from_pdf(pdf_path: Path) -> str:
    """
    Extracts text from all pages of the PDF, prioritizing:
    - Pages 1-4 in full (Title, TOC, Intro)
    - From pages 5 onwards, extract the top portion of each page (first 500 chars)
      and any lines matching subheading/section patterns (e.g. 1.1, 2.3, 10.1).
    This covers the entire chapter's subheadings without exceeding context limits.
    """
    doc = fitz.open(str(pdf_path))
    total_pages = len(doc)
    extracted_chunks = []

    # 1. Full text from first 4 pages
    for i in range(min(4, total_pages)):
        text = doc[i].get_text("text").strip()
        if text:
            extracted_chunks.append(f"--- Page {i+1} ---\n{text}")

    # 2. Key headings & top-of-page text for subsequent pages
    section_pattern = re.compile(r'^\d+\.\d+\s+[A-Za-z]')  # e.g., "1.1 Chemical"
    for i in range(4, total_pages):
        page_text = doc[i].get_text("text").strip()
        if not page_text:
            continue
        
        # Add top portion of page (usually has page header or new section start)
        top_text = page_text[:500]
        extracted_chunks.append(f"--- Page {i+1} (Start) ---\n{top_text}")

        # Search for lines matching section header patterns in the rest of the page
        lines = page_text.split('\n')
        for line in lines:
            line_strip = line.strip()
            if section_pattern.match(line_strip) and len(line_strip) < 80:
                extracted_chunks.append(f"Page {i+1} Heading: {line_strip}")

    doc.close()
    return "\n\n".join(extracted_chunks)

def query_gpt_for_chapter_data(text: str, filename: str, is_retry: bool = False) -> dict:
    """
    Sends the extracted PDF text to GPT-4o to parse chapter metadata.
    """
    prompt = (
        "You are processing an NCERT Science textbook chapter.\n"
        "From the text below extract the following information:\n"
        "1. Chapter number (integer)\n"
        "2. Chapter title (full English title)\n"
        "3. Chapter title in Hindi if present\n"
        "4. Chapter title in Marathi if present\n"
        "5. A list of 10-15 key topics covered in this chapter.\n"
        "   Topics should be keywords a student would speak naturally\n"
        "   including synonyms and alternate names.\n"
        "   Include Hindi and Marathi equivalents of major topics.\n\n"
        "Return ONLY a valid JSON object, no explanation, no markdown:\n"
        "{\n"
        "  \"chapter_number\": 1,\n"
        "  \"file_name\": \"" + filename + "\",\n"
        "  \"title_english\": \"...\",\n"
        "  \"title_hindi\": \"...\",\n"
        "  \"title_marathi\": \"...\",\n"
        "  \"topics\": [\"topic1\", \"topic2\", ...]\n"
        "}\n\n"
        f"Text:\n{text}"
    )

    if is_retry:
        prompt = (
            "STRICT JSON ONLY. Your previous response was not valid JSON. Do not include ```json blocks, explanations or notes.\n"
            "Return a single JSON object matching the exact schema:\n"
            "{\n"
            "  \"chapter_number\": 1,\n"
            "  \"file_name\": \"" + filename + "\",\n"
            "  \"title_english\": \"...\",\n"
            "  \"title_hindi\": \"...\",\n"
            "  \"title_marathi\": \"...\",\n"
            "  \"topics\": [\"topic1\", \"topic2\", ...]\n"
            "}\n\n"
            f"Text:\n{text}"
        )

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            response_format={"type": "json_object"}
        )
        content = response.choices[0].message.content.strip()
        data = json.loads(content)
        return data
    except Exception as e:
        if not is_retry:
            logger.warning(f"GPT query failed for {filename}. Retrying with strict prompt... Error: {e}")
            return query_gpt_for_chapter_data(text, filename, is_retry=True)
        else:
            raise e

def infer_chapter_number_from_filename(filename: str) -> int:
    """
    Infers chapter number from the last 2 digits of the filename.
    e.g., jesc108 -> 8, ceev101 -> 1
    """
    match = re.search(r'(\d{2})$', filename)
    if match:
        return int(match.group(1))
    return 1

def process_class_folder(class_number: int):
    """
    Processes all PDFs in a class directory and writes the classN.json file.
    """
    class_dir = DATA_DIR / str(class_number)
    if not class_dir.exists():
        logger.warning(f"Directory {class_dir} does not exist. Skipping.")
        return

    pdf_files = sorted(list(class_dir.glob("*.pdf")))
    if not pdf_files:
        logger.warning(f"No PDF files found in {class_dir}.")
        return

    logger.info(f"Processing class {class_number}...")
    chapters = []

    for pdf_path in pdf_files:
        filename = pdf_path.stem
        # Skip output json files
        if filename.startswith("class"):
            continue
        
        logger.info(f"  Reading {pdf_path.name}...")
        try:
            # Extract metadata
            extracted_text = extract_metadata_from_pdf(pdf_path)
            
            # Query GPT
            data = query_gpt_for_chapter_data(extracted_text, filename)
            
            # Post-process and fallback
            chapter_num = data.get("chapter_number")
            if not chapter_num or not isinstance(chapter_num, int):
                chapter_num = infer_chapter_number_from_filename(filename)
            
            title_eng = data.get("title_english") or data.get("title") or "Unknown Title"
            
            # Reconstruct to exact required output format
            chapter_entry = {
                "chapter_number": chapter_num,
                "file_name": filename,
                "title": title_eng,
                "title_english": title_eng,
                "title_hindi": data.get("title_hindi") or "",
                "title_marathi": data.get("title_marathi") or "",
                "topics": data.get("topics") or []
            }
            
            logger.info(f"    → Chapter {chapter_num}: {title_eng}")
            chapters.append(chapter_entry)

        except Exception as e:
            logger.error(f"  Error processing {pdf_path.name}: {e}")
            # Fallback entry if completely failed
            chapter_num = infer_chapter_number_from_filename(filename)
            chapters.append({
                "chapter_number": chapter_num,
                "file_name": filename,
                "title": f"Chapter {chapter_num}",
                "title_english": f"Chapter {chapter_num}",
                "title_hindi": "",
                "title_marathi": "",
                "topics": []
            })

    # Sort chapters by chapter number
    chapters = sorted(chapters, key=lambda x: x["chapter_number"])

    output_data = {
        "class": class_number,
        "chapters": chapters
    }

    output_path = class_dir / f"class{class_number}.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)
        
    logger.info(f"  ✓ Written: {output_path.relative_to(DATA_DIR.parent)}")
    return len(chapters)

def main():
    summary = {}
    for class_num in range(3, 11):
        processed_count = process_class_folder(class_num)
        if processed_count:
            summary[class_num] = processed_count

    print("\n" + "="*40)
    print("SUMMARY OF PROCESS")
    print("="*40)
    for class_num, count in summary.items():
        print(f"✓ Class {class_num} — {count} chapters processed")
    print("="*40)

if __name__ == "__main__":
    main()
