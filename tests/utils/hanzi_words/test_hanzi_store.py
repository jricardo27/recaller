#!/usr/bin/env python3
"""
Tests for hanzi_store.py module.
"""

import unittest
import sqlite3
import tempfile
import os
from pathlib import Path
import sys

# Add utils/hanzi_words directory to path to import the module
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / 'utils' / 'hanzi_words'))

from hanzi_store import HanziStore


class TestHanziStore(unittest.TestCase):
    """Test cases for hanzi_store module."""

    def setUp(self):
        """Set up test fixtures."""
        # Create a temporary database
        self.temp_db = tempfile.NamedTemporaryFile(suffix='.db', delete=False)
        self.temp_db.close()
        self.store = HanziStore(self.temp_db.name)

    def tearDown(self):
        """Clean up test fixtures."""
        if os.path.exists(self.temp_db.name):
            os.unlink(self.temp_db.name)

    def test_init_db_with_reviewed_column(self):
        """Test that database initialization creates reviewed column."""
        # Check that the reviewed column exists
        conn = sqlite3.connect(self.temp_db.name)
        cursor = conn.execute("PRAGMA table_info(hanzi_words)")
        columns = [row[1] for row in cursor.fetchall()]
        conn.close()
        
        self.assertIn('reviewed', columns)

    def test_init_db_with_existing_schema(self):
        """Test that database initialization works with existing schema."""
        # Create a database without the reviewed column
        temp_db2 = tempfile.NamedTemporaryFile(suffix='.db', delete=False)
        temp_db2.close()
        
        try:
            # Create old schema without reviewed column
            conn = sqlite3.connect(temp_db2.name)
            conn.execute("""
                CREATE TABLE hanzi_words (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    hanzi TEXT UNIQUE NOT NULL,
                    pinyin TEXT,
                    translation TEXT,
                    source TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_hanzi ON hanzi_words(hanzi)
            """)
            conn.commit()
            conn.close()
            
            # Initialize store with old database
            store2 = HanziStore(temp_db2.name)
            
            # Verify reviewed column was added
            conn = sqlite3.connect(temp_db2.name)
            cursor = conn.execute("PRAGMA table_info(hanzi_words)")
            columns = [row[1] for row in cursor.fetchall()]
            conn.close()
            
            self.assertIn('reviewed', columns)
        finally:
            if os.path.exists(temp_db2.name):
                os.unlink(temp_db2.name)

    def test_add_word_basic(self):
        """Test basic word addition."""
        word = self.store.add_word('测试', pinyin='cè shì', translation='test')
        self.assertEqual(word.hanzi, '测试')
        self.assertEqual(word.pinyin, 'cè shì')
        self.assertEqual(word.translation, 'test')
        self.assertIsNotNone(word.id)

    def test_add_word_duplicate_prevention(self):
        """Test that duplicate words are prevented."""
        self.store.add_word('重复', translation='duplicate')
        with self.assertRaises(ValueError) as context:
            self.store.add_word('重复', translation='another')
        self.assertIn('already exists', str(context.exception))

    def test_get_word(self):
        """Test retrieving a word."""
        self.store.add_word('获取', translation='get')
        word = self.store.get_word('获取')
        self.assertIsNotNone(word)
        self.assertEqual(word.hanzi, '获取')
        self.assertEqual(word.translation, 'get')

    def test_get_word_not_found(self):
        """Test retrieving a non-existent word."""
        word = self.store.get_word('不存在')
        self.assertIsNone(word)

    def test_list_words(self):
        """Test listing words."""
        self.store.add_word('词1', translation='word1')
        self.store.add_word('词2', translation='word2')
        
        words = self.store.list_words()
        self.assertEqual(len(words), 2)

    def test_list_words_with_filter(self):
        """Test listing words with filters."""
        self.store.add_word('有翻译', translation='has translation')
        self.store.add_word('无翻译', translation=None, auto_translate=False)
        
        # Filter by has_translation
        words_with_translation = self.store.list_words(has_translation=True)
        words_without_translation = self.store.list_words(has_translation=False)
        
        self.assertEqual(len(words_with_translation), 1)
        self.assertEqual(len(words_without_translation), 1)

    def test_update_word(self):
        """Test updating a word."""
        self.store.add_word('更新', translation='old')
        updated = self.store.update_word('更新', translation='new')
        
        self.assertEqual(updated.translation, 'new')
        self.assertTrue(updated.reviewed)

    def test_mark_reviewed(self):
        """Test marking a word as reviewed."""
        self.store.add_word('标记', translation='mark')
        result = self.store.mark_reviewed('标记')
        
        self.assertTrue(result)
        word = self.store.get_word('标记')
        self.assertTrue(word.reviewed)

    def test_delete_word(self):
        """Test deleting a word."""
        self.store.add_word('删除', translation='delete')
        result = self.store.delete_word('删除')
        
        self.assertTrue(result)
        self.assertIsNone(self.store.get_word('删除'))

    def test_count_words(self):
        """Test counting words."""
        self.store.add_word('计数1', translation='count1')
        self.store.add_word('计数2', translation='count2')
        
        count = self.store.count_words()
        self.assertEqual(count, 2)

    def test_export_import_json(self):
        """Test exporting and importing words."""
        self.store.add_word('导出', translation='export')
        self.store.add_word('导入', translation='import')
        
        temp_json = tempfile.NamedTemporaryFile(suffix='.json', delete=False)
        temp_json.close()
        
        try:
            # Export
            self.store.export_to_json(temp_json.name)
            self.assertTrue(os.path.exists(temp_json.name))
            
            # Import into new store
            temp_db2 = tempfile.NamedTemporaryFile(suffix='.db', delete=False)
            temp_db2.close()
            store2 = HanziStore(temp_db2.name)
            
            added, skipped = store2.import_from_json(temp_json.name)
            self.assertEqual(added, 2)
            self.assertEqual(skipped, 0)
            
            # Verify words were imported
            words = store2.list_words()
            self.assertEqual(len(words), 2)
        finally:
            if os.path.exists(temp_json.name):
                os.unlink(temp_json.name)
            if os.path.exists(temp_db2.name):
                os.unlink(temp_db2.name)


if __name__ == '__main__':
    unittest.main()
