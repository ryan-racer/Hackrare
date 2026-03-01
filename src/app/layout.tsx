import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { APP_NAME } from "@/constants";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Track symptoms with AI-assisted journaling for you and your doctor",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
