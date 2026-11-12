-- Production baseline must contain no fabricated civic records.
do $$ begin
  if (select count(*) from public.meetings) <> 0 then raise exception 'Meetings are not empty'; end if;
  if (select count(*) from public.decisions) <> 0 then raise exception 'Decisions are not empty'; end if;
  if (select count(*) from public.profiles) <> 0 then raise exception 'Profiles are not empty'; end if;
  if (select count(*) from public.senate_roles) <> 4 then raise exception 'Role catalog missing'; end if;
  if (select count(*) from pg_class where relnamespace = 'public'::regnamespace and relkind='r' and relrowsecurity) <> 12
    then raise exception 'An exposed table is missing RLS'; end if;
end $$;
