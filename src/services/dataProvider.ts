import { decisions as seedDecisions, meetings as seedMeetings, type Decision, type Meeting } from "../data/mockData";
import type { AgendaRow, DecisionRow, MeetingRow, SummaryRow } from "../types/database";
import { supabase, supabaseConfigured } from "./supabaseClient";

export type DataSnapshot = { meetings: Meeting[]; decisions: Decision[] };
export type DataMode = "mock" | "supabase" | "unavailable";
export type DataProvider = {
  readonly mode: DataMode;
  loadSnapshot(): Promise<DataSnapshot>;
  saveMeeting(meeting: Meeting): Promise<void>;
  saveDecision(decision: Decision): Promise<void>;
};
const empty = (): DataSnapshot => ({ meetings: [], decisions: [] });
const KEY = "argenti-mock-v3";
const seed = (): DataSnapshot => ({ meetings: seedMeetings, decisions: seedDecisions });
const readMock = (): DataSnapshot => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw) as Partial<DataSnapshot>;
    return { meetings: Array.isArray(parsed.meetings) ? parsed.meetings : seedMeetings,
      decisions: Array.isArray(parsed.decisions) ? parsed.decisions : seedDecisions };
  } catch { return seed(); }
};
const writeMock = (data: DataSnapshot) => localStorage.setItem(KEY, JSON.stringify(data));
export const mockDataProvider: DataProvider = {
  mode: "mock",
  async loadSnapshot() { return readMock(); },
  async saveMeeting(meeting) {
    const data = readMock();
    data.meetings = data.meetings.some((item) => item.id === meeting.id)
      ? data.meetings.map((item) => item.id === meeting.id ? meeting : item) : [...data.meetings, meeting];
    writeMock(data);
  },
  async saveDecision(decision) {
    const data = readMock();
    data.decisions = data.decisions.some((item) => item.id === decision.id)
      ? data.decisions.map((item) => item.id === decision.id ? decision : item) : [...data.decisions, decision];
    writeMock(data);
  },
};
const unavailableDataProvider: DataProvider = {
  mode: "unavailable",
  async loadSnapshot() { return empty(); },
  async saveMeeting() { throw new Error("Подключение к базе данных не настроено."); },
  async saveDecision() { throw new Error("Подключение к базе данных не настроено."); },
};

const typeToUi = { plenary: "Пленарное", committee: "Комитет", briefing: "Совещание" } as const;
const priorityToUi = { normal: "Обычное", important: "Важное", urgent: "Срочное" } as const;
const meetingStatusToUi = { scheduled: "Запланировано", completed: "Завершено", cancelled: "Отменено" } as const;
const decisionStatusToUi = { adopted: "Принято", in_progress: "На исполнении", completed: "Исполнено", postponed: "Отложено" } as const;
const typeToDb = { "Пленарное": "plenary", "Комитет": "committee", "Совещание": "briefing" } as const;
const priorityToDb = { "Обычное": "normal", "Важное": "important", "Срочное": "urgent" } as const;
const meetingStatusToDb = { "Запланировано": "scheduled", "Завершено": "completed", "Отменено": "cancelled" } as const;
const decisionStatusToDb = { "Принято": "adopted", "На исполнении": "in_progress", "Исполнено": "completed", "Отложено": "postponed" } as const;
const moscowParts = (iso: string) => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Moscow", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(iso)).map((part) => [part.type, part.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
};
function meetingFromRow(row: MeetingRow, agenda: AgendaRow[], summary?: SummaryRow): Meeting {
  return {
    id: row.id, number: row.meeting_no, title: row.title, ...moscowParts(row.starts_at),
    duration: row.duration_minutes, type: typeToUi[row.meeting_type],
    priority: priorityToUi[row.priority], status: meetingStatusToUi[row.status],
    participants: row.participant_count, expectedParticipants: row.expected_participants,
    summary: summary?.body ?? (row.status === "scheduled" ? row.description ?? "" : ""), published: Boolean(row.published_at),
    agenda: agenda.filter((item) => item.meeting_id === row.id).sort((a,b) => a.position-b.position).map((item) => ({
      title: item.title, result: item.result ?? "",
      status: item.status === "considered" ? "Рассмотрено" : item.status === "pending" ? "Предстоит" : "Перенесено",
    })), decisions: [],
  };
}
function decisionFromRow(row: DecisionRow): Decision {
  return { id: row.id, number: row.decision_no, title: row.title,
    date: moscowParts(row.adopted_at).date, meetingId: row.meeting_id,
    status: decisionStatusToUi[row.status], description: row.description,
    published: Boolean(row.published_at) };
}
export const supabaseDataProvider: DataProvider = {
  mode: "supabase",
  async loadSnapshot() {
    if (!supabase) throw new Error("Подключение к базе данных не настроено.");
    const [meetings, agenda, summaries, decisions] = await Promise.all([
      supabase.from("meetings").select("*").order("starts_at", { ascending: true }),
      supabase.from("meeting_agenda").select("*"),
      supabase.from("meeting_summaries").select("*"),
      supabase.from("decisions").select("*").order("adopted_at", { ascending: true }),
    ]);
    const error = meetings.error ?? agenda.error ?? summaries.error ?? decisions.error;
    if (error) throw new Error(`Не удалось загрузить данные Сената: ${error.message}`);
    return { meetings: (meetings.data ?? []).map((row) => meetingFromRow(row, agenda.data ?? [],
      (summaries.data ?? []).find((item) => item.meeting_id === row.id))),
      decisions: (decisions.data ?? []).map(decisionFromRow) };
  },
  async saveMeeting(meeting) {
    if (!supabase) throw new Error("Подключение к базе данных не настроено.");
    const payload = {
      id: meeting.id, number: meeting.number, title: meeting.title,
      description: meeting.status === "Запланировано" ? meeting.summary : "",
      starts_at: `${meeting.date}T${meeting.time}:00+03:00`, duration: meeting.duration,
      type: typeToDb[meeting.type], priority: priorityToDb[meeting.priority],
      status: meetingStatusToDb[meeting.status], participants: meeting.participants,
      expected_participants: meeting.expectedParticipants,
      published: Boolean(meeting.published),
      summary: meeting.status === "Завершено" ? meeting.summary : "",
      agenda: meeting.agenda.map((item) => ({ title: item.title, result: item.result,
        status: item.status === "Рассмотрено" ? "considered" : item.status === "Предстоит" ? "pending" : "postponed" })),
    };
    const { error } = await supabase.rpc("save_meeting", { payload });
    if (error) throw new Error(`Заседание не сохранено: ${error.message}`);
  },
  async saveDecision(decision) {
    if (!supabase) throw new Error("Подключение к базе данных не настроено.");
    const { error } = await supabase.from("decisions").upsert({
      id: decision.id, decision_no: decision.number, meeting_id: decision.meetingId,
      title: decision.title, description: decision.description,
      status: decisionStatusToDb[decision.status],
      adopted_at: `${decision.date}T12:00:00+03:00`,
      published_at: decision.published ? new Date().toISOString() : null,
    }, { onConflict: "id" });
    if (error) throw new Error(`Решение не сохранено: ${error.message}`);
  },
};
// Mock data require an explicit development flag. Production never falls back.
export const activeDataProvider: DataProvider = import.meta.env.DEV && import.meta.env.VITE_DATA_MODE === "mock"
  ? mockDataProvider : supabaseConfigured ? supabaseDataProvider : unavailableDataProvider;
