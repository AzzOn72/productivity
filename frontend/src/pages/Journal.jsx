import { useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { BookOpen, Sparkles, ArrowRight, Trash2, Plus } from "lucide-react";

function formatWhen(iso) {
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    return sameDay
      ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export default function Journal() {
  const [entries, setEntries] = useState([]);
  const [text, setText] = useState("");
  const [extract, setExtract] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/journal");
      setEntries(data);
    } catch (e) { toast.error(formatApiError(e)); }
  };
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e?.preventDefault?.();
    if (!text.trim()) return;
    setBusy(true);
    try {
      const { data } = await api.post("/journal", { text: text.trim(), extract_tasks: extract });
      setEntries((arr) => [data, ...arr]);
      setText("");
      if (data.extracted_task_ids?.length) {
        toast.success(`Captured · ${data.extracted_task_ids.length} task${data.extracted_task_ids.length === 1 ? "" : "s"} extracted.`);
      } else {
        toast.success("Noted.");
      }
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setBusy(false); }
  };

  const remove = async (e) => {
    setEntries((arr) => arr.filter((x) => x.entry_id !== e.entry_id));
    try { await api.delete(`/journal/${e.entry_id}`); }
    catch (err) { toast.error(formatApiError(err)); load(); }
  };

  return (
    <div className="px-5 md:px-10 py-8 max-w-[900px] mx-auto pb-28">
      <div className="mb-8 fade-up">
        <div className="text-[11px] uppercase tracking-[0.22em] text-velari-textSoft mb-2">Journal</div>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight">Tell Velari what's in your head.</h1>
        <p className="text-velari-textSoft mt-2 text-[15px] max-w-xl">
          A frictionless place for half-thoughts, rough notes, and what you're carrying. Velari will quietly extract anything actionable.
        </p>
      </div>

      <form onSubmit={save} className="card-soft elevated p-6 mb-6 fade-up" data-testid="journal-form">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What's on your mind?"
          rows={6}
          data-testid="journal-text"
          className="w-full bg-transparent text-[15.5px] leading-relaxed focus:outline-none placeholder:text-velari-textSoft resize-none font-editorial"
        />
        <div className="flex flex-wrap items-center justify-between gap-3 mt-3 border-t border-velari-border pt-3">
          <label className="inline-flex items-center gap-2 text-[12.5px] text-velari-textSoft cursor-pointer">
            <input
              type="checkbox"
              checked={extract}
              onChange={(e) => setExtract(e.target.checked)}
              data-testid="journal-extract"
              className="accent-velari-brand"
            />
            <Sparkles size={12} className="text-velari-brand" /> Extract tasks with AI
          </label>
          <button
            type="submit"
            disabled={busy || !text.trim()}
            data-testid="journal-save"
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-velari-ink text-velari-cream text-[13px] disabled:opacity-40 hover:-translate-y-0.5 transition-transform ease-velari"
          >
            <Plus size={13} /> {busy ? "Saving…" : "Save entry"}
          </button>
        </div>
      </form>

      {entries.length === 0 ? (
        <div className="text-center py-10 fade-up">
          <BookOpen size={22} className="mx-auto text-velari-brand mb-3" />
          <div className="font-editorial italic text-2xl mb-2">An empty page.</div>
          <p className="text-velari-textSoft text-[14px]">Write anything. Even one line is enough.</p>
        </div>
      ) : (
        <ul className="space-y-3 fade-up">
          {entries.map((e) => (
            <li key={e.entry_id} className="card-soft p-5 group" data-testid={`journal-entry-${e.entry_id}`}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="text-[10.5px] uppercase tracking-[0.22em] text-velari-textSoft">{formatWhen(e.created_at)}</div>
                <button onClick={() => remove(e)} data-testid={`journal-delete-${e.entry_id}`} className="opacity-0 group-hover:opacity-100 text-velari-textSoft hover:text-red-600 transition-opacity">
                  <Trash2 size={13} />
                </button>
              </div>
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap font-editorial">{e.text}</p>
              {e.extracted_task_ids?.length > 0 && (
                <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-velari-brand/10 border border-velari-brand/20 text-velari-brand text-[11.5px]">
                  <Sparkles size={11} />
                  {e.extracted_task_ids.length} task{e.extracted_task_ids.length === 1 ? "" : "s"} extracted
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
