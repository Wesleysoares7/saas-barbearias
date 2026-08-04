# Etapa 6 - Testes basicos de conflito de horario

## Pre-requisitos
- Script `docs/database/002_etapa6_conflito_agendamentos.sql` executado no Supabase.
- Pelo menos 1 funcionario ativo e 1 servico ativo cadastrados.

## Casos de teste

1. Criacao sem conflito
- Criar agendamento para funcionario A as 14:00 com servico de 60 min.
- Esperado: sucesso.

2. Conflito no mesmo funcionario (sobreposicao)
- Criar outro para funcionario A as 14:30.
- Esperado: bloqueio com mensagem amigavel de horario indisponivel.

3. Sem conflito para outro funcionario
- Criar para funcionario B as 14:30.
- Esperado: sucesso.

4. Reagendamento com conflito
- Editar um agendamento existente do funcionario A para horario que sobrepoe outro agendado.
- Esperado: bloqueio com mensagem de conflito.

5. Cancelado nao bloqueia
- Marcar um agendamento como cancelado e tentar criar outro no mesmo intervalo.
- Esperado: permitido.

6. Integridade no banco
- Tentar inserir manualmente no SQL Editor dois agendamentos sobrepostos para mesmo funcionario com status agendado.
- Esperado: erro de constraint `appointments_no_overlap_per_employee`.

## Timezone
- O front envia datetime local e o backend converte para ISO (UTC).
- A comparacao de conflito ocorre com timestamptz no banco, mantendo consistencia.
