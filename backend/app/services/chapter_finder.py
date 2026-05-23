import json
import logging
from pathlib import Path
from typing import Optional, Dict, List, Any

logger = logging.getLogger("sparshvaani.chapter_finder")

DATA_DIR = Path(__file__).parent.parent.parent / "data"

def find_chapter(query: str, class_number: Optional[int] = None) -> Optional[Dict[str, Any]]:
    """
    Search JSON knowledge maps for a chapter matching the query.
    Returns: { "class": class_num, "chapter_number": ch_num, "file_name": file, "title": title, "pdf_path": str }
    or None if not found.
    
    Search logic:
    1. If class_number given, search only that class JSON
    2. If no class_number, search all classes 3-10
    3. Score each chapter:
       - Title match (English/Hindi/Marathi) = 10 points
       - Topic exact match = 5 points per match
       - Topic partial/substring match = 2 points per match
    4. Return the highest scoring chapter
    5. If top score is 0, return None
    """
    if not query:
        return None

    query_lower = query.lower().strip()
    
    # 1 & 2. Determine which classes to search
    classes_to_search = [class_number] if class_number is not None else list(range(3, 11))
    
    best_match = None
    max_score = 0

    for c in classes_to_search:
        json_path = DATA_DIR / str(c) / f"class{c}.json"
        if not json_path.exists():
            continue
            
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:
            logger.error(f"Failed to read JSON map {json_path}: {e}")
            continue

        chapters = data.get("chapters", [])
        for ch in chapters:
            score = 0
            
            # Title matching (English/Hindi/Marathi)
            titles = [
                ch.get("title", ""),
                ch.get("title_english", ""),
                ch.get("title_hindi", ""),
                ch.get("title_marathi", "")
            ]
            for t in titles:
                if t and query_lower in t.lower():
                    score += 10
                    break  # Maximum 10 points for title matching
            
            # Topics matching
            topics = ch.get("topics", [])
            for topic in topics:
                if not topic:
                    continue
                topic_lower = topic.lower().strip()
                if query_lower == topic_lower:
                    score += 5
                elif query_lower in topic_lower or topic_lower in query_lower:
                    score += 2
                    
            if score > max_score:
                max_score = score
                best_match = {
                    "class": c,
                    "chapter_number": ch.get("chapter_number"),
                    "file_name": ch.get("file_name"),
                    "title": ch.get("title", ch.get("title_english", "")),
                    "pdf_path": str(get_pdf_path(c, ch.get("file_name")))
                }

    if max_score > 0:
        logger.info(f"Chapter found for query '{query}': {best_match['file_name']} (score: {max_score})")
        return best_match
        
    logger.info(f"No chapter found for query '{query}'")
    return None

def get_all_chapters(class_number: int) -> List[str]:
    """
    Return all chapter titles for a class.
    Used when student asks 'what chapters are available?'
    """
    json_path = DATA_DIR / str(class_number) / f"class{class_number}.json"
    if not json_path.exists():
        return []
        
    try:
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        chapters = data.get("chapters", [])
        # Return formatted titles: "Chapter X: English Title / Hindi Title"
        titles = []
        for ch in chapters:
            num = ch.get("chapter_number")
            eng = ch.get("title", ch.get("title_english", ""))
            hi = ch.get("title_hindi", "")
            title_str = f"Chapter {num}: {eng}"
            if hi:
                title_str += f" ({hi})"
            titles.append(title_str)
        return titles
    except Exception as e:
        logger.error(f"Failed to read chapters for class {class_number}: {e}")
        return []

def get_pdf_path(class_number: int, file_name: str) -> Path:
    """
    Return absolute path to a PDF file.
    """
    return DATA_DIR / str(class_number) / f"{file_name}.pdf"
