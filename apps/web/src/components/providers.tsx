"use client";

import { Toaster } from "@theseosaas/ui/components/sonner";

/**
 * v0.1 is light mode only, so there is no ThemeProvider and no theme toggle.
 * Reintroducing one means adding a .dark token block to globals.css first —
 * the design file has no dark variants to work from.
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster richColors position="top-center" />
    </>
  );
}
