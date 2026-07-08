import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import HomeEntryWatcher from "@/components/HomeEntryWatcher";
import { ReaderProvider } from "@/components/ReaderProvider";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "The Story of Winifred Coss",
  description:
    "An interactive family history storybook, family tree, and map — where the Coss family tree meets famous moments in history.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "The Story of Winifred Coss",
    description:
      "Interactive family history storybook, family tree chart, and map & timeline — Powers and Goodwater branches to Winifred Eloise Coss.",
    url: SITE_URL,
    siteName: "The Story of Winifred Coss",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ReaderProvider>
          <HomeEntryWatcher />
          {children}
        </ReaderProvider>
      </body>
    </html>
  );
}
