"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useOptionalReader } from "@/components/ReaderProvider";

type HomeLinkProps = {
  children: ReactNode;
  className?: string;
};

export default function HomeLink({ children, className }: HomeLinkProps) {
  const pathname = usePathname();
  const reader = useOptionalReader();

  function handleClick() {
    if (pathname !== "/") return;
    reader?.resetHomeEntry();
    reader?.setStoryChapterContext(null, null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <Link href="/" onClick={handleClick} className={className}>
      {children}
    </Link>
  );
}