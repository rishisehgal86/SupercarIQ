#!/usr/bin/env python3
"""
smart_pipeline.py — Staggered Pipeline Scheduler
=================================================
Orchestrates the full Ferrari market pipeline with bot-detection-aware pacing:

  Phase 1 (fast, ~5 min):   Discovery — scrape AT/FA search pages for new/removed listings
  Phase 2 (staggered):      Enrichment queue — process one listing every 30 mins
  Phase 3 (on completion):  Regenerate TypeScript files + git commit + site update

This script is designed to be called every 3 hours by a Manus scheduled task.
Each run:
  - Runs Phase 1 (discovery) immediately
  - Picks up to 6 items from the enrichment queue (one every 30 min = 3 hours)
  - If queue is empty, runs Phase 3 (TS regeneration + commit)

Queue table: pipeline_queue (created if not exists)
  - listingId, modelKey, priority, status, attempts, createdAt, processedAt, error

Usage:
  python3 smart_pipeline.py [--phase 1|2|3|all] [--dry-run]
"""
import argparse
import json
import logging
import os
import re
import subprocess
import sys
import time
from datetime import date, datetime
from pathlib import Path

import mysql.connector
from dotenv import load_dotenv

# ── Env ───────────────────────────────────────────────────────────────────────
PIPELINE_DIR = Path(__file__).parent
WEBAPP_DIR = PIPELINE_DIR.parent  # supercariq monorepo root
LOG_DIR = PIPELINE_DIR / "logs"
LOG_DIR.mkdir(exist_ok=True)

for env_path in [WEBAPP_DIR / ".env", PIPELINE_DIR / ".env"]:
    if env_path.exists():
        load_dotenv(env_path)
        break

DATABASE_URL = os.environ.get("DATABASE_URL", "")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set.")
    sys.exit(1)

TODAY = date.today().isoformat()
NOW = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")

# ── Logging ───────────────────────────────────────────────────────────────────
log_file = LOG_DIR / f"smart_pipeline_{NOW}.log"
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger(__name__)

# ── DB helpers ────────────────────────────────────────────────────────────────
def parse_db_url(url: str):
    url = url.replace("mysql://", "").replace("mysql2://", "")
    user_pass, rest = url.split("@", 1)
    user, password = user_pass.split(":", 1)
    host_port, dbname = rest.split("/", 1)
    dbname = dbname.split("?")[0]
    host, port = (host_port.split(":", 1) if ":" in host_port else (host_port, "3306"))
    return dict(host=host, port=int(port), user=user, password=password, database=dbname)

def get_conn():
    kwargs = parse_db_url(DATABASE_URL)
    return mysql.connector.connect(**kwargs, ssl_disabled=False)

def run_cmd(cmd, cwd=None, timeout=300, env=None):
    """
    Run a shell command and return (returncode, stdout, stderr).

    Uses a temp file for stdout/stderr to avoid pipe buffer deadlocks when
    child processes (e.g. discovery_scraper) spawn their own subprocesses
    (e.g. fa_playwright_scraper). With capture_output=True the pipe buffer
    fills up and causes a deadlock — writing to a file avoids this entirely.
    """
    import subprocess
    import tempfile
    with tempfile.NamedTemporaryFile(mode='w+', suffix='_out.txt', delete=False) as out_f, \
         tempfile.NamedTemporaryFile(mode='w+', suffix='_err.txt', delete=False) as err_f:
        out_path, err_path = out_f.name, err_f.name

    try:
        proc = subprocess.Popen(
            cmd, shell=True, stdout=open(out_path, 'w'), stderr=open(err_path, 'w'),
            cwd=cwd or PIPELINE_DIR,
            env={**os.environ, **(env or {})},
            text=True,
        )
        try:
            proc.wait(timeout=timeout)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait()
            raise
        rc = proc.returncode
        with open(out_path) as f:
            stdout = f.read()
        with open(err_path) as f:
            stderr = f.read()
        return rc, stdout, stderr
    finally:
        import os as _os
        for p in (out_path, err_path):
            try:
                _os.unlink(p)
            except Exception:
                pass

