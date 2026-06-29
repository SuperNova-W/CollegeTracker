#!/usr/bin/env python3
"""
US News College Rankings Scraper
=================================
Scrapes undergraduate program rankings from US News & World Report.

Strategy (in order):
  1. Direct requests to US News internal JSON API (no browser)
  2. Intercept XHR/fetch network responses via Playwright
  3. Extract from window.__NEXT_DATA__ (Next.js initial state)
  4. DOM parsing fallback using discovered selectors
  5. --debug flag saves full page HTML so you can inspect selectors yourself

Setup:
    pip install -r requirements.txt
    playwright install chromium

Usage:
    python scrape_rankings.py                      # all majors
    python scrape_rankings.py --major cs           # one major only
    python scrape_rankings.py --debug              # save HTML for inspection
    python scrape_rankings.py --out custom.json    # custom output path
    python scrape_rankings.py --dry-run            # print URLs only, no browser
"""

import json
import time
import argparse
import re
import sys
import requests
import csv
import shutil
from html.parser import HTMLParser
from pathlib import Path

# â”€â”€ Major catalogue â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

MAJORS = {
    "computer-science": {
        "name": "Computer Science",
        "url": "https://www.usnews.com/best-graduate-schools/top-computer-science-schools/computer-science-rankings",
    },
    "electrical-engineering": {
        "name": "Electrical Engineering",
        "url": "https://www.usnews.com/best-graduate-schools/top-engineering-schools/electrical-engineering-rankings",
    },
    "mechanical-engineering": {
        "name": "Mechanical Engineering",
        "url": "https://www.usnews.com/best-graduate-schools/top-engineering-schools/mechanical-engineering-rankings",
    },
    "chemical-engineering": {
        "name": "Chemical Engineering",
        "url": "https://www.usnews.com/best-graduate-schools/top-engineering-schools/chemical-engineering-rankings",
    },
    "computer-engineering": {
        "name": "Computer Engineering",
        "url": "https://www.usnews.com/best-graduate-schools/top-engineering-schools/computer-engineering-rankings",
    },
    "aerospace-engineering": {
        "name": "Aerospace Engineering",
        "url": "https://www.usnews.com/best-graduate-schools/top-engineering-schools/aerospace-engineering-rankings",
    },
    "biomedical-engineering": {
        "name": "Biomedical Engineering",
        "url": "https://www.usnews.com/best-graduate-schools/top-engineering-schools/biomedical-engineering-rankings",
    },
    "civil-engineering": {
        "name": "Civil Engineering",
        "url": "https://www.usnews.com/best-graduate-schools/top-engineering-schools/civil-engineering-rankings",
    },
    "business": {
        "name": "Business (MBA)",
        "url": "https://www.usnews.com/best-graduate-schools/top-business-schools/mba-rankings",
    },
    "accounting": {
        "name": "Accounting",
        "url": "https://www.usnews.com/best-graduate-schools/top-business-schools/accounting-rankings",
    },
    "finance": {
        "name": "Finance",
        "url": "https://www.usnews.com/best-graduate-schools/top-business-schools/finance-rankings",
    },
    "national-universities": {
        "name": "National Universities (Overall)",
        "url": "https://www.usnews.com/best-colleges/rankings/national-universities",
    },
    "liberal-arts": {
        "name": "Liberal Arts",
        "url": "https://www.usnews.com/best-colleges/rankings/national-liberal-arts-colleges",
    },
    "nursing": {
        "name": "Nursing",
        "url": "https://www.usnews.com/best-graduate-schools/top-health-schools/nursing-rankings",
    },
    "psychology": {
        "name": "Psychology",
        "url": "https://www.usnews.com/best-graduate-schools/top-health-schools/psychology-rankings",
    },
    "biology": {
        "name": "Biology",
        "url": "https://www.usnews.com/best-graduate-schools/top-science-schools/biological-sciences-rankings",
    },
}

