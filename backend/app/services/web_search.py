from typing import List, Dict
from urllib.parse import urlparse

from duckduckgo_search import DDGS
import trafilatura


def _is_trusted(url: str, allowed_domains: List[str]) -> bool:
    try:
        netloc = urlparse(url).netloc.lower()
    except Exception:
        return False
    return any(netloc.endswith(dom) for dom in allowed_domains)


def medical_search(query: str, allowed_domains: List[str], max_results: int = 5) -> List[Dict]:
    results: List[Dict] = []
    with DDGS() as ddgs:
        for r in ddgs.text(query, max_results=max_results * 3):
            url = r.get("href") or r.get("url")
            if not url:
                continue
            if not _is_trusted(url, allowed_domains):
                continue
            results.append({
                "title": r.get("title"),
                "url": url,
                "snippet": r.get("body") or r.get("snippet"),
            })
            if len(results) >= max_results:
                break

    # Fetch and extract main text
    for item in results:
        try:
            downloaded = trafilatura.fetch_url(item["url"])  # type: ignore[arg-type]
            item["content"] = trafilatura.extract(downloaded) if downloaded else None
        except Exception:
            item["content"] = None
    return results 