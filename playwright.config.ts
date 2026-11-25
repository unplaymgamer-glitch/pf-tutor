import { defineConfig } from "@playwright/test";

// Default: run against a production build served locally (all 16 weeks opened, in-memory store, no database needed).
// Set PW_BASE_URL to run the smoke tests against a deployed site instead (no local server is started).
// Uses the Chrome already installed on the machine (no browser download); set PW_CHANNEL=msedge for Edge.
const remote = process.env.PW_BASE_URL;
const base = remote ?? "http://localhost:3112";
// The existing tests read English labels, so they start with the English interface chosen (the real default for new students is Roman Urdu; tests/e2e/i18n.spec.ts covers all three languages).
const storageState = { cookies: [], origins: [{ origin: new URL(base).origin, localStorage: [{ name: "cc111.settings.v1", value: JSON.stringify({ lang: process.env.PW_LANG ?? "en" }) }] }] };
export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  retries: 0,
  workers: 2,
  reporter: [["list"]],
  use: { baseURL: base, storageState, channel: process.env.PW_CHANNEL ?? "chrome", trace: "off", headless: !process.env.PW_HEADED, launchOptions: { slowMo: Number(process.env.PW_SLOWMO ?? 0) } },
  webServer: remote ? undefined : {
    command: "npx next start -p 3112",
    url: "http://localhost:3112",
    reuseExistingServer: true,
    timeout: 120_000,
    env: { CC111_STORE: "memory" },
  },
});
