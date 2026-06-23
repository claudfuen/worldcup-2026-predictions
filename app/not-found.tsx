import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70svh] max-w-md flex-col items-center justify-center px-6 text-center">
      <div className="bg-card border-border w-full rounded-2xl border p-8">
        <div className="text-3xl">🏆</div>
        <h1 className="mt-3 text-xl font-semibold tracking-tight">Page not found</h1>
        <p className="text-muted-foreground mt-2 text-sm">That page does not exist. Head back to the live forecast.</p>
        <Link
          href="/"
          className="bg-primary text-primary-foreground mt-5 inline-block rounded-full px-4 py-2 text-sm font-medium focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          Go to Overview
        </Link>
      </div>
    </main>
  );
}
