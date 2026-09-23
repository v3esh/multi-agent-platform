import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    let backendUrl = (
      process.env.BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://multi-agent-platform.railway.internal:8000"
    )
      .trim()
      .replace(/\/+$/, "");

    // Rewrite destinations must be absolute URLs; accept bare hostnames from env.
    if (!/^https?:\/\//i.test(backendUrl)) {
      backendUrl = `https://${backendUrl}`;
    }

    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
