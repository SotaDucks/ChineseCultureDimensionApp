begin;

create table public.culture_element_deletions (
  id text primary key check (id <> '' and length(id) <= 200 and id <> 'jade')
);

alter table public.culture_element_deletions enable row level security;
revoke all on public.culture_element_deletions from public, anon, authenticated;
grant select on public.culture_element_deletions to anon, authenticated;
create policy "Public culture element deletion reads"
  on public.culture_element_deletions for select to anon, authenticated using (true);

create or replace function public.save_culture_element_edits(changes jsonb)
returns setof public.culture_element_edits
language plpgsql
security definer
set search_path = ''
as $$
declare
  change jsonb;
  target_id text;
  patch jsonb;
begin
  if jsonb_typeof(changes) is distinct from 'array' then
    raise exception 'Expected an array of element changes';
  end if;
  for change in select value from jsonb_array_elements(changes) order by value->>'id' loop
    target_id := change->>'id';
    patch := change->'fields';
    if jsonb_typeof(patch) is distinct from 'object'
        or (patch ? 'scores' and jsonb_typeof(patch->'scores') is distinct from 'object') then
      raise exception 'Invalid element fields';
    end if;

    -- Serialize saves and deletes of the same ID, including records that do not exist yet.
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(target_id, 0));
    if exists (select 1 from public.culture_element_deletions where id = target_id) then
      raise sqlstate 'PT410' using message = 'This culture element has been deleted';
    end if;

    return query
      insert into public.culture_element_edits as edits (id, fields)
      values (target_id, patch - 'id')
      on conflict (id) do update set fields =
        case when excluded.fields ? 'scores' then
          jsonb_set(edits.fields || excluded.fields, '{scores}',
            coalesce(edits.fields->'scores', '{}'::jsonb) || (excluded.fields->'scores'))
        else edits.fields || excluded.fields end
      returning edits.*;
  end loop;
end;
$$;

create function public.delete_culture_element(element_id text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(element_id, 0));

  insert into public.culture_element_deletions (id)
  values (element_id)
  on conflict (id) do nothing;

  delete from public.culture_element_edits where id = element_id;
  return true;
end;
$$;

revoke all on function public.delete_culture_element(text) from public, anon, authenticated;
grant execute on function public.delete_culture_element(text) to anon, authenticated;

notify pgrst, 'reload schema';
commit;
