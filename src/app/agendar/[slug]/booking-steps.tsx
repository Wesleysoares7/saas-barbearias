import Link from "next/link";
import type { ReactNode } from "react";

import {
  TIME_PATTERN,
  UUID_PATTERN,
  getAvailableTimes,
  getBookableDates,
  getPublicOptions,
  isValidDateChoice,
  type PublicCompany,
} from "@/lib/agendamento-publico/data";

type Query = Record<string, string | string[] | undefined>;

const OPTION_CLASS =
  "flex min-h-14 items-center justify-between gap-3 rounded-xl border border-border bg-surface-2 p-3 transition hover:border-brand";

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function buildHref(
  slug: string,
  params: Record<string, string | undefined>,
): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      search.set(key, value);
    }
  }

  const text = search.toString();

  return text ? `/agendar/${slug}?${text}` : `/agendar/${slug}`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function dayParts(date: string): { weekday: string; day: string } {
  const value = new Date(`${date}T12:00:00Z`);

  return {
    weekday: new Intl.DateTimeFormat("pt-BR", {
      weekday: "short",
      timeZone: "UTC",
    })
      .format(value)
      .replace(".", ""),
    day: new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      timeZone: "UTC",
    }).format(value),
  };
}

function formatLongDate(date: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

function StepCard({
  number,
  title,
  summary,
  changeHref,
  children,
}: {
  number: number;
  title: string;
  summary?: string;
  changeHref?: string;
  children?: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="inline-flex size-6 items-center justify-center rounded-full bg-brand/15 text-xs text-brand">
            {number}
          </span>
          {title}
        </h2>
        {changeHref ? (
          <Link
            href={changeHref}
            className="inline-flex min-h-11 items-center text-sm font-medium text-brand"
          >
            Alterar
          </Link>
        ) : null}
      </div>
      {summary ? (
        <p className="mt-1 text-sm text-muted-foreground">{summary}</p>
      ) : null}
      {children ? <div className="mt-3">{children}</div> : null}
    </section>
  );
}

export async function BookingSteps({
  company,
  query,
}: {
  company: PublicCompany;
  query: Query;
}) {
  const now = new Date();
  const { services, employees } = await getPublicOptions(company.id);

  const serviceId = first(query.servico);
  const employeeId = first(query.profissional);
  const date = first(query.data);
  const time = first(query.hora);

  const service = UUID_PATTERN.test(serviceId)
    ? services.find((item) => item.id === serviceId)
    : undefined;
  const employee =
    service && UUID_PATTERN.test(employeeId)
      ? employees.find((item) => item.id === employeeId)
      : undefined;
  const dateOk = Boolean(
    service && employee && isValidDateChoice(company, date, now),
  );

  const [dates, times] = await Promise.all([
    service && employee
      ? getBookableDates(company, employee.id, now)
      : Promise.resolve([] as string[]),
    service && employee && dateOk
      ? getAvailableTimes({
          company,
          employeeId: employee.id,
          durationMin: service.duracao,
          date,
          now,
        })
      : Promise.resolve([] as string[]),
  ]);

  const timeOk = dateOk && TIME_PATTERN.test(time) && times.includes(time);
  const slug = company.slug;

  return (
    <div className="space-y-3">
      <StepCard
        number={1}
        title="Serviço"
        summary={
          service
            ? `${service.nome} · ${service.duracao} min · ${formatCurrency(service.valor)}`
            : undefined
        }
        changeHref={service ? buildHref(slug, {}) : undefined}
      >
        {service ? null : services.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum serviço disponível no momento.
          </p>
        ) : (
          <div className="space-y-2">
            {services.map((item) => (
              <Link
                key={item.id}
                href={buildHref(slug, { servico: item.id })}
                className={OPTION_CLASS}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {item.nome}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {item.duracao} min
                  </span>
                </span>
                <span className="shrink-0 text-sm font-semibold text-foreground">
                  {formatCurrency(item.valor)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </StepCard>

      {service ? (
        <StepCard
          number={2}
          title="Profissional"
          summary={employee?.nome}
          changeHref={
            employee ? buildHref(slug, { servico: service.id }) : undefined
          }
        >
          {employee ? null : employees.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum profissional com horário disponível no momento.
            </p>
          ) : (
            <div className="space-y-2">
              {employees.map((item) => (
                <Link
                  key={item.id}
                  href={buildHref(slug, {
                    servico: service.id,
                    profissional: item.id,
                  })}
                  className={OPTION_CLASS}
                >
                  <span className="truncate text-sm font-medium text-foreground">
                    {item.nome}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </StepCard>
      ) : null}

      {service && employee ? (
        <StepCard
          number={3}
          title="Dia"
          summary={dateOk ? formatLongDate(date) : undefined}
          changeHref={
            dateOk
              ? buildHref(slug, {
                  servico: service.id,
                  profissional: employee.id,
                })
              : undefined
          }
        >
          {dateOk ? null : dates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum dia disponível nos próximos dias.
            </p>
          ) : (
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {dates.map((item) => {
                const parts = dayParts(item);

                return (
                  <Link
                    key={item}
                    href={buildHref(slug, {
                      servico: service.id,
                      profissional: employee.id,
                      data: item,
                    })}
                    className="flex min-h-14 min-w-[4.5rem] shrink-0 flex-col items-center justify-center rounded-xl border border-border bg-surface-2 px-3 text-center transition hover:border-brand"
                  >
                    <span className="text-xs capitalize text-muted-foreground">
                      {parts.weekday}
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {parts.day}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </StepCard>
      ) : null}

      {service && employee && dateOk ? (
        <StepCard
          number={4}
          title="Horário"
          summary={timeOk ? time : undefined}
          changeHref={
            timeOk
              ? buildHref(slug, {
                  servico: service.id,
                  profissional: employee.id,
                  data: date,
                })
              : undefined
          }
        >
          {timeOk ? null : times.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sem horários livres neste dia. Escolha outro dia.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {times.map((item) => (
                <Link
                  key={item}
                  href={buildHref(slug, {
                    servico: service.id,
                    profissional: employee.id,
                    data: date,
                    hora: item,
                  })}
                  className="flex h-12 items-center justify-center rounded-xl border border-border bg-surface-2 text-sm font-medium text-foreground transition hover:border-brand"
                >
                  {item}
                </Link>
              ))}
            </div>
          )}
        </StepCard>
      ) : null}

      {timeOk && service && employee ? (
        <section className="rounded-xl border border-brand/40 bg-brand/10 p-4 text-sm text-foreground">
          <p className="font-semibold">Seu pedido</p>
          <p className="mt-1 text-muted-foreground">
            {service.nome} com {employee.nome}, {formatLongDate(date)} às {time}
            .
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            O envio do pedido estará disponível em breve.
          </p>
        </section>
      ) : null}
    </div>
  );
}
