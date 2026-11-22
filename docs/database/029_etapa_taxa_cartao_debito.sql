-- Etapa 29: taxa do cartao de debito. Seguro para reexecucao.
alter table public.companies add column if not exists taxa_cartao_debito numeric(5,2);

alter table public.companies drop constraint if exists companies_taxa_debito_range;
alter table public.companies add constraint companies_taxa_debito_range
  check (taxa_cartao_debito is null or (taxa_cartao_debito >= 0 and taxa_cartao_debito <= 100));

grant update (taxa_cartao_debito) on public.companies to authenticated;

-- gatilho passa a tratar credito e debito
create or replace function public.payments_apply_card_fee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_taxa numeric(5,2);
begin
  if new.forma_pagamento not in ('cartao_credito', 'cartao_debito') then
    new.taxa_percentual := 0;
    new.valor_taxa := 0;
    return new;
  end if;

  if tg_op = 'UPDATE' and old.forma_pagamento = new.forma_pagamento then
    v_taxa := old.taxa_percentual; -- edicao: mantem a taxa da epoca
  else
    select case new.forma_pagamento
             when 'cartao_credito' then c.taxa_cartao_credito
             else c.taxa_cartao_debito
           end
      into v_taxa
    from public.companies c
    where c.id = new.company_id;

    if v_taxa is null then
      if new.forma_pagamento = 'cartao_credito' then
        raise exception 'Informe a taxa do cartão de crédito em Configurações antes de registrar pagamentos no crédito.';
      else
        raise exception 'Informe a taxa do cartão de débito em Configurações antes de registrar pagamentos no débito.';
      end if;
    end if;
  end if;

  new.taxa_percentual := v_taxa;
  new.valor_taxa := round(new.valor * v_taxa / 100, 2);
  return new;
end;
$$;
