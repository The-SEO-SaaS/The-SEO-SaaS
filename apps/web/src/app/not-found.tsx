"use client";

import { Button } from "@theseosaas/ui/components/button";
import { Compass } from "lucide-react";
import Link from "next/link";

import { StatusScreen } from "@/components/layout/status-screen";

/**
 * 404.
 *
 * A meaningful share of these will be someone opening an expired or mistyped
 * audit link, so the primary action is running a new audit rather than a bare
 * "go home" — it turns a dead end back into the funnel.
 *
 * Client component, not because it needs interactivity, but because it hands
 * `Compass` — a component reference, not JSX — to StatusScreen, which is
 * itself a client component. A function reference can't cross the
 * server→client boundary unserialized (React: "Functions cannot be passed
 * directly to Client Components"), and Next prerenders the global /_not-found
 * route at build time, so this broke the build rather than just erroring at
 * runtime. Same reasoning error.tsx already follows.
 */
export default function NotFound() {
  return (
    <StatusScreen
      icon={Compass}
      title="That page doesn't exist"
      description="The link may be mistyped, or the report it pointed to has expired. Audits stay available for anyone with the link, but only while the report is still live."
      actions={
        <>
          <Button render={<Link href="/" />}>Run a free audit</Button>
          <Button variant="outline" render={<Link href="/blog" />}>
            Read the blog
          </Button>
        </>
      }
    />
  );
}
