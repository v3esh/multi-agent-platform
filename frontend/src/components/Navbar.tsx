"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/api";

export default function Navbar() {
  const pathname = usePathname();

  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/agents", label: "Agents" },
    { href: "/personas", label: "Personas" },
    { href: "/permissions", label: "Permission Profiles" },
    { href: "/approvals", label: "Approvals" },
    { href: "/logs", label: "Audit Logs" },
  ];

  return (
    <nav className="border-b border-white/10 px-8 py-4 flex items-center justify-between backdrop-blur-md sticky top-0 z-30 bg-[#0a0a0a]/80">
      <div className="flex items-center gap-6">
        <Link href="/dashboard" className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 hover:opacity-80 transition-opacity">
          MAP
        </Link>
        <div className="flex items-center gap-5">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  isActive
                    ? "text-white font-semibold border-b-2 border-blue-500 pb-0.5"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={logout}
          className="text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-lg transition-all"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
