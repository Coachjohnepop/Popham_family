"use client";

import type { ReactNode } from "react";
import { useOptionalReader } from "@/components/ReaderProvider";

type LandingEntryProps = {
  children: ReactNode;
};

/** Remounts landing interactive sections whenever Home is visited. */
export default function LandingEntry({ children }: LandingEntryProps) {
  const reader = useOptionalReader();
  const entryKey = reader?.homeEntryKey ?? 0;

  return <div key={entryKey}>{children}</div>;
}