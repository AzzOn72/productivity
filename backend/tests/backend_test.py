"""Velari Backend API regression tests."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://velari-elite.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "founder@velari.app"
ADMIN_PASSWORD = "VelariAdmin2026!"


# ------------------------------------------------------------
# Fixtures
# ------------------------------------------------------------
@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def admin_client(admin_token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def new_user():
    """Register a brand-new user (used for onboarding + isolation)."""
    email = f"test_{uuid.uuid4().hex[:10]}@velari-test.com"
    password = "Velari!2026"
    r = requests.post(f"{API}/auth/register", json={"email": email, "password": password, "name": "Test User"}, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {data['access_token']}", "Content-Type": "application/json"})
    return {"email": email, "password": password, "token": data["access_token"], "user": data["user"], "client": s}


# ------------------------------------------------------------
# Health
# ------------------------------------------------------------
def test_health():
    r = requests.get(f"{API}/", timeout=15)
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["app"] == "Velari"


# ------------------------------------------------------------
# Auth
# ------------------------------------------------------------
class TestAuth:
    def test_register_returns_token_and_user(self, new_user):
        assert new_user["token"]
        assert new_user["user"]["email"] == new_user["email"]
        assert new_user["user"]["onboarded"] is False

    def test_login_admin(self, admin_token):
        assert isinstance(admin_token, str)
        assert len(admin_token) > 20

    def test_login_invalid(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"}, timeout=15)
        assert r.status_code == 401

    def test_me(self, admin_client):
        r = admin_client.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL

    def test_me_unauthenticated(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_logout(self, admin_token):
        s = requests.Session()
        s.headers.update({"Authorization": f"Bearer {admin_token}"})
        r = s.post(f"{API}/auth/logout")
        assert r.status_code == 200
        assert r.json()["ok"] is True


# ------------------------------------------------------------
# Onboarding
# ------------------------------------------------------------
class TestOnboarding:
    def test_submit_onboarding(self, new_user):
        r = new_user["client"].post(f"{API}/onboarding", json={
            "primary_goal": "Ship Velari MVP",
            "work_style": "deep",
            "daily_capacity": 4,
            "chronotype": "morning",
            "intentions": ["clarity", "focus"],
        })
        assert r.status_code == 200, r.text
        user = r.json()
        assert user["onboarded"] is True
        assert user["primary_goal"] == "Ship Velari MVP"

        # verify persistence via /auth/me
        me = new_user["client"].get(f"{API}/auth/me").json()
        assert me["onboarded"] is True


# ------------------------------------------------------------
# Tasks
# ------------------------------------------------------------
class TestTasks:
    def test_full_crud(self, admin_client):
        # CREATE
        r = admin_client.post(f"{API}/tasks", json={
            "title": "TEST_task_alpha",
            "priority": "high",
            "estimated_minutes": 45,
            "energy": "high",
        })
        assert r.status_code == 200, r.text
        task = r.json()
        task_id = task["task_id"]
        assert task["title"] == "TEST_task_alpha"
        assert task["completed"] is False

        # GET list
        r = admin_client.get(f"{API}/tasks")
        assert r.status_code == 200
        ids = [t["task_id"] for t in r.json()]
        assert task_id in ids

        # PATCH complete
        r = admin_client.patch(f"{API}/tasks/{task_id}", json={"completed": True})
        assert r.status_code == 200
        assert r.json()["completed"] is True

        # DELETE
        r = admin_client.delete(f"{API}/tasks/{task_id}")
        assert r.status_code == 200
        # Verify gone
        ids = [t["task_id"] for t in admin_client.get(f"{API}/tasks").json()]
        assert task_id not in ids

    def test_quick_capture(self, admin_client):
        r = admin_client.post(f"{API}/tasks/quick-capture", json={"text": "Review TEST_quick design draft for 20 minutes tomorrow"})
        assert r.status_code == 200, r.text
        task = r.json()
        assert "task_id" in task
        assert task["title"]
        admin_client.delete(f"{API}/tasks/{task['task_id']}")


# ------------------------------------------------------------
# Habits
# ------------------------------------------------------------
class TestHabits:
    def test_full_flow(self, admin_client):
        r = admin_client.post(f"{API}/habits", json={"name": "TEST_meditate", "icon": "leaf", "color": "#7B8B7B"})
        assert r.status_code == 200, r.text
        habit = r.json()
        hid = habit["habit_id"]
        assert habit["checked_today"] is False

        today = time.strftime("%Y-%m-%d")
        r = admin_client.post(f"{API}/habits/{hid}/check", json={"date": today})
        assert r.status_code == 200
        assert r.json()["checked"] is True

        r = admin_client.get(f"{API}/habits")
        h = next(h for h in r.json() if h["habit_id"] == hid)
        assert h["checked_today"] is True
        assert h["streak"] >= 1

        r = admin_client.delete(f"{API}/habits/{hid}")
        assert r.status_code == 200


# ------------------------------------------------------------
# Events
# ------------------------------------------------------------
class TestEvents:
    def test_full_flow(self, admin_client):
        r = admin_client.post(f"{API}/events", json={
            "title": "TEST_event_focus",
            "start": "2026-02-01T09:00:00+00:00",
            "end": "2026-02-01T10:00:00+00:00",
            "kind": "focus",
        })
        assert r.status_code == 200, r.text
        ev = r.json()
        eid = ev["event_id"]
        assert ev["title"] == "TEST_event_focus"

        ids = [e["event_id"] for e in admin_client.get(f"{API}/events").json()]
        assert eid in ids

        r = admin_client.delete(f"{API}/events/{eid}")
        assert r.status_code == 200


# ------------------------------------------------------------
# Focus sessions
# ------------------------------------------------------------
class TestFocus:
    def test_start_complete_today(self, admin_client):
        r = admin_client.post(f"{API}/focus/start", json={
            "intent": "TEST_focus_intent", "duration_minutes": 25, "mode": "pomodoro",
        })
        assert r.status_code == 200, r.text
        fid = r.json()["focus_id"]

        r = admin_client.post(f"{API}/focus/{fid}/complete", json={"completed_minutes": 25, "interrupted": False})
        assert r.status_code == 200

        r = admin_client.get(f"{API}/focus/today")
        assert r.status_code == 200
        body = r.json()
        assert body["total_minutes"] >= 25
        assert any(s["focus_id"] == fid for s in body["sessions"])


# ------------------------------------------------------------
# Reviews
# ------------------------------------------------------------
class TestReviews:
    def test_save_and_list(self, admin_client):
        r = admin_client.post(f"{API}/reviews", json={
            "week_of": "2026-01-26",
            "wins": ["TEST_win_1"],
            "challenges": ["TEST_challenge_1"],
            "energy_rating": 7,
            "focus_rating": 8,
            "next_week_intentions": ["TEST_intent"],
        })
        assert r.status_code == 200, r.text
        review = r.json()
        assert review["wins"] == ["TEST_win_1"]

        r = admin_client.get(f"{API}/reviews")
        assert r.status_code == 200
        assert any(rev["review_id"] == review["review_id"] for rev in r.json())

    def test_summary(self, admin_client):
        r = admin_client.get(f"{API}/reviews/summary")
        assert r.status_code == 200
        body = r.json()
        for k in ("tasks_done", "tasks_open", "focus_minutes", "focus_sessions", "habit_checks"):
            assert k in body


# ------------------------------------------------------------
# AI (Claude Sonnet 4.5 via Emergent LLM key)
# ------------------------------------------------------------
class TestAI:
    def test_chat(self, admin_client):
        r = admin_client.post(f"{API}/ai/chat", json={"prompt": "In one short sentence, say hello.", "context": "test"}, timeout=90)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("reply")
        assert len(body["reply"]) > 0

    def test_prioritize(self, admin_client):
        # ensure at least one open task today
        t = admin_client.post(f"{API}/tasks", json={"title": "TEST_prio_task", "priority": "high"}).json()
        try:
            r = admin_client.post(f"{API}/ai/prioritize", timeout=90)
            assert r.status_code == 200, r.text
            data = r.json()
            assert "order" in data and "reasoning" in data
        finally:
            admin_client.delete(f"{API}/tasks/{t['task_id']}")

    def test_plan_day(self, admin_client):
        today = time.strftime("%Y-%m-%d")
        t = admin_client.post(f"{API}/tasks", json={"title": "TEST_plan_task", "priority": "medium"}).json()
        try:
            r = admin_client.post(f"{API}/ai/plan-day", json={"date": today}, timeout=120)
            assert r.status_code == 200, r.text
            assert r.json().get("plan")
        finally:
            admin_client.delete(f"{API}/tasks/{t['task_id']}")

    def test_weekly_insight(self, admin_client):
        r = admin_client.get(f"{API}/ai/weekly-insight", timeout=120)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("insight")
        assert "metrics" in body



# ============================================================
# V2 — Streak, Momentum, Overload, Auto-plan, Insights, Rituals, Billing
# ============================================================
class TestStreak:
    def test_streak_shape(self, admin_client):
        r = admin_client.get(f"{API}/streak")
        assert r.status_code == 200, r.text
        body = r.json()
        assert "current" in body and "longest" in body
        assert isinstance(body["current"], int) and body["current"] >= 0
        assert isinstance(body["longest"], int) and body["longest"] >= 0


class TestMomentum:
    def test_momentum_shape(self, admin_client):
        r = admin_client.get(f"{API}/momentum")
        assert r.status_code == 200, r.text
        body = r.json()
        assert set(["score", "label", "components", "raw"]).issubset(body.keys())
        for k in ("tasks", "focus", "habits"):
            assert k in body["components"]
        assert 0 <= body["score"] <= 100
        assert body["label"] in ("Quiet", "Warming", "In motion", "Flow")


class TestOverloadCheck:
    def test_overload_shape(self, admin_client):
        r = admin_client.get(f"{API}/ai/overload-check")
        assert r.status_code == 200, r.text
        body = r.json()
        for k in ("overloaded", "ratio", "estimated_minutes", "capacity_minutes", "task_count", "suggestion"):
            assert k in body
        assert isinstance(body["overloaded"], bool)


class TestAutoPlan:
    def test_auto_plan_creates_focus_events_no_duplicates(self, admin_client):
        # Seed a couple of tasks for today
        today = time.strftime("%Y-%m-%d")
        ids = []
        for i in range(2):
            r = admin_client.post(f"{API}/tasks", json={
                "title": f"TEST_autoplan_{i}",
                "priority": "high",
                "estimated_minutes": 30,
                "scheduled_for": today,
            })
            assert r.status_code == 200, r.text
            ids.append(r.json()["task_id"])
        try:
            r1 = admin_client.post(f"{API}/ai/auto-plan", timeout=60)
            assert r1.status_code == 200, r1.text
            created1 = r1.json().get("created", 0)
            assert created1 > 0, r1.text

            # 2nd call should clear+regenerate (no duplicates)
            events_before = admin_client.get(f"{API}/events").json()
            focus_before = [e for e in events_before if e.get("kind") == "focus" and e.get("auto_generated")]
            r2 = admin_client.post(f"{API}/ai/auto-plan", timeout=60)
            assert r2.status_code == 200
            events_after = admin_client.get(f"{API}/events").json()
            focus_after = [e for e in events_after if e.get("kind") == "focus" and e.get("auto_generated")]
            # Same count -> no duplicate explosion
            assert len(focus_after) == len(focus_before), f"Duplicates: before={len(focus_before)} after={len(focus_after)}"

            # Verify GET /api/events includes kind=focus + auto_generated=true
            assert any(e.get("kind") == "focus" and e.get("auto_generated") for e in events_after)
        finally:
            for tid in ids:
                admin_client.delete(f"{API}/tasks/{tid}")
            # Clean auto-generated focus events created in this test
            for e in admin_client.get(f"{API}/events").json():
                if e.get("auto_generated") and e.get("kind") == "focus" and e.get("title", "").startswith("TEST_autoplan_"):
                    admin_client.delete(f"{API}/events/{e['event_id']}")


class TestWeeklyCompare:
    def test_compare_shape(self, admin_client):
        r = admin_client.get(f"{API}/insights/weekly-compare")
        assert r.status_code == 200, r.text
        body = r.json()
        for k in ("this_week", "previous_week", "deltas_pct", "best_day", "distraction_rate_pct", "sessions_count"):
            assert k in body, f"Missing key: {k}"
        for k in ("tasks_done", "focus_minutes", "focus_sessions", "habits"):
            assert k in body["this_week"]
            assert k in body["previous_week"]


class TestShutdownRitual:
    def test_save_and_list(self, admin_client):
        today = time.strftime("%Y-%m-%d")
        r = admin_client.post(f"{API}/rituals/shutdown", json={
            "date": today,
            "wins": ["TEST_shutdown_win"],
            "tomorrows_intention": "Ship Velari v2",
            "energy": 8,
        })
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["wins"] == ["TEST_shutdown_win"]
        assert body["tomorrows_intention"] == "Ship Velari v2"

        r = admin_client.get(f"{API}/rituals/shutdown")
        assert r.status_code == 200
        items = r.json()
        assert any(it.get("ritual_id") == body["ritual_id"] for it in items)


class TestBilling:
    def test_dev_override_and_restore(self, admin_client):
        # 1. Upgrade to pro via dev_mode=true
        r = admin_client.post(f"{API}/billing/upgrade", json={"plan": "pro", "dev_mode": True})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["ok"] is True
        assert body["dev_override"] is True
        assert body["user"]["plan"] == "pro"

        # 2. Verify via /billing/plan
        r = admin_client.get(f"{API}/billing/plan")
        assert r.status_code == 200
        assert r.json()["plan"] == "pro"

        # 3. dev_mode=false should 501
        r = admin_client.post(f"{API}/billing/upgrade", json={"plan": "pro", "dev_mode": False})
        assert r.status_code == 501

        # 4. Restore admin to elite
        r = admin_client.post(f"{API}/billing/upgrade", json={"plan": "elite", "dev_mode": True})
        assert r.status_code == 200
        assert r.json()["user"]["plan"] == "elite"
        r = admin_client.get(f"{API}/billing/plan")
        assert r.json()["plan"] == "elite"

    def test_create_checkout_mock(self, admin_client):
        r = admin_client.post(f"{API}/billing/create-checkout", json={"plan": "pro", "dev_mode": False})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["mock"] is True


class TestTightenedAIPrompts:
    def test_prioritize_reasoning_is_short(self, admin_client):
        t = admin_client.post(f"{API}/tasks", json={"title": "TEST_terse_prio", "priority": "high"}).json()
        try:
            r = admin_client.post(f"{API}/ai/prioritize", timeout=90)
            assert r.status_code == 200, r.text
            data = r.json()
            reasoning = data.get("reasoning", "")
            assert isinstance(reasoning, str) and len(reasoning) > 0
            # Allow up to 200 chars (target ≤140; mild slack for model variability)
            assert len(reasoning) <= 200, f"Reasoning too long ({len(reasoning)} chars): {reasoning}"
        finally:
            admin_client.delete(f"{API}/tasks/{t['task_id']}")

    def test_plan_day_returns_bullets(self, admin_client):
        today = time.strftime("%Y-%m-%d")
        t = admin_client.post(f"{API}/tasks", json={"title": "TEST_terse_plan", "priority": "high"}).json()
        try:
            r = admin_client.post(f"{API}/ai/plan-day", json={"date": today}, timeout=120)
            assert r.status_code == 200, r.text
            plan = r.json().get("plan", "")
            assert plan
            # Should look like bullets / structured plan
            assert any(line.strip() for line in plan.splitlines())
        finally:
            admin_client.delete(f"{API}/tasks/{t['task_id']}")

    def test_weekly_insight_short(self, admin_client):
        r = admin_client.get(f"{API}/ai/weekly-insight", timeout=120)
        assert r.status_code == 200, r.text
        insight = r.json().get("insight", "")
        assert insight
        # Should be roughly 3 lines (allow some slack)
        nonempty = [ln for ln in insight.splitlines() if ln.strip()]
        assert 1 <= len(nonempty) <= 6, f"Unexpected line count: {len(nonempty)}\n{insight}"
