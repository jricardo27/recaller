#!/usr/bin/env python3
"""
Tests for export_for_web.py module.
"""

import unittest
import json
import tempfile
import sqlite3
from pathlib import Path
import sys
import os

# Add parent directory to path to import the module
sys.path.insert(0, str(Path(__file__).parent.parent))

from export_for_web import export_words


class TestExportForWeb(unittest.TestCase):
    """Test cases for export_for_web module."""

    def setUp(self):
        """Set up test fixtures."""
        # Create a temporary database with test data
        self.temp_db = tempfile.NamedTemporaryFile(suffix='.db', delete=False)
        self.temp_db.close()
        
        # Create test database schema and data
        conn = sqlite3.connect(self.temp_db.name)
        with conn:
            conn.execute("""
                CREATE TABLE hanzi_words (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    hanzi TEXT UNIQUE NOT NULL,
                    pinyin TEXT,
                    translation TEXT
                )
            """)
            conn.execute("""
                INSERT INTO hanzi_words (hanzi, pinyin, translation) VALUES
                ('你好', 'nǐ hǎo', 'hello'),
                ('世界', 'shì jiè', 'world')
            """)
        conn.close()
        
        # Create temporary output file
        self.temp_output = tempfile.NamedTemporaryFile(suffix='.json', delete=False)
        self.temp_output.close()

    def tearDown(self):
        """Clean up test fixtures."""
        if os.path.exists(self.temp_db.name):
            os.unlink(self.temp_db.name)
        if os.path.exists(self.temp_output.name):
            os.unlink(self.temp_output.name)

    def test_source_field_uses_filename_only(self):
        """Test that the source field contains only the filename, not the absolute path."""
        result = export_words(self.temp_db.name, self.temp_output.name)
        
        # Read the output JSON file
        with open(self.temp_output.name, 'r', encoding='utf-8') as f:
            output = json.load(f)
        
        # Check that source field is just the filename
        expected_filename = Path(self.temp_db.name).name
        self.assertEqual(output['source'], expected_filename)
        
        # Ensure it's not the full path
        self.assertNotIn('/', output['source'])
        self.assertNotEqual(output['source'], self.temp_db.name)

    def test_export_basic_functionality(self):
        """Test basic export functionality."""
        result = export_words(self.temp_db.name, self.temp_output.name)
        
        # Check result
        self.assertEqual(result['exported'], 2)
        self.assertTrue(os.path.exists(self.temp_output.name))
        
        # Read and verify output
        with open(self.temp_output.name, 'r', encoding='utf-8') as f:
            output = json.load(f)
        
        self.assertEqual(output['version'], '1.0')
        self.assertEqual(output['wordCount'], 2)
        self.assertEqual(len(output['words']), 2)
        self.assertEqual(output['words'][0]['hanzi'], '你好')
        self.assertEqual(output['words'][1]['hanzi'], '世界')

    def test_export_with_custom_db_path(self):
        """Test export with a custom database path."""
        # Use absolute path
        abs_db_path = os.path.abspath(self.temp_db.name)
        result = export_words(abs_db_path, self.temp_output.name)
        
        with open(self.temp_output.name, 'r', encoding='utf-8') as f:
            output = json.load(f)
        
        # Source should still be just the filename
        expected_filename = Path(abs_db_path).name
        self.assertEqual(output['source'], expected_filename)

    def test_database_ids_preserved(self):
        """Test that database IDs are preserved and ordered correctly."""
        result = export_words(self.temp_db.name, self.temp_output.name)
        
        with open(self.temp_output.name, 'r', encoding='utf-8') as f:
            output = json.load(f)
        
        # Words should be ordered by database ID
        self.assertEqual(output['words'][0]['id'], 1)
        self.assertEqual(output['words'][0]['hanzi'], '你好')
        
        self.assertEqual(output['words'][1]['id'], 2)
        self.assertEqual(output['words'][1]['hanzi'], '世界')
        
        # Verify IDs are integers (not strings)
        self.assertIsInstance(output['words'][0]['id'], int)
        self.assertIsInstance(output['words'][1]['id'], int)

    def test_export_with_null_values(self):
        """Test export with null pinyin and translation values."""
        # Add word with null values to test database
        conn = sqlite3.connect(self.temp_db.name)
        with conn:
            conn.execute(
                "INSERT INTO hanzi_words (hanzi, pinyin, translation) VALUES (?, ?, ?)",
                ("测试", None, None)
            )
        conn.close()
        
        result = export_words(self.temp_db.name, self.temp_output.name)
        self.assertEqual(result['exported'], 3)
        
        with open(self.temp_output.name, 'r', encoding='utf-8') as f:
            output = json.load(f)
        
        # Find the word with null values
        test_word = next(w for w in output['words'] if w['hanzi'] == '测试')
        self.assertEqual(test_word['pinyin'], '')
        self.assertEqual(test_word['translation'], '')
        self.assertTrue(test_word['enabled'])
        self.assertEqual(test_word['id'], 3)  # Should have ID 3

    

if __name__ == '__main__':
    unittest.main()
