import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import { AppLayout } from "@/components/layout/AppLayout";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "SalonManager - 美容サロン向け統合管理Webアプリ",
  description: "勤怠・給与・売上・手当・業務委託報酬の統合管理Webアプリ",
};

import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "sonner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={cn("font-sans", geist.variable)} suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased bg-slate-50`}
        suppressHydrationWarning
      >
        <AuthProvider>
          <AppLayout>{children}</AppLayout>
          <Toaster position="top-center" richColors />
        </AuthProvider>
      </body>
    </html>
  );
}
