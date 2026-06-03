/** @vitest-environment node */

import { describe, it, expect } from "vitest";

import { parseExpiryToSeconds } from "@/lib/auth/session";

describe("parseExpiryToSeconds", () => {
  it.each([
    ["60s", 60],
    ["30m", 1800],
    ["1h", 3600],
    ["2h", 7200],
    ["7d", 604800],
    ["3600", 3600], // sem unidade = segundos
  ])("interpreta %s como %i segundos", (input, expected) => {
    expect(parseExpiryToSeconds(input)).toBe(expected);
  });

  it("usa fallback de 1h para formato inválido", () => {
    expect(parseExpiryToSeconds("nao-eh-um-formato")).toBe(3600);
    expect(parseExpiryToSeconds("")).toBe(3600);
  });
});
