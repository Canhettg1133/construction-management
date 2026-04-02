import { describe, expect, it } from "vitest";
import { formatDate, isWithinDays } from "./date";

describe("date utils", () => {
  it("formatDate should return yyyy-mm-dd", () => {
    expect(formatDate(new Date("2026-04-02T10:00:00.000Z"))).toBe("2026-04-02");
  });

  it("isWithinDays should detect recent dates", () => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(isWithinDays(oneDayAgo, 2)).toBe(true);
  });
});
