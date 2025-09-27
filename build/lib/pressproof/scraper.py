from bs4 import BeautifulSoup, NavigableString, Tag
from urllib.parse import urljoin
import unicodedata
import re
import requests

# CONSTANTS
WRAP = "⟦WRAP⟧"
WRAP_ESC = re.escape(WRAP)

BLOCK_LIKE = {
    "p","div","section","article","header","footer","h1","h2","h3","h4","h5","h6",
    "ul","ol","li","table","thead","tbody","tfoot","tr","td","th",
    "blockquote","pre","figure","figcaption","hr"
}

def _text_from_dom(root: Tag) -> str:
    parts = []

    def walk(node: Tag | NavigableString):
        if isinstance(node, NavigableString):
            parts.append(str(node))
            return

        if not isinstance(node, Tag):
            return

        is_block = node.name in BLOCK_LIKE

        # Add a paragraph separator before entering a block (but avoid doubling)
        if is_block and parts and not parts[-1].endswith("\n\n"):
            parts.append("\n\n")

        if node.name == "code":
            # Keep inline code text; you can wrap in backticks to protect spacing later
            parts.append(f"`{node.get_text()}`")
        elif node.name == "pre":
            # Preserve preformatted text exactly (optionally fenced)
            parts.append("```\n" + node.get_text() + "\n```")
        else:
            for child in node.children:
                walk(child)

        # Add a separator after a block
        if is_block and (not parts or not parts[-1].endswith("\n\n")):
            parts.append("\n\n")

    walk(root)
    text = "".join(parts)

    # Collapse 3+ newlines to 2 here, leave fine-grained reflow to _reflow()
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()

def _reflow(raw: str) -> str:
    t = unicodedata.normalize("NFKC", raw)
    t = t.replace("\u00A0", " ").replace("\uFFFD", "")
    t = t.replace("\r\n", "\n").replace("\r", "\n")

    # Trim trailing spaces on lines
    t = re.sub(r'[ \t]+\n', '\n', t)

    # Normalize paragraph breaks (keep double newlines as paragraphs)
    t = re.sub(r'\n{3,}', '\n\n', t)

    # Mark single newlines between nonblank chars as soft wraps
    t = re.sub(r'([^\n])\n(?!\n)([^\n])', rf'\1{WRAP}\2', t)

    # ---- boundary-aware punctuation hugging (SAFE) ----
    # If punctuation follows immediately after a wrap boundary, drop the space.
    t = re.sub(rf'{WRAP_ESC}\s+([.,;:!?%)\]\}}])', r'\1', t)  # note: '}}' here
    t = re.sub(rf';{WRAP_ESC}\s+\.', ';.', t)
    t = re.sub(rf'`\s*{WRAP_ESC}\s*([.,;:!?])', r'`\1', t)
    t = re.sub(rf'\s*{WRAP_ESC}\s*', ' ', t)

    # Final tidy of excessive spaces at line starts/ends
    t = re.sub(r'[ \t]+\n', '\n', t)
    t = re.sub(r'\n[ \t]+', '\n', t)

    return t.strip()

class Scraper:
    def __init__(self, args):
        self.args = args

    def _fetch_soup(self, url: str) -> BeautifulSoup:
        headers = {"User-Agent": getattr(self.args, "useragent", "Mozilla/5.0")}
        r = requests.get(url, headers=headers, timeout=20)
        r.raise_for_status()
        try:
            return BeautifulSoup(r.text, "lxml")
        except Exception:
            return BeautifulSoup(r.text, "html.parser")

    def getPageContent(self, url: str) -> str:
        soup = self._fetch_soup(url)

        # Prefer main content region; fallback to role/main/body
        main = soup.select_one("article .entry-content")
        if not main:
            main = soup.select_one('[role="main"]') or soup.select_one("main") or soup.body
        if not main:
            return ""

        # --- NEW: structure-preserving extraction + boundary-aware reflow ---
        raw = _text_from_dom(main)

        # Don’t strip/flatten here; preserve blank lines as paragraphs.
        cleaned = _reflow(raw)
        return cleaned
    
    
    def getPageTitle(self, url: str) -> str | None:
        soup = self._fetch_soup(url)
        h1 = soup.select_one("article h1.entry-title")
        if h1 and h1.get_text(strip=True):
            return h1.get_text(strip=True)
        
        title_tag = soup.title
        if title_tag and title_tag.string:
            return title_tag.string.strip()
        
        return None

    def getNextPageURL(self, url: str):
        soup = self._fetch_soup(url)

        # Search by <link> with rel=next---
        link_tag = soup.select_one('link[rel="next"]')
        if link_tag and link_tag.get("href"):
            return urljoin(url, link_tag["href"])

        # Search by <a> with rel=next---
        a_rel_next = soup.select_one('a[rel~="next"]')
        if a_rel_next and a_rel_next.get("href"):
            return urljoin(url, a_rel_next["href"])

        # Search by content
        for a in soup.find_all("a"):
            text = (a.get_text(strip=True) or "").lower()
            if text.startswith("next"):
                href = a.get("href")
                if href:
                    return urljoin(url, href)

        # Search by .nav-links
        nav_next = soup.select_one(".nav-links a, nav a")
        if nav_next and nav_next.get("href"):
            label = (nav_next.get_text(strip=True) or "").lower()
            if label.startswith("next"):
                return urljoin(url, nav_next["href"])

        return None