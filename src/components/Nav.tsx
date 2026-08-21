"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore, useCurrentAccount } from "@/lib/store";
import { DumpsterIcon } from "@/components/DumpsterIcon";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ZoomControl } from "@/components/ZoomControl";
import { NotificationBell } from "@/components/NotificationBell";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", adminOnly: false, desktopOnly: false },
  { href: "/tickets", label: "Tickets", adminOnly: false, desktopOnly: false },
  { href: "/dumpsters", label: "Dumpsters", adminOnly: false, desktopOnly: false },
  { href: "/customers", label: "Customers", adminOnly: false, desktopOnly: false },
  // Admin's Excel-like editing tables aren't built for a phone screen — see the matching
  // md:hidden gate on the /admin page itself, which is the part that actually matters (this
  // just keeps the link from showing up on mobile in the first place).
  { href: "/admin", label: "Admin", adminOnly: true, desktopOnly: true },
];

export function Nav() {
  const pathname = usePathname();
  const accounts = useStore((s) => s.accounts);
  const login = useStore((s) => s.login);
  const logout = useStore((s) => s.logout);
  const account = useCurrentAccount();

  const links = LINKS.filter((l) => !l.adminOnly || account?.role === "admin");

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100"
        >
          <DumpsterIcon className="h-6 w-9" />
          Roll Off Tracker Pro
        </Link>

        <div className="order-2 flex items-center gap-2 sm:order-3">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400" htmlFor="account-select">
            {account ? "Logged in as" : "Not logged in"}
          </label>
          <select
            id="account-select"
            value={account?.id ?? ""}
            onChange={(e) => (e.target.value ? login(e.target.value) : logout())}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="">Log out</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} — {a.role[0].toUpperCase() + a.role.slice(1)}
              </option>
            ))}
          </select>
          {account?.role === "admin" && <NotificationBell />}
          <ZoomControl />
          <ThemeToggle />
        </div>

        <nav className="order-3 flex w-full flex-wrap items-center gap-1 sm:order-2 sm:w-auto">
          {links.map((link) => {
            const active = pathname === link.href || pathname?.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap rounded-md px-3.5 py-2 text-base font-bold transition-colors ${
                  link.desktopOnly ? "hidden md:inline-block" : ""
                } ${
                  active
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
