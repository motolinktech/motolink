import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Noto_Sans } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";

const notoSans = Noto_Sans({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Sistema Motolink",
  description: "Sistema de gestão interna da Motolink",
  applicationName: "Sistema Motolink",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", notoSans.variable)} suppressHydrationWarning>
      <TooltipProvider>
        <body>
          <ThemeProvider attribute="class" defaultTheme="light">
            {children}
            <Toaster position="top-right" richColors />
          </ThemeProvider>
        </body>
      </TooltipProvider>
    </html>
  );
}
