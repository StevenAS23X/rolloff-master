import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { CrossTabSync } from "@/components/CrossTabSync";
import { APP_VERSION, BUILD_SHA, BUILD_TIME } from "@/lib/version";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Roll Off Tracker Pro",
  description: "Dumpster roll-off ticket and timer tracking",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <CrossTabSync />
        <Nav />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
        <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
          <p>Roll Off Tracker Pro — built by Serpent Software LLC</p>
          <p className="mt-0.5 text-slate-300" title={BUILD_TIME ?? undefined}>
            v{APP_VERSION} · {BUILD_SHA}
            {BUILD_TIME &&
              ` · built ${new Date(BUILD_TIME).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}`}
          </p>
        </footer>
      </body>
    </html>
  );
}