ALIASES = {
    "cs": "computer-science",
    "ee": "electrical-engineering",
    "me": "mechanical-engineering",
    "ce": "civil-engineering",
    "che": "chemical-engineering",
    "bme": "biomedical-engineering",
    "biz": "business",
    "nat": "national-universities",
}

_BROWSER_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)

# â”€â”€ Strategy 0: Direct API (no browser) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

def _dedupe_rankings(rankings, limit):
    """Return unique ranking rows ordered by rank, capped to limit."""
    seen = set()
    unique = []
    for entry in sorted(rankings, key=lambda x: x.get("rank", 9999)):
        rank = entry.get("rank")
        name = entry.get("name")
        if not rank or not name:
            continue
        key = name.lower()
        if key in seen:
            continue
        seen.add(key)
        unique.append(entry)
        if len(unique) >= limit:
            break
    return unique


def _write_outputs(output, out_path, sync_targets=False):
    out_path.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")
    if not sync_targets:
        return

    repo_root = Path(__file__).resolve().parents[1]
    targets = [
        repo_root / "frontend" / "src" / "data" / "rankings.json",
        repo_root / "backend" / "src" / "main" / "resources" / "rankings.json",
    ]
    for target in targets:
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(out_path, target)
        print(f"    synced -> {target.relative_to(repo_root)}")


def load_rankings_csv(csv_path, major_slug, major_name, source_url=None, limit=100):
    """
    Import rankings from a CSV export.

    Expected columns:
      rank,name

    Optional columns:
      unitId,sourceUrl
    """
    rankings = []
    with Path(csv_path).open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        required = {"rank", "name"}
        missing = required - set(reader.fieldnames or [])
        if missing:
            raise ValueError(f"CSV missing required columns: {', '.join(sorted(missing))}")

        for row in reader:
            try:
                rank = int(str(row.get("rank", "")).replace("#", "").replace("T-", "").strip())
            except ValueError:
                continue
            name = (row.get("name") or "").strip()
            if not name:
                continue
            rankings.append({
                "rank": rank,
                "name": name,
                "unitId": (row.get("unitId") or "").strip() or None,
            })

    rankings = _dedupe_rankings(rankings, limit)
    return {
        "slug": major_slug,
        "name": major_name,
        "sourceUrl": source_url,
        "scrapedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "rankings": rankings,
    }


def _try_direct_api(page_url, limit=100):
    """
    US News serves ranking data from an internal search API used by their SPA.
    Try both known endpoint patterns before falling back to Playwright.
    """
    ranking_slug = page_url.rstrip("/").split("/")[-1]
    session = requests.Session()
    session.headers.update({
        "User-Agent": _BROWSER_UA,
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": page_url,
        "Origin": "https://www.usnews.com",
        "DNT": "1",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
    })

    # First: visit the page with requests to pick up cookies / tokens
    try:
        session.get(page_url, timeout=10)
    except Exception:
        pass

    candidates = [
        # Internal search API (used by the Next.js frontend)
        ("https://www.usnews.com/best-colleges/api/search", {
            "format": "json",
            "ranking": ranking_slug,
            "_sort": "rank",
            "_sortDirection": "asc",
            "_page": 1,
            "_schools_per_page": min(limit, 100),
        }),
        # Alternate endpoint pattern
        ("https://www.usnews.com/best-colleges/api/search", {
            "format": "json",
            "specialty": ranking_slug,
            "_sort": "rank",
            "_sortDirection": "asc",
            "_page": 1,
            "_schools_per_page": min(limit, 100),
        }),
    ]

    for api_url, params in candidates:
        all_results = []
        try:
            for page_num in range(1, 8):
                page_params = dict(params)
                page_params["_page"] = page_num
                r = session.get(api_url, params=page_params, timeout=20)
                if r.status_code != 200:
                    break
                data = r.json()
                results = []
                _walk_for_rankings(data, results, depth=0, limit=limit)
                if not results:
                    break
                before = len(all_results)
                all_results.extend(results)
                all_results = _dedupe_rankings(all_results, limit)
                if len(all_results) >= limit or len(all_results) == before:
                    break
            if len(all_results) >= 3:
                return all_results
        except Exception:
            pass

    return None


