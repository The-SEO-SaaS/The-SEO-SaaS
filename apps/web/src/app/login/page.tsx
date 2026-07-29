import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in — TheSEOSaaS",
  // Sign-in pages have no business in search results.
  robots: { index: false, follow: false },
};

/**
 * /login
 *
 * `redirectTo` is threaded through both providers so someone who hit the
 * paywall on an audit report lands back on that report after signing in,
 * rather than on a dashboard with no memory of what they were doing.
 *
 * `error` is set by the OAuth and magic-link callbacks, which redirect here on
 * failure since the user arrived by browser navigation.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-4 py-12 sm:px-6">
      <div className="w-full max-w-sm">
        <LoginForm redirectTo={params.redirectTo} error={params.error} />
      </div>

      <p className="text-ink-300 mt-10 text-center text-sm">
        Haven&apos;t run an audit yet?{" "}
        <Link href="/" className="text-ink-500 text-sm">
          Try one free
        </Link>
      </p>
    </main>
  );
}
