import { useState, type FormEvent } from "react";
import { Button } from "./UI";
import { TODAY_MSK, type Decision, type DecisionStatus, type Meeting } from "../data/mockData";
import { useDataStore } from "../services/mockStore";

export function DecisionEditor({ decision, meetings, onSave }: { decision?: Decision; meetings: Meeting[]; onSave: (decision: Decision) => Promise<void> }) {
  const { mode } = useDataStore();
  const [title, setTitle] = useState(decision?.title ?? "");
  const [description, setDescription] = useState(decision?.description ?? "");
  const [date, setDate] = useState(decision?.date ?? TODAY_MSK);
  const [meetingId, setMeetingId] = useState(decision?.meetingId ?? meetings.find((m) => m.status === "Завершено")?.id ?? "");
  const [status, setStatus] = useState<DecisionStatus>(decision?.status ?? "Принято");
  const [published, setPublished] = useState(decision?.published ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!meetingId) { setError("Сначала выберите завершённое заседание."); return; }
    if (published && !meetings.find((meeting) => meeting.id === meetingId)?.published) {
      setError("Сначала опубликуйте связанное заседание."); return;
    }
    const id = decision?.id ?? crypto.randomUUID();
    setBusy(true); setError("");
    try { await onSave({
      id,
      number: decision?.number ?? `Р-${id.slice(0, 8).toUpperCase()}`,
      title: title.trim(), description: description.trim(), date, meetingId, status, published,
    }); } catch (cause) { setError(cause instanceof Error ? cause.message : "Не удалось сохранить решение."); }
    finally { setBusy(false); }
  };
  return <form className="demo-form" autoComplete="off" onSubmit={submit}>
    <p className="modal-copy">{mode === "mock" ? "Локальный демонстрационный режим. Изменения остаются в этом браузере." : "Публикация откроет решение посетителям после сохранения."}</p>
    <label>Название<input name="title" required value={title} onChange={(event) => setTitle(event.target.value)} /></label>
    <label>Описание<textarea name="description" required rows={4} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
    <div className="form-row">
      <label>Дата принятия<input name="date" type="date" required value={date} onChange={(event) => setDate(event.target.value)} /></label>
      <label>Статус<select name="status" value={status} onChange={(event) => setStatus(event.target.value as DecisionStatus)}><option>Принято</option><option>На исполнении</option><option>Исполнено</option><option>Отложено</option></select></label>
    </div>
    <label>Связанное заседание<select name="meeting" required value={meetingId} onChange={(event) => setMeetingId(event.target.value)}><option value="">Выберите заседание</option>{meetings.filter((m) => m.status === "Завершено").map((m) => <option key={m.id} value={m.id}>№{m.number} · {m.title}</option>)}</select></label>
    <label className="publish-toggle"><input type="checkbox" checked={published} onChange={(event) => setPublished(event.target.checked)} /> Опубликовать для посетителей</label>
    {error && <p className="form-error" role="alert">{error}</p>}
    <Button type="submit" disabled={busy || !meetingId}>{busy ? "Сохраняем…" : decision ? "Сохранить решение" : "Добавить решение"}</Button>
  </form>;
}
