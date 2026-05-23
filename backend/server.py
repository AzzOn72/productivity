"""
Velari — Backend
A premium daily operating system for life.
"""
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import logging
import bcrypt
import jwt
import httpx
from datetime import datetime, timezone, timedelta, date
from typing import List, Optional, Literal

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, status
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict

# Emergent LLM
from emergentintegrations.llm.chat import LlmChat, UserMessage

# ============================================================
# Config
# ============================================================
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = 60 * 24 * 7  # 7 days for comfort during dev
REFRESH_TOKEN_DAYS = 30

def jwt_secret() -> str:
    return os.environ["JWT_SECRET"]

# ============================================================
# DB
# ============================================================
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# ============================================================
# App
# ============================================================
app = FastAPI(title="Velari API", version="1.0.0")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("velari")


# ============================================================
# Helpers
# ============================================================
def now_utc() -> datetime:
    return datetime.now(timezone.utc)

def new_id(prefix: str = "id") -> str:
    return f"{prefix}_{uuid.uuid4().hex[:16]}"

def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False

def create_token(user_id: str, kind: str = "access") -> str:
    if kind == "access":
        exp = now_utc() + timedelta(minutes=ACCESS_TOKEN_MINUTES)
    else:
        exp = now_utc() + timedelta(days=REFRESH_TOKEN_DAYS)
    return jwt.encode(
        {"sub": user_id, "type": kind, "exp": exp, "iat": now_utc()},
        jwt_secret(),
        algorithm=JWT_ALGORITHM,
    )

def set_auth_cookies(response: Response, access: str, refresh: str):
    secure = True
    response.set_cookie("access_token", access, httponly=True, secure=secure, samesite="none", max_age=ACCESS_TOKEN_MINUTES * 60, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=secure, samesite="none", max_age=REFRESH_TOKEN_DAYS * 86400, path="/")

def clear_auth_cookies(response: Response):
    for key in ("access_token", "refresh_token", "session_token"):
        response.delete_cookie(key, path="/")

async def get_token_from_request(request: Request) -> Optional[str]:
    tok = request.cookies.get("access_token")
    if tok:
        return tok
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth[7:]
    return None

async def get_session_token(request: Request) -> Optional[str]:
    tok = request.cookies.get("session_token")
    if tok:
        return tok
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth[7:]
    return None

async def get_current_user(request: Request) -> dict:
    # First: try Emergent session token
    session_token = request.cookies.get("session_token")
    if session_token:
        sess = await db.sessions.find_one({"session_token": session_token}, {"_id": 0})
        if sess:
            expires_at = sess.get("expires_at")
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at)
            if expires_at and expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at and expires_at > now_utc():
                user = await db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0, "password_hash": 0})
                if user:
                    return user
    # Then JWT
    token = await get_token_from_request(request)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ============================================================
# Pydantic models
# ============================================================
class UserPublic(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    plan: str = "free"
    onboarded: bool = False
    created_at: Optional[datetime] = None

class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1, max_length=80)

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class OnboardingIn(BaseModel):
    primary_goal: str
    work_style: str
    daily_capacity: int = 4  # focus hours/day
    chronotype: str = "balanced"  # morning / balanced / night
    intentions: List[str] = []

class TaskIn(BaseModel):
    title: str
    notes: Optional[str] = ""
    priority: Literal["low", "medium", "high", "urgent"] = "medium"
    estimated_minutes: Optional[int] = 30
    due_date: Optional[str] = None  # YYYY-MM-DD
    project_id: Optional[str] = None
    goal_id: Optional[str] = None
    tags: List[str] = []
    energy: Literal["low", "medium", "high"] = "medium"
    scheduled_for: Optional[str] = None  # YYYY-MM-DD (which day on plan)
    parent_task_id: Optional[str] = None  # for subtasks

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    notes: Optional[str] = None
    priority: Optional[str] = None
    estimated_minutes: Optional[int] = None
    due_date: Optional[str] = None
    project_id: Optional[str] = None
    goal_id: Optional[str] = None
    tags: Optional[List[str]] = None
    energy: Optional[str] = None
    scheduled_for: Optional[str] = None
    completed: Optional[bool] = None
    actual_minutes: Optional[int] = None
    parent_task_id: Optional[str] = None

class ProjectIn(BaseModel):
    name: str
    color: str = "#C86B52"
    description: Optional[str] = ""

class HabitIn(BaseModel):
    name: str
    icon: Optional[str] = "leaf"
    color: str = "#7B8B7B"
    cadence: Literal["daily", "weekly"] = "daily"

class HabitCheckIn(BaseModel):
    date: str  # YYYY-MM-DD

class EventIn(BaseModel):
    title: str
    start: str  # ISO datetime
    end: str
    kind: Literal["event", "focus", "break"] = "event"
    notes: Optional[str] = ""
    color: Optional[str] = None

class FocusSessionIn(BaseModel):
    task_id: Optional[str] = None
    intent: Optional[str] = ""
    duration_minutes: int = 25
    mode: Literal["pomodoro", "deep", "flow"] = "pomodoro"

class FocusSessionComplete(BaseModel):
    completed_minutes: int
    interrupted: bool = False

class WeeklyReviewIn(BaseModel):
    week_of: str  # YYYY-MM-DD (Monday)
    wins: List[str] = []
    challenges: List[str] = []
    energy_rating: int = 7
    focus_rating: int = 7
    next_week_intentions: List[str] = []

class AIRequest(BaseModel):
    prompt: str
    context: Optional[str] = "general"

class AIPlanRequest(BaseModel):
    date: str  # YYYY-MM-DD

class QuickCaptureIn(BaseModel):
    text: str


class BillingUpgradeIn(BaseModel):
    plan: Literal["free", "pro", "elite"]
    dev_mode: bool = False


class ShutdownRitualIn(BaseModel):
    date: str  # YYYY-MM-DD
    wins: List[str] = []
    tomorrows_intention: Optional[str] = ""
    energy: int = 6
    notes: Optional[str] = ""


class NowRequest(BaseModel):
    free_minutes: Optional[int] = 30
    location: Optional[str] = None  # "home", "office", "transit", "anywhere"


class DecomposeIn(BaseModel):
    task_id: str


class GoalIn(BaseModel):
    title: str
    why: Optional[str] = ""
    weight: int = Field(default=5, ge=1, le=10)
    color: str = "#C86B52"
    icon: Optional[str] = "compass"
    target_date: Optional[str] = None


class GoalUpdate(BaseModel):
    title: Optional[str] = None
    why: Optional[str] = None
    weight: Optional[int] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    target_date: Optional[str] = None
    archived: Optional[bool] = None


class CheckinIn(BaseModel):
    mood: int = Field(ge=1, le=5)  # 1 = low, 5 = vivid
    energy: int = Field(ge=1, le=5)
    note: Optional[str] = ""


class JournalIn(BaseModel):
    text: str
    mood: Optional[int] = None
    extract_tasks: bool = True




# ============================================================
# AUTH — Email/Password JWT
# ============================================================
@api.post("/auth/register")
async def register(payload: RegisterIn, response: Response):
    email = payload.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = new_id("user")
    doc = {
        "user_id": user_id,
        "email": email,
        "name": payload.name,
        "picture": None,
        "password_hash": hash_password(payload.password),
        "plan": "free",
        "onboarded": False,
        "provider": "email",
        "created_at": now_utc().isoformat(),
    }
    await db.users.insert_one(doc)
    access = create_token(user_id, "access")
    refresh = create_token(user_id, "refresh")
    set_auth_cookies(response, access, refresh)
    return {"user": {k: v for k, v in doc.items() if k not in ("password_hash", "_id")}, "access_token": access}


@api.post("/auth/login")
async def login(payload: LoginIn, response: Response):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not user.get("password_hash") or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    access = create_token(user["user_id"], "access")
    refresh = create_token(user["user_id"], "refresh")
    set_auth_cookies(response, access, refresh)
    user.pop("password_hash", None)
    user.pop("_id", None)
    return {"user": user, "access_token": access}


