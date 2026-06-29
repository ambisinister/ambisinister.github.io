#!/usr/bin/env python3
"""Auto-generate the blog post listing in org/blog/index.org.

Scans org/blog/ for .org files (excluding index.org), extracts titles and
dates, and rewrites the post list below the "Posts are listed newest first."
line. Legacy marker comments are removed if they are still present.

Usage:
    python3 scripts/generate_blog_index.py [--dry-run]

Date convention:
    Blog post filenames should start with a date: YYYY-MM-DD-slug.org
    The date is parsed from the filename. If a file doesn't have a date in
    the filename, it falls back to file modification time.

Title convention:
    The #+TITLE: keyword at the top of the .org file is used as the link text.
    If not found, the filename slug is used.

Workflow:
    1. Write your post as org/blog/YYYY-MM-DD-slug.org
    2. Run this script
    3. Export with org-publish (C-c C-e h h) as usual
"""

import re
import sys
from datetime import datetime
from pathlib import Path

BLOG_DIR = Path(__file__).resolve().parent.parent / "org" / "blog"
INDEX_FILE = BLOG_DIR / "index.org"

BEGIN_MARKER = "<!-- BEGIN AUTO-GENERATED POST LIST -->"
END_MARKER = "<!-- END AUTO-GENERATED POST LIST -->"
POST_LIST_ANCHOR = "Posts are listed newest first."
NO_POSTS_LINE = "No posts yet."

DATE_RE = re.compile(r"^(\d{4}-\d{2}-\d{2})")
TITLE_RE = re.compile(r"^#\+TITLE:\s*(.+)$", re.MULTILINE)
POST_LINK_RE = re.compile(
    r"^(?:-\s+)?\[\[https?://planetbanatt\.net/blog/[^][]+\.html\]\[[^][]+\]\]$"
)


def extract_title(filepath):
    """Extract #+TITLE from an org file, fall back to filename slug."""
    try:
        text = filepath.read_text(encoding="utf-8")
    except Exception:
        return filepath.stem
    m = TITLE_RE.search(text)
    if m:
        return m.group(1).strip()
    # Fallback: slugify the filename minus date prefix
    stem = DATE_RE.sub("", filepath.stem).lstrip("-")
    return stem.replace("_", " ").title()


def extract_date(filepath):
    """Extract date from filename (YYYY-MM-DD-slug.org) or file mtime."""
    m = DATE_RE.match(filepath.stem)
    if m:
        return datetime.strptime(m.group(1), "%Y-%m-%d")
    return datetime.fromtimestamp(filepath.stat().st_mtime)


def get_blog_posts():
    """Scan blog dir for .org files, return sorted newest-first."""
    posts = []
    for f in BLOG_DIR.glob("*.org"):
        if f.name == "index.org":
            continue
        if f.name.startswith("."):
            continue
        title = extract_title(f)
        date = extract_date(f)
        slug = f.stem
        posts.append({"title": title, "date": date, "slug": slug})
    posts.sort(key=lambda p: p["date"], reverse=True)
    return posts


def format_post_link(post):
    """Format a single blog post link for org-mode."""
    date_str = post["date"].strftime("%Y-%m-%d")
    return f"[[https://planetbanatt.net/blog/{post['slug']}.html][{date_str} - {post['title']}]]"


def generate_index_section():
    """Generate the org-mode content for the post list."""
    posts = get_blog_posts()
    if not posts:
        return NO_POSTS_LINE
    return "\n".join(f"- {format_post_link(post)}" for post in posts)


def is_managed_post_line(line):
    """Return True for lines owned by this generator."""
    return line == NO_POSTS_LINE or bool(POST_LINK_RE.match(line))


def split_legacy_marker_block(content):
    """Return before/after text for old marker-based indexes, if present."""
    has_begin = BEGIN_MARKER in content
    has_end = END_MARKER in content

    if has_begin != has_end:
        print("ERROR: Incomplete legacy marker comments found in index.org.",
              file=sys.stderr)
        sys.exit(1)

    if not has_begin:
        return None

    begin_pos = content.index(BEGIN_MARKER)
    try:
        end_pos = content.index(END_MARKER, begin_pos) + len(END_MARKER)
    except ValueError:
        print("ERROR: Legacy end marker appears before begin marker in index.org.",
              file=sys.stderr)
        sys.exit(1)

    return content[:begin_pos], content[end_pos:]


def split_anchor_block(content):
    """Return before/after text around the managed post list."""
    lines = content.splitlines(keepends=True)
    anchor_idx = None

    for idx, line in enumerate(lines):
        if line.strip() == POST_LIST_ANCHOR:
            anchor_idx = idx
            break

    if anchor_idx is None:
        print("ERROR: Blog index anchor not found in index.org.", file=sys.stderr)
        print("Add this line where the generated post list should go:",
              file=sys.stderr)
        print(f"  {POST_LIST_ANCHOR}", file=sys.stderr)
        sys.exit(1)

    start = anchor_idx + 1
    while start < len(lines) and lines[start].strip() == "":
        start += 1

    end = start
    while end < len(lines):
        stripped = lines[end].strip()

        if is_managed_post_line(stripped):
            end += 1
            continue

        if stripped == "":
            next_idx = end + 1
            while next_idx < len(lines) and lines[next_idx].strip() == "":
                next_idx += 1
            if (next_idx < len(lines)
                    and is_managed_post_line(lines[next_idx].strip())):
                end = next_idx
                continue

        break

    return "".join(lines[:anchor_idx + 1]), "".join(lines[end:])


def build_index_content(before, new_section, after):
    """Assemble the index with clean spacing around the generated list."""
    before = before.rstrip()
    after = after.lstrip("\n")

    if after:
        return f"{before}\n\n{new_section}\n\n{after}"
    return f"{before}\n\n{new_section}\n"


def update_index_file(dry_run=False):
    """Replace the generated post list in index.org."""
    content = INDEX_FILE.read_text(encoding="utf-8")
    legacy_parts = split_legacy_marker_block(content)
    if legacy_parts:
        before, after = legacy_parts
    else:
        before, after = split_anchor_block(content)
    new_section = generate_index_section()
    new_content = build_index_content(before, new_section, after)

    if dry_run:
        print("=== DRY RUN: New index.org post list section ===")
        print(new_section)
        print()
        posts = get_blog_posts()
        print(f"Found {len(posts)} blog post(s):")
        for p in posts:
            print(f"  {p['date'].strftime('%Y-%m-%d')} - {p['title']} ({p['slug']})")
        return

    INDEX_FILE.write_text(new_content, encoding="utf-8")
    posts = get_blog_posts()
    print(f"Updated org/blog/index.org with {len(posts)} post(s):")
    for p in posts:
        print(f"  {p['date'].strftime('%Y-%m-%d')} - {p['title']} ({p['slug']})")


if __name__ == "__main__":
    dry = "--dry-run" in sys.argv
    update_index_file(dry_run=dry)
