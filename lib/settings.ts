// Student settings: stored only on the device (localStorage). No accounts.
export type Theme = "system" | "dark" | "light";
export type Lang = "en" | "roman" | "ur";
export type Settings = {
  theme: Theme;
  lang: Lang;
  fontScale: number; // 0.9 .. 1.5
  reduceMotion: boolean;
  lowData: boolean;
  threeD: "auto" | "on" | "off";
  dyslexia: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  lang: "roman", // most students read Roman Urdu most easily; each student can switch to English or Urdu script and it is remembered in their own browser
  fontScale: 1,
  reduceMotion: false,
  lowData: false,
  threeD: "auto",
  dyslexia: false,
};

export const STORAGE_KEY = "cc111.settings.v1";

/** Parse and sanitise unknown stored data. Never throws; bad fields fall back to defaults. */
export function sanitizeSettings(raw: unknown): Settings {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const pick = <T extends string>(v: unknown, allowed: readonly T[], d: T): T =>
    typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : d;
  const fs = typeof o.fontScale === "number" && isFinite(o.fontScale) ? o.fontScale : 1;
  return {
    theme: pick(o.theme, ["system", "dark", "light"], "system"),
    lang: pick(o.lang, ["en", "roman", "ur"], "roman"),
    fontScale: Math.min(1.5, Math.max(0.9, fs)),
    reduceMotion: o.reduceMotion === true,
    lowData: o.lowData === true,
    threeD: pick(o.threeD, ["auto", "on", "off"], "auto"),
    dyslexia: o.dyslexia === true,
  };
}

export function loadSettings(): Settings {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return sanitizeSettings(s ? JSON.parse(s) : null);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* storage blocked: settings just won't persist */
  }
}

/** Apply settings to <html>. Urdu script switches lang=ur and dir=rtl; code stays LTR via CSS. */
export function applySettings(s: Settings, root: HTMLElement = document.documentElement): void {
  if (s.theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", s.theme);
  root.setAttribute("lang", s.lang === "ur" ? "ur" : "en");
  root.setAttribute("dir", s.lang === "ur" ? "rtl" : "ltr");
  root.style.setProperty("--fs-scale", String(s.fontScale));
  root.setAttribute("data-motion", s.reduceMotion || s.lowData ? "reduce" : "full");
  root.setAttribute("data-dyslexia", s.dyslexia ? "on" : "off");
}

/** Inline script (runs before first paint) mirroring applySettings, so there is no flash. */
export const PRE_HYDRATION_SCRIPT = `(function(){try{var s=JSON.parse(localStorage.getItem(${JSON.stringify(
  STORAGE_KEY
)})||"{}");var r=document.documentElement;if(s.theme==="dark"||s.theme==="light")r.setAttribute("data-theme",s.theme);if(s.lang==="ur"){r.setAttribute("lang","ur");r.setAttribute("dir","rtl")}var f=Number(s.fontScale);if(f>=0.9&&f<=1.5)r.style.setProperty("--fs-scale",String(f));if(s.reduceMotion||s.lowData)r.setAttribute("data-motion","reduce");if(s.dyslexia)r.setAttribute("data-dyslexia","on")}catch(e){}})();`;
