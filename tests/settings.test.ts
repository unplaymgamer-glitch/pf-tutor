import { describe, it, expect } from "vitest";
import { sanitizeSettings, DEFAULT_SETTINGS } from "@/lib/settings";

describe("sanitizeSettings", () => {
  it("returns defaults for garbage", () => {
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings("x")).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings({ theme: "pink", lang: 5 })).toEqual(DEFAULT_SETTINGS);
  });
  it("clamps font scale", () => {
    expect(sanitizeSettings({ fontScale: 9 }).fontScale).toBe(1.5);
    expect(sanitizeSettings({ fontScale: 0.1 }).fontScale).toBe(0.9);
    expect(sanitizeSettings({ fontScale: NaN }).fontScale).toBe(1);
  });
  it("keeps valid values", () => {
    const s = sanitizeSettings({ theme: "light", lang: "ur", lowData: true });
    expect(s.theme).toBe("light");
    expect(s.lang).toBe("ur");
    expect(s.lowData).toBe(true);
  });
});
