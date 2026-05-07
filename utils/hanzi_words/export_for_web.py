#!/usr/bin/env python3
"""
Export hanzi words from SQLite to JSON for web app usage.
"""

import sqlite3
import json
import argparse
import zlib
from pathlib import Path
from datetime import datetime


def export_words(db_path: str, output_path: str) -> dict:
    """
    Export words from SQLite database to JSON format.
    
    Args:
        db_path: Path to hanzi_words.db
        output_path: Path for output JSON file
        
    Returns:
        Export statistics
    """
    output_path = Path(output_path)

    # Use default location if not specified or empty
    if not db_path:
        db_path = Path(__file__).parent / "hanzi_words.db"
    else:
        db_path = Path(db_path)

    if not db_path.exists():
        raise FileNotFoundError(f"Database not found: {db_path}")

    def make_id(hanzi: str) -> int:
        """Generate a consistent numeric ID from hanzi string."""
        # Use CRC32 to generate a stable, positive 32-bit integer from hanzi
        return zlib.crc32(hanzi.encode('utf-8')) & 0x7FFFFFFF

    conn = sqlite3.connect(str(db_path))
    cursor = conn.execute(
        "SELECT hanzi, pinyin, translation FROM hanzi_words"
    )

    words = []
    for row in cursor:
        hanzi = row[0]
        words.append({
            "id": make_id(hanzi),
            "hanzi": hanzi,
            "pinyin": row[1] or "",
            "translation": row[2] or "",
            "enabled": True
        })

    conn.close()

    # Sort alphabetically by hanzi for consistent output
    words.sort(key=lambda w: w["hanzi"])

    output = {
        "version": "1.0",
        "exportedAt": datetime.now().isoformat(),
        "wordCount": len(words),
        "source": db_path.name,
        "words": words
    }
    
    # Ensure output directory exists
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    return {
        "exported": len(words),
        "outputFile": str(output_path),
        "sourceDb": str(db_path)
    }


def main():
    parser = argparse.ArgumentParser(
        description="Export hanzi words to JSON for web app"
    )
    parser.add_argument(
        "--db",
        help="Path to SQLite database (default: hanzi_words.db in same directory)"
    )
    parser.add_argument(
        "--output", "-o",
        required=True,
        help="Output JSON file path"
    )
    
    args = parser.parse_args()
    
    try:
        result = export_words(args.db or "", args.output)
        print(f"✓ Exported {result['exported']} words to {result['outputFile']}")
        print(f"  Source: {result['sourceDb']}")
    except FileNotFoundError as e:
        print(f"✗ Error: {e}")
        return 1
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())
