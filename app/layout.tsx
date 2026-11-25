import type { Metadata, Viewport } from "next";
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/noto-nastaliq-urdu/400.css";
import "./globals.css";
import { PRE_HYDRATION_SCRIPT } from "@/lib/settings";
import { SettingsProvider } from "@/components/SettingsProvider";
import { Header } from "@/components/Header";
import { SiteStateProvider, AnnouncementBanner } from "@/components/SiteState";
import { Toasts } from "@/components/Toasts";
import { LeaderboardSync } from "@/components/game/LeaderboardPanel";
import { TutorProvider } from "@/components/tutor/TutorProvider";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";
import { Footer } from "@/components/Footer";
import { HideOnAdmin } from "@/components/HideOnAdmin";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME}: ${SITE_TAGLINE}`, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: { type: "website", siteName: SITE_NAME, title: `${SITE_NAME}: ${SITE_TAGLINE}`, description: SITE_DESCRIPTION },
  twitter: { card: "summary_large_image", title: `${SITE_NAME}: ${SITE_TAGLINE}`, description: SITE_DESCRIPTION },
};
export const viewport: Viewport = { themeColor: "#0b1020", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PRE_HYDRATION_SCRIPT }} />
      </head>
      <body className="min-h-dvh flex flex-col">
        <a className="skip-link" href="#main">Skip to lesson</a>
        <SettingsProvider>
          <SiteStateProvider>
            <TutorProvider>
              <HideOnAdmin><Header /></HideOnAdmin>
              <HideOnAdmin><AnnouncementBanner /></HideOnAdmin>
              <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
                {children}
              </main>
              <HideOnAdmin><Footer /></HideOnAdmin>
            </TutorProvider>
            <HideOnAdmin><Toasts /></HideOnAdmin>
            <LeaderboardSync />
          </SiteStateProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
