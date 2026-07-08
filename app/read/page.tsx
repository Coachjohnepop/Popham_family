import Link from "next/link";
import GuidedWelcome from "@/components/GuidedWelcome";
import HomeLink from "@/components/HomeLink";
import SiteFooter from "@/components/SiteFooter";

export default function GuidedReadPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f6f1e8] text-[#2b2118]">
      <header className="border-b border-[#d9cbb6] bg-[#fffaf2]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
          <div>
            <HomeLink className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#8b5e34] hover:text-[#6f4a28]">
              Home
            </HomeLink>
            <h1 className="font-serif text-2xl font-semibold">Guided reading</h1>
          </div>
          <Link
            href="/story"
            className="rounded-full bg-[#efe4d2] px-4 py-2 text-sm font-semibold text-[#5c4a38] hover:bg-[#e4d4bc]"
          >
            All tabs
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <GuidedWelcome />
      </main>
      <SiteFooter />
    </div>
  );
}