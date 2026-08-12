import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Prime IV Loyalty",
    short_name: "Prime IV",
    description: "Prime IV loyalty rewards, member QR, and self-booking portal.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f5f9fc",
    theme_color: "#073f75",
    orientation: "portrait-primary",
    icons: [
      { src: "/prime-iv-logo.png", sizes: "400x400", type: "image/png", purpose: "any" },
      { src: "/prime-iv-logo.png", sizes: "400x400", type: "image/png", purpose: "maskable" },
    ],
  };
}
