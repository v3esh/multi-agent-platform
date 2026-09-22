"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const PUBLIC_PATHS = ["/login"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

    if (!token && !isPublic) {
      router.replace("/login");
    } else if (token && pathname === "/login") {
      router.replace("/dashboard");
    } else {
      setChecked(true);
    }
  }, [pathname, router]);

  if (!checked && !PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
