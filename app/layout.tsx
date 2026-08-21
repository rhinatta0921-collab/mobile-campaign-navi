import type { Metadata } from "next";
import "@fontsource-variable/noto-sans-jp/wght.css";
import { GoogleAnalytics } from "@/app/components/GoogleAnalytics";
import { SITE_NAME, SITE_URL } from "@/app/site-config";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_NAME,
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: "/favicon.svg",
    apple: [
      {
        url: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <GoogleAnalytics />
        {children}
      </body>
    </html>
  );
}