@api.post("/auth/logout")
async def logout(response: Response, request: Request):
    sess = request.cookies.get("session_token")
    if sess:
        await db.sessions.delete_one({"session_token": sess})
    clear_auth_cookies(response)
    return {"ok": True}


@api.get("/auth/me")
async def me(current=Depends(get_current_user)):
    return current


# ============================================================
# AUTH — Emergent Google Session
# ============================================================
@api.post("/auth/session")
async def emergent_session(request: Request, response: Response):
    """Exchange Emergent session_id for backend session_token."""
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        body = await request.json() if request.headers.get("content-type", "").startswith("application/json") else {}
        session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing session_id")

    async with httpx.AsyncClient(timeout=15.0) as http:
        r = await http.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id},
        )
        if r.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        data = r.json()

    email = data["email"].lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": data.get("name", existing["name"]), "picture": data.get("picture")}},
        )
    else:
        user_id = new_id("user")
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": data.get("name", email.split("@")[0]),
            "picture": data.get("picture"),
            "plan": "free",
            "onboarded": False,
            "provider": "google",
            "created_at": now_utc().isoformat(),
        })

    session_token = data["session_token"]
    expires_at = now_utc() + timedelta(days=7)
    await db.sessions.update_one(
        {"session_token": session_token},
        {"$set": {"session_token": session_token, "user_id": user_id, "expires_at": expires_at.isoformat()}},
        upsert=True,
    )

    response.set_cookie(
        "session_token", session_token, httponly=True, secure=True, samesite="none",
        max_age=7 * 86400, path="/",
    )

    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    return {"user": user}


# ============================================================
# ONBOARDING
# ============================================================
@api.post("/onboarding")
async def submit_onboarding(payload: OnboardingIn, current=Depends(get_current_user)):
    await db.users.update_one(
        {"user_id": current["user_id"]},
        {"$set": {
            "onboarded": True,
            "primary_goal": payload.primary_goal,
            "work_style": payload.work_style,
            "daily_capacity": payload.daily_capacity,
            "chronotype": payload.chronotype,
            "intentions": payload.intentions,
        }},
    )
    user = await db.users.find_one({"user_id": current["user_id"]}, {"_id": 0, "password_hash": 0})
    return user


# ============================================================
# TASKS
# ============================================================
@api.get("/tasks")
async def list_tasks(current=Depends(get_current_user), day: Optional[str] = None):
    q = {"user_id": current["user_id"]}
    if day:
        q["$or"] = [{"scheduled_for": day}, {"due_date": day}]
    tasks = await db.tasks.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return tasks


@api.post("/tasks")
async def create_task(payload: TaskIn, current=Depends(get_current_user)):
    task = {
        "task_id": new_id("task"),
        "user_id": current["user_id"],
        **payload.model_dump(),
        "completed": False,
        "actual_minutes": 0,
        "created_at": now_utc().isoformat(),
        "completed_at": None,
    }
    if not task.get("scheduled_for"):
        task["scheduled_for"] = now_utc().date().isoformat()
    await db.tasks.insert_one(task)
    task.pop("_id", None)
    return task


