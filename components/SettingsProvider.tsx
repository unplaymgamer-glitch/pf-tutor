"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { DEFAULT_SETTINGS, Settings, applySettings, loadSettings, saveSettings } from "@/lib/settings";
import { Tier, computeTier, detectSignals } from "@/lib/device-tier";

// Tiny external store: server render sees defaults, the browser reads localStorage. No hydration mismatch.
let current: Settings | null = null;
const listeners = new Set<() => void>();
const getSnapshot = (): Settings => (current ??= loadSettings());
const getServerSnapshot = (): Settings => DEFAULT_SETTINGS;
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  window.addEventListener("resize", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("resize", cb);
  };
};
function setSettings(next: Settings) {
  current = next;
  saveSettings(next);
  applySettings(next);
  listeners.forEach((l) => l());
}

type Ctx = { settings: Settings; update: (p: Partial<Settings>) => void; tier: Tier };
const SettingsCtx = createContext<Ctx>({ settings: DEFAULT_SETTINGS, update: () => {}, tier: "low" });
export const useSettings = () => useContext(SettingsCtx);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const settings = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const tier = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return computeTier(detectSignals(settings.threeD, settings.lowData));
      } catch {
        return "low" as Tier;
      }
    },
    () => "low" as Tier
  );

  useEffect(() => applySettings(settings), [settings]);

  const update = useCallback((p: Partial<Settings>) => setSettings({ ...getSnapshot(), ...p }), []);
  const value = useMemo(() => ({ settings, update, tier }), [settings, update, tier]);
  return <SettingsCtx.Provider value={value}>{children}</SettingsCtx.Provider>;
}
