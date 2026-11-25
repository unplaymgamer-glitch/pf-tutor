import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export const alt = `${SITE_NAME}: ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "#0b1020", color: "#e8ecf8" }}>
        <div style={{ fontSize: 120, fontWeight: 700, color: "#22d3ee" }}>C++</div>
        <div style={{ fontSize: 68, fontWeight: 700, marginTop: 10 }}>{SITE_NAME}</div>
        <div style={{ fontSize: 40, marginTop: 16, color: "#9aa6c8" }}>{SITE_TAGLINE}</div>
        <div style={{ fontSize: 30, marginTop: 40, color: "#9aa6c8" }}>16 weeks · animations · code you can run · practice and quizzes</div>
      </div>
    ),
    size,
  );
}
