#!/usr/bin/env python3
"""Auto-generate the blog post listing in org/blog/index.org.

Scans org/blog/ for .org files (excluding index.org), extracts titles and
dates, and rewrites the post list section between the marker comments.

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

import os
import re
import sys
from datetime import datetime
from pathlib import Path

BLOG_DIR = Path(__file__).resolve().parent.parent / "org" / "blog"
INDEX_FILE = BLOG_DIR / "index.org"

BEGIN_MARKER = "<!-- BEGIN AUTO-GENERATED POST LIST -->"
END_MARKER = "<!-- END AUTO-GENERATED POST LIST -->"

DATE_RE = re.compile(r"^(\d{4}-\d{2}-\d{2})")
TITLE_RE = re.compile(r"^#\+TITLE:\s*(.+)$", re.MULTILINE)


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
        return f"{BEGIN_MARKER}\n\nNo posts yet.\n\n{END_MARKER}"
    lines = [BEGIN_MARKER, ""]
    for post in posts:
        lines.append(format_post_link(post))
    lines.append("")
    lines.append(END_MARKER)
    return "\n".join(lines)


def update_index_file(dry_run=False):
    """Replace the content between markers in index.org."""
    content = INDEX_FILE.read_text(encoding="utf-8")

    # If markers don't exist yet, we can't proceed
    if BEGIN_MARKER not in content or END_MARKER not in content:
        print("ERROR: Marker comments not found in index.org.", file=sys.stderr)
        print(f"Add these lines to org/blog/index.org where the post list should go:",
              file=sys.stderr)
        print(f"  {BEGIN_MARKER}", file=sys.stderr)
        print(f"  {END_MARKER}", file=sys.stderr)
        sys.exit(1)

    # Extract before/after sections
    begin_pos = content.index(BEGIN_MARKER)
    end_pos = content.index(END_MARKER) + len(END_MARKER)

    before = content[:begin_pos]
    after = content[end_pos:]
    new_section = generate_index_section()

    new_content = before + new_section + after

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
