import json
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"

def validate():
    all_ok = True
    for class_num in range(3, 11):
        class_dir = DATA_DIR / str(class_num)
        json_path = class_dir / f"class{class_num}.json"
        
        if not json_path.exists():
            print(f"✗ Class {class_num} — Missing {json_path.name}")
            all_ok = False
            continue
            
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                
            if data.get("class") != class_num:
                print(f"✗ Class {class_num} — JSON 'class' key does not match folder")
                all_ok = False
                
            chapters = data.get("chapters", [])
            if not chapters:
                print(f"✗ Class {class_num} — No chapters found in JSON")
                all_ok = False
                
            for idx, ch in enumerate(chapters):
                # Check keys
                required = ["chapter_number", "file_name", "title", "topics"]
                missing = [r for r in required if r not in ch]
                if missing:
                    print(f"✗ Class {class_num} (Ch {ch.get('chapter_number', idx)}) — Missing keys: {missing}")
                    all_ok = False
                    
                file_name = ch.get("file_name")
                if file_name:
                    pdf_path = class_dir / f"{file_name}.pdf"
                    if not pdf_path.exists():
                        print(f"✗ Class {class_num} — Chapter PDF {pdf_path.name} does not exist in folder")
                        all_ok = False
                        
                topics = ch.get("topics")
                if not isinstance(topics, list) or len(topics) == 0:
                    # Don't strictly error if it's empty, but warn
                    print(f"⚠ Class {class_num} (Ch {ch.get('chapter_number')}) — Empty topics list")
                    
            print(f"✓ Class {class_num} — JSON is VALID ({len(chapters)} chapters)")
            
        except Exception as e:
            print(f"✗ Class {class_num} — Failed to read/parse JSON: {e}")
            all_ok = False
            
    if all_ok:
        print("\n🎉 ALL JSON FILES ARE VALID AND MATCH PDFS PERFECTLY!")
    else:
        print("\n❌ SOME VALIDATION ERRORS WERE FOUND.")

if __name__ == "__main__":
    validate()
