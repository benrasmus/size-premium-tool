import { redirect } from "next/navigation";
import { authEnabled } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = params.next ?? "/dashboard";
  const hasError = params.error === "1";

  if (!authEnabled()) {
    redirect(next);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <h1 className="text-lg font-semibold text-slate-900 mb-1">Size Premium Tool</h1>
        <p className="text-sm text-slate-500 mb-6">Enter the shared password to continue.</p>
        <form action="/api/login" method="POST" className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <input
            type="password"
            name="password"
            autoFocus
            placeholder="Password"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
          {hasError && (
            <p className="text-sm text-red-600">Incorrect password. Try again.</p>
          )}
          <button
            type="submit"
            className="w-full rounded-md bg-slate-900 text-white text-sm font-medium py-2 hover:bg-slate-700 transition"
          >
            Enter
          </button>
        </form>
      </div>
    </div>
  );
}
