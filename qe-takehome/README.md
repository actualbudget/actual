# QE Take Home — Actual Budget E2E Tests

Playwright + pytest (Python). **Author:** Shreya Kumari

**Prerequisites:** Node.js 22+, Yarn, Python 3.12+

## Setup note

Tests run against the local dev app (`yarn start` on port 3001).

Docker is not required for these flows — budget and transactions work in the browser without a sync server. 

## Run

```bash
# Terminal 1 — repo root
yarn start

# Terminal 2
cd qe-takehome
source .venv/bin/activate
pip install -r requirements.txt   # first time only
playwright install chromium       # first time only
pytest -v
```

Headed (watch): `pytest -v --headed --slowmo=1000`

## What's in this folder

| File                        | Purpose                                |
| --------------------------- | -------------------------------------- |
| `TEST_PLAN.md`              | Test plan, manual findings, 10 cases   |
| `docs/ai-sessions.md`       | How Cursor was used on this assignment |
| `tests/`                    | 10 Playwright tests                    |
| `pages/`, `flows/`, `data/` | Page objects and shared setup          |
