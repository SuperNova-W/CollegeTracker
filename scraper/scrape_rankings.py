#!/usr/bin/env python3
"""
College ranking ingestion for CollegeTracker.

This script tries to collect ranking rows from US News using ordinary public
page/API loading. If the live site blocks, times out, or changes shape, use the
CSV import path. The output JSON is consumed by both:

  - frontend/src/data/rankings.json
  - backend/src/main/resources/rankings.json

Examples:
  python scrape_rankings.py --major national-universities --limit 100 --sync
  python scrape_rankings.py --major national-universities --csv input/rankings.csv --sync
"""

import argparse
import csv
import json
import re
import shutil
import sys
import time
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse

import requests


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

BROWSER_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)


class CollegeProfileLinkParser(HTMLParser):
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


def timestamp():
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def normalize_rank(value):
    if value is None:
        return None
    text = str(value).replace("#", "").replace("T-", "").strip()
    try:
        return int(text)
    except ValueError:
        return None


def dedupe_rankings(rankings, limit):
    seen = set()
    unique = []
    for entry in sorted(rankings, key=lambda item: item.get("rank", 999999)):
        name = (entry.get("name") or "").strip()
        rank = entry.get("rank")
        if not name or not rank:
            continue
        key = name.lower()
        if key in seen:
            continue
        seen.add(key)
        unique.append({
            "rank": rank,
            "name": name,
            "unitId": entry.get("unitId"),
        })
        if len(unique) >= limit:
            break
    return unique


def ranking_payload(slug, info, rankings, source_url=None):
    return {
        "slug": slug,
        "name": info["name"],
        "sourceUrl": source_url or info["url"],
        "scrapedAt": timestamp(),
        "rankings": rankings,
    }


def extract_profile_links_from_html(html, start_rank=1, limit=100):
    parser = CollegeProfileLinkParser()
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


def parse_json_rankings(obj, out, limit, depth=0):
    if depth > 8 or len(out) >= limit:
        return
    if isinstance(obj, list) and len(obj) >= 3 and isinstance(obj[0], dict):
        keys = {key.lower() for key in obj[0].keys()}
        has_name = bool({"name", "school", "displayname", "school_name"} & keys)
        has_rank = bool({"rank", "ranking", "sortrank", "display_rank"} & keys)
        if has_name and has_rank:
            for item in obj:
                entry = parse_ranking_item(item)
                if entry:
                    out.append(entry)
                    if len(out) >= limit:
                        return
            return
    if isinstance(obj, dict):
        for value in obj.values():
            parse_json_rankings(value, out, limit, depth + 1)
    elif isinstance(obj, list):
        for item in obj:
            parse_json_rankings(item, out, limit, depth + 1)


def parse_ranking_item(item):
    if not isinstance(item, dict):
        return None
    nested_ranking = item.get("ranking") if isinstance(item.get("ranking"), dict) else {}
    nested_school = item.get("school") if isinstance(item.get("school"), dict) else {}
    nested_institution = item.get("institution") if isinstance(item.get("institution"), dict) else {}
    rank = normalize_rank(
        item.get("rank")
        or item.get("ranking")
        or item.get("sortRank")
        or item.get("display_rank")
        or nested_ranking.get("sortRank")
    )
    name = (
        item.get("displayName")
        or item.get("name")
        or item.get("school_name")
        or nested_school.get("name")
        or nested_institution.get("displayName")
        or nested_institution.get("name")
    )
    if not rank or not name:
        return None
    unit_id = str(item.get("unitId") or item.get("unit_id") or "").strip() or None
    return {"rank": rank, "name": str(name).strip(), "unitId": unit_id}


def try_direct_api(page_url, limit):
    ranking_slug = page_url.rstrip("/").split("/")[-1]
    session = requests.Session()
    session.headers.update({
        "User-Agent": BROWSER_UA,
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": page_url,
        "Origin": "https://www.usnews.com",
    })
    try:
        session.get(page_url, timeout=15)
    except requests.RequestException:
        pass

    endpoint = "https://www.usnews.com/best-colleges/api/search"
    candidates = [
        {"format": "json", "ranking": ranking_slug},
        {"format": "json", "specialty": ranking_slug},
    ]
    all_results = []
    for params in candidates:
        for page_num in range(1, 12):
            query = {
                **params,
                "_sort": "rank",
                "_sortDirection": "asc",
                "_page": page_num,
                "_schools_per_page": min(limit, 100),
            }
            try:
                response = session.get(endpoint, params=query, timeout=20)
                if response.status_code != 200:
                    break
                data = response.json()
            except (requests.RequestException, ValueError):
                break
            before = len(all_results)
            parse_json_rankings(data, all_results, limit)
            all_results = dedupe_rankings(all_results, limit)
            if len(all_results) >= limit or len(all_results) == before:
                break
        if all_results:
            break
    return dedupe_rankings(all_results, limit)


def build_page_url(base_url, page_index):
    if page_index <= 0:
        return base_url
    parsed = urlparse(base_url)
    if parsed.netloc.endswith("usnews.com") and "?" not in base_url:
        return f"{base_url}&_page={page_index}"
    separator = "&" if "?" in base_url else "?"
    return f"{base_url}{separator}_page={page_index}"


