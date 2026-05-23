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