# ── Queue management ──────────────────────────────────────────────────────────
def ensure_queue_table():
    """Create pipeline_queue table if it doesn't exist."""
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS pipeline_queue (
            id INT AUTO_INCREMENT PRIMARY KEY,
            listingId VARCHAR(64) NOT NULL,
            modelKey VARCHAR(64) NOT NULL,
            priority INT DEFAULT 5,
            status ENUM('pending', 'processing', 'done', 'failed') DEFAULT 'pending',
            attempts INT DEFAULT 0,
            queuedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            processedAt TIMESTAMP NULL,
            error TEXT NULL,
            INDEX idx_status_priority (status, priority DESC, queuedAt ASC),
            UNIQUE KEY uq_listing (listingId)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    """)
    conn.commit()
    conn.close()
    log.info("Queue table ready")

def get_queue_depth():
    """Return count of pending items in the queue."""
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM pipeline_queue WHERE status = 'pending'")
    count = cur.fetchone()[0]
    conn.close()
    return count

def get_queue_status():
    """Return full queue status summary."""
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT status, COUNT(*) as cnt 
        FROM pipeline_queue 
        GROUP BY status
    """)
    rows = {r[0]: r[1] for r in cur.fetchall()}
    conn.close()
    return rows

def enqueue_unenriched_listings():
    """
    Find all active listings that have NO car_listing_details row yet
    and add them to the pipeline_queue. These are new listings discovered
    by the discovery scraper that haven't been enriched yet.
    Returns count of newly enqueued items.
    """
    conn = get_conn()
    cur = conn.cursor()

    # Find listings with no details row
    cur.execute("""
        SELECT l.id, l.modelKey, l.source, l.firstSeenDate
        FROM car_listings l
        LEFT JOIN car_listing_details d ON l.id = d.listingId
        WHERE l.status = 'active'
          AND d.listingId IS NULL
        ORDER BY l.firstSeenDate DESC
    """)
    unenriched = cur.fetchall()

    enqueued = 0
    for listing_id, model_key, source, first_seen in unenriched:
        # Higher priority for Ferrari Approved (they have dealer URLs, easier to scrape)
        priority = 9 if source == "ferrari-approved" else 5
        try:
            cur.execute("""
                INSERT IGNORE INTO pipeline_queue (listingId, modelKey, priority, status)
                VALUES (%s, %s, %s, 'pending')
            """, (str(listing_id), model_key, priority))
            if cur.rowcount > 0:
                enqueued += 1
        except Exception as e:
            log.warning(f"Failed to enqueue {listing_id}: {e}")

    conn.commit()
    conn.close()
    log.info(f"Enqueued {enqueued} new listings (from {len(unenriched)} unenriched total)")
    return enqueued

def pick_next_queue_item():
    """
    Pick the highest-priority pending item from the queue.
    Returns (listingId, modelKey) or None if queue is empty.
    Marks it as 'processing' atomically.
    """
    conn = get_conn()
    cur = conn.cursor()

    # Atomic pick: select + update in one transaction
    cur.execute("""
        SELECT id, listingId, modelKey
        FROM pipeline_queue
        WHERE status = 'pending'
        ORDER BY priority DESC, queuedAt ASC
        LIMIT 1
        FOR UPDATE
    """)
    row = cur.fetchone()
    if not row:
        conn.close()
        return None

    queue_id, listing_id, model_key = row
    cur.execute("""
        UPDATE pipeline_queue 
        SET status = 'processing', attempts = attempts + 1
        WHERE id = %s
    """, (queue_id,))
    conn.commit()
    conn.close()
    return queue_id, listing_id, model_key