@api.patch("/tasks/{task_id}")
async def update_task(task_id: str, payload: TaskUpdate, current=Depends(get_current_user)):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if payload.completed is True:
        update["completed_at"] = now_utc().isoformat()
    if payload.completed is False:
        update["completed_at"] = None
    res = await db.tasks.update_one({"task_id": task_id, "user_id": current["user_id"]}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    task = await db.tasks.find_one({"task_id": task_id}, {"_id": 0})
    return task


@api.delete("/tasks/{task_id}")
async def delete_task(task_id: str, current=Depends(get_current_user)):
    await db.tasks.delete_one({"task_id": task_id, "user_id": current["user_id"]})
    return {"ok": True}


@api.post("/tasks/quick-capture")
async def quick_capture(payload: QuickCaptureIn, current=Depends(get_current_user)):
    """Parse natural language into a task using AI."""
    parsed = {"title": payload.text, "priority": "medium", "estimated_minutes": 30, "energy": "medium"}
    try:
        chat = LlmChat(
            api_key=os.environ["EMERGENT_LLM_KEY"],
            session_id=f"capture-{current['user_id']}-{uuid.uuid4().hex[:8]}",
            system_message=(
                "You parse short natural-language productivity inputs into a JSON object with keys: "
                "title (string, cleaned), priority (low|medium|high|urgent), estimated_minutes (int), energy (low|medium|high). "
                "Reply with ONLY valid JSON, no prose."
            ),
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        reply = await chat.send_message(UserMessage(text=payload.text))
        import json
        import re
        match = re.search(r"\{.*\}", reply, re.S)
        if match:
            parsed.update(json.loads(match.group(0)))
    except Exception as e:
        log.warning(f"quick-capture AI parse failed: {e}")
    task_in = TaskIn(
        title=parsed.get("title", payload.text)[:200],
        priority=parsed.get("priority", "medium"),
        estimated_minutes=int(parsed.get("estimated_minutes", 30) or 30),
        energy=parsed.get("energy", "medium"),
    )
    return await create_task(task_in, current)


# ============================================================
# PROJECTS
# ============================================================
@api.get("/projects")
async def list_projects(current=Depends(get_current_user)):
    return await db.projects.find({"user_id": current["user_id"]}, {"_id": 0}).to_list(200)


@api.post("/projects")
async def create_project(payload: ProjectIn, current=Depends(get_current_user)):
    proj = {
        "project_id": new_id("prj"),
        "user_id": current["user_id"],
        **payload.model_dump(),
        "created_at": now_utc().isoformat(),
    }
    await db.projects.insert_one(proj)
    proj.pop("_id", None)
    return proj


# ============================================================
# HABITS
# ============================================================
@api.get("/habits")
async def list_habits(current=Depends(get_current_user)):
    habits = await db.habits.find({"user_id": current["user_id"]}, {"_id": 0}).to_list(200)
    # Attach today check-in status
    today = now_utc().date().isoformat()
    for h in habits:
        ci = await db.habit_checks.find_one({"habit_id": h["habit_id"], "date": today})
        h["checked_today"] = bool(ci)
        # streak
        streak = 0
        d = now_utc().date()
        while True:
            ds = d.isoformat()
            row = await db.habit_checks.find_one({"habit_id": h["habit_id"], "date": ds})
            if row:
                streak += 1
                d = d - timedelta(days=1)
            else:
                break
        h["streak"] = streak
    return habits


@api.post("/habits")
async def create_habit(payload: HabitIn, current=Depends(get_current_user)):
    habit = {
        "habit_id": new_id("hbt"),
        "user_id": current["user_id"],
        **payload.model_dump(),
        "created_at": now_utc().isoformat(),
    }
    await db.habits.insert_one(habit)
    habit.pop("_id", None)
    habit["checked_today"] = False
    habit["streak"] = 0
    return habit


@api.post("/habits/{habit_id}/check")
async def check_habit(habit_id: str, payload: HabitCheckIn, current=Depends(get_current_user)):
    habit = await db.habits.find_one({"habit_id": habit_id, "user_id": current["user_id"]})
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    existing = await db.habit_checks.find_one({"habit_id": habit_id, "date": payload.date})
    if existing:
        await db.habit_checks.delete_one({"_id": existing["_id"]})
        return {"checked": False}
    await db.habit_checks.insert_one({
        "habit_id": habit_id,
        "user_id": current["user_id"],
        "date": payload.date,
        "checked_at": now_utc().isoformat(),
    })
    return {"checked": True}


@api.delete("/habits/{habit_id}")
async def delete_habit(habit_id: str, current=Depends(get_current_user)):
    await db.habits.delete_one({"habit_id": habit_id, "user_id": current["user_id"]})
    await db.habit_checks.delete_many({"habit_id": habit_id})
    return {"ok": True}


# ============================================================
# CALENDAR EVENTS
# ============================================================
@api.get("/events")
async def list_events(current=Depends(get_current_user), start: Optional[str] = None, end: Optional[str] = None):
    q = {"user_id": current["user_id"]}
    events = await db.events.find(q, {"_id": 0}).to_list(500)
    if start and end:
        events = [
            e for e in events
            if (start <= e["start"] <= end) or (start <= e["end"] <= end)
        ]
    return events


@api.post("/events")
async def create_event(payload: EventIn, current=Depends(get_current_user)):
    ev = {
        "event_id": new_id("ev"),
        "user_id": current["user_id"],
        **payload.model_dump(),
        "created_at": now_utc().isoformat(),
    }
    await db.events.insert_one(ev)
    ev.pop("_id", None)
    return ev


@api.delete("/events/{event_id}")
async def delete_event(event_id: str, current=Depends(get_current_user)):
    await db.events.delete_one({"event_id": event_id, "user_id": current["user_id"]})
    return {"ok": True}


# ============================================================
# FOCUS SESSIONS
# ============================================================
@api.post("/focus/start")
async def start_focus(payload: FocusSessionIn, current=Depends(get_current_user)):
    session = {
        "focus_id": new_id("focus"),
        "user_id": current["user_id"],
        **payload.model_dump(),
        "started_at": now_utc().isoformat(),
        "completed_at": None,
        "completed_minutes": 0,
        "interrupted": False,
    }
    await db.focus_sessions.insert_one(session)
    session.pop("_id", None)
    return session


@api.post("/focus/{focus_id}/complete")
async def complete_focus(focus_id: str, payload: FocusSessionComplete, current=Depends(get_current_user)):
    res = await db.focus_sessions.update_one(
        {"focus_id": focus_id, "user_id": current["user_id"]},
        {"$set": {
            "completed_at": now_utc().isoformat(),
            "completed_minutes": payload.completed_minutes,
            "interrupted": payload.interrupted,
        }},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Focus session not found")
    return {"ok": True}


@api.get("/focus/today")
async def focus_today(current=Depends(get_current_user)):
    today = now_utc().date().isoformat()
    sessions = await db.focus_sessions.find({
        "user_id": current["user_id"],
        "started_at": {"$gte": today},
    }, {"_id": 0}).to_list(100)
    total = sum(s.get("completed_minutes", 0) for s in sessions)
    return {"sessions": sessions, "total_minutes": total}


# ============================================================
# WEEKLY REVIEW
# ============================================================
@api.post("/reviews")
async def save_review(payload: WeeklyReviewIn, current=Depends(get_current_user)):
    doc = {
        "review_id": new_id("rev"),
        "user_id": current["user_id"],
        **payload.model_dump(),
        "created_at": now_utc().isoformat(),
    }
    await db.reviews.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/reviews")
async def list_reviews(current=Depends(get_current_user)):
    return await db.reviews.find({"user_id": current["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(20)


@api.get("/reviews/summary")
async def review_summary(current=Depends(get_current_user)):
    """Aggregate last 7 days metrics."""
    seven_days_ago = (now_utc() - timedelta(days=7)).isoformat()
    tasks_done = await db.tasks.count_documents({
        "user_id": current["user_id"],
        "completed": True,
        "completed_at": {"$gte": seven_days_ago},
    })
    tasks_open = await db.tasks.count_documents({
        "user_id": current["user_id"],
        "completed": False,
    })
    focus_sessions = await db.focus_sessions.find({
        "user_id": current["user_id"],
        "started_at": {"$gte": seven_days_ago},
    }, {"_id": 0}).to_list(500)
    focus_total = sum(s.get("completed_minutes", 0) for s in focus_sessions)
    habit_checks = await db.habit_checks.count_documents({
        "user_id": current["user_id"],
        "checked_at": {"$gte": seven_days_ago},
    })
    return {
        "tasks_done": tasks_done,
        "tasks_open": tasks_open,
        "focus_minutes": focus_total,
        "focus_sessions": len(focus_sessions),
        "habit_checks": habit_checks,
    }


# ============================================================
# AI ASSISTANT — Claude Sonnet 4.5 (via Emergent LLM)
# ============================================================
def _llm() -> LlmChat:
    return LlmChat(
        api_key=os.environ["EMERGENT_LLM_KEY"],
        session_id=new_id("ai"),
        system_message=(
            "You are Velari — a calm, elite productivity coach. "
            "Be terse. Be direct. Give plans, not explanations. "
            "Default to bullets of 6 words or fewer. "
            "Never apologize, never preface, never use emoji. "
            "Speak as a trusted senior advisor: warm, precise, unhurried."
        ),
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")


@api.post("/ai/chat")
async def ai_chat(payload: AIRequest, current=Depends(get_current_user)):
    try:
        chat = _llm()
        reply = await chat.send_message(UserMessage(text=payload.prompt))
        await db.ai_messages.insert_one({
            "user_id": current["user_id"],
            "prompt": payload.prompt,
            "reply": reply,
            "context": payload.context,
            "created_at": now_utc().isoformat(),
        })
        return {"reply": reply}
    except Exception as e:
        log.error(f"AI chat error: {e}")
        raise HTTPException(status_code=500, detail="AI is currently unavailable")


@api.post("/ai/prioritize")
async def ai_prioritize(current=Depends(get_current_user)):
    """Have the AI suggest a priority order for today's tasks."""
    today = now_utc().date().isoformat()
    tasks = await db.tasks.find({
        "user_id": current["user_id"],
        "completed": False,
        "$or": [{"scheduled_for": today}, {"due_date": today}],
    }, {"_id": 0}).to_list(50)
    if not tasks:
        return {"order": [], "reasoning": "No tasks scheduled today. Take a breath, then capture one meaningful intention."}
    summary = "\n".join([f"- {t['task_id']}: {t['title']} (priority={t.get('priority','medium')}, est={t.get('estimated_minutes',30)}m, energy={t.get('energy','medium')})" for t in tasks])
    chat = _llm()
    prompt = (
        f"User chronotype: {current.get('chronotype','balanced')}. Capacity: {current.get('daily_capacity',4)}h.\n"
        f"Tasks:\n{summary}\n\n"
        "Return JSON only: {order: [task_ids, hardest first], reasoning: '<= 14 words, no emoji'}."
    )
    try:
        reply = await chat.send_message(UserMessage(text=prompt))
        import json
        import re
        m = re.search(r"\{.*\}", reply, re.S)
        data = json.loads(m.group(0)) if m else {"order": [t["task_id"] for t in tasks], "reasoning": reply}
        return data
    except Exception as e:
        log.error(f"prioritize error: {e}")
        return {"order": [t["task_id"] for t in tasks], "reasoning": "Start with what feels heaviest while your energy is fresh."}


@api.post("/ai/plan-day")
async def ai_plan_day(payload: AIPlanRequest, current=Depends(get_current_user)):
    tasks = await db.tasks.find({
        "user_id": current["user_id"],
        "completed": False,
        "$or": [{"scheduled_for": payload.date}, {"due_date": payload.date}],
    }, {"_id": 0}).to_list(50)
    if not tasks:
        return {"plan": "No tasks scheduled. Consider a slow morning, a single deep work block, and a clean shutdown ritual."}
    chat = _llm()
    summary = "\n".join([f"- {t['title']} ({t.get('estimated_minutes',30)}m, {t.get('priority','medium')})" for t in tasks])
    reply = await chat.send_message(UserMessage(text=(
        f"Plan {payload.date}. Chronotype: {current.get('chronotype','balanced')}. "
        f"Capacity: {current.get('daily_capacity',4)}h.\nTasks:\n{summary}\n\n"
        "Output 4-6 bullets, format: 'HH:MM-HH:MM — Task (≤ 5 words)'. "
        "Include one deep work block, one short break, and 'Shutdown' as the last bullet. No prose."
    )))
    return {"plan": reply}


@api.get("/ai/weekly-insight")
async def ai_weekly_insight(current=Depends(get_current_user)):
    summary = await review_summary(current)
    chat = _llm()
    reply = await chat.send_message(UserMessage(text=(
        f"Past 7-day metrics: {summary}. "
        "Reply in exactly 3 short lines. Line 1: one warm observation. "
        "Line 2: the single biggest pattern to keep. Line 3: one precise next-week move. "
        "No headings, no emoji, no preamble."
    )))
    return {"insight": reply, "metrics": summary}


# ============================================================
# AUTO PLAN — Generates focus blocks across the day
# ============================================================
@api.post("/ai/auto-plan")
async def ai_auto_plan(current=Depends(get_current_user)):
    today = now_utc().date().isoformat()
    tasks = await db.tasks.find({
        "user_id": current["user_id"],
        "completed": False,
        "$or": [{"scheduled_for": today}, {"due_date": today}],
    }, {"_id": 0}).sort("priority", 1).to_list(50)
    if not tasks:
        return {"created": 0, "message": "Nothing to plan. Capture one intention first."}

    chrono = current.get("chronotype", "balanced")
    start_hour = 9 if chrono == "morning" else 10 if chrono == "balanced" else 14
    if chrono == "night":
        start_hour = 18
    capacity_min = (current.get("daily_capacity", 4) or 4) * 60

    # Sort: urgent>high>medium>low; then larger estimates first within group for batching
    pr_rank = {"urgent": 0, "high": 1, "medium": 2, "low": 3}
    tasks.sort(key=lambda t: (pr_rank.get(t.get("priority", "medium"), 2), -int(t.get("estimated_minutes") or 30)))

    # Clear previously auto-generated focus blocks for today
    await db.events.delete_many({
        "user_id": current["user_id"],
        "kind": "focus",
        "auto_generated": True,
        "start": {"$gte": today + "T00:00:00", "$lt": today + "T23:59:59"},
    })

    now = now_utc()
    base = now.replace(hour=start_hour, minute=0, second=0, microsecond=0)
    if base < now:
        # Round up to next 15 minutes from now
        minute = (now.minute // 15 + 1) * 15
        base = now.replace(second=0, microsecond=0) + timedelta(minutes=(minute - now.minute))

    cursor = base
    end_of_day_cap = now.replace(hour=20, minute=0, second=0, microsecond=0)
    total = 0
    created = 0
    for t in tasks:
        if total >= capacity_min:
            break
        dur = max(15, min(int(t.get("estimated_minutes") or 30), 120))
        if cursor + timedelta(minutes=dur) > end_of_day_cap:
            break
        ev_start = cursor
        ev_end = cursor + timedelta(minutes=dur)
        await db.events.insert_one({
            "event_id": new_id("ev"),
            "user_id": current["user_id"],
            "title": t["title"],
            "start": ev_start.isoformat(),
            "end": ev_end.isoformat(),
            "kind": "focus",
            "task_id": t.get("task_id"),
            "auto_generated": True,
            "notes": "",
            "created_at": now_utc().isoformat(),
        })
        created += 1
        total += dur
        # Add 15-min break between blocks
        cursor = ev_end + timedelta(minutes=15)

    return {
        "created": created,
        "scheduled_minutes": total,
        "starts_at": base.isoformat(),
        "message": (
            f"{created} block{'s' if created != 1 else ''} arranged across your day."
            if created
            else "It's late — nothing fits before 8pm today. Try planning for tomorrow morning."
        ),
    }


# ============================================================
# OVERLOAD CHECK
# ============================================================
@api.get("/ai/overload-check")
async def ai_overload_check(current=Depends(get_current_user)):
    today = now_utc().date().isoformat()
    tasks = await db.tasks.find({
        "user_id": current["user_id"],
        "completed": False,
        "$or": [{"scheduled_for": today}, {"due_date": today}],
    }, {"_id": 0}).to_list(100)
    estimated = sum(int(t.get("estimated_minutes") or 30) for t in tasks)
    capacity_min = (current.get("daily_capacity", 4) or 4) * 60
    ratio = (estimated / capacity_min) if capacity_min else 0
    overloaded = ratio > 1.1
    return {
        "overloaded": overloaded,
        "ratio": round(ratio, 2),
        "estimated_minutes": estimated,
        "capacity_minutes": capacity_min,
        "task_count": len(tasks),
        "suggestion": "Move one task to tomorrow." if overloaded else "Realistic. You can do this.",
    }


# ============================================================
# STREAK & MOMENTUM
# ============================================================
@api.get("/streak")
async def get_streak(current=Depends(get_current_user)):
    """A non-toxic streak: counts consecutive days with at least 1 task done OR 1 focus session OR 1 habit check."""
    user_id = current["user_id"]
    streak = 0
    d = now_utc().date()
    # Look back up to 365 days
    for _ in range(365):
        ds = d.isoformat()
        next_ds = (d + timedelta(days=1)).isoformat()
        had_task = await db.tasks.find_one({
            "user_id": user_id, "completed": True,
            "completed_at": {"$gte": ds, "$lt": next_ds + "T00:00:00"},
        })
        had_focus = await db.focus_sessions.find_one({
            "user_id": user_id, "completed_minutes": {"$gt": 0},
            "started_at": {"$gte": ds, "$lt": next_ds},
        })
        had_habit = await db.habit_checks.find_one({"user_id": user_id, "date": ds})
        if had_task or had_focus or had_habit:
            streak += 1
            d = d - timedelta(days=1)
        else:
            # Allow today to be 0 yet — only break the streak if a past day was empty
            if d == now_utc().date():
                d = d - timedelta(days=1)
                continue
            break
    longest = current.get("longest_streak", 0) or 0
    if streak > longest:
        await db.users.update_one({"user_id": user_id}, {"$set": {"longest_streak": streak}})
        longest = streak
    return {"current": streak, "longest": longest}


@api.get("/momentum")
async def get_momentum(current=Depends(get_current_user)):
    """A 0-100 momentum score blending today's progress, focus, habits, and streak."""
    user_id = current["user_id"]
    today = now_utc().date().isoformat()
    tomorrow = (now_utc().date() + timedelta(days=1)).isoformat()
    total = await db.tasks.count_documents({
        "user_id": user_id,
        "$or": [{"scheduled_for": today}, {"due_date": today}],
    })
    done = await db.tasks.count_documents({
        "user_id": user_id, "completed": True,
        "$or": [{"scheduled_for": today}, {"due_date": today}],
    })
    focus = await db.focus_sessions.find({
        "user_id": user_id, "started_at": {"$gte": today, "$lt": tomorrow},
    }, {"_id": 0}).to_list(50)
    focus_min = sum(int(s.get("completed_minutes") or 0) for s in focus)
    habits_today = await db.habit_checks.count_documents({"user_id": user_id, "date": today})
    capacity_min = (current.get("daily_capacity", 4) or 4) * 60

    task_score = (done / total * 100) if total else 0
    focus_score = min(100, (focus_min / capacity_min * 100) if capacity_min else 0)
    habit_score = min(100, habits_today * 25)
    score = round(0.45 * task_score + 0.4 * focus_score + 0.15 * habit_score)
    if total == 0 and focus_min == 0 and habits_today == 0:
        score = 0
    label = "Quiet" if score < 25 else "Warming" if score < 55 else "In motion" if score < 85 else "Flow"
    return {
        "score": score,
        "label": label,
        "components": {
            "tasks": round(task_score),
            "focus": round(focus_score),
            "habits": round(habit_score),
        },
        "raw": {
            "tasks_done": done,
            "tasks_total": total,
            "focus_minutes": focus_min,
            "habits_checked": habits_today,
        },
    }


# ============================================================
# SHUTDOWN RITUAL
# ============================================================
@api.post("/rituals/shutdown")
async def save_shutdown(payload: ShutdownRitualIn, current=Depends(get_current_user)):
    doc = {
        "ritual_id": new_id("rit"),
        "user_id": current["user_id"],
        "kind": "shutdown",
        **payload.model_dump(),
        "created_at": now_utc().isoformat(),
    }
    await db.rituals.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/rituals/shutdown")
async def list_shutdown(current=Depends(get_current_user)):
    items = await db.rituals.find(
        {"user_id": current["user_id"], "kind": "shutdown"}, {"_id": 0}
    ).sort("created_at", -1).to_list(30)
    return items


# ============================================================
# INSIGHTS — Weekly comparison
# ============================================================
@api.get("/insights/weekly-compare")
async def insights_weekly_compare(current=Depends(get_current_user)):
    """Compare this week (last 7 days) vs previous week (8–14 days ago)."""
    user_id = current["user_id"]
    now = now_utc()
    this_start = (now - timedelta(days=7)).isoformat()
    prev_start = (now - timedelta(days=14)).isoformat()
    prev_end = this_start

    async def metrics(start, end=None):
        q_tasks = {"user_id": user_id, "completed": True, "completed_at": {"$gte": start}}
        if end:
            q_tasks["completed_at"]["$lt"] = end
        tasks_done = await db.tasks.count_documents(q_tasks)
        q_focus = {"user_id": user_id, "started_at": {"$gte": start}}
        if end:
            q_focus["started_at"]["$lt"] = end
        focus_sessions = await db.focus_sessions.find(q_focus, {"_id": 0}).to_list(500)
        focus_min = sum(int(s.get("completed_minutes") or 0) for s in focus_sessions)
        q_habits = {"user_id": user_id, "checked_at": {"$gte": start}}
        if end:
            q_habits["checked_at"]["$lt"] = end
        habits = await db.habit_checks.count_documents(q_habits)
        return {"tasks_done": tasks_done, "focus_minutes": focus_min, "focus_sessions": len(focus_sessions), "habits": habits}

    this_week = await metrics(this_start)
    prev_week = await metrics(prev_start, prev_end)

    def delta(a, b):
        if b == 0:
            return None if a == 0 else 100
        return round(((a - b) / b) * 100)

    deltas = {
        k: delta(this_week[k], prev_week[k]) for k in this_week
    }

    # Best day of this week (most tasks completed)
    pipeline = [
        {"$match": {"user_id": user_id, "completed": True, "completed_at": {"$gte": this_start}}},
        {"$project": {"day": {"$substr": ["$completed_at", 0, 10]}}},
        {"$group": {"_id": "$day", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 1},
    ]
    best = await db.tasks.aggregate(pipeline).to_list(1)
    best_day = best[0] if best else None

    # Distraction pattern: rate of interrupted focus sessions this week
    sessions_q = await db.focus_sessions.find(
        {"user_id": user_id, "started_at": {"$gte": this_start}}, {"_id": 0}
    ).to_list(500)
    interrupted = sum(1 for s in sessions_q if s.get("interrupted"))
    distraction_rate = round((interrupted / len(sessions_q)) * 100) if sessions_q else 0

    return {
        "this_week": this_week,
        "previous_week": prev_week,
        "deltas_pct": deltas,
        "best_day": best_day,
        "distraction_rate_pct": distraction_rate,
        "sessions_count": len(sessions_q),
    }


# ============================================================
# BILLING — DEV mode override + mock checkout
# ============================================================
# DEV ONLY: When dev_mode=true, instantly grants the requested plan.
# DO NOT ship this as production monetization. Replace with verified Stripe webhook.
@api.post("/billing/upgrade")
async def billing_upgrade(payload: BillingUpgradeIn, current=Depends(get_current_user)):
    if payload.dev_mode:
        # DEV ONLY: gate behind env so production deploys can't self-grant.
        if os.environ.get("ENABLE_DEV_BILLING", "false").lower() != "true":
            raise HTTPException(status_code=403, detail="Dev billing disabled. Use Stripe checkout.")
        await db.users.update_one(
            {"user_id": current["user_id"]},
            {"$set": {
                "plan": payload.plan,
                "plan_source": "dev_override",
                "plan_updated_at": now_utc().isoformat(),
            }},
        )
        user = await db.users.find_one({"user_id": current["user_id"]}, {"_id": 0, "password_hash": 0})
        return {"ok": True, "dev_override": True, "user": user}
    # Production placeholder: would create a Stripe Checkout Session here.
    raise HTTPException(status_code=501, detail="Live billing not enabled yet. Use dev_mode=true.")


@api.post("/billing/create-checkout")
async def billing_create_checkout(payload: BillingUpgradeIn, current=Depends(get_current_user)):
    """Mock Stripe checkout session — returns a fake URL the UI can simulate."""
    return {
        "checkout_url": None,  # in production this would be the Stripe Checkout URL
        "mock": True,
        "plan": payload.plan,
        "user_id": current["user_id"],
        "note": "Stripe not wired yet. Toggle dev_mode in /billing/upgrade to grant access.",
    }


@api.get("/billing/plan")
async def billing_plan(current=Depends(get_current_user)):
    return {
        "plan": current.get("plan", "free"),
        "plan_source": current.get("plan_source", "default"),
        "plan_updated_at": current.get("plan_updated_at"),
    }


# ============================================================
# GOALS — Top-level life directions
# ============================================================
@api.get("/goals")
async def list_goals(current=Depends(get_current_user)):
    goals = await db.goals.find(
        {"user_id": current["user_id"], "archived": {"$ne": True}}, {"_id": 0}
    ).sort("weight", -1).to_list(50)
    # Attach progress: % of tasks completed in last 14 days that are tagged to each goal
    cutoff = (now_utc() - timedelta(days=14)).isoformat()
    for g in goals:
        total = await db.tasks.count_documents({
            "user_id": current["user_id"],
            "goal_id": g["goal_id"],
            "created_at": {"$gte": cutoff},
        })
        done = await db.tasks.count_documents({
            "user_id": current["user_id"],
            "goal_id": g["goal_id"],
            "completed": True,
            "created_at": {"$gte": cutoff},
        })
        g["tasks_total_14d"] = total
        g["tasks_done_14d"] = done
        g["progress_pct"] = min(100, round((done / total) * 100)) if total else 0
    return goals


@api.post("/goals")
async def create_goal(payload: GoalIn, current=Depends(get_current_user)):
    goal = {
        "goal_id": new_id("goal"),
        "user_id": current["user_id"],
        **payload.model_dump(),
        "archived": False,
        "created_at": now_utc().isoformat(),
    }
    await db.goals.insert_one(goal)
    goal.pop("_id", None)
    return goal


@api.patch("/goals/{goal_id}")
async def update_goal(goal_id: str, payload: GoalUpdate, current=Depends(get_current_user)):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    res = await db.goals.update_one(
        {"goal_id": goal_id, "user_id": current["user_id"]}, {"$set": update}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Goal not found")
    return await db.goals.find_one({"goal_id": goal_id}, {"_id": 0})


@api.delete("/goals/{goal_id}")
async def delete_goal(goal_id: str, current=Depends(get_current_user)):
    await db.goals.delete_one({"goal_id": goal_id, "user_id": current["user_id"]})
    # Untag tasks
    await db.tasks.update_many(
        {"user_id": current["user_id"], "goal_id": goal_id},
        {"$unset": {"goal_id": ""}},
    )
    return {"ok": True}


# ============================================================
# MOOD / EMOTIONAL CHECK-IN
# ============================================================
@api.post("/checkin")
async def save_checkin(payload: CheckinIn, current=Depends(get_current_user)):
    today = now_utc().date().isoformat()
    doc = {
        "checkin_id": new_id("chk"),
        "user_id": current["user_id"],
        "date": today,
        **payload.model_dump(),
        "created_at": now_utc().isoformat(),
    }
    # Upsert today's
    await db.checkins.update_one(
        {"user_id": current["user_id"], "date": today},
        {"$set": doc},
        upsert=True,
    )
    return doc


@api.get("/checkin/today")
async def get_today_checkin(current=Depends(get_current_user)):
    today = now_utc().date().isoformat()
    doc = await db.checkins.find_one({"user_id": current["user_id"], "date": today}, {"_id": 0})
    return doc or {"present": False}


@api.get("/checkin/history")
async def checkin_history(current=Depends(get_current_user)):
    items = await db.checkins.find(
        {"user_id": current["user_id"]}, {"_id": 0}
    ).sort("date", -1).limit(30).to_list(30)
    return items


# ============================================================
# JOURNAL — Frictionless capture
# ============================================================
@api.post("/journal")
async def create_journal(payload: JournalIn, current=Depends(get_current_user)):
    extracted_task_ids: List[str] = []
    if payload.extract_tasks and payload.text.strip():
        try:
            chat = LlmChat(
                api_key=os.environ["EMERGENT_LLM_KEY"],
                session_id=new_id("journal"),
                system_message=(
                    "Extract concrete actionable tasks from a journal entry. "
                    "Return JSON only: {tasks: [{title, priority(low|medium|high|urgent), "
                    "estimated_minutes(int), energy(low|medium|high)}]} — max 5 tasks. "
                    "If no tasks, return {tasks: []}. No prose."
                ),
            ).with_model("anthropic", "claude-sonnet-4-5-20250929")
            reply = await chat.send_message(UserMessage(text=payload.text))
            import json
            import re
            m = re.search(r"\{.*\}", reply, re.S)
            if m:
                data = json.loads(m.group(0))
                for t in (data.get("tasks") or [])[:5]:
                    task = {
                        "task_id": new_id("task"),
                        "user_id": current["user_id"],
                        "title": (t.get("title") or "").strip()[:200],
                        "priority": t.get("priority", "medium"),
                        "estimated_minutes": int(t.get("estimated_minutes") or 30),
                        "energy": t.get("energy", "medium"),
                        "completed": False,
                        "source": "journal",
                        "scheduled_for": now_utc().date().isoformat(),
                        "created_at": now_utc().isoformat(),
                        "completed_at": None,
                    }
                    if task["title"]:
                        await db.tasks.insert_one(task)
                        extracted_task_ids.append(task["task_id"])
        except Exception as e:
            log.warning(f"journal extract failed: {e}")

    entry = {
        "entry_id": new_id("j"),
        "user_id": current["user_id"],
        "text": payload.text,
        "mood": payload.mood,
        "extracted_task_ids": extracted_task_ids,
        "created_at": now_utc().isoformat(),
    }
    await db.journal.insert_one(entry)
    entry.pop("_id", None)
    return entry


@api.get("/journal")
async def list_journal(current=Depends(get_current_user)):
    return await db.journal.find(
        {"user_id": current["user_id"]}, {"_id": 0}
    ).sort("created_at", -1).limit(60).to_list(60)


@api.delete("/journal/{entry_id}")
async def delete_journal(entry_id: str, current=Depends(get_current_user)):
    await db.journal.delete_one({"entry_id": entry_id, "user_id": current["user_id"]})
    return {"ok": True}


# ============================================================
# AI — "What now?"
# ============================================================
@api.post("/ai/now")
async def ai_now(payload: NowRequest, current=Depends(get_current_user)):
    """Single-best-action prompt — the magical 'what should I do right now?'"""
    today = now_utc().date().isoformat()
    open_tasks = await db.tasks.find({
        "user_id": current["user_id"],
        "completed": False,
        "$or": [{"scheduled_for": today}, {"due_date": today}],
    }, {"_id": 0}).to_list(50)
    checkin = await db.checkins.find_one(
        {"user_id": current["user_id"], "date": today}, {"_id": 0}
    ) or {}
    free_min = payload.free_minutes or 30

    if not open_tasks:
        return {
            "action": "Capture one intention.",
            "task_id": None,
            "rationale": "Nothing scheduled. Decide one thing that matters.",
            "minutes": min(5, free_min),
        }

    summary = "\n".join([
        f"- {t['task_id']}: {t['title']} (priority={t.get('priority','medium')}, "
        f"est={t.get('estimated_minutes',30)}m, energy={t.get('energy','medium')})"
        for t in open_tasks
    ])
    hr = now_utc().hour
    mood_line = f"mood {checkin.get('mood','?')}, energy {checkin.get('energy','?')}" if checkin else "no check-in"
    prompt = (
        f"Current hour: {hr}. Free time: {free_min}m. User: {mood_line}. "
        f"Chronotype: {current.get('chronotype','balanced')}.\n"
        f"Open tasks:\n{summary}\n\n"
        "Pick the SINGLE best next task that fits the free time and energy. "
        "Reply with JSON only: {task_id, action: '<= 7 word imperative', "
        "rationale: '<= 14 words', minutes: int}."
    )
    try:
        chat = _llm()
        reply = await chat.send_message(UserMessage(text=prompt))
        import json
        import re
        m = re.search(r"\{.*\}", reply, re.S)
        if m:
            data = json.loads(m.group(0))
            return {
                "task_id": data.get("task_id"),
                "action": (data.get("action") or open_tasks[0]["title"])[:80],
                "rationale": (data.get("rationale") or "")[:160],
                "minutes": int(data.get("minutes") or min(free_min, open_tasks[0].get("estimated_minutes") or 30)),
            }
    except Exception as e:
        log.warning(f"/ai/now fallback: {e}")
    # Fallback: highest priority task
    pr = {"urgent": 0, "high": 1, "medium": 2, "low": 3}
    open_tasks.sort(key=lambda t: pr.get(t.get("priority", "medium"), 2))
    t = open_tasks[0]
    return {
        "task_id": t["task_id"],
        "action": t["title"][:80],
        "rationale": "Highest priority for this hour.",
        "minutes": min(free_min, int(t.get("estimated_minutes") or 30)),
    }


# ============================================================
# AI — Decompose a task into substeps
# ============================================================
@api.post("/ai/decompose")
async def ai_decompose(payload: DecomposeIn, current=Depends(get_current_user)):
    parent = await db.tasks.find_one(
        {"task_id": payload.task_id, "user_id": current["user_id"]}, {"_id": 0}
    )
    if not parent:
        raise HTTPException(status_code=404, detail="Task not found")

    prompt = (
        f"Task: {parent['title']}. "
        f"Notes: {parent.get('notes','') or '(none)'}. "
        f"Estimate: {parent.get('estimated_minutes', 30)}m.\n"
        "Decompose into 3–5 concrete sub-steps. JSON only: "
        "{steps: [{title (<= 7 words), estimated_minutes (int)}]}. "
        "Total minutes should roughly equal the parent estimate."
    )
    created = []
    try:
        chat = _llm()
        reply = await chat.send_message(UserMessage(text=prompt))
        import json
        import re
        m = re.search(r"\{.*\}", reply, re.S)
        data = json.loads(m.group(0)) if m else {"steps": []}
        for s in (data.get("steps") or [])[:5]:
            sub = {
                "task_id": new_id("task"),
                "user_id": current["user_id"],
                "title": (s.get("title") or "").strip()[:160],
                "estimated_minutes": int(s.get("estimated_minutes") or 15),
                "priority": parent.get("priority", "medium"),
                "energy": parent.get("energy", "medium"),
                "parent_task_id": parent["task_id"],
                "goal_id": parent.get("goal_id"),
                "scheduled_for": parent.get("scheduled_for") or now_utc().date().isoformat(),
                "completed": False,
                "source": "decompose",
                "created_at": now_utc().isoformat(),
                "completed_at": None,
            }
            if sub["title"]:
                await db.tasks.insert_one(sub)
                created.append({k: v for k, v in sub.items() if k != "_id"})
    except Exception as e:
        log.error(f"decompose error: {e}")
        raise HTTPException(status_code=500, detail="Could not decompose right now.")
    return {"subtasks": created, "count": len(created)}


# ============================================================
# INSIGHTS — Patterns, Burnout, Personality, Goal Alignment
# ============================================================
@api.get("/insights/patterns")
async def insights_patterns(current=Depends(get_current_user)):
    user_id = current["user_id"]
    cutoff = (now_utc() - timedelta(days=30)).isoformat()

    completed = await db.tasks.find(
        {"user_id": user_id, "completed": True, "completed_at": {"$gte": cutoff}},
        {"_id": 0, "completed_at": 1, "priority": 1},
    ).to_list(2000)

    # Best day-of-week
    dow_counts = [0] * 7  # Mon-Sun
    for t in completed:
        try:
            d = datetime.fromisoformat(t["completed_at"])
            dow_counts[d.weekday()] += 1
        except Exception:
            pass
    best_dow_idx = max(range(7), key=lambda i: dow_counts[i]) if any(dow_counts) else None
    DOW = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    best_dow = DOW[best_dow_idx] if best_dow_idx is not None else None

    # Best hour band (focus minutes)
    sessions = await db.focus_sessions.find(
        {"user_id": user_id, "started_at": {"$gte": cutoff}},
        {"_id": 0, "started_at": 1, "completed_minutes": 1, "interrupted": 1},
    ).to_list(2000)
    hour_min = [0] * 24
    interrupted_count = 0
    total_session_min = 0
    for s in sessions:
        try:
            h = datetime.fromisoformat(s["started_at"]).hour
            cm = int(s.get("completed_minutes") or 0)
            hour_min[h] += cm
            total_session_min += cm
            if s.get("interrupted"):
                interrupted_count += 1
        except Exception:
            pass
    best_hour = max(range(24), key=lambda i: hour_min[i]) if any(hour_min) else None
    best_hour_band = f"{best_hour:02d}:00–{(best_hour+1) % 24:02d}:00" if best_hour is not None else None

    avg_session_min = round(total_session_min / len(sessions)) if sessions else 0
    interrupt_rate = round((interrupted_count / len(sessions)) * 100) if sessions else 0

    # Completion rate by priority (last 30d)
    by_priority = {}
    for p in ["urgent", "high", "medium", "low"]:
        total_p = await db.tasks.count_documents({
            "user_id": user_id, "priority": p, "created_at": {"$gte": cutoff},
        })
        done_p = await db.tasks.count_documents({
            "user_id": user_id, "priority": p, "completed": True,
            "completed_at": {"$gte": cutoff},
        })
        by_priority[p] = {"total": total_p, "done": done_p, "rate_pct": round((done_p / total_p) * 100) if total_p else 0}

    # Avg tasks completed per active day (last 14d)
    active_days = sorted(set(t["completed_at"][:10] for t in completed if "completed_at" in t and len(t["completed_at"]) >= 10))[-14:]
    avg_per_active_day = round(len(completed) / len(active_days), 1) if active_days else 0

    # Habit consistency
    habits_total = await db.habits.count_documents({"user_id": user_id})
    habit_checks_30d = await db.habit_checks.count_documents({
        "user_id": user_id, "checked_at": {"$gte": cutoff},
    })
    consistency = round((habit_checks_30d / (habits_total * 30)) * 100) if habits_total else 0

    return {
        "best_day_of_week": best_dow,
        "best_hour_band": best_hour_band,
        "average_focus_session_minutes": avg_session_min,
        "interrupt_rate_pct": interrupt_rate,
        "average_tasks_per_active_day": avg_per_active_day,
        "completion_by_priority": by_priority,
        "habit_consistency_pct": consistency,
        "habits_total": habits_total,
        "sample_size_days": 30,
        "completed_30d": len(completed),
        "focus_sessions_30d": len(sessions),
    }


@api.get("/insights/burnout")
async def insights_burnout(current=Depends(get_current_user)):
    user_id = current["user_id"]
    now = now_utc()
    cutoff_7 = (now - timedelta(days=7)).isoformat()
    cutoff_14 = (now - timedelta(days=14)).isoformat()

    # Overload ratio last 7 days (sum estimates of tasks scheduled / capacity)
    capacity_min_per_day = (current.get("daily_capacity", 4) or 4) * 60
    last7_tasks = await db.tasks.find({
        "user_id": user_id,
        "created_at": {"$gte": cutoff_7},
    }, {"_id": 0, "estimated_minutes": 1}).to_list(500)
    overload_score = min(60, max(0, round(
        (sum(int(t.get("estimated_minutes") or 30) for t in last7_tasks) - capacity_min_per_day * 7)
        / max(1, capacity_min_per_day) * 6
    )))

    # Interrupted sessions
    sessions_7 = await db.focus_sessions.find({
        "user_id": user_id, "started_at": {"$gte": cutoff_7},
    }, {"_id": 0, "interrupted": 1, "started_at": 1}).to_list(500)
    interrupt_pct = (sum(1 for s in sessions_7 if s.get("interrupted")) / len(sessions_7) * 100) if sessions_7 else 0
    interrupt_score = round(min(25, interrupt_pct * 0.4))

    # Completion-rate drop vs prior week
    done_7 = await db.tasks.count_documents({"user_id": user_id, "completed": True, "completed_at": {"$gte": cutoff_7}})
    done_prev = await db.tasks.count_documents({
        "user_id": user_id, "completed": True,
        "completed_at": {"$gte": cutoff_14, "$lt": cutoff_7},
    })
    drop_score = 0
    if done_prev > 0:
        delta = (done_prev - done_7) / done_prev
        if delta > 0:
            drop_score = round(min(15, delta * 30))

    # Late-night activity (>= 23:00 local approx via UTC)
    late_night = 0
    for s in sessions_7:
        try:
            h = datetime.fromisoformat(s["started_at"]).hour
            if h >= 23 or h <= 4:
                late_night += 1
        except Exception:
            pass
    late_score = min(10, late_night * 2)

    total = min(100, overload_score + interrupt_score + drop_score + late_score)
    if total < 30:
        level = "calm"
        message = "Healthy rhythm. Keep going."
    elif total < 60:
        level = "stretched"
        message = "You're carrying a lot. Schedule one slow morning."
    else:
        level = "overheating"
        message = "Pull back. Cut three tasks. Take one whole evening off."

    return {
        "score": total,
        "level": level,
        "message": message,
        "components": {
            "overload": overload_score,
            "interruptions": interrupt_score,
            "completion_drop": drop_score,
            "late_night": late_score,
        },
        "data": {
            "tasks_planned_7d": len(last7_tasks),
            "tasks_done_7d": done_7,
            "tasks_done_prev7d": done_prev,
            "interrupt_pct": round(interrupt_pct),
            "late_night_sessions": late_night,
        },
    }


@api.get("/insights/personality")
async def insights_personality(current=Depends(get_current_user)):
    user_id = current["user_id"]
    cutoff = (now_utc() - timedelta(days=30)).isoformat()

    sessions = await db.focus_sessions.find(
        {"user_id": user_id, "started_at": {"$gte": cutoff}},
        {"_id": 0, "completed_minutes": 1, "duration_minutes": 1},
    ).to_list(2000)
    total_focus = sum(int(s.get("completed_minutes") or 0) for s in sessions)
    avg_session = (total_focus / len(sessions)) if sessions else 0
    long_sessions = sum(1 for s in sessions if int(s.get("completed_minutes") or 0) >= 50)

    completed_tasks = await db.tasks.count_documents({
        "user_id": user_id, "completed": True, "completed_at": {"$gte": cutoff}
    })
    captured = await db.tasks.count_documents({
        "user_id": user_id, "source": {"$in": ["journal", "decompose"]},
        "created_at": {"$gte": cutoff},
    })
    journal_count = await db.journal.count_documents({
        "user_id": user_id, "created_at": {"$gte": cutoff},
    })
    goals_count = await db.goals.count_documents({"user_id": user_id, "archived": {"$ne": True}})
    reviews_count = await db.reviews.count_documents({"user_id": user_id, "created_at": {"$gte": cutoff}})

    # Heuristic classification
    archetype = "Architect"
    headline = "Planner & builder. You think before you move."
    if avg_session >= 45 and long_sessions >= 3:
        archetype = "Marathoner"
        headline = "Long undisturbed dives. You like to disappear into a problem."
    elif len(sessions) >= 12 and avg_session < 35:
        archetype = "Sprinter"
        headline = "Short bursts. You stack many small finishes per day."
    elif captured >= 6 or journal_count >= 4:
        archetype = "Improviser"
        headline = "Energy first. You capture wildly and refine later."
    elif goals_count >= 3 and reviews_count >= 1:
        archetype = "Architect"
        headline = "Planner & builder. You design weeks more than days."

    if completed_tasks < 5 and len(sessions) < 3:
        archetype = "Calibrating"
        headline = "Velari is still learning your rhythm. Keep using it."

    return {
        "archetype": archetype,
        "headline": headline,
        "signals": {
            "average_session_min": round(avg_session),
            "long_sessions_30d": long_sessions,
            "completed_tasks_30d": completed_tasks,
            "ai_captured_or_decomposed_30d": captured,
            "journal_entries_30d": journal_count,
            "active_goals": goals_count,
            "reviews_30d": reviews_count,
        },
    }


@api.get("/insights/goal-alignment")
async def insights_goal_alignment(current=Depends(get_current_user)):
    user_id = current["user_id"]
    cutoff = (now_utc() - timedelta(days=14)).isoformat()

    goals = await db.goals.find(
        {"user_id": user_id, "archived": {"$ne": True}}, {"_id": 0}
    ).to_list(50)
    if not goals:
        return {"goals": [], "drift": []}

    total_intended_weight = sum(g.get("weight", 5) for g in goals)
    # Actual minutes spent: sum estimated_minutes of completed tasks per goal
    minutes_by_goal = {g["goal_id"]: 0 for g in goals}
    unaligned_min = 0
    completed = await db.tasks.find(
        {"user_id": user_id, "completed": True, "completed_at": {"$gte": cutoff}},
        {"_id": 0, "estimated_minutes": 1, "goal_id": 1, "actual_minutes": 1},
    ).to_list(2000)
    for t in completed:
        mins = int(t.get("actual_minutes") or t.get("estimated_minutes") or 0)
        gid = t.get("goal_id")
        if gid and gid in minutes_by_goal:
            minutes_by_goal[gid] += mins
        else:
            unaligned_min += mins

    total_min = sum(minutes_by_goal.values()) + unaligned_min
    result_goals = []
    drift = []
    for g in goals:
        intended_pct = round((g.get("weight", 5) / total_intended_weight) * 100) if total_intended_weight else 0
        actual_pct = round((minutes_by_goal[g["goal_id"]] / total_min) * 100) if total_min else 0
        d = actual_pct - intended_pct
        result_goals.append({
            "goal_id": g["goal_id"],
            "title": g["title"],
            "color": g.get("color"),
            "icon": g.get("icon"),
            "weight": g.get("weight", 5),
            "minutes": minutes_by_goal[g["goal_id"]],
            "intended_pct": intended_pct,
            "actual_pct": actual_pct,
            "delta": d,
        })
        if d < -10:
            drift.append({"goal_id": g["goal_id"], "title": g["title"], "delta": d,
                          "note": f"Under-served by {abs(d)}%. Add one task tied to this goal."})

    return {
        "goals": result_goals,
        "drift": drift,
        "unaligned_minutes": unaligned_min,
        "total_tracked_minutes": total_min,
    }


# ============================================================
# NUDGES — Contextual smart suggestions
# ============================================================
@api.get("/nudges")
async def get_nudges(current=Depends(get_current_user)):
    user_id = current["user_id"]
    today = now_utc().date().isoformat()
    hr = now_utc().hour
    nudges = []

    # 1. No check-in yet → suggest it
    checkin = await db.checkins.find_one({"user_id": user_id, "date": today})
    if not checkin and hr < 14:
        nudges.append({
            "id": "checkin",
            "kind": "checkin",
            "text": "Two-tap mood check-in. Velari will adapt your day.",
            "action": "Check in",
        })

    # 2. Today has no tasks → encourage capture
    open_today = await db.tasks.count_documents({
        "user_id": user_id, "completed": False,
        "$or": [{"scheduled_for": today}, {"due_date": today}],
    })
    if open_today == 0 and hr < 18:
        nudges.append({
            "id": "capture",
            "kind": "capture",
            "text": "Today is open. Capture one intention.",
            "action": "Quick capture",
        })

    # 3. End-of-day shutdown ritual
    if hr >= 18:
        rit = await db.rituals.find_one({"user_id": user_id, "kind": "shutdown", "date": today})
        if not rit:
            nudges.append({
                "id": "shutdown",
                "kind": "shutdown",
                "text": "Close today gently. Three breaths, three wins.",
                "action": "Shutdown ritual",
            })

    # 4. Streak protection — if streak >= 2 and nothing done yet
    today_done = await db.tasks.count_documents({
        "user_id": user_id, "completed": True,
        "completed_at": {"$gte": today},
    })
    streak_data = current.get("longest_streak", 0) or 0
    if today_done == 0 and hr >= 18 and streak_data >= 2:
        nudges.append({
            "id": "streak",
            "kind": "streak",
            "text": "Protect your streak. One small thing counts.",
            "action": "Capture small task",
        })

    # 5. Goal drift hint
    goals = await db.goals.count_documents({"user_id": user_id, "archived": {"$ne": True}})
    if goals == 0:
        nudges.append({
            "id": "goal",
            "kind": "goal",
            "text": "Name your top 3 goals. Velari will guard your time.",
            "action": "Set goals",
        })

    return nudges[:3]


# ============================================================
# SEARCH — Universal smart search
# ============================================================
@api.get("/search")
async def universal_search(q: str = "", current=Depends(get_current_user)):
    """Search across tasks, goals, journal entries, and calendar events."""
    needle = q.strip()
    if not needle or len(needle) < 2:
        return {"tasks": [], "goals": [], "journal": [], "events": [], "query": needle}
    user_id = current["user_id"]
    import re as _re
    safe = _re.escape(needle)
    pat = {"$regex": safe, "$options": "i"}

    tasks = await db.tasks.find(
        {"user_id": user_id, "$or": [{"title": pat}, {"notes": pat}]},
        {"_id": 0, "task_id": 1, "title": 1, "notes": 1, "completed": 1, "priority": 1, "scheduled_for": 1},
    ).sort("created_at", -1).limit(8).to_list(8)

    goals = await db.goals.find(
        {"user_id": user_id, "archived": {"$ne": True}, "$or": [{"title": pat}, {"why": pat}]},
        {"_id": 0, "goal_id": 1, "title": 1, "why": 1, "color": 1},
    ).limit(6).to_list(6)

    journal = await db.journal.find(
        {"user_id": user_id, "text": pat},
        {"_id": 0, "entry_id": 1, "text": 1, "created_at": 1},
    ).sort("created_at", -1).limit(5).to_list(5)
    # Truncate long bodies
    for j in journal:
        if j.get("text") and len(j["text"]) > 140:
            j["text"] = j["text"][:140] + "…"

    events = await db.events.find(
        {"user_id": user_id, "title": pat},
        {"_id": 0, "event_id": 1, "title": 1, "start": 1, "kind": 1},
    ).sort("start", -1).limit(5).to_list(5)

    return {"tasks": tasks, "goals": goals, "journal": journal, "events": events, "query": needle}


# ============================================================
# HEALTH
# ============================================================
@api.get("/")
async def root():
    return {"app": "Velari", "version": "1.0.0", "status": "ok"}


# ============================================================
# Wire up
# ============================================================
app.include_router(api)

cors_origins_env = os.environ.get("CORS_ORIGINS", "*")
if cors_origins_env.strip() == "*":
    cors_origins = ["*"]
    cors_allow_credentials = False  # browsers reject "*" + credentials
else:
    cors_origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()]
    cors_allow_credentials = True

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=cors_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.tasks.create_index([("user_id", 1), ("scheduled_for", 1)])
    await db.tasks.create_index("task_id", unique=True)
    await db.habits.create_index("habit_id", unique=True)
    await db.habit_checks.create_index([("habit_id", 1), ("date", 1)])
    await db.events.create_index("event_id", unique=True)
    await db.focus_sessions.create_index("focus_id", unique=True)
    await db.sessions.create_index("session_token", unique=True)
    await db.goals.create_index("goal_id", unique=True)
    await db.checkins.create_index([("user_id", 1), ("date", 1)], unique=True)
    await db.journal.create_index("entry_id", unique=True)

    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL")
    admin_password = os.environ.get("ADMIN_PASSWORD")
    if admin_email and admin_password:
        existing = await db.users.find_one({"email": admin_email})
        if not existing:
            await db.users.insert_one({
                "user_id": new_id("user"),
                "email": admin_email,
                "name": "Velari Founder",
                "password_hash": hash_password(admin_password),
                "plan": "elite",
                "onboarded": True,
                "provider": "email",
                "role": "admin",
                "primary_goal": "Build Velari into the calmest productivity OS in the world.",
                "work_style": "deep",
                "daily_capacity": 5,
                "chronotype": "morning",
                "intentions": ["clarity", "calm", "momentum"],
                "created_at": now_utc().isoformat(),
            })
            log.info(f"Seeded admin: {admin_email}")
        elif not verify_password(admin_password, existing.get("password_hash", "")):
            await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
            log.info(f"Updated admin password: {admin_email}")
    log.info("Velari API ready.")


@app.on_event("shutdown")
async def on_shutdown():
    client.close()
