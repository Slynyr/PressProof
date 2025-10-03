from bs4 import BeautifulSoup, NavigableString, Tag
from urllib.parse import urljoin
from dataclasses import dataclass
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


_MOJIBAKE_SIGNS = re.compile(r"(?:Ã.|Â.|â€|â€™|â€œ|â€“|â€”|â€¢|â€¦)")

_INVISIBLES = re.compile(r"[\u200B-\u200F\u202A-\u202E\u2060\uFEFF\u00AD]")

_CODE_SPANS = re.compile(r"(?s)(```.*?```|`[^`\n]*`)")

def _maybe_fix_mojibake(s: str) -> str:
    if not _MOJIBAKE_SIGNS.search(s):
        return s
    try:
        return s.encode("cp1252").decode("utf-8")
    except Exception:
        return s

def _reflow_segment(t: str) -> str:
    t = _maybe_fix_mojibake(t)                              
    t = unicodedata.normalize("NFKC", t)                    
    t = t.replace("\u00A0", " ")                            
    t = t.replace("\r\n", "\n").replace("\r", "\n")         
    t = _INVISIBLES.sub("", t)                             
    t = re.sub(r"[ \t]+\n", "\n", t)                        
    t = re.sub(r"\n{3,}", "\n\n", t)                        

    t = re.sub(r"([^\n])\n(?!\n)([^\n])", rf"\1{WRAP}\2", t)
    t = re.sub(rf"{WRAP_ESC}\s+([.,;:!?%)\]\}}])", r"\1", t)
    t = re.sub(rf";{WRAP_ESC}\s+\.", ";.", t)
    t = re.sub(rf"\s*{WRAP_ESC}\s*", " ", t)

    t = re.sub(r"[ \t]+\n", "\n", t)
    t = re.sub(r"\n[ \t]+", "\n", t)
    return t

def _text_from_dom(root: Tag) -> str:
    parts = []

    def walk(node: Tag | NavigableString):
        if isinstance(node, NavigableString):
            parts.append(str(node))
            return

        if not isinstance(node, Tag):
            return

        # Skip non content
        if node.name in {"script", "style"}:
            return

        # Treat <br> as a line break
        if node.name == "br":
            parts.append("\n")
            return

        is_block = node.name in BLOCK_LIKE

        # Paragraph separator before entering a block
        if is_block and parts and not parts[-1].endswith("\n\n"):
            parts.append("\n\n")

        if node.name == "code":
            parts.append(f"`{node.get_text()}`")            
        elif node.name == "pre":
            code = node.get_text()
            classes = node.get("class") or []
            lang = None
            for cls in classes:
                m = re.match(r"(?:language|lang)-(\w+)", cls)
                if m:
                    lang = m.group(1)
                    break
            fence = f"```{lang}\n" if lang else "```\n"
            parts.append(fence + code + "\n```")
        else:
            for child in node.children:
                walk(child)

        # Paragraph separator after a block
        if is_block and (not parts or not parts[-1].endswith("\n\n")):
            parts.append("\n\n")

    walk(root)
    text = "".join(parts)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()

def _reflow(raw: str) -> str:
    out = []
    last = 0
    for m in _CODE_SPANS.finditer(raw):
        out.append(_reflow_segment(raw[last:m.start()]))
        out.append(m.group(0))
        last = m.end()

    # Trailing non code
    out.append(_reflow_segment(raw[last:]))

    return "".join(out).strip()

class Scraper:
    def __init__(self, args):
        self.args = args
        self.latestSoup = None

    def _fetch_soup(self, url: str) -> BeautifulSoup:
        headers = {"User-Agent": getattr(self.args, "useragent", "Mozilla/5.0")}
        r = requests.get(url, headers=headers, timeout=20)
        r.raise_for_status()
        try:
            return BeautifulSoup(r.text, "lxml")
        except Exception:
            return BeautifulSoup(r.text, "html.parser")

    def indexPage(self, url: str): 
        self.latestSoup = self._fetch_soup(url)

    def getCurrentPageContent(self) -> str:
        main = self.latestSoup.select_one("article .entry-content")
        if not main:
            main = self.latestSoup.select_one('[role="main"]') or self.latestSoup.select_one("main") or self.latestSoup.body
        if not main:
            return ""

        raw = _text_from_dom(main)

        cleaned = _reflow(raw)
        return cleaned
    
    
    def getCurrentPageTitle(self) -> str | None:
        h1 = self.latestSoup.select_one("article h1.entry-title")
        if h1 and h1.get_text(strip=True):
            return h1.get_text(strip=True)
        
        title_tag = self.latestSoup.title
        if title_tag and title_tag.string:
            return title_tag.string.strip()
        
        return None

    def getCurrentNextPageURL(self, url: str):
        # Search by <link> with rel=next---
        link_tag = self.latestSoup.select_one('link[rel="next"]')
        if link_tag and link_tag.get("href"):
            return urljoin(url, link_tag["href"])

        # Search by <a> with rel=next---
        a_rel_next = self.latestSoup.select_one('a[rel~="next"]')
        if a_rel_next and a_rel_next.get("href"):
            return urljoin(url, a_rel_next["href"])

        # Search by content
        for a in self.latestSoup.find_all("a"):
            text = (a.get_text(strip=True) or "").lower()
            if text.startswith("next"):
                href = a.get("href")
                if href:
                    return urljoin(url, href)

        # Search by .nav-links
        nav_next = self.latestSoup.select_one(".nav-links a, nav a")
        if nav_next and nav_next.get("href"):
            label = (nav_next.get_text(strip=True) or "").lower()
            if label.startswith("next"):
                return urljoin(url, nav_next["href"])

        return None