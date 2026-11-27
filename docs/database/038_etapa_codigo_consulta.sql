-- Etapa 38: codigo de consulta curto + protecao contra tentativas em massa.
-- Seguro para reexecucao.

alter table public.appointments
  add column if not exists codigo_consulta text;

alter table public.appointments drop constraint if exists appointments_codigo_consulta_format;
alter table public.appointments
  add constraint appointments_codigo_consulta_format
  check (codigo_consulta is null or codigo_consulta ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{6}$');

-- 6 caracteres de um alfabeto sem 0/O/1/I/L
create or replace function public.generate_booking_code()
returns text
language plpgsql
volatile
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  bytes bytea := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
  result text := '';
  i integer;
begin
  for i in 0..5 loop
    result := result || substr(alphabet, (get_byte(bytes, i) % 31) + 1, 1);
  end loop;

  return result;
end;
$$;

-- garante codigo unico por empresa nos pedidos online
create or replace function public.set_booking_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate text;
  attempts integer := 0;
begin
  if new.codigo_consulta is not null then
    return new;
  end if;

  loop
    candidate := public.generate_booking_code();

    exit when not exists (
      select 1 from public.appointments a
      where a.company_id = new.company_id and a.codigo_consulta = candidate
    );

    attempts := attempts + 1;

    if attempts > 20 then
      raise exception 'Nao foi possivel gerar o codigo de consulta.';
    end if;
  end loop;

  new.codigo_consulta := candidate;
  return new;
end;
$$;

-- pedidos online que ja existem ganham codigo
update public.appointments
set codigo_consulta = public.generate_booking_code()
where origem = 'online' and codigo_consulta is null;

create unique index if not exists idx_appointments_company_codigo
  on public.appointments (company_id, codigo_consulta)
  where codigo_consulta is not null;

drop trigger if exists trg_appointments_booking_code on public.appointments;
create trigger trg_appointments_booking_code
before insert on public.appointments
for each row
when (new.origem = 'online')
execute function public.set_booking_code();

-- tentativas de consulta que falharam (so o servidor acessa)
create table if not exists public.public_lookup_attempts (
  id bigint generated always as identity primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  ip_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_lookup_attempts_ip
  on public.public_lookup_attempts (ip_hash, created_at desc);
create index if not exists idx_lookup_attempts_company
  on public.public_lookup_attempts (company_id, created_at desc);
create index if not exists idx_lookup_attempts_created
  on public.public_lookup_attempts (created_at);

alter table public.public_lookup_attempts enable row level security;
revoke all on public.public_lookup_attempts from anon, authenticated;