# â”€â”€ Extraction helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

def extract_from_jsonld(page):
    """
    Primary strategy: US News embeds a JSON-LD @graph with an ItemList node.
    Each entry has position (rank) and item.name (school name).
    This is server-rendered so it's present on first load.
    """
    try:
        blocks = page.evaluate("""() => {
            return Array.from(
                document.querySelectorAll('script[type="application/ld+json"]')
            ).map(s => s.textContent);
        }""")
    except Exception as e:
        print(f"    JSON-LD script query failed: {e}")
        return None

    for raw in blocks:
        try:
            data = json.loads(raw)
        except Exception:
            continue

        # Handle both direct object and array
        nodes = data if isinstance(data, list) else [data]

        # Walk @graph arrays
        for node in nodes:
            if isinstance(node, dict):
                graph = node.get("@graph", [node])
            else:
                continue
            for item in graph:
                if not isinstance(item, dict):
                    continue
                if item.get("@type") != "ItemList":
                    continue
                elements = item.get("itemListElement", [])
                if len(elements) < 3:
                    continue
                results = []
                for el in elements:
                    rank = el.get("position")
                    school = el.get("item", {})
                    name = school.get("name", "")
                    if rank and name:
                        results.append({"rank": int(rank), "name": name.strip()})
                if results:
                    return results

    return None


def extract_from_next_data(page):
    """Pull ranking entries from window.__NEXT_DATA__ (Next.js initial props)."""
    try:
        raw = page.evaluate("JSON.stringify(window.__NEXT_DATA__ || null)")
        if not raw or raw == "null":
            return None
        data = json.loads(raw)
    except Exception as e:
        print(f"    __NEXT_DATA__ not available: {e}")
        return None

    results = []
    _walk_for_rankings(data, results, depth=0)
    return results if results else None


def _walk_for_rankings(obj, out, depth, limit=100):
    """Recursive walk: find arrays that look like ranking lists."""
    if depth > 8:
        return
    if isinstance(obj, list) and len(obj) >= 3:
        sample = obj[0] if obj else {}
        if isinstance(sample, dict):
            keys = {k.lower() for k in sample.keys()}
            if ("name" in keys or "school" in keys or "displayname" in keys) and (
                "rank" in keys or "ranking" in keys or "sortrank" in keys
            ):
                for item in obj[:limit]:
                    entry = _parse_ranking_item(item)
                    if entry:
                        out.append(entry)
                return
    if isinstance(obj, dict):
        for v in obj.values():
            _walk_for_rankings(v, out, depth + 1, limit)
    elif isinstance(obj, list):
        for item in obj:
            _walk_for_rankings(item, out, depth + 1, limit)


def _parse_ranking_item(item):
    """Normalise a raw ranking dict into {rank, name, unitId}."""
    if not isinstance(item, dict):
        return None

    rank = (
        item.get("rank")
        or item.get("ranking")
        or item.get("sortRank")
        or item.get("display_rank")
        or (item.get("ranking") or {}).get("sortRank")
    )
    try:
        rank = int(str(rank).replace("T-", "").replace("#", "").strip())
    except (TypeError, ValueError):
        return None

    name = (
        item.get("displayName")
        or item.get("name")
        or item.get("school_name")
        or (item.get("school") or {}).get("name")
        or (item.get("institution") or {}).get("displayName")
        or (item.get("institution") or {}).get("name")
    )
    if not name:
        return None

    unit_id = (
        str(item.get("unitId") or item.get("unit_id") or "").strip() or None
    )

    return {"rank": rank, "name": str(name).strip(), "unitId": unit_id}


def extract_from_api_intercept(captured):
    """Parse ranking entries from intercepted XHR/fetch JSON responses."""
    for payload in captured:
        data = payload.get("data", {})
        results = []
        _walk_for_rankings(data, results, depth=0)
        if len(results) >= 5:
            return results
    return None


