import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/auth/auth-provider";
import { UserProfile } from "@/components/auth/user-profile";
import { Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "VIdia - AI Video Idea Generator",
  description: "Generate viral video ideas using AI and YouTube trends",
  generator: "v0.dev",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
        >
          <AuthProvider>
            <div className="min-h-screen flex flex-col">
              <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-14 items-center">
                  <div className="flex items-center gap-2 font-bold">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <a href="/" className="font-semibold text-lg">
                      VIdia
                    </a>
                  </div>
                  <nav className="ml-auto flex items-center gap-4">
                    <Button variant="ghost" size="sm" asChild>
                      <a href="/">Dashboard</a>
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <a href="/analytics">Analytics</a>
                    </Button>
                    <UserProfile />
                  </nav>
                </div>
              </header>
              <main className="flex-1">{children}</main>
            </div>
            <Toaster position="top-right" />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
