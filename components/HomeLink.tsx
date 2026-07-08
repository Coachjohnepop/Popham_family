"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useOptionalReader } from "@/components/ReaderProvider";

type HomeLinkProps = {
  children: ReactNode;
  className?: string;
};

/** Always returns to the main landing page and clears in-app research state. */
export default function HomeLink({ children, className }: HomeLinkProps) {
  const pathname = usePathname();
  const reader = useOptionalReader();

  function handleClick() {
    reader?.resetToLanding();
    if (pathname === "/") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <Link href="/" className={className} scroll onClick={handleClick}>
      {children}
    </Link>
  );
}