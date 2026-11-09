create table public.culture_element_edits (
  id text primary key check (id <> '' and length(id) <= 200 and id <> 'jade'),
  fields jsonb not null check (jsonb_typeof(fields) = 'object' and octet_length(fields::text) <= 2000000)
);

alter table public.culture_element_edits enable row level security;
revoke all on public.culture_element_edits from public, anon, authenticated;
grant select on public.culture_element_edits to anon, authenticated;
create policy "Public culture element reads"
  on public.culture_element_edits for select to anon, authenticated using (true);

create function public.save_culture_element_edits(changes jsonb)
returns setof public.culture_element_edits
language plpgsql
security definer
set search_path = ''
as $$
declare
  change jsonb;
  patch jsonb;
begin
  if jsonb_typeof(changes) is distinct from 'array' then
    raise exception 'Expected an array of element changes';
  end if;
  for change in select value from jsonb_array_elements(changes) order by value->>'id' loop
    patch := change->'fields';
    if jsonb_typeof(patch) is distinct from 'object'
        or (patch ? 'scores' and jsonb_typeof(patch->'scores') is distinct from 'object') then
      raise exception 'Invalid element fields';
    end if;
    return query
      insert into public.culture_element_edits as edits (id, fields)
      values (change->>'id', patch - 'id')
      on conflict (id) do update set fields =
        case when excluded.fields ? 'scores' then
          jsonb_set(edits.fields || excluded.fields, '{scores}',
            coalesce(edits.fields->'scores', '{}'::jsonb) || (excluded.fields->'scores'))
        else edits.fields || excluded.fields end
      returning edits.*;
  end loop;
end;
$$;

revoke all on function public.save_culture_element_edits(jsonb) from public, anon, authenticated;
grant execute on function public.save_culture_element_edits(jsonb) to anon, authenticated;
