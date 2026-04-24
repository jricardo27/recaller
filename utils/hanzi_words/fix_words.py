#!/usr/bin/env python3
"""
Fix incorrect pinyin and translations in the hanzi database.
"""

import sys
from pathlib import Path

# Add parent directory to path to import hanzi_store
sys.path.insert(0, str(Path(__file__).parent))

from hanzi_store import HanziStore


def main():
    db_path = Path(__file__).parent / "hanzi_words.db"
    store = HanziStore(str(db_path))

    # Corrections: (hanzi, pinyin, translation)
    # pinyin can be None if no change needed
    corrections = [
        # Empty pinyin
        ("北京", "běi jīng", None),

        # Wrong translations (language codes)
        ("我", None, "I/me"),
        ("你", None, "you"),

        # Wrong verb forms / meanings
        ("去", None, "go"),  # was "went"
        ("饭店", None, "restaurant"),  # was "Hotels"
        ("吃", None, "eat"),  # was "eats"
        ("再见", None, "goodbye"),  # was "gone"
        ("学习", None, "study/learn"),  # was "learning:"
        ("喜欢", None, "like"),  # was "Love"

        # Numbers/time
        ("五点", None, "5 o'clock"),  # was "5 points"
        ("十", None, "ten"),  # was "X"
        ("号", None, "number/day"),  # was "."

        # Grammar/particles
        ("的", None, "'s/of"),  # was "right of privacy"

        # Idioms/special terms
        ("白事", None, "funeral"),  # was "White matter"

        # Typos and formatting
        ("红色", None, "red"),  # was "'red" (extra quote)
        ("蝴蝶结", None, "bowknot"),  # was "bbowknot" (typo)

        # Articles/capitalization
        ("猫", None, "cat"),  # was "The cats"
        ("酒店", None, "hotel"),  # was "Hotels"
        ("门", None, "door"),  # was "DOOR"

        # Punctuation issues
        ("关门", None, "close door"),  # lowercase for consistency
        ("开门", None, "open door"),  # lowercase for consistency
    ]

    updated = 0
    failed = 0

    for hanzi, pinyin, translation in corrections:
        try:
            word = store.update_word(hanzi, pinyin=pinyin, translation=translation)
            if word:
                print(f"✓ Updated: {hanzi} -> {word.pinyin}, {word.translation}")
                updated += 1
            else:
                print(f"✗ Not found: {hanzi}")
                failed += 1
        except Exception as e:
            print(f"✗ Error updating {hanzi}: {e}")
            failed += 1

    print(f"\nSummary: {updated} updated, {failed} failed")

    # Also check for the ⻢ character (id 374) - it's a variant form that should be removed
    # or have proper data
    word = store.get_word("⻢")
    if word:
        print(f"\nNote: Found variant character '⻢' (id 374) with empty fields:")
        print(f"  pinyin: '{word.pinyin}', translation: '{word.translation}'")
        print(f"  This is a variant of 马 (horse). Consider removing or fixing.")


if __name__ == "__main__":
    main()