def extract_from_dom(page):
    """Last-resort DOM extraction."""
    try:
        pairs = page.evaluate("""() => {
            const results = [];
            const rankEls = document.querySelectorAll(
                '[class*="rank"],[data-testid*="rank"],[class*="Rank"]'
            );
            for (const el of rankEls) {
                const rankText = el.innerText?.trim();
                const rankNum = parseInt(rankText);
                if (!rankNum || rankNum > 200) continue;
                let parent = el.parentElement;
                for (let i = 0; i < 5; i++) {
                    if (!parent) break;
                    const link = parent.querySelector('a[href*="best-colleges"]');
                    if (link && link.innerText.trim().length > 3) {
                        results.push({ rank: rankNum, name: link.innerText.trim() });
                        break;
                    }
                    parent = parent.parentElement;
                }
            }
            if (results.length < 3) {
                const links = document.querySelectorAll('a[href*="/best-colleges/"][href*="/name/"]');
                for (const link of links) {
                    const name = link.innerText.trim();
                    if (!name) continue;
                    let node = link.closest('li,article,[class*="result"],[class*="Result"]');
                    if (!node) continue;
                    const text = node.innerText;
                    const m = text.match(/^\\s*(\\d{1,3})[^\\d]/);
                    if (m) results.push({ rank: parseInt(m[1]), name });
                }
            }
            return results;
        }""")
        return [p for p in pairs if p.get("rank") and p.get("name")] or None
    except Exception as e:
        print(f"    DOM extraction error: {e}")
        return None


class _CollegeProfileLinkParser(HTMLParser):
    """Extract US News college profile links from server-rendered ranking HTML."""

    def __init__(self):
        super().__init__()
        self.links = []
        self._active_href = None
        self._text = []

    def handle_starttag(self, tag, attrs):
        if tag != "a":
            return
        href = dict(attrs).get("href", "")
        if re.match(r"^/best-colleges/[^?#]+-\d+$", href):
            self._active_href = href
            self._text = []

    def handle_data(self, data):
        if self._active_href:
            self._text.append(data)

    def handle_endtag(self, tag):
        if tag != "a" or not self._active_href:
            return
        name = " ".join("".join(self._text).split())
        if name:
            self.links.append((self._active_href, name))
        self._active_href = None
        self._text = []


def extract_profile_links_from_html(html, start_rank=1, limit=100):
    """Fallback for current US News ranking pages: profile links appear in rank order."""
    parser = _CollegeProfileLinkParser()
    parser.feed(html)
    seen = set()
    rankings = []
    for href, name in parser.links:
        if href in seen:
            continue
        seen.add(href)
        unit_match = re.search(r"-(\d+)$", href)
        rankings.append({
            "rank": start_rank + len(rankings),
            "name": name,
            "unitId": unit_match.group(1) if unit_match else None,
        })
        if len(rankings) >= limit:
            break
    return rankings


def _page_url(base_url, page_index):
    if page_index <= 0:
        return base_url
    if "usnews.com" in base_url and "?" not in base_url:
        return f"{base_url}&_page={page_index}"
    separator = "&" if "?" in base_url else "?"
    return f"{base_url}{separator}_page={page_index}"


# â”€â”€ Main scraper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