def try_browser_html(source_url, limit, debug_path=None):
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("Playwright is not installed; skipping browser fallback.")
        return []

    rankings = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=True,
            args=["--disable-http2", "--no-sandbox", "--disable-dev-shm-usage"],
        )
        context = browser.new_context(
            user_agent=BROWSER_UA,
            viewport={"width": 1440, "height": 900},
            locale="en-US",
            timezone_id="America/New_York",
            extra_http_headers={
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
            },
        )
        page = context.new_page()
        page_index = 0
        while len(rankings) < limit:
            current_url = build_page_url(source_url, page_index)
            try:
                page.goto(current_url, wait_until="domcontentloaded", timeout=45000)
                page.wait_for_timeout(2000)
            except Exception as exc:
                print(f"    Pagination stopped at page {page_index}: {type(exc).__name__}")
                break
            html = page.content()
            if debug_path and page_index == 0:
                debug_path.parent.mkdir(parents=True, exist_ok=True)
                debug_path.write_text(html, encoding="utf-8")
            before = len(rankings)
            rankings.extend(
                extract_profile_links_from_html(
                    html,
                    start_rank=before + 1,
                    limit=limit - before,
                )
            )
            rankings = dedupe_rankings(rankings, limit)
            if len(rankings) <= before:
                break
            page_index += 1
        context.close()
        browser.close()
    return rankings


def import_csv(csv_path, slug, info, limit, source_url=None):
    rows = []
    with Path(csv_path).open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        required = {"rank", "name"}
        missing = required - set(reader.fieldnames or [])
        if missing:
            raise ValueError(f"CSV missing required columns: {', '.join(sorted(missing))}")
        for row in reader:
            rank = normalize_rank(row.get("rank"))
            name = (row.get("name") or "").strip()
            if not rank or not name:
                continue
            rows.append({
                "rank": rank,
                "name": name,
                "unitId": (row.get("unitId") or "").strip() or None,
            })
    return ranking_payload(slug, info, dedupe_rankings(rows, limit), source_url)


def write_outputs(output, out_path, sync_targets):
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


def resolve_targets(major):
    if not major:
        return MAJORS
    slug = ALIASES.get(major, major)
    if slug not in MAJORS:
        available = ", ".join(sorted(list(ALIASES) + list(MAJORS)))
        raise ValueError(f"Unknown major '{major}'. Available: {available}")
    return {slug: MAJORS[slug]}


def main():
    parser = argparse.ArgumentParser(description="Collect college ranking data")
    parser.add_argument("--major", help="Major/ranking slug or alias, e.g. nat or national-universities")
    parser.add_argument("--limit", type=int, default=100, help="Max schools per ranking list")
    parser.add_argument("--csv", help="Import rankings from CSV instead of scraping. Required columns: rank,name")
    parser.add_argument("--source-url", help="Source URL to store when importing CSV")
    parser.add_argument("--sync", action="store_true", help="Copy output to frontend and backend data locations")
    parser.add_argument("--debug", action="store_true", help="Save first loaded HTML page for inspection")
    parser.add_argument("--out", default=None, help="Output JSON path")
    parser.add_argument("--dry-run", action="store_true", help="Print target URLs and exit")
    args = parser.parse_args()

    limit = max(1, min(args.limit, 250))
    targets = resolve_targets(args.major)
    out_path = Path(args.out) if args.out else Path(__file__).parent / "output" / "rankings.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)

    if args.dry_run:
        for slug, info in targets.items():
            print(f"{slug}: {info['url']}")
        return

    existing = {}
    if out_path.exists():
        try:
            for entry in json.loads(out_path.read_text(encoding="utf-8")):
                existing[entry["slug"]] = entry
        except (OSError, ValueError, KeyError):
            pass

    if args.csv:
        if len(targets) != 1:
            print("CSV import requires --major so the rows have one slug/name.")
            sys.exit(1)
        slug, info = next(iter(targets.items()))
        existing[slug] = import_csv(args.csv, slug, info, limit, args.source_url or info["url"])
    else:
        for slug, info in targets.items():
            print(f"\n> {info['name']} ({info['url']})")
            print("    Trying direct API...")
            rankings = try_direct_api(info["url"], limit)
            if not rankings:
                print("    Trying browser HTML...")
                debug_path = None
                if args.debug:
                    debug_path = out_path.parent / "debug_html" / f"{slug}.html"
                rankings = try_browser_html(info["url"], limit, debug_path)
            if rankings:
                print(f"    Found {len(rankings)} schools; first: {rankings[0]['name']}")
                existing[slug] = ranking_payload(slug, info, rankings)
            else:
                print("    No rankings found.")
            time.sleep(1)

    output = list(existing.values())
    write_outputs(output, out_path, args.sync)
    total = sum(len(entry.get("rankings", [])) for entry in output)
    print(f"\nSaved {len(output)} ranking lists, {total} total entries -> {out_path}")


if __name__ == "__main__":
    main()

