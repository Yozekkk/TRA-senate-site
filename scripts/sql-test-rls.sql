-- Run after sql-test-setup.sql and the baseline migration in a fresh DB.
insert into auth.users(id, email) values
  ('00000000-0000-0000-0000-000000000001', 'chair@example.invalid'),
  ('00000000-0000-0000-0000-000000000002', 'secretary@example.invalid'),
  ('00000000-0000-0000-0000-000000000003', 'viewer@example.invalid');
update public.profiles set role = 'chairman' where id = '00000000-0000-0000-0000-000000000001';
update public.profiles set role = 'secretary' where id = '00000000-0000-0000-0000-000000000002';

insert into public.meetings(id, meeting_no, title, starts_at, meeting_type, published_at) values
  ('10000000-0000-0000-0000-000000000001', 'TEST-PUBLIC', 'Публичное тестовое заседание', now(), 'plenary', now()),
  ('10000000-0000-0000-0000-000000000002', 'TEST-DRAFT', 'Закрытый тестовый черновик', now(), 'committee', null);
insert into public.decisions(id, decision_no, meeting_id, title, description, adopted_at, published_at) values
  ('20000000-0000-0000-0000-000000000001', 'TEST-PUBLIC', '10000000-0000-0000-0000-000000000001', 'Публичное тестовое решение', 'Проверка публичного доступа.', now(), now()),
  ('20000000-0000-0000-0000-000000000002', 'TEST-DRAFT', '10000000-0000-0000-0000-000000000002', 'Закрытое тестовое решение', 'Проверка закрытого доступа.', now(), null);

set role anon;
do $$ begin
  if (select count(*) from public.meetings) <> 1 then raise exception 'Anon meeting visibility failed'; end if;
  if (select count(*) from public.decisions) <> 1 then raise exception 'Anon decision visibility failed'; end if;
  begin
    insert into public.meetings(meeting_no, title, starts_at, meeting_type)
    values ('UNAUTHORIZED', 'Недопустимая запись', now(), 'plenary');
    raise exception 'Anon write unexpectedly succeeded';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
set role authenticated;
do $$ begin
  if (select count(*) from public.meetings) <> 1 then raise exception 'Viewer saw a draft'; end if;
  begin
    insert into public.meetings(meeting_no, title, starts_at, meeting_type)
    values ('VIEWER-WRITE', 'Недопустимая запись', now(), 'plenary');
    raise exception 'Viewer write unexpectedly succeeded';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
set role authenticated;
do $$ begin
  if (select count(*) from public.meetings) <> 2 then raise exception 'Secretary draft access failed'; end if;
  begin
    insert into public.decisions(decision_no, meeting_id, title, description, adopted_at, published_at)
    values ('ILLEGAL-PUBLISH', '10000000-0000-0000-0000-000000000002', 'Недопустимая публикация', 'Связано с неопубликованным заседанием.', now(), now());
    raise exception 'Draft decision publication unexpectedly succeeded';
  exception when check_violation then null; end;
end $$;
insert into public.meetings(meeting_no, title, starts_at, meeting_type)
values ('SECRETARY-CREATED', 'Черновик секретаря', now(), 'plenary');
select public.save_meeting('{"id":"10000000-0000-0000-0000-000000000003","number":"RPC-TEST","title":"Заседание через атомарную функцию","description":"Открытое обсуждение","starts_at":"2026-11-12T17:00:00+03:00","duration":90,"type":"committee","priority":"normal","status":"scheduled","participants":null,"expected_participants":null,"published":false,"summary":"","agenda":[{"title":"Первый вопрос повестки","result":"","status":"pending"}]}'::jsonb);
update public.decisions set status = 'in_progress' where decision_no = 'TEST-PUBLIC';
reset role;

do $$ begin
  if (select count(*) from public.decision_updates where decision_id = '20000000-0000-0000-0000-000000000001') <> 1
    then raise exception 'Decision status history missing'; end if;
  if (select count(*) from public.audit_logs where entity_type = 'decisions') < 3
    then raise exception 'Audit trail missing'; end if;
  if (select count(*) from public.meetings where meeting_no = 'SECRETARY-CREATED') <> 1
    then raise exception 'Secretary write missing'; end if;
  if (select count(*) from public.meeting_agenda where meeting_id = '10000000-0000-0000-0000-000000000003') <> 1
    then raise exception 'Atomic meeting agenda missing'; end if;
end $$;
