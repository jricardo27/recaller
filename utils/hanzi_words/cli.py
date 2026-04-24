#!/usr/bin/env python3
"""
Command-line interface for the Hanzi Words utility.
"""

import argparse
import sys
from pathlib import Path
from typing import Optional

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent))
from hanzi_store import HanziStore


def print_word(word, index: Optional[int] = None) -> None:
    """Pretty print a single word."""
    prefix = f"{index}. " if index is not None else ""
    print(f"\n{prefix}汉字: {word.hanzi}")
    if word.pinyin:
        print(f"   拼音: {word.pinyin}")
    if word.translation:
        print(f"   翻译: {word.translation}")


def cmd_add(store: HanziStore, args) -> None:
    """Handle add command."""
    try:
        word = store.add_word(
            hanzi=args.hanzi,
            pinyin=args.pinyin,
            translation=args.translation,
            auto_translate=not args.no_translate,
            auto_pinyin=not args.no_pinyin
        )
        print("✓ Added:")
        print_word(word)
        if not word.translation and not args.no_translate:
            print("\n   Note: No translation found. Use --translation to add manually.")
    except ValueError as e:
        print(f"✗ Error: {e}")
        sys.exit(1)


def cmd_list(store: HanziStore, args) -> None:
    """Handle list command."""
    # If --all flag is set, use no limit
    limit = None if args.all else args.limit

    words = store.list_words(
        search=args.search,
        has_translation=args.has_translation,
        has_pinyin=args.has_pinyin,
        limit=limit,
        offset=args.offset
    )

    if not words:
        print("No words found.")
        return

    # Compact mode: just print hanzi separated by spaces
    if args.compact:
        print(' '.join(word.hanzi for word in words))
        return

    total = store.count_words()
    filtered_count = len(words)

    if limit is None:
        print(f"\nShowing all {filtered_count} words:\n")
    else:
        print(f"\nShowing {filtered_count} of {total} words:\n")

    for i, word in enumerate(words, 1 + args.offset):
        print_word(word, i)


def cmd_get(store: HanziStore, args) -> None:
    """Handle get command."""
    word = store.get_word(args.hanzi)
    if word:
        print_word(word)
    else:
        print(f"✗ Word '{args.hanzi}' not found.")
        sys.exit(1)


def cmd_update(store: HanziStore, args) -> None:
    """Handle update command."""
    word = store.update_word(
        hanzi=args.hanzi,
        pinyin=args.pinyin,
        translation=args.translation
    )
    if word:
        print("✓ Updated:")
        print_word(word)
    else:
        print(f"✗ Word '{args.hanzi}' not found.")
        sys.exit(1)


def cmd_delete(store: HanziStore, args) -> None:
    """Handle delete command."""
    if store.delete_word(args.hanzi):
        print(f"✓ Deleted '{args.hanzi}'")
    else:
        print(f"✗ Word '{args.hanzi}' not found.")
        sys.exit(1)


def cmd_stats(store: HanziStore, args) -> None:
    """Handle stats command."""
    total = store.count_words()
    with_translation = store.count_words(has_translation=True)
    without_translation = store.count_words(has_translation=False)

    print("\n=== Hanzi Words Statistics ===")
    print(f"Total words:          {total}")
    print(f"With translation:     {with_translation}")
    print(f"Without translation:  {without_translation}")


def cmd_export(store: HanziStore, args) -> None:
    """Handle export command."""
    store.export_to_json(args.filepath)
    print(f"✓ Exported to {args.filepath}")


def cmd_import(store: HanziStore, args) -> None:
    """Handle import command."""
    added, skipped = store.import_from_json(
        args.filepath,
        auto_translate=args.auto_translate,
        auto_pinyin=args.auto_pinyin
    )
    print(f"✓ Import complete:")
    print(f"  Added:   {added}")
    print(f"  Skipped: {skipped} (duplicates)")


