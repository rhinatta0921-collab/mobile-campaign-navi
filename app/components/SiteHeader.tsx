import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link
          className="brand-mark"
          href="/"
          aria-label="楽天モバイルキャンペーン比較ナビ"
        >
          <span className="brand-emblem" aria-hidden="true" />
          <span className="brand-wordmark" aria-hidden="true">
            <span className="brand-title-main">
              楽天モバイルキャンペーン
            </span>
            <span className="brand-title-highlight">
              <span>比</span>
              <span>較</span>
              <span>ナ</span>
              <span>ビ</span>
            </span>
          </span>
        </Link>
      </div>
    </header>
  );
}
