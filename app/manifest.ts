import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME}: Programming Fundamentals (C++)`, short_name: "CC111 PF", description: SITE_DESCRIPTION, start_url: "/", display: "standalone",
    background_color: "#0b1020", theme_color: "#0b1020",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
