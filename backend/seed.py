"""Seed accounts + core data. Idempotent: existing rows are left untouched.

- Demo account (fixed credentials, used in class demos):
    demo@tradelens.app / demo1234
- Admin account: credentials come from ADMIN_EMAIL / ADMIN_PASSWORD in
  backend/.env — never hard-coded here.
- Playbook library, tags, and the demo user's trades/adoptions are seeded
  from the front end's mock JSON (src/mock/) so both sides share one source.

Run after migrations:
    flask --app app db upgrade
    python seed.py
"""
import json
from datetime import date, datetime, timezone
from pathlib import Path

from werkzeug.security import generate_password_hash

import config
from app import app
from extensions import db
from models import Playbook, Tag, Trade, User, UserPlaybook, UserProfile, utcnow

MOCK_DIR = Path(__file__).resolve().parent.parent / "src" / "mock"

DEMO_EMAIL = "demo@tradelens.app"
DEMO_PASSWORD = "demo1234"
LEGACY_DEMO_ID = "u_1"  # the demo user's id inside the mock JSON files


def _load(name):
    with open(MOCK_DIR / name, encoding="utf-8") as fh:
        return json.load(fh)


def _parse_dt(value):
    if not value:
        return utcnow()
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return utcnow()


def _parse_day(value):
    return date.fromisoformat(value) if value else None


def ensure_user(email, password, display_name, role):
    email = email.strip().lower()
    existing = db.session.query(User).filter_by(email=email).first()
    if existing:
        # Seed accounts must never sit unverified (D-014): rows created before
        # the 1.5 migration have email_verified_at NULL and get stuck at
        # /verify. Backfill ONLY that field, only for this seed email —
        # everything else (password, display_name, ...) may have been changed
        # by the user and is left untouched.
        if existing.email_verified_at is None:
            existing.email_verified_at = utcnow()
            db.session.commit()
            print(f"= {email} already exists (role={existing.role}), backfilled email_verified_at")
        else:
            print(f"= {email} already exists (role={existing.role}), skipped")
        return existing
    user = User(
        email=email,
        password_hash=generate_password_hash(password),
        display_name=display_name,
        role=role,
        # Seed accounts skip the verification round-trip (class demos).
        email_verified_at=utcnow(),
    )
    db.session.add(user)
    db.session.commit()
    print(f"+ created {email} (role={role})")
    return user


def ensure_onboarded(user):
    """Seed accounts never see the onboarding flow (TL-FEAT-008): make sure a
    profile row exists and is marked complete. Idempotent; only the two
    seed-identified accounts ever reach this."""
    profile = db.session.get(UserProfile, user.id)
    if profile is None:
        profile = UserProfile(user_id=user.id)
        db.session.add(profile)
    if profile.onboarding_completed_at is None:
        profile.onboarding_completed_at = utcnow()
        db.session.commit()
        print(f"+ {user.email}: onboarding marked complete")
    else:
        print(f"= {user.email}: onboarding already complete")


def seed_playbooks():
    created = 0
    for item in _load("playbooks.json"):
        if db.session.get(Playbook, item["id"]):
            continue
        db.session.add(
            Playbook(
                id=item["id"],
                category=item["category"],
                market=item["market"],
                risk_level=item.get("riskLevel", "Medium"),
                tags=item.get("tags", []),
                name_en=item["name"],
                summary_en=item.get("summary", ""),
                description_en=item.get("description", ""),
                rules_en=item.get("rules", []),
                name_zh=item.get("name_zh"),
                summary_zh=item.get("summary_zh"),
                description_zh=item.get("description_zh"),
                rules_zh=item.get("rules_zh"),
                is_curated=item.get("isCurated", True),
                created_by=item.get("createdBy", "seed"),
                created_at=_parse_dt(item.get("createdAt")),
            )
        )
        created += 1
    db.session.commit()
    print(f"+ playbooks: {created} created" if created else "= playbooks: up to date")


def seed_tags():
    created = 0
    for item in _load("tags.json"):
        if db.session.query(Tag).filter_by(label=item["label"]).first():
            continue
        db.session.add(Tag(label=item["label"], color=item.get("color")))
        created += 1
    db.session.commit()
    print(f"+ tags: {created} created" if created else "= tags: up to date")


def seed_demo_data(demo_user):
    """Demo trades + adoptions from mock JSON. Trades are only seeded while the
    demo account has none, so real data added later is never mixed back."""
    if db.session.query(Trade.id).filter_by(user_id=demo_user.id).first():
        print("= demo trades: account already has trades, skipped")
    else:
        trades = [t for t in _load("trades.json") if t["userId"] == LEGACY_DEMO_ID]
        for item in trades:
            playbook_id = item.get("playbookId")
            db.session.add(
                Trade(
                    user_id=demo_user.id,
                    playbook_id=playbook_id
                    if playbook_id and db.session.get(Playbook, playbook_id)
                    else None,
                    ticker=item["ticker"],
                    side=item["side"],
                    quantity=item["quantity"],
                    entry_price=item["entryPrice"],
                    exit_price=item.get("exitPrice"),
                    open_date=_parse_day(item["openDate"]),
                    close_date=_parse_day(item.get("closeDate")),
                    fees=item.get("fees") or 0.0,
                    notes=item.get("notes", ""),
                    source="manual",
                    created_at=_parse_dt(item.get("createdAt")),
                )
            )
        db.session.commit()
        print(f"+ demo trades: {len(trades)} created")

    demo_mock = next(
        (u for u in _load("users.json") if u["id"] == LEGACY_DEMO_ID), None
    )
    adopted = 0
    for playbook_id in (demo_mock or {}).get("adoptedPlaybookIds", []):
        if db.session.get(UserPlaybook, (demo_user.id, playbook_id)):
            continue
        if db.session.get(Playbook, playbook_id) is None:
            continue
        db.session.add(UserPlaybook(user_id=demo_user.id, playbook_id=playbook_id))
        adopted += 1
    db.session.commit()
    print(f"+ demo adoptions: {adopted} created" if adopted else "= demo adoptions: up to date")


if __name__ == "__main__":
    with app.app_context():
        demo = ensure_user(DEMO_EMAIL, DEMO_PASSWORD, "Demo Investor", "user")
        ensure_onboarded(demo)
        if config.ADMIN_EMAIL and config.ADMIN_PASSWORD:
            admin = ensure_user(
                config.ADMIN_EMAIL, config.ADMIN_PASSWORD, "Platform Admin", "admin"
            )
            ensure_onboarded(admin)
        else:
            print("! ADMIN_EMAIL / ADMIN_PASSWORD not set in .env — admin account skipped")
        seed_playbooks()
        seed_tags()
        seed_demo_data(demo)
