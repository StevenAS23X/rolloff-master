"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", adminOnly: false },
  { href: "/tickets", label: "Tickets", adminOnly: false },
  { href: "/admin", label: "Admin", adminOnly: true },
];

export function Nav() {
  const pathname = usePathname();
  const role = useStore((s) => s.role);
  const setRole = useStore((s) => s.setRole);

  const links = LINKS.filter((l) => !l.adminOnly || role === "admin");

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/dashboard" className="text-base font-bold text-slate-900">
          🗑️ RollOff Tracker
        </Link>

        <nav className="flex items-center gap-1 overflow-x-auto">
          {links.map((link) => {
            const active = pathname === link.href || pathname?.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-500" htmlFor="role-select">
            Role
          </label>
          <select
            id="role-select"
            value={role}
            onChange={(e) => setRole(e.target.value as "admin" | "dispatch")}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm font-medium text-slate-700"
          >
            <option value="dispatch">Dispatch</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>
    </header>
  );
}
