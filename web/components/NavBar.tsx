"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";

const LINKS = [
  { href: "/dashboard", label: "Size Premium Dashboard" },
  { href: "/lookup", label: "Cost of Equity Lookup" },
  { href: "/export", label: "Export" },
  { href: "/methodology", label: "Methodology" },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center h-14 gap-1 overflow-x-auto">
        <span className="font-semibold text-slate-900 dark:text-slate-100 pr-4 whitespace-nowrap">Size Premium Tool</span>
        <nav className="flex gap-1">
          {LINKS.map((link) => {
            const active = pathname?.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition ${
                  active
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto pl-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
