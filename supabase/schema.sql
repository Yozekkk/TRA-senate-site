-- ARGENTI 3.0 baseline. No fabricated meetings or decisions are seeded.
create schema if not exists private;

create type public.senate_role as enum ('chairman', 'senator', 'secretary', 'viewer');

create table public.senate_roles (
  role public.senate_role primary key,
  label text not null,
  can_edit boolean not null default false
);
insert into public.senate_roles(role, label, can_edit) values
  ('chairman', 'Председатель', true),
  ('secretary', 'Секретарь', true),
  ('senator', 'Сенатор', false),
  ('viewer', 'Посетитель', false);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 120),
  role public.senate_role not null default 'viewer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  meeting_no text not null unique,
  title text not null check (char_length(title) between 4 and 240),
  description text,
  starts_at timestamptz not null,
  duration_minutes integer not null default 60 check (duration_minutes between 15 and 720),
  meeting_type text not null check (meeting_type in ('plenary', 'committee', 'briefing')),
  priority text not null default 'normal' check (priority in ('normal', 'important', 'urgent')),
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  participant_count integer check (participant_count >= 0),
  expected_participants integer check (expected_participants > 0),
  constraint attendance_lte_expected check (participant_count is null or expected_participants is null or participant_count <= expected_participants),
  published_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.meeting_agenda (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  position integer not null check (position > 0),
  title text not null check (char_length(title) between 3 and 300),
  result text,
  status text not null default 'pending' check (status in ('pending', 'considered', 'postponed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (meeting_id, position)
);

create table public.meeting_summaries (
  meeting_id uuid primary key references public.meetings(id) on delete cascade,
  body text not null check (char_length(body) >= 20),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.meeting_participants (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  attended boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (meeting_id, profile_id)
);

create table public.meeting_attendance (
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  attended boolean,
  recorded_at timestamptz not null default now(),
  recorded_by uuid references public.profiles(id) on delete set null,
  primary key (meeting_id, profile_id)
);

create table public.decisions (
  id uuid primary key default gen_random_uuid(),
  decision_no text not null unique,
  meeting_id uuid not null references public.meetings(id) on delete restrict,
  title text not null check (char_length(title) between 4 and 240),
  description text not null check (char_length(description) >= 10),
  status text not null default 'adopted' check (status in ('adopted', 'in_progress', 'completed', 'postponed')),
  adopted_at timestamptz not null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.decision_updates (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references public.decisions(id) on delete cascade,
  previous_status text check (previous_status in ('adopted', 'in_progress', 'completed', 'postponed')),
  new_status text not null check (new_status in ('adopted', 'in_progress', 'completed', 'postponed')),
  note text not null check (char_length(note) between 3 and 2000),
  actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  entity_type text not null,
  entity_id uuid not null,
  action text not null check (action in ('insert', 'update', 'publish', 'status_change')),
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid references public.meetings(id) on delete cascade,
  decision_id uuid references public.decisions(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 200),
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  published_at timestamptz,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attachment_parent check (num_nonnulls(meeting_id, decision_id) = 1)
);

create table public.site_settings (
  key text primary key check (key ~ '^[a-z][a-z0-9_]{2,63}$'),
  value jsonb not null,
  is_public boolean not null default false,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create index meetings_starts_at_idx on public.meetings (starts_at desc);
create index meetings_public_idx on public.meetings (starts_at desc) where published_at is not null;
create index agenda_meeting_idx on public.meeting_agenda (meeting_id, position);
create index participants_profile_idx on public.meeting_participants (profile_id);
create index decisions_meeting_idx on public.decisions (meeting_id);
create index decisions_adopted_at_idx on public.decisions (adopted_at desc);
create index decision_updates_decision_idx on public.decision_updates (decision_id, created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id, created_at desc);
create index attendance_profile_idx on public.meeting_attendance(profile_id);
create index attachments_meeting_idx on public.attachments(meeting_id);
create index attachments_decision_idx on public.attachments(decision_id);
create index decisions_public_idx on public.decisions(adopted_at desc) where published_at is not null;

create function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger profiles_updated before update on public.profiles for each row execute function private.touch_updated_at();
create trigger meetings_updated before update on public.meetings for each row execute function private.touch_updated_at();
create trigger agenda_updated before update on public.meeting_agenda for each row execute function private.touch_updated_at();
create trigger summaries_updated before update on public.meeting_summaries for each row execute function private.touch_updated_at();
create trigger participants_updated before update on public.meeting_participants for each row execute function private.touch_updated_at();
create trigger decisions_updated before update on public.decisions for each row execute function private.touch_updated_at();
create trigger attachments_updated before update on public.attachments for each row execute function private.touch_updated_at();
create trigger site_settings_updated before update on public.site_settings for each row execute function private.touch_updated_at();

-- New Auth accounts are viewers. A chairman must be assigned by a trusted
-- administrator in SQL; browser clients have no role update privilege.
create function private.create_viewer_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, display_name, role)
  values (new.id, 'Участник Сената', 'viewer');
  return new;
end;
$$;
revoke all on function private.create_viewer_profile() from public;
create trigger auth_user_profile after insert on auth.users
for each row execute function private.create_viewer_profile();

-- This function is intentionally restricted to a non-exposed schema. Its owner
-- needs read access to profiles; never expose private in Data API settings.
create function private.has_any_role(allowed public.senate_role[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = any(allowed)
  );
$$;
revoke all on function private.has_any_role(public.senate_role[]) from public;
grant usage on schema private to authenticated;
grant execute on function private.has_any_role(public.senate_role[]) to authenticated;

alter table public.profiles enable row level security;
alter table public.meetings enable row level security;
alter table public.meeting_agenda enable row level security;
alter table public.meeting_summaries enable row level security;
alter table public.meeting_participants enable row level security;
alter table public.decisions enable row level security;
alter table public.decision_updates enable row level security;
alter table public.audit_logs enable row level security;
alter table public.senate_roles enable row level security;
alter table public.meeting_attendance enable row level security;
alter table public.attachments enable row level security;
alter table public.site_settings enable row level security;

create policy roles_public_read on public.senate_roles for select to anon, authenticated using (true);

create policy profiles_self_or_editor_read on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select private.has_any_role(array['chairman','secretary']::public.senate_role[])));

create policy meetings_public_read on public.meetings for select to anon, authenticated
using (published_at is not null);
create policy meetings_staff_read on public.meetings for select to authenticated
using ((select private.has_any_role(array['chairman','senator','secretary']::public.senate_role[])));
create policy meetings_editor_insert on public.meetings for insert to authenticated
with check ((select private.has_any_role(array['chairman','secretary']::public.senate_role[])));
create policy meetings_editor_update on public.meetings for update to authenticated
using ((select private.has_any_role(array['chairman','secretary']::public.senate_role[])))
with check ((select private.has_any_role(array['chairman','secretary']::public.senate_role[])));

create policy agenda_public_read on public.meeting_agenda for select to anon, authenticated
using (exists (select 1 from public.meetings m where m.id = meeting_id and m.published_at is not null));
create policy agenda_staff_read on public.meeting_agenda for select to authenticated
using ((select private.has_any_role(array['chairman','senator','secretary']::public.senate_role[])));
create policy agenda_editor_insert on public.meeting_agenda for insert to authenticated
with check ((select private.has_any_role(array['chairman','secretary']::public.senate_role[])));
create policy agenda_editor_update on public.meeting_agenda for update to authenticated
using ((select private.has_any_role(array['chairman','secretary']::public.senate_role[])))
with check ((select private.has_any_role(array['chairman','secretary']::public.senate_role[])));
create policy agenda_editor_delete on public.meeting_agenda for delete to authenticated
using ((select private.has_any_role(array['chairman','secretary']::public.senate_role[])));

create policy summaries_public_read on public.meeting_summaries for select to anon, authenticated
using (published_at is not null and exists (select 1 from public.meetings m where m.id = meeting_id and m.published_at is not null));
create policy summaries_staff_read on public.meeting_summaries for select to authenticated
using ((select private.has_any_role(array['chairman','senator','secretary']::public.senate_role[])));
create policy summaries_editor_insert on public.meeting_summaries for insert to authenticated
with check ((select private.has_any_role(array['chairman','secretary']::public.senate_role[])));
create policy summaries_editor_update on public.meeting_summaries for update to authenticated
using ((select private.has_any_role(array['chairman','secretary']::public.senate_role[])))
with check ((select private.has_any_role(array['chairman','secretary']::public.senate_role[])));
create policy summaries_editor_delete on public.meeting_summaries for delete to authenticated
using ((select private.has_any_role(array['chairman','secretary']::public.senate_role[])));

create policy participants_self_or_editor_read on public.meeting_participants for select to authenticated
using (profile_id = (select auth.uid()) or (select private.has_any_role(array['chairman','secretary']::public.senate_role[])));
create policy participants_editor_insert on public.meeting_participants for insert to authenticated
with check ((select private.has_any_role(array['chairman','secretary']::public.senate_role[])));
create policy participants_editor_update on public.meeting_participants for update to authenticated
using ((select private.has_any_role(array['chairman','secretary']::public.senate_role[])))
with check ((select private.has_any_role(array['chairman','secretary']::public.senate_role[])));

create policy attendance_self_or_editor_read on public.meeting_attendance for select to authenticated
using (profile_id = (select auth.uid()) or (select private.has_any_role(array['chairman','secretary']::public.senate_role[])));
create policy attendance_editor_insert on public.meeting_attendance for insert to authenticated
with check ((select private.has_any_role(array['chairman','secretary']::public.senate_role[])));
create policy attendance_editor_update on public.meeting_attendance for update to authenticated
using ((select private.has_any_role(array['chairman','secretary']::public.senate_role[])))
with check ((select private.has_any_role(array['chairman','secretary']::public.senate_role[])));

create policy decisions_public_read on public.decisions for select to anon, authenticated
using (published_at is not null and exists (select 1 from public.meetings m where m.id = meeting_id and m.published_at is not null));
create policy decisions_staff_read on public.decisions for select to authenticated
using ((select private.has_any_role(array['chairman','senator','secretary']::public.senate_role[])));
create policy decisions_editor_insert on public.decisions for insert to authenticated
with check ((select private.has_any_role(array['chairman','secretary']::public.senate_role[])));
create policy decisions_editor_update on public.decisions for update to authenticated
using ((select private.has_any_role(array['chairman','secretary']::public.senate_role[])))
with check ((select private.has_any_role(array['chairman','secretary']::public.senate_role[])));

create policy decision_updates_public_read on public.decision_updates for select to anon, authenticated
using (exists (select 1 from public.decisions d join public.meetings m on m.id = d.meeting_id where d.id = decision_id and d.published_at is not null and m.published_at is not null));
create policy decision_updates_staff_read on public.decision_updates for select to authenticated
using ((select private.has_any_role(array['chairman','senator','secretary']::public.senate_role[])));
-- Writes to decision_updates and audit_logs are reserved for a trusted backend
-- transaction so a client cannot forge the status history or change log.
create policy audit_logs_editor_read on public.audit_logs for select to authenticated
using ((select private.has_any_role(array['chairman','secretary']::public.senate_role[])));

create policy attachments_public_read on public.attachments for select to anon, authenticated
using (published_at is not null and (
  (meeting_id is not null and exists (select 1 from public.meetings m where m.id = meeting_id and m.published_at is not null)) or
  (decision_id is not null and exists (select 1 from public.decisions d where d.id = decision_id and d.published_at is not null))
));
create policy attachments_staff_read on public.attachments for select to authenticated
using ((select private.has_any_role(array['chairman','senator','secretary']::public.senate_role[])));
create policy attachments_editor_insert on public.attachments for insert to authenticated
with check ((select private.has_any_role(array['chairman','secretary']::public.senate_role[])));
create policy attachments_editor_update on public.attachments for update to authenticated
using ((select private.has_any_role(array['chairman','secretary']::public.senate_role[])))
with check ((select private.has_any_role(array['chairman','secretary']::public.senate_role[])));

create policy settings_public_read on public.site_settings for select to anon, authenticated using (is_public);
create policy settings_editor_read on public.site_settings for select to authenticated
using ((select private.has_any_role(array['chairman','secretary']::public.senate_role[])));
create policy settings_chairman_insert on public.site_settings for insert to authenticated
with check ((select private.has_any_role(array['chairman']::public.senate_role[])));
create policy settings_chairman_update on public.site_settings for update to authenticated
using ((select private.has_any_role(array['chairman']::public.senate_role[])))
with check ((select private.has_any_role(array['chairman']::public.senate_role[])));

grant select on public.meetings, public.meeting_agenda, public.meeting_summaries,
  public.decisions, public.decision_updates to anon;
grant select on public.profiles, public.meetings, public.meeting_agenda,
  public.meeting_summaries, public.meeting_participants, public.decisions,
  public.decision_updates, public.audit_logs to authenticated;
grant insert, update on public.meetings, public.meeting_agenda,
  public.meeting_summaries, public.meeting_participants, public.decisions to authenticated;
grant delete on public.meeting_agenda to authenticated;
grant delete on public.meeting_summaries to authenticated;
grant select on public.senate_roles, public.attachments, public.site_settings to anon;
grant select on public.senate_roles, public.meeting_attendance, public.attachments,
  public.site_settings to authenticated;
grant insert, update on public.meeting_attendance, public.attachments to authenticated;
grant insert, update on public.site_settings to authenticated;

-- History is written by triggers in the same transaction as the changed row.
create function private.audit_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  row_id uuid;
begin
  row_id := coalesce((to_jsonb(new)->>'id')::uuid, (to_jsonb(old)->>'id')::uuid,
    (to_jsonb(new)->>'meeting_id')::uuid, (to_jsonb(old)->>'meeting_id')::uuid);
  insert into public.audit_logs(actor_id, entity_type, entity_id, action, old_data, new_data)
  values (auth.uid(), tg_table_name, row_id,
    case when tg_op = 'INSERT' then 'insert' when tg_table_name = 'decisions' and old.status is distinct from new.status then 'status_change' else 'update' end,
    case when tg_op = 'UPDATE' then to_jsonb(old) else null end, to_jsonb(new));
  return new;
end;
$$;
revoke all on function private.audit_change() from public;
create trigger meetings_audit after insert or update on public.meetings for each row execute function private.audit_change();
create trigger decisions_audit after insert or update on public.decisions for each row execute function private.audit_change();

create function private.record_decision_status() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.status is distinct from new.status then
    insert into public.decision_updates(decision_id, previous_status, new_status, note, actor_id)
    values (new.id, old.status, new.status, 'Статус изменён', auth.uid());
  end if;
  return new;
end;
$$;
revoke all on function private.record_decision_status() from public;
create trigger decisions_status_history after update of status on public.decisions
for each row execute function private.record_decision_status();

create function private.ensure_decision_parent_published() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.published_at is not null and not exists (
    select 1 from public.meetings m where m.id = new.meeting_id and m.published_at is not null
  ) then
    raise check_violation using message = 'Publish the linked meeting before publishing its decision';
  end if;
  return new;
end;
$$;
revoke all on function private.ensure_decision_parent_published() from public;
create trigger decisions_publication_guard before insert or update of published_at, meeting_id on public.decisions
for each row execute function private.ensure_decision_parent_published();

-- One invoker transaction keeps meeting details and agenda together.
create function public.save_meeting(payload jsonb) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_meeting_id uuid := coalesce((payload->>'id')::uuid, gen_random_uuid());
  agenda_item jsonb;
  agenda_position integer := 0;
  summary_text text := nullif(trim(payload->>'summary'), '');
begin
  if not private.has_any_role(array['chairman','secretary']::public.senate_role[]) then
    raise insufficient_privilege using message = 'Not authorized to edit meetings';
  end if;
  insert into public.meetings(id, meeting_no, title, description, starts_at,
    duration_minutes, meeting_type, priority, status, participant_count,
    expected_participants, published_at, created_by)
  values (v_meeting_id, payload->>'number', payload->>'title', nullif(payload->>'description',''),
    (payload->>'starts_at')::timestamptz, (payload->>'duration')::integer,
    payload->>'type', payload->>'priority', payload->>'status',
    (payload->>'participants')::integer, (payload->>'expected_participants')::integer,
    case when (payload->>'published')::boolean then now() else null end, auth.uid())
  on conflict(id) do update set
    meeting_no=excluded.meeting_no, title=excluded.title, description=excluded.description,
    starts_at=excluded.starts_at, duration_minutes=excluded.duration_minutes,
    meeting_type=excluded.meeting_type, priority=excluded.priority,
    status=excluded.status, participant_count=excluded.participant_count,
    expected_participants=excluded.expected_participants, published_at=excluded.published_at;
  delete from public.meeting_agenda where meeting_agenda.meeting_id = v_meeting_id;
  for agenda_item in select value from jsonb_array_elements(coalesce(payload->'agenda', '[]'::jsonb)) loop
    agenda_position := agenda_position + 1;
    insert into public.meeting_agenda(meeting_id, position, title, result, status)
    values (v_meeting_id, agenda_position, agenda_item->>'title', nullif(agenda_item->>'result',''), agenda_item->>'status');
  end loop;
  if summary_text is not null then
    insert into public.meeting_summaries(meeting_id, body, published_at)
    values (v_meeting_id, summary_text,
      case when (payload->>'published')::boolean then now() else null end)
    on conflict(meeting_id) do update set body=excluded.body, published_at=excluded.published_at;
  else
    delete from public.meeting_summaries where meeting_id = v_meeting_id;
  end if;
  return v_meeting_id;
end;
$$;
revoke all on function public.save_meeting(jsonb) from public;
grant execute on function public.save_meeting(jsonb) to authenticated;
