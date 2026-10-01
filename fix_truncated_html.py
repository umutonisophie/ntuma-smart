#!/usr/bin/env python3
"""Close the tags that six NTUMA pages were truncated short of.

all.html and ntuma.html through ntuma4.html were all saved mid-document, with
<div>, <main>, <body> and <html> still open. Browsers recover from this and
render the page anyway, which is why it went unnoticed, but it is invalid HTML
and it has a practical cost: any <script> appended to the end of a file is
swallowed into an unclosed <div> instead of landing in <body>, and automated
markup checks fail.

This script measures the real nesting with html.parser - it does not assume a
fixed tag list - and closes exactly what each file leaves open, innermost last.
Run it once; the files are committed afterwards.

Run:  python3 fix_truncated_html.py
"""

from html.parser import HTMLParser
from pathlib import Path

# Elements that never carry a closing tag.
VOID_ELEMENTS = {
    "area", "base", "br", "col", "embed", "hr", "img", "input",
    "link", "meta", "param", "source", "track", "wbr",
}

# Files known to be truncated, and the comment marker each was cut off inside.
TARGETS = [
    "all.html",
    "ntuma.html",
    "ntuma1.html",
    "ntuma2.html",
    "ntuma3.html",
    "ntuma4.html",
]


class NestingChecker(HTMLParser):
    """Tracks the open-element stack without guessing at structure."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.stack: list[str] = []

    def handle_starttag(self, tag, attrs):
        if tag not in VOID_ELEMENTS:
            self.stack.append(tag)

    def handle_startendtag(self, tag, attrs):
        # Self-closing form, e.g. <br/> - nothing to track.
        pass

    def handle_endtag(self, tag):
        if tag in VOID_ELEMENTS:
            return
        if tag in self.stack:
            # Close anything left open inside this element.
            while self.stack and self.stack[-1] != tag:
                self.stack.pop()
            if self.stack:
                self.stack.pop()


def open_tags(text: str) -> list[str]:
    checker = NestingChecker()
    checker.feed(text)
    checker.close()
    return checker.stack


def close_document(text: str) -> tuple[str, list[str]]:
    """Append the closing tags for whatever the document leaves open."""
    remaining = open_tags(text)
    if not remaining:
        return text, []

    # A truncated file usually ends inside an HTML comment. Close the comment
    # first, or the closing tags would be swallowed as comment text.
    body = text.rstrip()
    if body.count("<!--") > body.count("-->"):
        body += "\n-->"

    for tag in reversed(remaining):
        body += f"\n</{tag}>"

    return body + "\n", remaining


def main() -> None:
    here = Path(__file__).resolve().parent

    for name in TARGETS:
        path = here / name
        if not path.exists():
            print(f"skip   {name}: not found")
            continue

        original = path.read_text(encoding="utf-8")
        if "</html>" in original:
            print(f"skip   {name}: already complete")
            continue

        fixed, remaining = close_document(original)
        path.write_text(fixed, encoding="utf-8")

        # Re-parse to confirm the document is now balanced.
        leftover = open_tags(fixed)
        if leftover:
            print(f"FAIL   {name}: still open {leftover}")
        else:
            print(f"fixed  {name}: closed {' > '.join(reversed(remaining))}")


if __name__ == "__main__":
    main()
