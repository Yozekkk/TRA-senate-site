import { TODAY_MSK, formatDate, type Decision, type Meeting, type Period } from "../data/mockData";

const monthNames = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];

const shiftDate = (date: string, days: number) => {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};
const periodStart = (period: Period) => period === "Год" ? `${TODAY_MSK.slice(0, 4)}-01-01`
  : shiftDate(TODAY_MSK, -(period === "7 дней" ? 6 : period === "30 дней" ? 29 : 89));
const periodLabel = (period: Period) => period === "Год" ? `${TODAY_MSK.slice(0,4)} год · доступные записи`
  : `${formatDate(periodStart(period), {day:"numeric", month:"long"})} – ${formatDate(TODAY_MSK, {day:"numeric", month:"long", year:"numeric"})}`;

export function getPeriodComparison(period: Period, meetings: Meeting[]) {
  if (period === "Год") return null;
  const length = period === "7 дней" ? 7 : period === "30 дней" ? 30 : 90;
  const start = periodStart(period);
  const previousStart = shiftDate(start, -length);
  const previousEnd = shiftDate(start, -1);
  const completed = meetings.filter((item) => item.status === "Завершено");
  const current = completed.filter((item) => item.date >= start && item.date <= TODAY_MSK).length;
  const previous = completed.filter((item) => item.date >= previousStart && item.date <= previousEnd).length;
  if (current === 0 && previous === 0) return null;
  return { current, previous, difference: current - previous, length };
}

export function getAnalytics(period: Period, meetings: Meeting[], decisions: Decision[]) {
  const start = periodStart(period);
  const relevantMeetings = meetings.filter((item) => item.status === "Завершено" && item.date >= start && item.date <= TODAY_MSK);
  const relevantDecisions = decisions.filter((item) => item.date >= start && item.date <= TODAY_MSK);
  const agendaTotal = relevantMeetings.reduce((sum, item) => sum + item.agenda.length, 0);
  const agendaConsidered = relevantMeetings.reduce((sum, item) => sum + item.agenda.filter((agenda) => agenda.status === "Рассмотрено").length, 0);
  const chartMap = new Map<string, { month: string; meetings: number; decisions: number; participants: number; expected: number }>();
  for (const meeting of relevantMeetings) {
    const key = meeting.date.slice(0, 7);
    const row = chartMap.get(key) ?? { month: monthNames[Number(key.slice(5)) - 1], meetings: 0, decisions: 0, participants: 0, expected: 0 };
    row.meetings += 1;
    if (meeting.participants !== null && meeting.expectedParticipants) {
      row.participants += meeting.participants;
      row.expected += meeting.expectedParticipants;
    }
    chartMap.set(key, row);
  }
  for (const decision of relevantDecisions) {
    const key = decision.date.slice(0, 7);
    const row = chartMap.get(key) ?? { month: monthNames[Number(key.slice(5)) - 1], meetings: 0, decisions: 0, participants: 0, expected: 0 };
    row.decisions += 1;
    chartMap.set(key, row);
  }
  const chart = [...chartMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, row]) => ({
    month: row.month,
    meetings: row.meetings,
    decisions: row.decisions,
    attendance: row.expected ? Math.round(row.participants / row.expected * 100) : null,
  }));
  const attendanceRows = relevantMeetings.filter((item) => item.participants !== null && Boolean(item.expectedParticipants));
  const totalExpected = attendanceRows.reduce((sum, item) => sum + (item.expectedParticipants ?? 0), 0);
  return {
    label: periodLabel(period),
    meetings: relevantMeetings.length,
    decisions: relevantDecisions.length,
    attendance: totalExpected ? Math.round(attendanceRows.reduce((sum, item) => sum + (item.participants ?? 0), 0) / totalExpected * 100) : null,
    completed: relevantDecisions.filter((item) => item.status === "Исполнено").length,
    agendaTotal,
    agendaConsidered,
    duration: relevantMeetings.length ? Math.round(relevantMeetings.reduce((sum, item) => sum + item.duration, 0) / relevantMeetings.length) : null,
    chart,
  };
}
