/** Local database contract. Regenerate from the target project after migration. */
export type SenateRole = "chairman" | "secretary" | "senator" | "viewer";
export type MeetingRow = {
  id: string; meeting_no: string; title: string; description: string | null;
  starts_at: string; duration_minutes: number; meeting_type: "plenary" | "committee" | "briefing";
  priority: "normal" | "important" | "urgent";
  status: "scheduled" | "completed" | "cancelled";
  participant_count: number | null; expected_participants: number | null;
  published_at: string | null; created_by: string | null;
  created_at: string; updated_at: string;
};
export type AgendaRow = { id: string; meeting_id: string; position: number; title: string; result: string | null; status: "pending" | "considered" | "postponed"; created_at: string; updated_at: string };
export type SummaryRow = { meeting_id: string; body: string; published_at: string | null; created_at: string; updated_at: string };
export type DecisionRow = { id: string; decision_no: string; meeting_id: string; title: string; description: string; status: "adopted" | "in_progress" | "completed" | "postponed"; adopted_at: string; published_at: string | null; created_at: string; updated_at: string };
export type ProfileRow = { id: string; display_name: string; role: SenateRole; created_at: string; updated_at: string };
type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = { Row: Row; Insert: Insert; Update: Update; Relationships: [] };
export type Database = {
  public: {
    Tables: {
      meetings: Table<MeetingRow>;
      meeting_agenda: Table<AgendaRow>;
      meeting_summaries: Table<SummaryRow>;
      decisions: Table<DecisionRow>;
      profiles: Table<ProfileRow>;
    };
    Views: Record<string, never>;
    Functions: { save_meeting: { Args: { payload: Record<string, unknown> }; Returns: string } };
    Enums: { senate_role: SenateRole };
    CompositeTypes: Record<string, never>;
  };
};
