// Device tier detection: decides how much 3D / animation to use.
export type Tier = "high" | "medium" | "low";

export type DeviceSignals = {
  width: number;
  cores?: number;
  memoryGB?: number;
  webgl: boolean;
  reducedMotion: boolean;
  saveData: boolean;
  slowConnection: boolean;
  userThreeD: "auto" | "on" | "off";
  lowDataSetting: boolean;
};

/** Pure function, unit-tested. Low tier = 2D animated diagrams only. */
export function computeTier(s: DeviceSignals): Tier {
  if (s.userThreeD === "off") return "low";
  if (!s.webgl) return "low";
  if (s.userThreeD === "on") return s.width >= 900 ? "high" : "medium";
  if (s.reducedMotion || s.saveData || s.slowConnection || s.lowDataSetting) return "low";
  if (s.width < 768) return "low"; // phones
  const cores = s.cores ?? 4;
  const mem = s.memoryGB ?? 4;
  if (cores >= 8 && mem >= 8 && s.width >= 1100) return "high";
  if (cores >= 4 && mem >= 4) return "medium";
  return "low";
}

export function detectSignals(
  userThreeD: DeviceSignals["userThreeD"],
  lowDataSetting: boolean
): DeviceSignals {
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean; effectiveType?: string };
  };
  let webgl = false;
  try {
    const c = document.createElement("canvas");
    webgl = !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    webgl = false;
  }
  return {
    width: window.innerWidth,
    cores: nav.hardwareConcurrency,
    memoryGB: nav.deviceMemory,
    webgl,
    reducedMotion: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
    saveData: nav.connection?.saveData === true,
    slowConnection: ["slow-2g", "2g", "3g"].includes(nav.connection?.effectiveType ?? ""),
    userThreeD,
    lowDataSetting,
  };
}
