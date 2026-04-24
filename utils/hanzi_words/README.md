# Hanzi Words Utility

Store Mandarin hanzi words with auto-pinyin, auto-translation, and filtering.

## Quick Start

```bash
cd utils/hanzi_words
uv sync

# Add a word (auto-generates pinyin & translation)
uv run python cli.py add 你好

# List all words
uv run python cli.py list

# Search
uv run python cli.py list --search "hello"
```

## Commands

| Command | Description |
|---------|-------------|
| `add <hanzi>` | Add word (auto pinyin + translation) |
| `batch` | Add multiple words at once |
| `list` | List words with filters |
| `get <hanzi>` | Get single word |
| `update <hanzi>` | Update pinyin/translation |
| `delete <hanzi>` | Remove word |
| `stats` | Show statistics |
| `export <file>` | Export to JSON |
| `import <file>` | Import from JSON |

## Examples

```bash
# Add with manual translation
uv run python cli.py add 你好 --pinyin "nǐ hǎo" --translation "hello"

# Add multiple words at once
uv run python cli.py batch --words 你好 中国 北京

# Add from file (one word per line)
uv run python cli.py batch --file words.txt

# Show only untranslated words
uv run python cli.py list --no-has-translation

# Update translation
uv run python cli.py update 你好 --translation "hi there"

# Export backup
uv run python cli.py export words.json
```

See `IMPLEMENTATION.md` for full documentation.