def mark_queue_item_done(queue_id):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        UPDATE pipeline_queue 
        SET status = 'done', processedAt = NOW()
        WHERE id = %s
    """, (queue_id,))
    conn.commit()
    conn.close()

def mark_queue_item_failed(queue_id, error_msg):
    conn = get_conn()
    cur = conn.cursor()
    # After 3 attempts, mark as failed permanently
    cur.execute("""
        UPDATE pipeline_queue 
        SET status = CASE WHEN attempts >= 3 THEN 'failed' ELSE 'pending' END,
            error = %s,
            processedAt = NOW()
        WHERE id = %s
    """, (str(error_msg)[:500], queue_id))
    conn.commit()
    conn.close()

# ── Phase 1: Discovery ────────────────────────────────────────────────────────
def phase_1_discovery(dry_run=False):
    """
    Run the discovery scraper to find new/removed listings.
    New listings are inserted into car_listings by discovery_scraper.py.
    Then we enqueue any unenriched listings for Phase 2.
    """
    log.info("=" * 60)
    log.info("PHASE 1: Discovery")
    log.info("=" * 60)

    if dry_run:
        log.info("[DRY RUN] Would run discovery_scraper.py")
        return True

    rc, out, err = run_cmd(
        f"python3 {PIPELINE_DIR}/discovery_scraper.py",
        cwd=PIPELINE_DIR,
        timeout=600  # 10 min max for discovery
    )
    if out:
        log.info(f"Discovery output:\n{out[-3000:]}")  # last 3000 chars
    if err and rc != 0:
        log.error(f"Discovery errors:\n{err[-2000:]}")

    if rc != 0:
        log.error(f"Discovery scraper failed with code {rc}")
        return False

    log.info("Discovery complete")

    # Enqueue any new unenriched listings
    enqueue_unenriched_listings()
    return True

# ── Phase 2: Staggered Enrichment ────────────────────────────────────────────
def phase_2_enrich_one(dry_run=False):
    """
    Pick one item from the queue and enrich it.
    Enrichment = visit dealer page + LLM spec extraction + scoring + images.
    Returns True if an item was processed, False if queue was empty.
    """
    item = pick_next_queue_item()
    if not item:
        log.info("Queue is empty — nothing to enrich")
        return False

    queue_id, listing_id, model_key = item
    log.info(f"Enriching listing {listing_id} ({model_key}) [queue_id={queue_id}]")

    if dry_run:
        log.info(f"[DRY RUN] Would enrich listing {listing_id}")
        mark_queue_item_done(queue_id)
        return True

    # Write a single-item queue file and run detail_scraper.py on it
    import tempfile
    queue_file = PIPELINE_DIR / f"data/queue_{listing_id}.json"
    queue_file.parent.mkdir(exist_ok=True)
    with open(queue_file, "w") as f:
        json.dump([listing_id], f)

    rc, out, err = run_cmd(
        f"python3 {PIPELINE_DIR}/detail_scraper.py --queue {queue_file}",
        cwd=PIPELINE_DIR,
        timeout=300  # 5 min per listing
    )
    # Clean up temp queue file
    try:
        queue_file.unlink()
    except Exception:
        pass

    if out:
        log.info(f"Enrichment output:\n{out[-2000:]}")
    if err and rc != 0:
        log.error(f"Enrichment errors:\n{err[-1000:]}")

    if rc == 0:
        mark_queue_item_done(queue_id)
        log.info(f"Enrichment complete for {listing_id}")
        return True
    else:
        mark_queue_item_failed(queue_id, err or out)
        log.error(f"Enrichment failed for {listing_id}")
        return False

# ── Phase 3: TypeScript Regeneration + Site Update ───────────────────────────
def phase_3_regenerate_and_deploy(dry_run=False):
    """
    Phase 3: LLM content generation + market stats update.
    On Railway (DB-only mode), skips TS regeneration and git push.
    On legacy Manus mode, also regenerates TS files and commits to GitHub.
    """
    log.info("=" * 60)
    log.info("PHASE 3: LLM Content + Market Stats")
    log.info("=" * 60)

    # Detect Railway environment: skip TS/git steps when RAILWAY_ENVIRONMENT is set
    railway_mode = bool(os.environ.get("RAILWAY_ENVIRONMENT") or os.environ.get("RAILWAY_SERVICE_NAME"))
    if railway_mode:
        log.info("Railway mode detected — skipping TS regeneration and git push")

    if dry_run:
        log.info("[DRY RUN] Would run LLM content generation")
        return True

    # Step 1: Get market stats
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT modelKey, COUNT(*) as active
        FROM car_listings
        WHERE status = 'active'
        GROUP BY modelKey
        ORDER BY modelKey
    """)
    stats = cur.fetchall()
    conn.close()
    total_active = sum(r[1] for r in stats)
    stats_str = ", ".join(f"{r[0]}: {r[1]}" for r in stats)
    log.info(f"Active listings: {total_active} ({stats_str})")

    # Step 2: LLM content generation for all active models
    log.info("Step 3.2: Generating LLM content for all active models...")
    rc_llm, out_llm, err_llm = run_cmd(
        f"python3 {PIPELINE_DIR}/llm_content_generator.py --all",
        cwd=PIPELINE_DIR,
        timeout=600  # 10 min for LLM generation across all models
    )
    if rc_llm != 0:
        log.warning(f"LLM content generation had issues (non-fatal): {err_llm or out_llm}")
    else:
        log.info("LLM content generation complete ✓")

    if railway_mode:
        log.info(f"Phase 3 complete (Railway mode) — {total_active} active listings in DB")
        return True

    # Legacy Manus mode: regenerate TS files and git push
    log.info("Step 3.3 (legacy): Regenerating TypeScript data files...")
    rc, out, err = run_cmd(
        f"python3 {PIPELINE_DIR}/write_ts_from_db.py",
        cwd=PIPELINE_DIR,
        timeout=120
    )
    if rc != 0:
        log.error(f"TS regeneration failed: {err or out}")
        return False
    log.info("TypeScript files regenerated ✓")

    log.info("Step 3.4 (legacy): TypeScript compilation check...")
    rc, out, err = run_cmd("npx tsc --noEmit", cwd=WEBAPP_DIR, timeout=120)
    if rc != 0:
        log.error(f"TypeScript errors:\n{err or out}")
        return False
    log.info("TypeScript: 0 errors ✓")

    log.info("Step 3.5 (legacy): Committing and pushing...")
    rc, out, err = run_cmd("git add client/src/data/", cwd=WEBAPP_DIR)
    commit_msg = f"chore: market update {TODAY} — {total_active} active listings\n\n{stats_str}"
    rc2, out2, err2 = run_cmd(f'git commit -m "{commit_msg}"', cwd=WEBAPP_DIR)

    if rc2 != 0 and "nothing to commit" in (out2 + err2):
        log.info("No data changes since last run — skipping push")
        return True
    if rc2 != 0:
        log.error(f"Git commit failed: {err2}")
        return False

    rc3, out3, err3 = run_cmd("git push user_github main", cwd=WEBAPP_DIR, timeout=60)
    if rc3 != 0:
        log.warning(f"Git push failed (non-fatal): {err3}")
    else:
        log.info(f"Pushed to GitHub: {TODAY} ✓")

    log.info(f"Phase 3 complete — {total_active} active listings live")
    return True

