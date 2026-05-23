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
    tags: List[str] = []
    energy: Literal["low", "medium", "high"] = "medium"
    scheduled_for: Optional[str] = None  # YYYY-MM-DD (which day on plan)

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    notes: Optional[str] = None
    priority: Optional[str] = None
    estimated_minutes: Optional[int] = None
    due_date: Optional[str] = None
    project_id: Optional[str] = None
    tags: Optional[List[str]] = None
    energy: Optional[str] = None
    scheduled_for: Optional[str] = None
    completed: Optional[bool] = None
    actual_minutes: Optional[int] = None

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
        events = [e for e in events if start <= e["start"] <= end or start <= e["end"] <= end]
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
            "You are Velari, a calm, premium daily operating system AI coach. "
            "You speak softly, with clarity and warmth. You help the user focus, plan, and reflect. "
            "Keep answers concise, elegant, and emotionally aware. Never use emoji. "
            "Format with short paragraphs and the occasional bullet list."
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
        f"User's chronotype: {current.get('chronotype','balanced')}. Daily capacity: {current.get('daily_capacity',4)}h.\n"
        f"Tasks for today:\n{summary}\n\n"
        "Return a JSON object with two keys: order (array of task_ids in the suggested order, most important first) "
        "and reasoning (one short paragraph explaining the order with warmth). Respond with JSON only."
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
        f"Design a calm daily plan for {payload.date}. Chronotype: {current.get('chronotype','balanced')}. "
        f"Capacity: {current.get('daily_capacity',4)} focus hours.\nTasks:\n{summary}\n\n"
        "Give 4–6 time blocks with realistic timings, a single deep work block, breaks, and a shutdown ritual. "
        "Format with bullet points, no headings, no JSON."
    )))
    return {"plan": reply}


@api.get("/ai/weekly-insight")
async def ai_weekly_insight(current=Depends(get_current_user)):
    summary = await review_summary(current)
    chat = _llm()
    reply = await chat.send_message(UserMessage(text=(
        f"Past 7 days metrics: {summary}. "
        "Write a 4-sentence reflective insight — warm, kind, with one concrete suggestion. No emoji."
    )))
    return {"insight": reply, "metrics": summary}


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

cors_origins = os.environ.get("CORS_ORIGINS", "*")
if cors_origins == "*":
    origin_list = ["*"]
    allow_credentials = False  # browsers reject * + credentials
else:
    origin_list = [o.strip() for o in cors_origins.split(",")]
    allow_credentials = True

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
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
