# Hanzi Words Utility - Implementation Document

## Overview

This utility provides a persistent storage system for Mandarin hanzi words with automatic translation lookup. It uses SQLite for storage (no duplicate hanzi allowed) and integrates with free translation APIs.

## Architecture

### Components

| File | Purpose |
|------|---------|
| `hanzi_store.py` | Core storage class with SQLite operations |
| `cli.py` | Command-line interface for all operations |
| `hanzi_words.db` | SQLite database (auto-created) |
| `pyproject.toml` | uv project configuration (dependencies) |
| `IMPLEMENTATION.md` | This documentation |

### Database Schema

```sql
CREATE TABLE hanzi_words (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hanzi TEXT UNIQUE NOT NULL,      -- The Chinese word (unique)
    pinyin TEXT,                      -- Pinyin pronunciation
    translation TEXT,                 -- English translation
    source TEXT,                      -- Translation source (mymemory/manual)
    created_at TIMESTAMP              -- Creation timestamp
);
```

**Key Constraints:**
- `UNIQUE` constraint on `hanzi` prevents duplicate entries
- Index on `hanzi` for fast lookups

## Features

### 1. Word Storage (No Duplicates)

- Each hanzi word is stored uniquely
- Attempting to add an existing word raises `ValueError`
- Supports hanzi, pinyin, and translation fields

### 2. Auto-Translation & Auto-Pinyin

**Translation:**
- Uses **MyMemory Translation API** (free, no API key required)
- Auto-translates Chinese (zh-CN) to English when translation not provided
- Stores translation source for tracking
- Falls back to manual entry if API fails

**Pinyin:**
- Uses **pypinyin** library for local pinyin generation
- Generates tone-marked pinyin (e.g., "nǐ hǎo")
- Works offline, no API required
- Can be disabled with `--no-pinyin` flag

### 3. Query & Filtering

The `list_words()` method supports:

| Filter | Description |
|--------|-------------|
| `search` | Partial match in hanzi, pinyin, or translation |
| `has_translation` | Filter by presence/absence of translation |
| `has_pinyin` | Filter by presence/absence of pinyin |
| `limit` / `offset` | Pagination support |

### 4. CRUD Operations

- **Create**: `add_word()`
- **Batch Create**: `batch` command for multiple words
- **Read**: `get_word()`, `list_words()`
- **Update**: `update_word()`
- **Delete**: `delete_word()`

### 5. Import/Export & Batch Operations

- Export all words to JSON
- Import from JSON (skips duplicates)
- Optional auto-translation during import

## CLI Usage

### Setup

```bash
cd /Users/ricardoperez/pcode/recaller/utils/hanzi_words
uv sync
```

### Commands

#### Add Words

```bash
# Add with auto-translation AND auto-pinyin (default)
uv run python cli.py add 你好

# Add with manual translation and pinyin
uv run python cli.py add 你好 --pinyin "nǐ hǎo" --translation "hello"

# Add with auto-pinyin but no translation
uv run python cli.py add 你好 --no-translate

# Add with auto-translation but no auto-pinyin
uv run python cli.py add 你好 --no-pinyin
```

#### Batch Add Words

Add multiple words efficiently (auto-generates pinyin and translation for all):

```bash
# Add multiple words from command line
uv run python cli.py batch --words 你好 中国 北京 谢谢

# Add from file (one word per line)
uv run python cli.py batch --file words.txt

# Content of words.txt:
# 你好
# 中国
# 北京

# Batch add without translation
uv run python cli.py batch --words 你好 中国 --no-translate

# Batch add without pinyin
uv run python cli.py batch --words 你好 中国 --no-pinyin
```

**Batch output shows progress:**
```
Processing 3 words...

✓ 你好 (nǐ hǎo) - Hello
✓ 中国 (zhōng guó) - China
⊘ 北京 (already exists)

========================================
Added:   2
Skipped: 1 (duplicates)
```

#### List Words

```bash
# List all words
uv run python cli.py list

# Search (matches hanzi, pinyin, or translation)
uv run python cli.py list --search "hello"

# Show only untranslated words
uv run python cli.py list --no-has-translation

# Show only words with pinyin
uv run python cli.py list --has-pinyin

# Pagination
uv run python cli.py list --limit 20 --offset 40
```

#### Get Single Word

```bash
uv run python cli.py get 你好
```

#### Update Word

```bash
# Update pinyin
uv run python cli.py update 你好 --pinyin "ni hao"

# Update translation
uv run python cli.py update 你好 --translation "hi"
```

#### Delete Word

```bash
uv run python cli.py delete 你好
```

#### Statistics

```bash
uv run python cli.py stats
```

#### Export/Import

```bash
# Export to JSON
uv run python cli.py export words.json

# Import from JSON
uv run python cli.py import words.json

# Import with auto-translation for missing translations
uv run python cli.py import words.json --auto-translate

# Import with auto-pinyin for missing pinyin
uv run python cli.py import words.json --auto-pinyin

# Import with both
uv run python cli.py import words.json --auto-translate --auto-pinyin
```

### Custom Database Path

```bash
uv run python cli.py --db /path/to/custom.db add 你好
```

## Python API Usage

```python
from hanzi_store import HanziStore

# Initialize
store = HanziStore()  # Uses default db path

# Add a word (auto-translates)
word = store.add_word("中国")
print(word.translation)  # "China"

# Add with manual data
word = store.add_word(
    hanzi="北京",
    pinyin="běi jīng",
    translation="Beijing"
)

# List with filters
words = store.list_words(
    search="china",
    has_translation=True,
    limit=10
)

# Get single word
word = store.get_word("中国")

# Update
store.update_word("中国", pinyin="zhōng guó")

# Delete
store.delete_word("中国")

# Statistics
total = store.count_words()
with_trans = store.count_words(has_translation=True)

# Export/Import
store.export_to_json("backup.json")
store.import_from_json("backup.json")
```

## Implementation Details

### Translation API

**Primary**: MyMemory Translation API
- Endpoint: `https://api.mymemory.translated.net/get`
- Parameters: `q` (query), `langpair` (zh-CN|en)
- Free tier: 5000 words/day
- No API key required

### Error Handling

- Duplicate words raise `ValueError`
- Missing words return `None` or raise error depending on method
- API failures gracefully fall back to no translation

### Data Integrity

- SQLite transactions ensure atomic operations
- Unique constraint prevents duplicate hanzi
- Timestamps automatically recorded

## Future Enhancements

- [ ] Batch add from text file
- [ ] Integration with additional translation APIs
- [ ] Pinyin auto-generation
- [ ] Word frequency tracking
- [ ] Categorization/tags for words
- [ ] Spaced repetition integration

## Progress Log

| Date | Task | Status |
|------|------|--------|
| 2024-04-22 | Create SQLite storage class | ✓ Complete |
| 2024-04-22 | Implement MyMemory API integration | ✓ Complete |
| 2024-04-22 | Build CLI interface | ✓ Complete |
| 2024-04-22 | Add filtering and search | ✓ Complete |
| 2024-04-22 | Write documentation | ✓ Complete |
| 2024-04-22 | Setup uv environment | ✓ Complete |
| 2024-04-22 | Add auto-pinyin generation | ✓ Complete |
| 2024-04-22 | Add batch word addition | ✓ Complete |
