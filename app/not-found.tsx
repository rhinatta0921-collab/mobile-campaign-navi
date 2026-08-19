import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/app/components/SiteHeader";
import { SITE_NAME } from "@/app/site-config";

export const metadata: Metadata = {
  title: `ページが見つかりません | ${SITE_NAME}`,
};

export default function NotFound() {
  return (
    <main>
      <SiteHeader />
      <div className="shell">
        <section className="not-found-page" aria-labelledby="not-found-title">
          <p className="section-label">404</p>
          <h1 id="not-found-title">ページが見つかりません</h1>
          <p>
            お探しのページは移動または削除された可能性があります。
          </p>
          <Link className="official-link" href="/">
            トップページへ戻る
          </Link>
        </section>
      </div>
    </main>
  );
}