_EXTRA_HEADERS = {
    "Accept": (
        "text/html,application/xhtml+xml,application/xml;q=0.9,"
        "image/avif,image/webp,image/apng,*/*;q=0.8,"
        "application/signed-exchange;v=b3;q=0.7"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "max-age=0",
    "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"macOS"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
}


def scrape_major(browser, major_slug, major_info, debug=False, debug_dir=None, limit=100):
    print(f"\nâ–¶  {major_info['name']}  ({major_info['url']})")

    # --- Strategy 0: direct API (no browser) ---
    print("    Trying direct APIâ€¦")
    direct = _try_direct_api(major_info["url"], limit=limit)
    if direct and len(direct) >= 3:
        print(f"    âœ“  Direct API: {len(direct)} entries")
        direct = _dedupe_rankings(direct, limit)
        return {
            "slug": major_slug,
            "name": major_info["name"],
            "sourceUrl": major_info["url"],
            "scrapedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "rankings": direct,
        }

    # --- Playwright strategies ---
    context = browser.new_context(
        user_agent=_BROWSER_UA,
        viewport={"width": 1440, "height": 900},
        locale="en-US",
        timezone_id="America/New_York",
        extra_http_headers=_EXTRA_HEADERS,
    )
    page = context.new_page()

    captured_responses = []

    def on_response(response):
        if response.status != 200:
            return
        ct = response.headers.get("content-type", "")
        if "json" not in ct:
            return
        url = response.url
        if not any(kw in url for kw in ["ranking", "search", "colleges", "school", "api"]):
            return
        try:
            body = response.json()
            captured_responses.append({"url": url, "data": body})
        except Exception:
            pass

    page.on("response", on_response)

    rankings = []
    try:
        print("    Loading pageâ€¦")
        try:
            page.goto(major_info["url"], wait_until="domcontentloaded", timeout=30000)
        except Exception as e1:
            print(f"    domcontentloaded failed ({type(e1).__name__}), continuing anywayâ€¦")

        page.wait_for_timeout(3000)

        print("    Trying JSON-LDâ€¦")
        rankings = extract_from_jsonld(page) or []

        print("    Trying __NEXT_DATA__â€¦")
        if len(rankings) < 3:
            rankings = extract_from_next_data(page) or []

        if len(rankings) < 3:
            print("    Trying intercepted API responsesâ€¦")
            rankings = extract_from_api_intercept(captured_responses) or []

        if len(rankings) < 3:
            print("    Trying DOM extractionâ€¦")
            rankings = extract_from_dom(page) or []

        if len(rankings) < 3:
            print("    Trying profile-link extractionâ€¦")
            rankings = extract_profile_links_from_html(page.content(), start_rank=1, limit=limit)

        while 0 < len(rankings) < limit:
            next_page = len(rankings) // 10
            if next_page <= 0:
                next_page = 1
            next_url = _page_url(major_info["url"], next_page)
            before = len(rankings)
            try:
                page.goto(next_url, wait_until="domcontentloaded", timeout=30000)
                page.wait_for_timeout(1500)
                more = extract_profile_links_from_html(page.content(), start_rank=before + 1, limit=limit - before)
                rankings.extend(more)
                rankings = _dedupe_rankings(rankings, limit)
            except Exception as e:
                print(f"    Pagination stopped at page {next_page}: {type(e).__name__}")
                break
            if len(rankings) <= before:
                break

        if debug and debug_dir:
            html_path = Path(debug_dir) / f"{major_slug}.html"
            html_path.write_text(page.content(), encoding="utf-8")
            print(f"    Debug HTML â†’ {html_path}")

    except Exception as e:
        print(f"    ERROR: {e}")
    finally:
        context.close()

    rankings = _dedupe_rankings(rankings, limit)

    if rankings:
        print(f"    âœ“  Found {len(rankings)} schools  (top: {rankings[0]['name']})")
    else:
        print("    âœ—  No rankings extracted â€” run with --debug to inspect the HTML")

    return {
        "slug": major_slug,
        "name": major_info["name"],
        "sourceUrl": major_info["url"],
        "scrapedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "rankings": rankings,
    }


def scrape_major_direct_only(major_slug, major_info, limit=100):
    """Try only the requests-based endpoint path; useful when Playwright is not installed."""
    print(f"\n>  {major_info['name']}  ({major_info['url']})")
    print("    Trying direct API...")
    direct = _try_direct_api(major_info["url"], limit=limit) or []
    direct = _dedupe_rankings(direct, limit)
    if direct:
        print(f"    OK  Direct API: {len(direct)} entries")
    else:
        print("    No ranking entries from direct API")
    return {
        "slug": major_slug,
        "name": major_info["name"],
        "sourceUrl": major_info["url"],
        "scrapedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "rankings": direct,
    }


def main():
    parser = argparse.ArgumentParser(description="Scrape US News college rankings")
    parser.add_argument("--major", help="Major slug or alias (e.g. cs, ee, business)")
    parser.add_argument("--limit", type=int, default=100, help="Max schools per ranking list")
    parser.add_argument("--csv", help="Import rankings from CSV instead of scraping. Required columns: rank,name")
    parser.add_argument("--sync", action="store_true", help="Copy output to frontend/src/data and backend resources")
    parser.add_argument("--source-url", help="Source URL to store when importing CSV")
    parser.add_argument("--debug", action="store_true", help="Save HTML files for selector debugging")
    parser.add_argument("--out", default=None, help="Output JSON path (default: output/rankings.json)")
    parser.add_argument("--dry-run", action="store_true", help="Print URLs without launching browser")
    parser.add_argument("--headed", action="store_true", help="Run Chromium in headed (visible) mode")
    args = parser.parse_args()

    limit = max(1, min(args.limit, 250))

    if args.major:
        slug = ALIASES.get(args.major, args.major)
        if slug not in MAJORS:
            print(f"Unknown major '{args.major}'. Available: {', '.join(list(ALIASES) + list(MAJORS))}")
            sys.exit(1)
        targets = {slug: MAJORS[slug]}
    else:
        targets = MAJORS

    if args.dry_run:
        print("Dry run â€” URLs to scrape:")
        for slug, info in targets.items():
            print(f"  {slug}: {info['url']}")
        return

    out_path = Path(args.out) if args.out else Path(__file__).parent / "output" / "rankings.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    debug_dir = out_path.parent / "debug_html" if args.debug else None
    if debug_dir:
        debug_dir.mkdir(exist_ok=True)

    existing = {}
    if out_path.exists():
        try:
            for entry in json.loads(out_path.read_text(encoding="utf-8")):
                existing[entry["slug"]] = entry
        except Exception:
            pass

    if args.csv:
        if len(targets) != 1:
            print("CSV import needs --major so the imported list has a slug/name.")
            sys.exit(1)
        slug, info = next(iter(targets.items()))
        imported = load_rankings_csv(
            args.csv,
            major_slug=slug,
            major_name=info["name"],
            source_url=args.source_url or info["url"],
            limit=limit,
        )
        existing[slug] = imported
        output = list(existing.values())
        _write_outputs(output, out_path, sync_targets=args.sync)
        print(f"\nSaved CSV import: {len(imported['rankings'])} entries -> {out_path}")
        return

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("Playwright is not installed. Trying direct API only.")
        print("Install browser fallback with: pip install -r requirements.txt && playwright install chromium")
        for slug, info in targets.items():
            result = scrape_major_direct_only(slug, info, limit=limit)
            if result["rankings"]:
                existing[slug] = result

        output = list(existing.values())
        _write_outputs(output, out_path, sync_targets=args.sync)
        total = sum(len(m["rankings"]) for m in output)
        print(f"\nSaved {len(output)} majors, {total} total entries -> {out_path}")
        return

    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            headless=not args.headed,
            args=[
                "--disable-http2",
                "--no-sandbox",
                "--disable-dev-shm-usage",
            ],
        )
        for slug, info in targets.items():
            result = scrape_major(browser, slug, info, debug=args.debug, debug_dir=debug_dir, limit=limit)
            if result["rankings"]:
                existing[slug] = result
            time.sleep(2)
        browser.close()

    output = list(existing.values())
    _write_outputs(output, out_path, sync_targets=args.sync)
    total = sum(len(m["rankings"]) for m in output)
    print(f"\nâœ…  Saved {len(output)} majors, {total} total entries â†’ {out_path}")
    if not args.sync:
        print(f"\nNext step:")
        print(f"  python scrape_rankings.py --sync")


if __name__ == "__main__":
    main()

