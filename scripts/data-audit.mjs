import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../src/data/mockData.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const data = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const { meetings, pastMeetings, futureMeetings, decisions, DEMO_DATE } = data;
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const unique = (items) => new Set(items).size === items.length;

assert(meetings.length === pastMeetings.length + futureMeetings.length, "Meeting lists have different totals");
assert(unique(meetings.map((item) => item.id)) && unique(meetings.map((item) => item.number)), "Duplicate meeting identifier");
assert(unique(decisions.map((item) => item.id)) && unique(decisions.map((item) => item.number)), "Duplicate decision identifier");
assert(pastMeetings.every((item) => item.date < DEMO_DATE && item.status === "Завершено"), "Archive includes a future or unfinished meeting");
assert(futureMeetings.every((item) => item.date > DEMO_DATE && item.status === "Запланировано"), "Schedule includes a past or completed meeting");
assert(meetings.every((item) => /^\d{2}:\d{2}$/.test(item.time) && item.agenda.length > 0), "Meeting is missing time or agenda");
assert(decisions.every((item) => pastMeetings.some((meeting) => meeting.id === item.meetingId && meeting.date === item.date)), "Decision is not linked to a past meeting on its date");
assert(pastMeetings.every((item) => item.participants >= 0 && item.participants <= 16 && item.summary.length > 20), "Archive has invalid participation or summary");
console.log(`Data audit passed: ${pastMeetings.length} archived meetings, ${futureMeetings.length} future meetings, ${decisions.length} linked decisions`);