# ── Pipeline status report ────────────────────────────────────────────────────
def print_status():
    """Print current pipeline status."""
    ensure_queue_table()
    queue_status = get_queue_status()
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT l.modelKey, COUNT(*) as total,
               SUM(CASE WHEN d.listingId IS NOT NULL THEN 1 ELSE 0 END) as enriched,
               SUM(CASE WHEN JSON_LENGTH(d.imagesJson) > 0 THEN 1 ELSE 0 END) as with_images
        FROM car_listings l
        LEFT JOIN car_listing_details d ON l.id = d.listingId
        WHERE l.status = 'active'
        GROUP BY l.modelKey
        ORDER BY l.modelKey
    """)
    rows = cur.fetchall()
    conn.close()

    print(f"\n{'='*65}")
    print(f"Ferrari Pipeline Status — {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"{'='*65}")
    print(f"\nQueue: {queue_status}")
    print(f"\n{'Model':<20} {'Active':>7} {'Enriched':>9} {'Images':>7} {'Coverage':>9}")
    print("-" * 55)
    for model, total, enriched, imgs in rows:
        enriched = enriched or 0
        imgs = imgs or 0
        pct = (imgs/total*100) if total else 0
        print(f"{str(model):<20} {total:>7} {enriched:>9} {imgs:>7} {pct:>8.0f}%")
    print()

# ── Main ──────────────────────────────────────────────────────────────────────
# ── Pipeline run DB logging ───────────────────────────────────────────────────
def db_insert_pipeline_run(run_type: str, phase: str, log_file_path: str = '') -> int | None:
    """Insert a pipeline_runs row at the start of a run. Returns the new row id."""
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO pipeline_runs
              (runType, status, newListingsFound, listingsEnriched,
               listingsMarkedSold, queueDepth, modelsScanned, logFilePath, startedAt)
            VALUES (%s, 'running', 0, 0, 0, %s, NULL, %s, NOW())
        """, (run_type, get_queue_depth(), log_file_path or str(log_file)))
        run_id = cur.lastrowid
        conn.commit()
        conn.close()
        log.info(f"Pipeline run logged — DB id={run_id}")
        return run_id
    except Exception as exc:
        log.warning(f"Could not insert pipeline_run row: {exc}")
        return None


