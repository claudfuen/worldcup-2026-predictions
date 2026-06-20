import { SignInForm } from "./sign-in-form";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        We&apos;ll email you a magic link — no password. Sign in to save the matches you&apos;re tracking.
      </p>
      <SignInForm next={next && next.startsWith("/") ? next : "/matches"} />
    </main>
  );
}
