import { describe, it, expect } from "vitest";

import { timeAgo } from "@/lib/format/time-ago";

const NOW = new Date("2026-06-06T12:00:00.000Z");

describe("timeAgo", () => {
  it.each([
    ["2026-06-06T11:59:40.000Z", "agora"],
    ["2026-06-06T11:45:00.000Z", "há 15 min"],
    ["2026-06-06T07:00:00.000Z", "há 5 h"],
    ["2026-06-05T12:00:00.000Z", "ontem"],
    ["2026-06-03T12:00:00.000Z", "há 3 d"],
    ["2026-05-23T12:00:00.000Z", "há 2 sem"],
    ["2026-04-06T12:00:00.000Z", "há 2 meses"],
  ])("%s → %s", (iso, expected) => {
    expect(timeAgo(iso, NOW)).toBe(expected);
  });
});
