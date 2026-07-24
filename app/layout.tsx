import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

const title = "楽天モバイル SIMのみキャンペーン比較";
const description =
  "スマホ本体を買わずに使える楽天モバイル入会キャンペーンを、最大ポイント、条件、申込方法で比較します。";

async function getRequestOrigin() {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";

  return host ? `${protocol}://${host}` : "http://localhost:3000";
}

export async function generateMetadata(): Promise<Metadata> {
  const origin = await getRequestOrigin();
  const imageUrl = `${origin}/og.png`;

  return {
    title,
    description,
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
    openGraph: {
      title,
      description:
        "SIMのみで使える楽天モバイル入会キャンペーンを、公式情報にもとづいて最大ポイント順に整理。",
      type: "website",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description:
        "SIMのみで使える楽天モバイル入会キャンペーンを、公式情報にもとづいて最大ポイント順に整理。",
      images: [imageUrl],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