def db_update_pipeline_run(run_id: int, success: bool, stats: dict) -> None:
    """Update the pipeline_runs row at the end of a run."""
    if run_id is None:
        return
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("""
            UPDATE pipeline_runs
            SET status            = %s,
                newListingsFound  = %s,
                listingsEnriched  = %s,
                listingsMarkedSold= %s,
                queueDepth        = %s,
                modelsScanned     = %s,
                durationSeconds   = %s,
                errorMessage      = %s,
                completedAt       = NOW()
            WHERE id = %s
        """, (
            'completed' if success else 'failed',
            stats.get('new_listings', 0),
            stats.get('enriched', 0),
            stats.get('marked_sold', 0),
            get_queue_depth(),
            json.dumps(stats.get('models_scanned', [])),
            stats.get('duration_seconds', 0),
            stats.get('error_message'),
            run_id,
        ))
        conn.commit()
        conn.close()
        log.info(f"Pipeline run {run_id} updated — status={'completed' if success else 'failed'}")
    except Exception as exc:
        log.warning(f"Could not update pipeline_run row {run_id}: {exc}")


def _count_new_listings_from_output(output: str) -> int:
    """Parse discovery output for 'X new listings' count."""
    m = re.search(r'(\d+) new listing', output or '')
    return int(m.group(1)) if m else 0


def _count_active_models() -> list:
    """Return list of active model keys."""
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("SELECT DISTINCT modelKey FROM car_listings WHERE status='active'")
        models = [r[0] for r in cur.fetchall()]
        conn.close()
        return models
    except Exception:
        return []


def main():
    parser = argparse.ArgumentParser(description="Smart Ferrari Pipeline Scheduler")
    parser.add_argument("--phase", choices=["1", "2", "3", "all", "status"], default="all",
                        help="Which phase to run (default: all)")
    parser.add_argument("--dry-run", action="store_true", help="Print what would happen without doing it")
    parser.add_argument("--enrich-count", type=int, default=1,
                        help="Number of listings to enrich in phase 2 (default: 1)")
    args = parser.parse_args()

    ensure_queue_table()

    if args.phase == "status":
        print_status()
        return 0

    log.info(f"Smart Pipeline starting — phase={args.phase}, dry_run={args.dry_run}")

    # ── DB: record run start ───────────────────────────────────────────────────
    run_type = "manual" if sys.stdin.isatty() else "scheduled"
    run_id = db_insert_pipeline_run(run_type=run_type, phase=args.phase, log_file_path=str(log_file))
    run_start = time.time()
    run_stats: dict = {
        'new_listings': 0,
        'enriched': 0,
        'marked_sold': 0,
        'models_scanned': [],
        'duration_seconds': 0,
        'error_message': None,
    }

    success = True

    try:
        if args.phase in ("1", "all"):
            ok = phase_1_discovery(dry_run=args.dry_run)
            if not ok:
                log.warning("Phase 1 (discovery) had issues — continuing anyway")

        if args.phase in ("2", "all"):
            queue_depth = get_queue_depth()
            log.info(f"Queue depth: {queue_depth} pending items")
            enriched_count = 0

            if queue_depth > 0:
                for i in range(args.enrich_count):
                    log.info(f"Enriching item {i+1}/{args.enrich_count}...")
                    ok = phase_2_enrich_one(dry_run=args.dry_run)
                    if ok:
                        enriched_count += 1
                    else:
                        break
                    # Stagger: wait 30 seconds between items in same run
                    if i < args.enrich_count - 1:
                        log.info("Waiting 30s before next enrichment...")
                        time.sleep(30)
            else:
                log.info("Queue empty — skipping Phase 2")
            run_stats['enriched'] = enriched_count

        if args.phase in ("3", "all"):
            ok = phase_3_regenerate_and_deploy(dry_run=args.dry_run)
            if not ok:
                log.error("Phase 3 (deploy) failed")
                success = False

        # Collect final stats
        run_stats['models_scanned'] = _count_active_models()
        run_stats['duration_seconds'] = int(time.time() - run_start)

    except Exception as exc:
        log.error(f"Unhandled pipeline error: {exc}")
        run_stats['error_message'] = str(exc)[:500]
        run_stats['duration_seconds'] = int(time.time() - run_start)
        success = False

    # ── DB: record run completion ──────────────────────────────────────────────
    db_update_pipeline_run(run_id, success=success, stats=run_stats)

    if success:
        log.info("Pipeline run complete ✓")
        print_status()
        return 0
    else:
        log.error("Pipeline run completed with errors")
        return 1

if __name__ == "__main__":
    sys.exit(main())
