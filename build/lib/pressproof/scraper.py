from bs4 import BeautifulSoup
from urllib.parse import urljoin
import requests

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

        # Parsing data
        main = soup.select_one("article .entry-content")
        if not main:
            main = soup.select_one('[role="main"]') or soup.select_one("main") or soup.body

        for tag in main.find_all(["script", "style", "noscript", "nav", "aside"]):
            tag.decompose()

        text = main.get_text(separator="\n", strip=True)
        lines = [line.strip() for line in text.splitlines()]
        cleaned = "\n".join([ln for ln in lines if ln])
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