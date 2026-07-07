"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Size Premium Dashboard" },
  { href: "/lookup", label: "Cost of Equity Lookup" },
  { href: "/export", label: "Export" },
  { href: "/methodology", label: "Methodology" },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center h-14 gap-1 overflow-x-auto">
        <span className="font-semibold text-slate-900 pr-4 whitespace-nowrap">Size Premium Tool</span>
        <nav className="flex gap-1">
          {LINKS.map((link) => {
            const active = pathname?.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition ${
                  active
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
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