def cmd_batch(store: HanziStore, args) -> None:
    """Handle batch add command - add multiple words at once."""
    words_to_add = []

    # Collect words from arguments
    if args.words:
        words_to_add.extend(args.words)

    # Collect words from file if provided
    if args.file:
        try:
            with open(args.file, 'r', encoding='utf-8') as f:
                file_words = [line.strip() for line in f if line.strip()]
                words_to_add.extend(file_words)
        except FileNotFoundError:
            print(f"✗ File not found: {args.file}")
            sys.exit(1)
        except Exception as e:
            print(f"✗ Error reading file: {e}")
            sys.exit(1)

    if not words_to_add:
        print("✗ No words provided. Use --words or --file.")
        sys.exit(1)

    added = 0
    skipped = 0
    failed = 0

    print(f"\nProcessing {len(words_to_add)} words...\n")

    for hanzi in words_to_add:
        try:
            word = store.add_word(
                hanzi=hanzi,
                pinyin=None,  # Always auto-generate in batch mode
                translation=None,
                auto_translate=not args.no_translate,
                auto_pinyin=not args.no_pinyin
            )
            added += 1
            print(f"✓ {word.hanzi}", end="")
            if word.pinyin:
                print(f" ({word.pinyin})", end="")
            if word.translation:
                print(f" - {word.translation}", end="")
            print()
        except ValueError:
            skipped += 1
            print(f"⊘ {hanzi} (already exists)")
        except Exception as e:
            failed += 1
            print(f"✗ {hanzi} (error: {e})")

    print(f"\n{'=' * 40}")
    print(f"Added:   {added}")
    print(f"Skipped: {skipped} (duplicates)")
    if failed:
        print(f"Failed:  {failed}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Manage Mandarin hanzi words with translations",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s add 你好 --pinyin "nǐ hǎo" --translation "hello"
  %(prog)s add 中国                    # auto-generates pinyin & translation
  %(prog)s add 中国 --no-pinyin        # auto-translates only
  %(prog)s batch --words 你好 中国 北京           # add multiple words
  %(prog)s batch --file words.txt                 # add from file
  %(prog)s list                        # show all words
  %(prog)s list --compact              # show only hanzi (copy-friendly)
  %(prog)s list --search "hello"       # filter by translation
  %(prog)s list --no-has-translation   # show untranslated
  %(prog)s list --limit 10             # show first 10 words
  %(prog)s list --offset 10 --limit 5  # show words 11-15
  %(prog)s get 你好                    # get specific word
  %(prog)s update 你好 --pinyin "ni hao"
  %(prog)s delete 你好
  %(prog)s export words.json
  %(prog)s import words.json
        """
    )
    parser.add_argument(
        "--db", "-d",
        help="Path to SQLite database (default: hanzi_words.db)"
    )

    subparsers = parser.add_subparsers(dest="command", help="Commands")

    # Add command
    add_parser = subparsers.add_parser("add", help="Add a new hanzi word")
    add_parser.add_argument("hanzi", help="The Chinese word")
    add_parser.add_argument("--pinyin", "-p", help="Pinyin pronunciation")
    add_parser.add_argument("--translation", "-t", help="English translation")
    add_parser.add_argument(
        "--no-translate", "-n",
        action="store_true",
        help="Don't auto-translate if translation not provided"
    )
    add_parser.add_argument(
        "--no-pinyin", "-P",
        action="store_true",
        help="Don't auto-generate pinyin if not provided"
    )
    add_parser.set_defaults(func=cmd_add)

    # Batch add command
    batch_parser = subparsers.add_parser("batch", help="Add multiple words at once")
    batch_parser.add_argument(
        "--words", "-w",
        nargs="+",
        help="List of hanzi words to add (space-separated)"
    )
    batch_parser.add_argument(
        "--file", "-f",
        help="File containing words (one per line)"
    )
    batch_parser.add_argument(
        "--no-translate", "-n",
        action="store_true",
        help="Don't auto-translate words"
    )
    batch_parser.add_argument(
        "--no-pinyin", "-P",
        action="store_true",
        help="Don't auto-generate pinyin"
    )
    batch_parser.set_defaults(func=cmd_batch)

    # List command
    list_parser = subparsers.add_parser("list", help="List all words")
    list_parser.add_argument("--search", "-s", help="Search in hanzi, pinyin, or translation")
    list_parser.add_argument(
        "--has-translation",
        action=argparse.BooleanOptionalAction,
        help="Filter by translation presence"
    )
    list_parser.add_argument(
        "--has-pinyin",
        action=argparse.BooleanOptionalAction,
        help="Filter by pinyin presence"
    )
    list_parser.add_argument("--all", "-a", action="store_true", help="Show all words (no limit)")
    list_parser.add_argument("--compact", "-c", action="store_true", help="Print only hanzi (space-separated)")
    list_parser.add_argument("--limit", "-l", type=int, default=None, help="Limit results (default: no limit)")
    list_parser.add_argument("--offset", "-o", type=int, default=0, help="Offset for pagination")
    list_parser.set_defaults(func=cmd_list)

    # Get command
    get_parser = subparsers.add_parser("get", help="Get a specific word")
    get_parser.add_argument("hanzi", help="The Chinese word to retrieve")
    get_parser.set_defaults(func=cmd_get)

    # Update command
    update_parser = subparsers.add_parser("update", help="Update an existing word")
    update_parser.add_argument("hanzi", help="The Chinese word to update")
    update_parser.add_argument("--pinyin", "-p", help="New pinyin pronunciation")
    update_parser.add_argument("--translation", "-t", help="New English translation")
    update_parser.set_defaults(func=cmd_update)

    # Delete command
    delete_parser = subparsers.add_parser("delete", help="Delete a word")
    delete_parser.add_argument("hanzi", help="The Chinese word to delete")
    delete_parser.set_defaults(func=cmd_delete)

    # Stats command
    stats_parser = subparsers.add_parser("stats", help="Show statistics")
    stats_parser.set_defaults(func=cmd_stats)

    # Export command
    export_parser = subparsers.add_parser("export", help="Export to JSON")
    export_parser.add_argument("filepath", help="Output JSON file path")
    export_parser.set_defaults(func=cmd_export)

    # Import command
    import_parser = subparsers.add_parser("import", help="Import from JSON")
    import_parser.add_argument("filepath", help="Input JSON file path")
    import_parser.add_argument(
        "--auto-translate", "-a",
        action="store_true",
        help="Auto-translate words without translations"
    )
    import_parser.add_argument(
        "--auto-pinyin", "-p",
        action="store_true",
        help="Auto-generate pinyin for words without pinyin"
    )
    import_parser.set_defaults(func=cmd_import)

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    store = HanziStore(db_path=args.db)
    args.func(store, args)


if __name__ == "__main__":
    main()
