import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link
          className="brand-mark"
          href="/"
          aria-label="楽天モバイル キャンペーン比較ナビ"
        >
          <span className="brand-icon" aria-hidden="true">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect
                x="6.75"
                y="4.75"
                width="16.5"
                height="22.5"
                rx="4"
                stroke="currentColor"
                strokeWidth="2.5"
              />
              <circle cx="15" cy="23" r="1.25" fill="currentColor" />
              <path
                className="brand-sparkle"
                d="M25 4.5 26.2 7.6 29.3 8.8 26.2 10 25 13.1 23.8 10 20.7 8.8 23.8 7.6 25 4.5Z"
              />
            </svg>
          </span>
          <span className="brand-copy">
            <span className="brand-title">キャンペーン比較ナビ</span>
            <span className="brand-subtitle">
              迷わず選べる、申込ガイド
            </span>
          </span>
        </Link>
      </div>
    </header>
  );
}
