# College ranking data

This app can read ranking data from `rankings.json` in two places:

- `frontend/src/data/rankings.json`
- `backend/src/main/resources/rankings.json`

The scraper writes `scraper/output/rankings.json` first, then `--sync` copies it
to both app targets.

## Try the live US News source

```bash
cd scraper
pip install -r requirements.txt
playwright install chromium
python scrape_rankings.py --major national-universities --limit 100 --sync
```

US News may time out, paywall, block automation, or change its page/API shape.
The script only uses normal requests/browser loading. If that does not return
data, use the CSV import path below.

## Import from CSV

Create a CSV with at least these columns:

```csv
rank,name
1,Example University
2,Example College
```

Optional column:

```csv
unitId
```

Then run:

```bash
cd scraper
python scrape_rankings.py --major national-universities --csv input/us-news-national-universities.csv --limit 100 --sync
```

That produces the JSON shape consumed by both the React frontend and Spring
backend.


