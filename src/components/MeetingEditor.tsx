import { useState, type FormEvent } from "react";
import { type AgendaItem, type Meeting, type MeetingPriority, type MeetingStatus, type MeetingType, TODAY_MSK } from "../data/mockData";
import { Button } from "./UI";
import { useDataStore } from "../services/mockStore";

export function MeetingEditor({ meeting, onSave }: { meeting?: Meeting; onSave: (meeting: Meeting) => Promise<void> }) {
  const { mode } = useDataStore();
  const [title, setTitle] = useState(meeting?.title ?? "");
  const [date, setDate] = useState(meeting?.date ?? TODAY_MSK);
  const [time, setTime] = useState(meeting?.time ?? "17:00");
  const [type, setType] = useState<MeetingType>(meeting?.type ?? "Пленарное");
  const [priority, setPriority] = useState<MeetingPriority>(meeting?.priority ?? "Обычное");
  const [status, setStatus] = useState<MeetingStatus>(meeting?.status ?? "Запланировано");
  const [duration, setDuration] = useState(meeting?.duration ?? 120);
  const [participants, setParticipants] = useState(meeting?.participants ?? 0);
  const [expectedParticipants, setExpectedParticipants] = useState(meeting?.expectedParticipants ?? 0);
  const [summary, setSummary] = useState(meeting?.summary ?? "");
  const [agenda, setAgenda] = useState(meeting?.agenda.map((item) => item.title).join("\n") ?? "");
  const [agendaStatuses, setAgendaStatuses] = useState<Record<number, AgendaItem["status"]>>(() => Object.fromEntries(meeting?.agenda.map((item, index) => [index, item.status]) ?? []));
  const [published, setPublished] = useState(meeting?.published ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const agendaLines = agenda.split("\n").map((line) => line.trim()).filter(Boolean);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (status === "Завершено" && summary.trim() && summary.trim().length < 20) { setError("Краткий итог должен содержать не менее 20 символов."); return; }
    if (expectedParticipants > 0 && participants > expectedParticipants) { setError("Число присутствовавших не может превышать ожидаемое."); return; }
    const id = meeting?.id ?? crypto.randomUUID();
    setBusy(true); setError("");
    try { await onSave({
      id,
      number: meeting?.number ?? `С-${id.slice(0, 8).toUpperCase()}`,
      title: title.trim(), date, time, type, priority,
      duration,
      status,
      participants: status === "Завершено" ? participants : null,
      expectedParticipants: status === "Завершено" && expectedParticipants > 0 ? expectedParticipants : null,
      summary: summary.trim(),
      published,
      agenda: agendaLines.map((line, index) => {
        const original = meeting?.agenda.find((item) => item.title === line);
        const itemStatus = agendaStatuses[index] ?? (status === "Запланировано" ? "Предстоит" : "Перенесено");
        return { title: line, status: itemStatus, result: original?.status === itemStatus ? original.result : "" };
      }),
      decisions: meeting?.decisions ?? [],
    }); } catch (cause) { setError(cause instanceof Error ? cause.message : "Не удалось сохранить заседание."); }
    finally { setBusy(false); }
  };
  return (
    <form className="demo-form" autoComplete="off" onSubmit={submit}>
      <p className="modal-copy">{mode === "mock" ? "Локальный демонстрационный режим. Изменения остаются в этом браузере." : "Черновик виден только уполномоченным участникам. Для публичного доступа включите публикацию."}</p>
      <label>Название заседания<input name="title" required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Пленарное заседание Сената" /></label>
      <div className="form-row">
        <label>Дата<input name="date" type="date" min={meeting ? undefined : TODAY_MSK} required value={date} onChange={(event) => setDate(event.target.value)} /></label>
        <label>Время по МСК<input name="time" type="time" required value={time} onChange={(event) => setTime(event.target.value)} /></label>
      </div>
      <div className="form-row">
        <label>Тип<select name="type" value={type} onChange={(event) => setType(event.target.value as MeetingType)}><option>Пленарное</option><option>Комитет</option><option>Совещание</option></select></label>
        <label>Приоритет<select name="priority" value={priority} onChange={(event) => setPriority(event.target.value as MeetingPriority)}><option>Обычное</option><option>Важное</option><option>Срочное</option></select></label>
      </div>
      <div className="form-row"><label>Статус<select name="status" value={status} onChange={(event) => setStatus(event.target.value as MeetingStatus)}><option>Запланировано</option><option>Завершено</option><option>Отменено</option></select></label><label>Длительность, мин<input name="duration" type="number" min="15" max="720" required value={duration} onChange={(event) => setDuration(Number(event.target.value))} /></label></div>
      {status === "Завершено" && <div className="form-row"><label>Присутствовало участников<input name="participants" type="number" min="0" required value={participants} onChange={(event) => setParticipants(Number(event.target.value))} /></label><label>Ожидалось участников<input name="expectedParticipants" type="number" min="1" value={expectedParticipants || ""} onChange={(event) => setExpectedParticipants(Number(event.target.value))} placeholder="Если известно" /></label></div>}
      <label>Повестка — по одному вопросу в строке<textarea name="agenda" rows={4} value={agenda} onChange={(event) => setAgenda(event.target.value)} placeholder="Обсуждение материалов" /></label>
      {agendaLines.length > 0 && <div className="agenda-editor"><span>Рассмотрение вопросов</span>{agendaLines.map((line, index) => <label key={`${index}-${line}`}><span>{index + 1}. {line}</span><select name={`agenda-status-${index}`} value={agendaStatuses[index] ?? (status === "Запланировано" ? "Предстоит" : "Перенесено")} onChange={(event) => setAgendaStatuses((current) => ({ ...current, [index]: event.target.value as AgendaItem["status"] }))}><option>Предстоит</option><option>Перенесено</option><option>Рассмотрено</option></select></label>)}</div>}
      <label>Краткий итог или анонс<textarea name="summary" rows={4} value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Понятное описание заседания" /></label>
      <label className="publish-toggle"><input type="checkbox" checked={published} onChange={(event) => setPublished(event.target.checked)} /> Опубликовать для посетителей</label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <Button type="submit" disabled={busy}>{busy ? "Сохраняем…" : meeting ? "Сохранить заседание" : "Создать заседание"}</Button>
    </form>
  );
}
