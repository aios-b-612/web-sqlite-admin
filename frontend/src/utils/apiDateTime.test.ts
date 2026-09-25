import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  apiDateTimeToLocalDate,
  formatApiDateTimeAsUtc,
  formatApiDateTimeForUser,
  getOperatorTimeZone,
  parseApiDateTime,
  toApiUtcDateTime,
} from "./apiDateTime";

dayjs.extend(utc);

describe("apiDateTime", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getOperatorTimeZone usa Intl do browser", () => {
    vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
      locale: "pt-BR",
      calendar: "gregory",
      numberingSystem: "latn",
      timeZone: "America/Manaus",
      year: "numeric",
      month: "numeric",
      day: "numeric",
    } as Intl.ResolvedDateTimeFormatOptions);

    expect(getOperatorTimeZone()).toBe("America/Manaus");
  });

  it("parseApiDateTime trata naive da API como UTC", () => {
    const parsed = parseApiDateTime("2026-07-20 20:23:00");
    expect(parsed).not.toBeNull();
    expect(parsed!.utc().format("YYYY-MM-DD HH:mm:ss")).toBe(
      "2026-07-20 20:23:00",
    );
  });

  it("parseApiDateTime aceita ISO com Z", () => {
    const parsed = parseApiDateTime("2026-07-20T20:23:00.000Z");
    expect(parsed).not.toBeNull();
    expect(parsed!.utc().format("YYYY-MM-DD HH:mm:ss")).toBe(
      "2026-07-20 20:23:00",
    );
  });

  // Regressão: #355 — naive da API lido como local fazia ganho “antes” da criação
  it("regression_formatApiDateTimeForUser_converte_UTC_naive_para_fuso_do_operador", () => {
    const utcWall = "2026-07-20 20:23:00";
    const expected = dayjs.utc(utcWall).local().format("DD/MM/YYYY HH:mm");

    expect(formatApiDateTimeForUser(utcWall)).toBe(expected);
    expect(formatApiDateTimeForUser("2026-07-20T20:23:00.000Z")).toBe(expected);

    // Bug antigo: dayjs(naive) tratava UTC como relógio local
    const wrongAsLocal = dayjs(utcWall).format("DD/MM/YYYY HH:mm");
    if (new Date().getTimezoneOffset() !== 0) {
      expect(formatApiDateTimeForUser(utcWall)).not.toBe(wrongAsLocal);
    }
  });

  it("toApiUtcDateTime envia instante do DatePicker em UTC naive", () => {
    const local = new Date(2026, 6, 20, 17, 23, 0);
    const expected = dayjs(local).utc().format("YYYY-MM-DD HH:mm:ss");
    expect(toApiUtcDateTime(local)).toBe(expected);
  });

  it("apiDateTimeToLocalDate round-trip preserva instante", () => {
    const original = "2026-07-20 20:23:00";
    const localDate = apiDateTimeToLocalDate(original);
    expect(localDate).not.toBeNull();
    expect(toApiUtcDateTime(localDate!)).toBe(original);
  });

  it("formatApiDateTimeAsUtc inclui sufixo UTC", () => {
    expect(formatApiDateTimeAsUtc("2026-07-20 20:23:00")).toBe(
      "20/07/2026 20:23 UTC",
    );
  });
});
