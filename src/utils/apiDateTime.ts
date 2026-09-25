import dayjs, { type Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

const HAS_TZ_OFFSET = /(?:[zZ]|[+-]\d{2}:?\d{2})$/;

/**
 * Fuso IANA do operador (browser). Clientes em qualquer região do Brasil/mundo.
 */
export function getOperatorTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/**
 * Interpreta datetime da API como instante UTC.
 * - Strings com `Z`/offset: parse ISO normal
 * - Naive (`YYYY-MM-DD HH:mm:ss` ou com `T`): contrato do CRM = UTC (sessão MySQL +00:00)
 */
export function parseApiDateTime(value?: string | null): Dayjs | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;

  if (HAS_TZ_OFFSET.test(trimmed)) {
    const parsed = dayjs(trimmed);
    return parsed.isValid() ? parsed : null;
  }

  const normalized = trimmed.includes("T")
    ? trimmed
    : trimmed.replace(" ", "T");
  const parsed = dayjs.utc(normalized);
  return parsed.isValid() ? parsed : null;
}

/** Exibe datetime da API no fuso do usuário que opera o sistema. */
export function formatApiDateTimeForUser(
  value?: string | null,
  format = "DD/MM/YYYY HH:mm",
): string {
  const parsed = parseApiDateTime(value);
  if (!parsed || parsed.year() < 1900) return "—";
  return parsed.local().format(format);
}

/**
 * Exibe o relógio UTC de propósito (ops/logs). Sempre inclui o sufixo ` UTC`.
 * Não usar para telas de cliente — preferir `formatApiDateTimeForUser`.
 */
export function formatApiDateTimeAsUtc(
  value?: string | null,
  format = "DD/MM/YYYY HH:mm",
): string {
  const parsed = parseApiDateTime(value);
  if (!parsed || parsed.year() < 1900) return "—";
  return `${parsed.utc().format(format)} UTC`;
}

/**
 * Converte um Date escolhido no DatePicker (fuso do operador) para
 * datetime naive UTC gravável na API (`YYYY-MM-DD HH:mm:ss`).
 */
export function toApiUtcDateTime(value: Date): string {
  return dayjs(value).utc().format("YYYY-MM-DD HH:mm:ss");
}

/** Date local para DatePicker a partir do valor UTC da API. */
export function apiDateTimeToLocalDate(value?: string | null): Date | null {
  const parsed = parseApiDateTime(value);
  if (!parsed) return null;
  return parsed.local().toDate();
}
