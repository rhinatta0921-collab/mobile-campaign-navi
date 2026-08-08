"use client";

import { useEffect, useState } from "react";

const navigationItems = [
  { href: "#conclusion", id: "conclusion", label: "結論" },
  { href: "#ranking", id: "ranking", label: "ランキング" },
  { href: "#details", id: "details", label: "詳細" },
];

export function MobileSectionNav() {
  const [activeId, setActiveId] = useState("conclusion");

  useEffect(() => {
    const sections = navigationItems
      .map((item) => document.getElementById(item.id))
      .filter((section): section is HTMLElement => Boolean(section));

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];

        if (visibleEntry) {
          setActiveId(visibleEntry.target.id);
        }
      },
      { rootMargin: "-112px 0px -65% 0px", threshold: 0 },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <nav className="mobile-section-nav" aria-label="記事内ナビゲーション">
      {navigationItems.map((item) => (
        <a
          key={item.id}
          href={item.href}
          aria-current={activeId === item.id ? "location" : undefined}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
