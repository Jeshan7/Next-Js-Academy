import type { Metadata } from "next";
import "./globals.css";
import { ProgressProvider } from "@/lib/progress";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Next.js Academy",
  description: "Learn Next.js from first principles, with a real editor and live sandbox.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ProgressProvider>
          <AppShell>{children}</AppShell>
        </ProgressProvider>
      </body>
    </html>
  );
}
