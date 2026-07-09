import NavBar from "@/components/NavBar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <NavBar />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">{children}</main>
      <footer className="text-center text-xs text-slate-400 dark:text-slate-600 py-6">
        Independent CRSP-derived approximation. Not affiliated with Kroll, Duff &amp; Phelps, or Ibbotson Associates.
      </footer>
    </div>
  );
}
