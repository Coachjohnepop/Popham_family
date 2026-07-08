import Link from "next/link";
import { LEMONVOICE_URL } from "@/lib/site";

export default function SiteFooter() {
  return (
    <footer className="border-t border-[#d9cbb6] bg-[#fffaf2]">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-sm text-[#6f5c49] sm:flex-row sm:items-center sm:justify-between">
        <p>The Story of Winifred Coss — family history for Dad</p>
        <div className="flex flex-col gap-1 sm:items-end">
          <Link href="/" className="font-medium text-[#8b5e34] hover:text-[#6f4a28]">
            coss-family-story.vercel.app
          </Link>
          <p>
            Powered by{" "}
            <a
              href={LEMONVOICE_URL}
              className="font-medium text-[#8b5e34] hover:text-[#6f4a28]"
            >
              LemonVoice.com
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}