"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { usePortalStore } from "@/lib/portal-store";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { token, account, fetchMe } = usePortalStore();

  useEffect(() => {
    if (pathname === "/portal/login") return;
    if (!token) { router.push("/portal/login"); return; }
    if (!account) {
      fetchMe().catch(() => router.push("/portal/login"));
    }
  }, [token, pathname]);

  return <>{children}</>;
}
