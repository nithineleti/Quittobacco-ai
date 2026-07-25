import type { MetadataRoute } from "next";

// app/manifest.ts convention → served at /manifest.webmanifest (§6 PWA).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "QuitTobacco — your quit journey",
    short_name: "QuitTobacco",
    description: "A calm, game-like companion to help you quit tobacco, with real rewards.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fbfaf7",
    theme_color: "#0e7a6b",
    categories: ["health", "medical", "lifestyle"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
