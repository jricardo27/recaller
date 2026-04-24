"""
Hanzi Words Storage Utility

A utility for storing Mandarin hanzi words with automatic translation lookup.
Uses SQLite for persistent storage with duplicate prevention.
"""

import sqlite3
import json
import requests
import re
from pathlib import Path
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
from datetime import datetime
from pypinyin import pinyin, Style


@dataclass
class HanziWord:
    """Represents a hanzi word with its metadata."""
    id: Optional[int]
    hanzi: str
    pinyin: Optional[str]
    translation: Optional[str]
    source: Optional[str]  # Where the translation came from
    created_at: Optional[str]
    reviewed: bool = False  # Whether the word has been manually reviewed


class HanziStore:
    """
    SQLite-based storage for hanzi words with automatic translation lookup.
    Prevents duplicate entries.
    """

    def __init__(self, db_path: Optional[str] = None):
        """
        Initialize the hanzi store.

        Args:
            db_path: Path to SQLite database. Defaults to 'hanzi_words.db' in same directory.
        """
        if db_path is None:
            db_path = Path(__file__).parent / "hanzi_words.db"
        self.db_path = str(db_path)
        self._init_db()

    def _init_db(self) -> None:
        """Initialize the database schema."""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS hanzi_words (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    hanzi TEXT UNIQUE NOT NULL,
                    pinyin TEXT,
                    translation TEXT,
                    source TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    reviewed BOOLEAN DEFAULT 0
                )
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_hanzi ON hanzi_words(hanzi)
            """)
            # Add reviewed column if it doesn't exist (for existing databases)
            cursor = conn.execute("PRAGMA table_info(hanzi_words)")
            columns = [row[1] for row in cursor.fetchall()]
            if "reviewed" not in columns:
                conn.execute("""
                    ALTER TABLE hanzi_words ADD COLUMN reviewed BOOLEAN DEFAULT 0
                """)
            conn.commit()

    def _lookup_translation(self, hanzi: str) -> tuple[Optional[str], Optional[str]]:
        """
        Look up translation for a hanzi word using free translation API.

        Returns:
            Tuple of (translation, source) or (None, None) if lookup fails.
        """
        # Try MyMemory API first (free, no API key required for small usage)
        try:
            url = "https://api.mymemory.translated.net/get"
            params = {
                "q": hanzi,
                "langpair": "zh-CN|en"
            }
            response = requests.get(url, params=params, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get("responseStatus") == 200:
                    translation = data.get("responseData", {}).get("translatedText")
                    if translation and translation.lower() != hanzi.lower():
                        return translation, "mymemory"
        except Exception:
            pass

        # Fallback: return None, requiring manual input
        return None, None

    def _generate_pinyin(self, hanzi: str) -> str:
        """
        Generate pinyin for hanzi using pypinyin.
        Returns tone-marked pinyin (e.g., "nǐ hǎo").
        """
        try:
            # Use TONE3 style which gives tone numbers, then convert to marks
            result = pinyin(hanzi, style=Style.TONE)
            # Flatten the list of lists and join with spaces
            return ' '.join([item[0] for item in result])
        except Exception:
            return ""

    def add_word(self, hanzi: str, pinyin: Optional[str] = None,
                 translation: Optional[str] = None,
                 auto_translate: bool = True,
                 auto_pinyin: bool = True) -> HanziWord:
        """
        Add a hanzi word to the store.
        Duplicates are prevented (based on hanzi characters).

        Args:
            hanzi: The Chinese word/characters
            pinyin: Optional pinyin pronunciation
            translation: Optional English translation
            auto_translate: Whether to auto-lookup translation if not provided
            auto_pinyin: Whether to auto-generate pinyin if not provided

        Returns:
            The stored HanziWord object

        Raises:
            ValueError: If word already exists
        """
        hanzi = hanzi.strip()
        if not hanzi:
            raise ValueError("Hanzi cannot be empty")

        # Check for existing
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                "SELECT id FROM hanzi_words WHERE hanzi = ?",
                (hanzi,)
            )
            if cursor.fetchone():
                raise ValueError(f"Word '{hanzi}' already exists in database")

        # Auto-generate pinyin if needed
        if pinyin is None and auto_pinyin:
            pinyin = self._generate_pinyin(hanzi)
            if pinyin == hanzi:  # pypinyin sometimes returns same string for non-Chinese
                pinyin = None

        # Auto-translate if needed
        source = None
        if translation is None and auto_translate:
            translation, source = self._lookup_translation(hanzi)

        # Insert
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                """
                INSERT INTO hanzi_words (hanzi, pinyin, translation, source)
                VALUES (?, ?, ?, ?)
                """,
                (hanzi, pinyin, translation, source)
            )
            word_id = cursor.lastrowid
            conn.commit()

        return HanziWord(
            id=word_id,
            hanzi=hanzi,
            pinyin=pinyin,
            translation=translation,
            source=source,
            created_at=datetime.now().isoformat()
        )

    def get_word(self, hanzi: str) -> Optional[HanziWord]:
        """Retrieve a single word by its hanzi."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                "SELECT id, hanzi, pinyin, translation, source, created_at, reviewed "
                "FROM hanzi_words WHERE hanzi = ?",
                (hanzi,)
            )
            row = cursor.fetchone()
            if row:
                return HanziWord(*row)
        return None

    def list_words(
        self,
        search: Optional[str] = None,
        has_translation: Optional[bool] = None,
        has_pinyin: Optional[bool] = None,
        reviewed: Optional[bool] = None,
        limit: Optional[int] = 100,
        offset: int = 0
    ) -> List[HanziWord]:
        """
        List words with optional filtering.

        Args:
            search: Search string for hanzi or translation (partial match)
            has_translation: Filter by presence/absence of translation
            has_pinyin: Filter by presence/absence of pinyin
            reviewed: Filter by reviewed status
            limit: Maximum number of results (None for no limit)
            offset: Offset for pagination

        Returns:
            List of HanziWord objects matching the filters
        """
        query = "SELECT id, hanzi, pinyin, translation, source, created_at, reviewed FROM hanzi_words WHERE 1=1"
        params: List[Any] = []

        if search:
            query += " AND (hanzi LIKE ? OR translation LIKE ? OR pinyin LIKE ?)"
            like_param = f"%{search}%"
            params.extend([like_param, like_param, like_param])

        if has_translation is not None:
            if has_translation:
                query += " AND translation IS NOT NULL AND translation != ''"
            else:
                query += " AND (translation IS NULL OR translation = '')"

        if has_pinyin is not None:
            if has_pinyin:
                query += " AND pinyin IS NOT NULL AND pinyin != ''"
            else:
                query += " AND (pinyin IS NULL OR pinyin = '')"

        if reviewed is not None:
            query += " AND reviewed = ?"
            params.append(1 if reviewed else 0)

        query += " ORDER BY created_at DESC"

        if limit is not None:
            query += " LIMIT ? OFFSET ?"
            params.extend([limit, offset])

        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(query, params)
            rows = cursor.fetchall()
            return [HanziWord(*row) for row in rows]

    def update_word(self, hanzi: str, pinyin: Optional[str] = None,
                    translation: Optional[str] = None,
                    mark_reviewed: bool = True) -> Optional[HanziWord]:
        """
        Update an existing word's pinyin or translation.

        Args:
            hanzi: The Chinese word to update
            pinyin: Optional new pinyin
            translation: Optional new translation
            mark_reviewed: Whether to mark the word as reviewed (default True)

        Returns:
            Updated HanziWord or None if word not found
        """
        updates = []
        params: List[Any] = []

        if pinyin is not None:
            updates.append("pinyin = ?")
            params.append(pinyin)
        if translation is not None:
            updates.append("translation = ?")
            params.append(translation)
            updates.append("source = ?")
            params.append("manual")
        if mark_reviewed:
            updates.append("reviewed = 1")

        if not updates:
            return self.get_word(hanzi)

        params.append(hanzi)
        query = f"UPDATE hanzi_words SET {', '.join(updates)} WHERE hanzi = ?"

        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(query, params)
            if cursor.rowcount == 0:
                return None
            conn.commit()

        return self.get_word(hanzi)

    def mark_reviewed(self, hanzi: str) -> bool:
        """Mark a word as reviewed. Returns True if marked."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                "UPDATE hanzi_words SET reviewed = 1 WHERE hanzi = ?",
                (hanzi,)
            )
            conn.commit()
            return cursor.rowcount > 0

    def delete_word(self, hanzi: str) -> bool:
        """Delete a word by hanzi. Returns True if deleted."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("DELETE FROM hanzi_words WHERE hanzi = ?", (hanzi,))
            conn.commit()
            return cursor.rowcount > 0

    def count_words(self, has_translation: Optional[bool] = None) -> int:
        """Count total words, optionally filtering by translation status."""
        query = "SELECT COUNT(*) FROM hanzi_words WHERE 1=1"
        params: List[Any] = []

        if has_translation is not None:
            if has_translation:
                query += " AND translation IS NOT NULL AND translation != ''"
            else:
                query += " AND (translation IS NULL OR translation = '')"

        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(query, params)
            return cursor.fetchone()[0]

    def export_to_json(self, filepath: str) -> None:
        """Export all words to a JSON file."""
        words = self.list_words(limit=10000)
        data = [
            {
                "hanzi": w.hanzi,
                "pinyin": w.pinyin,
                "translation": w.translation,
                "source": w.source
            }
            for w in words
        ]
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def import_from_json(self, filepath: str, auto_translate: bool = False,
                         auto_pinyin: bool = False) -> tuple[int, int]:
        """
        Import words from JSON file.

        Args:
            filepath: Path to JSON file
            auto_translate: Auto-translate words without translations
            auto_pinyin: Auto-generate pinyin for words without pinyin

        Returns:
            Tuple of (added_count, skipped_count)
        """
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)

        added = 0
        skipped = 0
        for item in data:
            try:
                self.add_word(
                    hanzi=item["hanzi"],
                    pinyin=item.get("pinyin"),
                    translation=item.get("translation"),
                    auto_translate=auto_translate,
                    auto_pinyin=auto_pinyin
                )
                added += 1
            except ValueError:
                skipped += 1

        return added, skipped
