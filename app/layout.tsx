import type { Metadata } from "next";
import { headers } from "next/headers";
import "@fontsource-variable/noto-sans-jp/wght.css";
import "./globals.css";

const title = "楽天モバイル キャンペーン比較ナビ";
const description =
  "楽天モバイル公式一覧のキャンペーンをコード単位で整理し、申込者ポイントのランキングとポイント以外の特典・追加費用・実質価値を比較します。";

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
      icon: [
        {
          url: "/favicon.svg",
          type: "image/svg+xml",
        },
      ],
      shortcut: "/favicon.svg",
      apple: [
        {
          url: "/apple-touch-icon.png",
          sizes: "180x180",
          type: "image/png",
        },
      ],
    },
    openGraph: {
      title,
      description,
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
      description,
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
