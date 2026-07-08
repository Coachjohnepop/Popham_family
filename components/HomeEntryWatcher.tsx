"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useOptionalReader } from "@/components/ReaderProvider";

/** When the route is the landing page, reset chapter context and remount entry UI. */
export default function HomeEntryWatcher() {
  const pathname = usePathname();
  const reader = useOptionalReader();

  const resetToLanding = reader?.resetToLanding;

  useEffect(() => {
    if (pathname === "/") {
      resetToLanding?.();
    }
  }, [pathname, resetToLanding]);

  return null;
}