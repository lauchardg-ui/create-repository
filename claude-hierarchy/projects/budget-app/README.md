# Budget App — start here

Personal finance dashboard for G. Imports Amex + HSBC UK statements, categorizes spending, flags anomalies, shows month-over-month trends.

**Read this whole file before running any commands.** Most steps below involve Claude asking you to approve an action — that's by design (your Layer 1 hard rule).

---

## Storage — the tradeoff you accepted

Your `budget.db` file lives in iCloud Drive, **unencrypted**. You chose this consciously:

- Apple's Advanced Data Protection (end-to-end encryption for iCloud) is unavailable to UK users since February 2025.
- So Apple holds a readable copy of your spending history, and can be compelled under UK law to hand it over.
- You weighed that against the convenience of iCloud sync/backup and picked iCloud. Noted and respected.

If you want to revisit this (local-only, or passphrase-encrypted in iCloud), tell Claude and we re-interview. Don't silently change it.

---

## One-time setup (you do these in order, once)

### 1. Install Python 3.11 or later

- Download the macOS installer from https://www.python.org/downloads/macos/
- Run the installer. Default options are fine.
- Open **Terminal.app**. Type `python3 --version`. You should see something like `Python 3.11.x` or higher. If not, tell Claude.

### 2. Export 3–6 months of statements (sample first)

Before Claude writes the ingest code, send it a **sample of one recent month** from each account so it can see the actual column names:

- **Amex:** log in → Statements → Download (CSV). Save most recent month.
- **HSBC UK:** log in → My accounts → the account → Download transactions → CSV. Save most recent month.

Put both files in `~/budget-app/statements/`. Claude reads these *before* writing `ingest.py`.

Once the ingest code is working, export the rest (3–6 months total) and drop them in the same folder.

### 3. One-time project setup

Claude will ask for your approval before each of these. **Say yes when it asks:**

```
cd ~/budget-app
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Each line is: (a) go to the app folder, (b) create an isolated Python environment, (c) activate it, (d) install the exact packages listed in `requirements.txt` (Streamlit, pandas, PyYAML — that's it). Claude will explain each one the first time (learning-as-we-go).

---

## Every time you open the app

```
cd ~/budget-app
source .venv/bin/activate
streamlit run app.py
```

A browser tab opens at `http://localhost:8501`. Use it; close the tab when done; press **Ctrl-C** in Terminal to stop the server.

---

## Tabs you'll see

- **This month** — current month's spending by category, biggest transactions.
- **Trends** — month-over-month line chart per category.
- **Anomalies** — flagged transactions and category spikes, with reasons.
- **Rules** — the merchant→category rules; editable. Your overrides live here too.

If a transaction is miscategorized, click it, pick the right category. It persists to `rules/overrides.yaml` and reapplies retroactively.

---

## When something breaks

Use the **fix-what-broke** workflow. Tell Claude:
1. What you were doing when it broke.
2. What you expected vs. what happened.
3. The error message (full text or screenshot).
4. What's changed recently — OS update, new statement, anything.

Claude will diagnose before changing anything.

---

## What NOT to expect from v1

- No bill paying or money movement.
- No tax prep or HMRC categorization.
- No retirement or investment views (those are future modules).
- No specific trade or product recommendations ever.
- No outbound network calls from the app. (The DB does live in iCloud Drive — see the "Storage" section above — but the app itself never phones home.)

---

## First-run expectation

Your first run will produce many wrong categorizations. That's normal. Correct them as you go; the fixes stick and apply backward. After a month or two of use, the rules file will reflect your real spending shape.
