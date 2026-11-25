import { describe, it, expect } from "vitest";
import { computeTier, DeviceSignals } from "@/lib/device-tier";

const base: DeviceSignals = { width: 1440, cores: 8, memoryGB: 8, webgl: true, reducedMotion: false, saveData: false, slowConnection: false, userThreeD: "auto", lowDataSetting: false };
describe("computeTier", () => {
  it("desktop is high", () => expect(computeTier(base)).toBe("high"));
  it("phone is low", () => expect(computeTier({ ...base, width: 375 })).toBe("low"));
  it("no webgl is low even if user forces 3D", () => expect(computeTier({ ...base, webgl: false, userThreeD: "on" })).toBe("low"));
  it("user off wins", () => expect(computeTier({ ...base, userThreeD: "off" })).toBe("low"));
  it("save-data / reduced motion / low-data go low", () => {
    expect(computeTier({ ...base, saveData: true })).toBe("low");
    expect(computeTier({ ...base, reducedMotion: true })).toBe("low");
    expect(computeTier({ ...base, lowDataSetting: true })).toBe("low");
    expect(computeTier({ ...base, slowConnection: true })).toBe("low");
  });
  it("mid laptop is medium", () => expect(computeTier({ ...base, cores: 4, memoryGB: 4, width: 1000 })).toBe("medium"));
});
