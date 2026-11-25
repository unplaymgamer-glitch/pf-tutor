// Admin-controlled tutor settings (stored as the `tutor` row in cc111_settings). Always sanitised: bad values fall back to safe defaults.
export type TutorSettings = {
  enabled: boolean;
  monthlyBudgetUSD: number;   // hard cap on Claude spend per calendar month (UTC)
  dailyPerDevice: number;     // Claude questions per anonymous device per day
  maxDeepPerDay: number;      // "Answer more deeply" (Sonnet) uses per device per day
  hintFirst: boolean;         // give hints before full solutions to assignment-like requests
  tier0Threshold: number;     // 0..1 confidence needed to answer from the course notes without calling Claude
};

export const DEFAULT_TUTOR: TutorSettings = { enabled: true, monthlyBudgetUSD: 5, dailyPerDevice: 20, maxDeepPerDay: 5, hintFirst: true, tier0Threshold: 0.8 };

const clamp = (v: unknown, lo: number, hi: number, d: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);

export function sanitizeTutorSettings(raw: unknown): TutorSettings {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    enabled: o.enabled !== false,
    monthlyBudgetUSD: clamp(o.monthlyBudgetUSD, 0, 1000, DEFAULT_TUTOR.monthlyBudgetUSD),
    dailyPerDevice: Math.round(clamp(o.dailyPerDevice, 0, 200, DEFAULT_TUTOR.dailyPerDevice)),
    maxDeepPerDay: Math.round(clamp(o.maxDeepPerDay, 0, 100, DEFAULT_TUTOR.maxDeepPerDay)),
    hintFirst: o.hintFirst !== false,
    tier0Threshold: clamp(o.tier0Threshold, 0.3, 1, DEFAULT_TUTOR.tier0Threshold),
  };
}
