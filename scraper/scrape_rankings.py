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
from pathlib import Path

# ── Major catalogue ────────────────────────────────────────────────────────────

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

# ── Strategy 0: Direct API (no browser) ───────────────────────────────────────

def _try_direct_api(page_url):
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
            "_schools_per_page": 50,
        }),
        # Alternate endpoint pattern
        ("https://www.usnews.com/best-colleges/api/search", {
            "format": "json",
            "specialty": ranking_slug,
            "_sort": "rank",
            "_sortDirection": "asc",
            "_page": 1,
            "_schools_per_page": 50,
        }),
    ]

    for api_url, params in candidates:
        try:
            r = session.get(api_url, params=params, timeout=15)
            if r.status_code != 200:
                continue
            data = r.json()
            results = []
            _walk_for_rankings(data, results, depth=0)
            if len(results) >= 3:
                return results
        except Exception:
            pass

    return None


# ── Extraction helpers ─────────────────────────────────────────────────────────

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


def _walk_for_rankings(obj, out, depth):
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
                for item in obj[:50]:
                    entry = _parse_ranking_item(item)
                    if entry:
                        out.append(entry)
                return
    if isinstance(obj, dict):
        for v in obj.values():
            _walk_for_rankings(v, out, depth + 1)
    elif isinstance(obj, list):
        for item in obj:
            _walk_for_rankings(item, out, depth + 1)


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


# ── Main scraper ───────────────────────────────────────────────────────────────

_STEALTH_SCRIPT = """
    Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
    Object.defineProperty(navigator, 'plugins', {get: () => [1, 2, 3, 4, 5]});
    Object.defineProperty(navigator, 'languages', {get: () => ['en-US', 'en']});
    window.chrome = {runtime: {}, loadTimes: function(){}, csi: function(){}, app: {}};
    Object.defineProperty(navigator, 'permissions', {
        get: () => ({query: () => Promise.resolve({state: 'granted'})})
    });
"""

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


def scrape_major(browser, major_slug, major_info, debug=False, debug_dir=None, stealth_fn=None):
    print(f"\n▶  {major_info['name']}  ({major_info['url']})")

    # --- Strategy 0: direct API (no browser) ---
    print("    Trying direct API…")
    direct = _try_direct_api(major_info["url"])
    if direct and len(direct) >= 3:
        print(f"    ✓  Direct API: {len(direct)} entries")
        direct.sort(key=lambda x: x.get("rank", 999))
        return {
            "slug": major_slug,
            "name": major_info["name"],
            "sourceUrl": major_info["url"],
            "scrapedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "rankings": direct[:50],
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
    if stealth_fn:
        stealth_fn(page)
    else:
        page.add_init_script(_STEALTH_SCRIPT)

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
        print("    Loading page…")
        try:
            page.goto(major_info["url"], wait_until="domcontentloaded", timeout=30000)
        except Exception as e1:
            print(f"    domcontentloaded failed ({type(e1).__name__}), continuing anyway…")

        page.wait_for_timeout(3000)

        print("    Trying JSON-LD…")
        rankings = extract_from_jsonld(page) or []

        print("    Trying __NEXT_DATA__…")
        if len(rankings) < 3:
            rankings = extract_from_next_data(page) or []

        if len(rankings) < 3:
            print("    Trying intercepted API responses…")
            rankings = extract_from_api_intercept(captured_responses) or []

        if len(rankings) < 3:
            print("    Trying DOM extraction…")
            rankings = extract_from_dom(page) or []

        if debug and debug_dir:
            html_path = Path(debug_dir) / f"{major_slug}.html"
            html_path.write_text(page.content(), encoding="utf-8")
            print(f"    Debug HTML → {html_path}")

    except Exception as e:
        print(f"    ERROR: {e}")
    finally:
        context.close()

    rankings.sort(key=lambda x: x.get("rank", 999))
    rankings = rankings[:50]

    if rankings:
        print(f"    ✓  Found {len(rankings)} schools  (top: {rankings[0]['name']})")
    else:
        print("    ✗  No rankings extracted — run with --debug to inspect the HTML")

    return {
        "slug": major_slug,
        "name": major_info["name"],
        "sourceUrl": major_info["url"],
        "scrapedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "rankings": rankings,
    }


def main():
    parser = argparse.ArgumentParser(description="Scrape US News college rankings")
    parser.add_argument("--major", help="Major slug or alias (e.g. cs, ee, business)")
    parser.add_argument("--debug", action="store_true", help="Save HTML files for selector debugging")
    parser.add_argument("--out", default=None, help="Output JSON path (default: output/rankings.json)")
    parser.add_argument("--dry-run", action="store_true", help="Print URLs without launching browser")
    parser.add_argument("--headed", action="store_true", help="Run Chromium in headed (visible) mode")
    args = parser.parse_args()

    if args.major:
        slug = ALIASES.get(args.major, args.major)
        if slug not in MAJORS:
            print(f"Unknown major '{args.major}'. Available: {', '.join(list(ALIASES) + list(MAJORS))}")
            sys.exit(1)
        targets = {slug: MAJORS[slug]}
    else:
        targets = MAJORS

    if args.dry_run:
        print("Dry run — URLs to scrape:")
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
            for entry in json.loads(out_path.read_text()):
                existing[entry["slug"]] = entry
        except Exception:
            pass

    from playwright.sync_api import sync_playwright
    try:
        from playwright_stealth import stealth_sync as _stealth_sync
        _has_stealth = True
    except ImportError:
        _has_stealth = False

    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            headless=not args.headed,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--disable-http2",
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-extensions",
                "--disable-default-apps",
                "--no-first-run",
            ],
        )
        stealth_fn = _stealth_sync if _has_stealth else None
        if _has_stealth:
            print("    playwright-stealth enabled")
        for slug, info in targets.items():
            result = scrape_major(browser, slug, info, debug=args.debug, debug_dir=debug_dir, stealth_fn=stealth_fn)
            if result["rankings"]:
                existing[slug] = result
            time.sleep(2)
        browser.close()

    output = list(existing.values())
    out_path.write_text(json.dumps(output, indent=2, ensure_ascii=False))
    total = sum(len(m["rankings"]) for m in output)
    print(f"\n✅  Saved {len(output)} majors, {total} total entries → {out_path}")
    print(f"\nNext step:")
    print(f"  cp {out_path} ../frontend/src/data/rankings.json")
    print(f"  cp {out_path} ../backend/src/main/resources/rankings.json")


if __name__ == "__main__":
    main()
