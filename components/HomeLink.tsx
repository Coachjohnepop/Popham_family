"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";
import { useOptionalReader } from "@/components/ReaderProvider";

type HomeLinkProps = {
  children: ReactNode;
  className?: string;
};

/** Always returns to the main landing page and clears in-app research state. */
export default function HomeLink({ children, className }: HomeLinkProps) {
  const pathname = usePathname();
  const router = useRouter();
  const reader = useOptionalReader();

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    reader?.resetToLanding();

    if (pathname === "/") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    router.push("/");
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  return (
    <Link href="/" className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}