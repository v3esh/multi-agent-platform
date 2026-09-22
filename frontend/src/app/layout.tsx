import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import AuthGuard from "@/components/AuthGuard";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Multi-Agent Platform",
  description: "Manage AI-driven social personas from a centralized command center.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={geist.className}>
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  );
}
