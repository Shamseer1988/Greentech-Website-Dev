import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const media = new URL(
  process.env.MEDIA_PUBLIC_URL ?? "http://127.0.0.1:9000/greentech-media",
);

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: media.protocol === "https:" ? "https" : "http",
        hostname: media.hostname,
        port: media.port,
        pathname: `${media.pathname.replace(/\/$/, "")}/**`,
      },
    ],
  },
};

export default createNextIntlPlugin()(nextConfig);
