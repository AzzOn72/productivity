import { useEffect, useMemo, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Plus, ChevronLeft, ChevronRight, X, Target } from "lucide-react";

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7am - 8pm

function startOfWeek(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function fmtDay(d) {
  return d.toLocaleDateString(undefined, { weekday: "short" });
}
function fmtDate(d) {
  return d.getDate();
}
function iso(d) {
  return d.toISOString();
}

export default function CalendarPage() {
  const [anchor, setAnchor] = useState(() => startOfWeek(new Date()));
  const [events, setEvents] = useState([]);
  const [modal, setModal] = useState(null); // { date, hour }

  const week = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(anchor); d.setDate(anchor.getDate() + i); return d;
  }), [anchor]);

  const load = async () => {
    try {
      const { data } = await api.get("/events");
      setEvents(data);
    } catch (e) { toast.error(formatApiError(e)); }
  };
  useEffect(() => { load(); }, []);

  const move = (delta) => {
    const d = new Date(anchor);
    d.setDate(anchor.getDate() + delta * 7);
    setAnchor(d);
  };

  const goToday = () => setAnchor(startOfWeek(new Date()));

  const openCreate = (date, hour) => setModal({ date, hour });

  const saveEvent = async (payload) => {
    try {
      const { data } = await api.post("/events", payload);
      setEvents((arr) => [...arr, data]);
      setModal(null);
      toast.success("Held a piece of your day.");
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const deleteEvent = async (id) => {
    setEvents((arr) => arr.filter((e) => e.event_id !== id));
    try { await api.delete(`/events/${id}`); } catch (e) { load(); }
  };

  return (
    <div className="px-5 md:px-10 py-8 max-w-[1400px] mx-auto pb-28">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-7 fade-up">
        <div>
          <div className="text-[12px] uppercase tracking-[0.22em] text-velari-textSoft mb-2">Calendar</div>
          <h1 className="font-display text-4xl tracking-tight">
            {anchor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => move(-1)} data-testid="cal-prev" className="h-9 w-9 rounded-full border border-velari-border hover:bg-velari-surfaceAlt flex items-center justify-center"><ChevronLeft size={16} /></button>
          <button onClick={goToday} data-testid="cal-today" className="h-9 px-4 rounded-full border border-velari-border hover:bg-velari-surfaceAlt text-[13px]">Today</button>
          <button onClick={() => move(1)} data-testid="cal-next" className="h-9 w-9 rounded-full border border-velari-border hover:bg-velari-surfaceAlt flex items-center justify-center"><ChevronRight size={16} /></button>
        </div>
      </div>

      <div className="rounded-2xl border border-velari-border bg-velari-surface overflow-hidden" data-testid="calendar-grid">
        <div className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))] border-b border-velari-border">
          <div />
          {week.map((d) => {
            const isToday = new Date().toDateString() === d.toDateString();
            return (
              <div key={d.toISOString()} className={`py-3 text-center border-l border-velari-border ${isToday ? "bg-velari-surfaceAlt" : ""}`}>
                <div className="text-[11px] uppercase tracking-[0.18em] text-velari-textSoft">{fmtDay(d)}</div>
                <div className={`font-display text-2xl tracking-tight ${isToday ? "text-velari-brand" : ""}`}>{fmtDate(d)}</div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))] relative">
          <div>
            {HOURS.map((h) => (
              <div key={h} className="h-14 pr-2 text-right text-[10.5px] text-velari-textSoft border-t border-velari-border/60 pt-1 font-display">
                {h}:00
              </div>
            ))}
          </div>
          {week.map((d) => (
            <div key={d.toISOString()} className="border-l border-velari-border relative">
              {HOURS.map((h) => (
                <button
                  key={h}
                  onClick={() => openCreate(d, h)}
                  data-testid={`cal-slot-${d.toISOString().slice(0,10)}-${h}`}
                  className="h-14 w-full border-t border-velari-border/60 hover:bg-velari-brand/5 transition-colors"
                />
              ))}
              {events
                .filter((e) => new Date(e.start).toDateString() === d.toDateString())
                .map((e) => {
                  const start = new Date(e.start);
                  const end = new Date(e.end);
                  const startHr = start.getHours() + start.getMinutes() / 60;
                  const endHr = end.getHours() + end.getMinutes() / 60;
                  const top = (startHr - HOURS[0]) * 56;
                  const height = Math.max(20, (endHr - startHr) * 56);
                  if (startHr < HOURS[0] || startHr > HOURS[HOURS.length - 1] + 1) return null;
                  return (
                    <div
                      key={e.event_id}
                      className={`absolute left-1 right-1 rounded-lg px-2 py-1.5 text-[11.5px] border overflow-hidden group ${
                        e.kind === "focus"
                          ? "bg-velari-brand/15 border-velari-brand/40 text-velari-text"
                          : e.kind === "break"
                          ? "bg-velari-sage/15 border-velari-sage/40"
                          : "bg-velari-surfaceAlt border-velari-border"
                      }`}
                      style={{ top, height }}
                    >
                      <div className="flex items-center gap-1.5">
                        {e.kind === "focus" && <Target size={10} />}
                        <div className="font-medium truncate">{e.title}</div>
                      </div>
                      <div className="text-velari-textSoft text-[10.5px]">
                        {start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      </div>
                      <button
                        onClick={() => deleteEvent(e.event_id)}
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-velari-textSoft hover:text-red-600"
                        data-testid={`cal-del-${e.event_id}`}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      </div>

      {modal && <EventModal initial={modal} onSave={saveEvent} onClose={() => setModal(null)} />}
    </div>
  );
}

function EventModal({ initial, onSave, onClose }) {
  const start = new Date(initial.date);
  start.setHours(initial.hour, 0, 0, 0);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("event");
  const [minutes, setMinutes] = useState(60);

  const submit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    const s = new Date(start);
    const en = new Date(s.getTime() + minutes * 60 * 1000);
    onSave({ title, start: s.toISOString(), end: en.toISOString(), kind });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" data-testid="event-modal">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={submit} className="relative bg-velari-surface border border-velari-border rounded-2xl w-full max-w-md p-6 fade-up">
        <div className="text-[11px] uppercase tracking-[0.2em] text-velari-textSoft mb-2">
          {start.toLocaleString(undefined, { weekday: "long", month: "short", day: "numeric", hour: "numeric" })}
        </div>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What is this for?"
          data-testid="event-title"
          className="w-full bg-transparent text-2xl font-display tracking-tight focus:outline-none mb-4"
        />
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: "event", label: "Event" },
            { id: "focus", label: "Focus block" },
            { id: "break", label: "Break" },
          ].map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => setKind(k.id)}
              data-testid={`event-kind-${k.id}`}
              className={`px-3.5 py-1.5 rounded-full text-[13px] border transition-colors ${
                kind === k.id ? "bg-velari-ink text-velari-cream border-velari-ink" : "border-velari-border hover:bg-velari-surfaceAlt"
              }`}
            >
              {k.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1 text-[13px]">
            <span className="text-velari-textSoft">For</span>
            <input
              type="number"
              min={15}
              max={300}
              step={15}
              value={minutes}
              onChange={(e) => setMinutes(parseInt(e.target.value) || 60)}
              className="w-14 bg-velari-bg border border-velari-border rounded-md py-1 px-2 text-center focus:outline-none"
            />
            <span className="text-velari-textSoft">min</span>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-full text-[13px] text-velari-textSoft hover:text-velari-text">Cancel</button>
          <button type="submit" data-testid="event-save" className="px-4 py-2 rounded-full text-[13px] bg-velari-ink text-velari-cream">Hold this</button>
        </div>
      </form>
    </div>
  );
}
