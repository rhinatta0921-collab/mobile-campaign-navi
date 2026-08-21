import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

async function render(pathname = "/") {
  const url = new URL(pathname, "http://localhost");
  const isHome = url.pathname === "/";
  const html = await readFile(
    new URL(isHome ? "../out/index.html" : "../out/404.html", import.meta.url),
    "utf8",
  );

  return new Response(html, {
    status: isHome ? 200 : 404,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function sectionHtml(html, className) {
  return html.match(
    new RegExp(
      `<section class="${className}"[^>]*>[\\s\\S]*?<\\/section>`,
    ),
  )?.[0];
}

function htmlBetweenDivMarkers(html, startMarker, endMarker) {
  const startMarkerIndex = html.indexOf(startMarker);
  assert.notEqual(startMarkerIndex, -1, `missing marker: ${startMarker}`);
  const start = html.lastIndexOf("<div", startMarkerIndex);
  const endMarkerIndex = html.indexOf(endMarker, startMarkerIndex + 1);
  assert.notEqual(endMarkerIndex, -1, `missing marker: ${endMarker}`);
  const end = endMarker.startsWith("data-")
    ? html.lastIndexOf("<div", endMarkerIndex)
    : endMarkerIndex;
  return html.slice(start, end);
}

function applicationRankingHtml(html, applicationType) {
  return applicationType === "mnp"
    ? htmlBetweenDivMarkers(
        html,
        'data-application-ranking="mnp"',
        'data-application-ranking="new-number"',
      )
    : htmlBetweenDivMarkers(
        html,
        'data-application-ranking="new-number"',
        '<section class="detail-section"',
      );
}

function applicationDetailsHtml(html, applicationType) {
  return applicationType === "mnp"
    ? htmlBetweenDivMarkers(
        html,
        'data-application-details="mnp"',
        'data-application-details="new-number"',
      )
    : htmlBetweenDivMarkers(
        html,
        'data-application-details="new-number"',
        '<section class="exclusions-band"',
      );
}

function plainText(html) {
  return html
    .replaceAll("<!-- -->", "")
    .replace(/<[^>]*>/g, "")
    .replaceAll("&amp;", "&")
    .replace(/\s+/g, " ")
    .trim();
}

function tableBodyText(html) {
  const tableBody = html.match(/<tbody>[\s\S]*?<\/tbody>/)?.[0];
  assert.ok(tableBody, "missing ranking table body");
  return plainText(tableBody);
}

function tableHeadCells(html) {
  const tableHead = html.match(/<thead>[\s\S]*?<\/thead>/)?.[0];
  assert.ok(tableHead, "missing ranking table head");
  return [...tableHead.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map(
    (match) => plainText(match[1]),
  );
}

function rankingTableHtml(html, tableClassName) {
  const table = html.match(
    new RegExp(
      `<table class="comparison-table ${tableClassName}">[\\s\\S]*?<\\/table>`,
    ),
  )?.[0];
  assert.ok(table, `missing ranking table: ${tableClassName}`);
  return table;
}

function tableRowCount(tableHtml) {
  const tableBody = tableHtml.match(/<tbody>[\s\S]*?<\/tbody>/)?.[0];
  assert.ok(tableBody, "missing ranking table body");
  return [...tableBody.matchAll(/<tr>/g)].length;
}

function detailArticleCount(html) {
  return [...html.matchAll(/class="campaign-detail-article"/g)].length;
}

function detailOverflowHtml(html) {
  return html.match(
    /<details class="ranking-overflow detail-overflow">[\s\S]*?<\/details>/,
  )?.[0];
}

function initiallyVisibleDetailHtml(html) {
  const overflowStart = html.indexOf(
    '<details class="ranking-overflow detail-overflow">',
  );
  return overflowStart === -1 ? html : html.slice(0, overflowStart);
}

function detailRanks(html) {
  return [...html.matchAll(
    /<p class="campaign-rank-badge campaign-rank-badge--(?:1|2|3|standard)">([\s\S]*?)<\/p>/g,
  )].map((match) => Number(plainText(match[1]).replace("位", "")));
}

function campaignDetailHtml(html, campaignCode) {
  return [...html.matchAll(
    /<article class="campaign-detail-article"[\s\S]*?<\/article>/g,
  )].find((match) =>
    match[0].includes(`data-campaign-code="${campaignCode}"`),
  )?.[0];
}

function rankingRecommendations(html) {
  return [...html.matchAll(/<tr>[\s\S]*?<\/tr>/g)]
    .map((match) => match[0])
    .filter((row) => row.includes('data-campaign-code="'))
    .map((row) => {
      const campaignCode = row.match(/data-campaign-code="([^"]+)"/)?.[1];
      const recommendation = row.match(
        /<td class="ranking-recommendation-cell">([\s\S]*?)<\/td>/,
      )?.[1];

      assert.ok(campaignCode);
      assert.ok(recommendation);
      return [campaignCode, plainText(recommendation)];
    });
}

function detailRecommendations(html) {
  return [...html.matchAll(
    /<article class="campaign-detail-article"[\s\S]*?<\/article>/g,
  )].map((match) => {
    const article = match[0];
    const campaignCode = article.match(/data-campaign-code="([^"]+)"/)?.[1];
    const recommendation = article.match(
      /<div class="campaign-recommendation">[\s\S]*?<p class="campaign-recommendation-label">[\s\S]*?<\/p><p>([\s\S]*?)<\/p><\/div>/,
    )?.[1];

    assert.ok(campaignCode);
    assert.ok(recommendation);
    return [campaignCode, plainText(recommendation)];
  });
}

function assertDetailStructure(html, expectedCount) {
  const articles = [...html.matchAll(
    /<article class="campaign-detail-article"[\s\S]*?<\/article>/g,
  )].map((match) => match[0]);

  assert.equal(articles.length, expectedCount);

  for (const article of articles) {
    const figureHtml = article.match(
      /<figure class="campaign-official-figure"[\s\S]*?<\/figure>/,
    )?.[0];
    assert.ok(figureHtml);
    assert.equal(classCount(figureHtml, "campaign-point-summary"), 1);
    assertInOrder(figureHtml, [
      "campaign-detail-picture",
      'class="campaign-point-summary"',
      "獲得可能ポイント",
      "<figcaption>",
      "画像：",
    ]);
    assert.doesNotMatch(figureHtml, /<ul>/);
    assert.doesNotMatch(article, /campaign-score|score-metric/);
    assertInOrder(article, [
      'class="campaign-pros-cons"',
      "おすすめなポイント",
      "気になるポイント",
      'class="official-link campaign-official-link"',
    ]);
    assert.match(
      article,
      /<div class="campaign-pros-cons">[\s\S]*?<\/div>[\s\S]*?<a class="official-link campaign-official-link"[\s\S]*?<\/section><\/article>$/,
    );
  }
}

function classCount(html, className) {
  return [
    ...html.matchAll(new RegExp(`class="[^"]*\\b${className}\\b[^"]*"`, "g")),
  ].length;
}

function rankingPoints(html) {
  return [...html.matchAll(/class="points-cell">([\d,]+)<span>ポイント/g)].map(
    (match) => Number(match[1].replaceAll(",", "")),
  );
}

function assertInOrder(haystack, values) {
  let lastIndex = -1;

  for (const value of values) {
    const index = haystack.indexOf(value);
    assert.ok(index > lastIndex, `${value} should appear in order`);
    lastIndex = index;
  }
}

test("ranks MNP campaigns by applicant fixed points and shows point summaries", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  const text = plainText(html);
  assert.match(
    text,
    /楽天モバイル 申し込みキャンペーン比較ランキング【2026年8月16日最終確認】/,
  );
  assert.doesNotMatch(text, /2026年8月最新/);
  assert.match(text, /楽天モバイルキャンペーン比較ナビ/);
  assert.match(
    html,
    /<a(?=[^>]*href="\/")(?=[^>]*class="brand-mark")(?=[^>]*aria-label="楽天モバイルキャンペーン比較ナビ")[^>]*>/,
  );
  assert.match(html, /class="brand-emblem" aria-hidden="true"/);
  assert.match(html, /class="brand-title-highlight"/);
  assert.doesNotMatch(text, /迷わず選べる、申込ガイド/);
  assert.match(
    html,
    /srcSet="\/hero-firstview-pop-v2-mobile\.png"/,
  );
  assert.match(html, /media="\(max-width: 860px\)"/);
  assert.match(html, /width="390" height="292"/);
  assert.match(html, /src="\/hero-firstview-pop-v2-desktop\.png"/);
  assert.match(html, /width="700" height="525"/);
  assert.doesNotMatch(html, /src="\/hero-editorial\.png"/);
  assert.doesNotMatch(html, /class="meta-row"/);
  assert.doesNotMatch(text, /広告・PR/);
  assert.doesNotMatch(text, / 更新/);
  assert.doesNotMatch(text, /最終確認:/);
  const heroHtml = sectionHtml(html, "article-hero home-hero");
  assert.ok(heroHtml);
  const heroText = plainText(heroHtml);
  assert.match(
    heroText,
    /このページでは、現在開催中の楽天モバイル申し込みキャンペーンを、受け取れるポイント額の多い順にランキング形式で比較しています。/,
  );
  assert.doesNotMatch(
    heroText,
    /22種|申込者本人が受け取れる固定ポイント額/,
  );
  assert.match(
    heroHtml,
    /<strong class="lead-highlight">受け取れるポイント額の多い順にランキング形式で比較しています<\/strong>。/,
  );
  assert.match(
    heroText,
    /MNP・新規番号別の獲得ポイントランキングを確認できる/,
  );
  assert.doesNotMatch(
    heroText,
    /ポイント以外の特典・追加コスト・実質お得額も掲載/,
  );
  assert.equal([...heroHtml.matchAll(/<strong\b/g)].length, 1);
  assert.match(text, /当サイトはプロモーションを含みます/);
  assert.match(
    text,
    /現在開催されている楽天モバイルのキャンペーンを徹底調査し、以下の3つのポイントで比較しました。/,
  );
  assert.doesNotMatch(
    text,
    /現在開催されている楽天モバイルのキャンペーン22種類/,
  );
  assert.doesNotMatch(text, /3つのポイントで比較しています/);
  const comparisonPointsHtml = sectionHtml(html, "comparison-points");
  assert.ok(comparisonPointsHtml);
  assert.match(
    comparisonPointsHtml,
    /<strong>楽天モバイルのキャンペーン<\/strong>/,
  );
  assert.match(comparisonPointsHtml, /<strong>比較しました<\/strong>。/);
  assert.match(text, /ポイント以外の特典と実質的なお得さ/);
  assert.match(html, /src="\/assets\/comparison-point-points-v2\.png"/);
  assert.match(html, /src="\/assets\/comparison-point-conditions-v2\.png"/);
  assert.match(html, /src="\/assets\/comparison-point-value-v2\.png"/);
  assert.doesNotMatch(html, /comparison-points-period/);
  assert.doesNotMatch(html, /comparison-point-period-v2\.png/);
  assertInOrder(html, [
    'id="comparison-points-value"',
    'id="comparison-points-total-value"',
    'id="comparison-points-conditions"',
  ]);
  assert.match(
    html,
    /<strong>楽天モバイルで申し込みキャンペーンを利用する際に必ずチェックしておきたい3つのポイント<\/strong>を紹介します/,
  );
  assert.match(html, /src="\/assets\/campaign-choice-step-scope-v1\.png"/);
  assert.match(html, /src="\/assets\/campaign-choice-step-conditions-v1\.png"/);
  assert.match(html, /src="\/assets\/campaign-choice-step-ranking-v1\.png"/);
  assert.equal(classCount(html, "choice-step-figure"), 3);
  assert.equal([...html.matchAll(/width="690" height="460"/g)].length, 3);
  assert.doesNotMatch(html, /campaign-choice-steps-v3\.png/);
  assert.doesNotMatch(html, /campaign-types-guide-v2\.png/);
  assert.equal([...html.matchAll(/<section class="choice-step"/g)].length, 3);
  assertInOrder(html, [
    'id="choice-scope"',
    'id="choice-conditions"',
    'id="choice-points"',
  ]);
  assert.match(text, /「SIMだけ」か「端末も一緒に買うか」を最初に決めましょう/);
  assert.match(
    text,
    /楽天カードの申込や楽天銀行会員など、対象サービスの申込・利用条件を組み合わせるタイプです/,
  );
  assert.match(text, /新規番号かMNP（乗り換え）か/);
  assert.match(text, /初契約か2回線目以降か/);
  const choiceScopeHtml = html.slice(
    html.indexOf('id="choice-scope"'),
    html.indexOf('id="choice-conditions"'),
  );
  const choiceConditionsHtml = html.slice(
    html.indexOf('id="choice-conditions"'),
    html.indexOf('id="choice-points"'),
  );
  const choicePointsHtml = html.slice(
    html.indexOf('id="choice-points"'),
    html.indexOf('class="device-guide-section"'),
  );
  assertInOrder(choiceScopeHtml, [
    'class="choice-step-lead"',
    'src="/assets/campaign-choice-step-scope-v1.png"',
    "キャンペーンは申し込む内容によって",
    'class="choice-type-list"',
  ]);
  assertInOrder(choiceConditionsHtml, [
    'class="choice-step-lead"',
    'src="/assets/campaign-choice-step-conditions-v1.png"',
    "申し込む範囲が決まったら",
    'class="choice-condition-grid"',
  ]);
  assertInOrder(choicePointsHtml, [
    'class="choice-step-lead"',
    'src="/assets/campaign-choice-step-ranking-v1.png"',
    "ポイント①②で自分に当てはまるキャンペーンが絞り込めたら",
    'class="choice-ranking-link"',
  ]);
  assert.doesNotMatch(html, /class="choice-decision-flow"/);
  assert.doesNotMatch(text, /条件に合うキャンペーンを絞る/);
  assert.doesNotMatch(text, /ランキングを上から確認/);
  assert.doesNotMatch(text, /最上位を選ぶ/);
  assert.match(html, /class="choice-ranking-link" href="#ranking"/);
  assert.doesNotMatch(html, /class="choice-table/);
  assertInOrder(html, [
    'class="comparison-points"',
    'class="toc"',
    'class="mobile-section-nav"',
    'class="conclusion"',
    'class="campaign-choice"',
    'class="device-guide-section"',
    'class="ranking-section"',
  ]);
  const choiceStart = html.indexOf('class="campaign-choice"');
  const deviceGuideStart = html.indexOf('class="device-guide-section"');
  assert.ok(choiceStart >= 0 && deviceGuideStart > choiceStart);
  assert.doesNotMatch(
    html.slice(choiceStart, deviceGuideStart),
    /href="\/device-campaigns"/,
  );
  const deviceGuideHtml = sectionHtml(html, "device-guide-section");
  assert.ok(deviceGuideHtml);
  const deviceGuideParagraphs = [
    ...deviceGuideHtml.matchAll(/<p>([\s\S]*?)<\/p>/g),
  ].map((match) => plainText(match[1]));
  assert.deepEqual(deviceGuideParagraphs, [
    "端末購入ありのキャンペーンは、基本的に1機種につき1つのキャンペーンが設定されています。",
    "そのため、気になる端末のキャンペーン条件を確認し、他店での購入と比べてどちらがお得かをチェックするだけでOKです。",
    "SIMのみのキャンペーンとは選び方が根本的に異なるため、このページでは端末購入なしのキャンペーンのみを掲載しています。",
  ]);
  assert.doesNotMatch(deviceGuideHtml, /device-guide-highlight/);
  assert.doesNotMatch(deviceGuideHtml, /device-guide-flow/);
  assert.doesNotMatch(deviceGuideHtml, /端末購入が必要なキャンペーンは、別ページで/);
  assert.doesNotMatch(deviceGuideHtml, /欲しい機種を先に決める/);
  assert.doesNotMatch(deviceGuideHtml, /device-guide-link/);
  assert.doesNotMatch(text, /端末購入ありのキャンペーンを見る/);
  assert.doesNotMatch(html, /href="\/device-campaigns"/);
  const tocHtml = html.match(
    /<nav class="toc" aria-label="目次">[\s\S]*?<\/nav>/,
  )?.[0];
  assert.ok(tocHtml);
  const expectedTocItems = [
    {
      href: "#conclusion",
      headingId: "conclusion-title",
      title:
        "【結論】初回申込は楽天市場キャンペーン、追加回線・再契約は社員紹介キャンペーンを確認！",
    },
    {
      href: "#how-to-choose",
      headingId: "how-to-choose-title",
      title: "キャンペーンの選び方",
    },
    {
      href: "#device-campaign-guide",
      headingId: "device-campaign-guide-title",
      title: "スマホ本体も一緒に購入する方へ",
    },
    {
      href: "#ranking",
      headingId: "ranking-title",
      title: "獲得可能ポイントランキング",
    },
    {
      href: "#details",
      headingId: "details-title",
      title: "ランキング掲載キャンペーンの詳細",
    },
    {
      href: "#excluded-title",
      headingId: "excluded-title",
      title: "ランキングから外したもの",
    },
  ];
  const tocItems = [
    ...tocHtml.matchAll(/<a href="([^"]+)">([\s\S]*?)<\/a>/g),
  ].map((match) => ({ href: match[1], title: plainText(match[2]) }));
  assert.deepEqual(
    tocItems,
    expectedTocItems.map(({ href, title }) => ({ href, title })),
  );
  for (const { headingId, title } of expectedTocItems) {
    const headingHtml = html.match(
      new RegExp(`<h2 id="${headingId}">([\\s\\S]*?)<\\/h2>`),
    )?.[1];
    assert.ok(headingHtml, `missing heading: ${headingId}`);
    assert.equal(plainText(headingHtml), title);
  }
  assert.match(tocHtml, /<details class="toc-overflow">/);
  assert.match(plainText(tocHtml), /全部見る閉じるランキングから外したもの/);
  assert.doesNotMatch(tocHtml, /href="#comparison-points"/);
  assert.doesNotMatch(html, /href="#comparison-points-value"/);
  assert.doesNotMatch(html, /href="#comparison-points-total-value"/);
  assert.doesNotMatch(html, /href="#comparison-points-conditions"/);
  assert.doesNotMatch(html, /href="#choice-scope"/);
  assert.doesNotMatch(html, /href="#choice-conditions"/);
  assert.doesNotMatch(html, /href="#choice-points"/);
  assert.match(html, /href="#device-campaign-guide">スマホ本体も一緒に購入する方へ/);
  const hiddenTocHtml = html.match(
    /<ul class="toc-list toc-list-hidden">[\s\S]*?<\/ul>/,
  )?.[0];
  assert.ok(hiddenTocHtml);
  assert.match(
    hiddenTocHtml,
    /<a href="#excluded-title">ランキングから外したもの<\/a>/,
  );
  assert.equal([...hiddenTocHtml.matchAll(/<li>/g)].length, 1);
  const mobileSectionNavHtml = html.match(
    /<nav class="mobile-section-nav"[\s\S]*?<\/nav>/,
  )?.[0];
  assert.ok(mobileSectionNavHtml);
  assertInOrder(mobileSectionNavHtml, [
    'href="#how-to-choose"',
    ">選び方</a>",
    'href="#ranking"',
    ">ランキング</a>",
    'href="#details"',
    ">詳細</a>",
  ]);
  assert.doesNotMatch(mobileSectionNavHtml, /href="#conclusion"/);
  assert.doesNotMatch(text, /このページの比較・調査方法/);

  const conclusionHtml = sectionHtml(html, "conclusion");
  assert.ok(conclusionHtml);
  const conclusionText = plainText(conclusionHtml);
  assert.equal(classCount(conclusionHtml, "conclusion-campaign-picture"), 1);
  assert.match(
    conclusionHtml,
    /data-campaign-code="3327"><source media="\(max-width: 860px\)" srcSet="\/assets\/campaigns\/official\/3327-mobile\.jpg" width="750" height="920"\/><img src="\/assets\/campaigns\/official\/3327-desktop\.jpg" width="4000" height="988"/,
  );
  assertInOrder(conclusionText, [
    "【結論】初回申込は楽天市場キャンペーン、追加回線・再契約は社員紹介キャンペーンを確認！",
    "画像：楽天モバイル公式ページ（2026年8月16日確認）",
    "初めて楽天モバイルへ申し込む方がポイント額を優先するなら、楽天モバイル×楽天市場キャンペーンが最上位です。他社からの乗り換え（MNP）で最大20,000ポイント、新しい電話番号での申し込みでも最大12,000ポイントを受け取れます。ただし、専用ページからの申し込み、Rakuten Linkで10秒以上の通話、楽天市場で1,000円以上の買い物が必要です。",
    "一方、初回申込ではない方や複数回線を申し込む方は、社員紹介キャンペーンが有力です。MNPなら最大14,000ポイント、新規・追加回線・再契約でも条件を満たせば最大11,000ポイントを受け取れ、1人最大5回線まで対象になります。",
    "しかし各キャンペーン特典のポイント額は期間限定で増量することもあるので、申し込む時点での情報は必ず公式ページでも確認してください。",
    "楽天市場キャンペーンの公式ページを見る",
    "社員紹介キャンペーンの公式ページを見る",
    "※公式ページの確認には、楽天アカウントでのログインが必要です。",
  ]);
  const highlightedText = [
    ...conclusionHtml.matchAll(
      /<strong class="conclusion-highlight">([\s\S]*?)<\/strong>/g,
    ),
  ].map((match) => plainText(match[1]));
  assert.deepEqual(highlightedText, [
    "初めて楽天モバイルへ申し込む方がポイント額を優先するなら、楽天モバイル×楽天市場キャンペーンが最上位です。他社からの乗り換え（MNP）で最大20,000ポイント、新しい電話番号での申し込みでも最大12,000ポイントを受け取れます",
  ]);
  assert.doesNotMatch(conclusionHtml, /winner-/);
  assert.doesNotMatch(conclusionText, /楽天市場キャンペーンのWeb申込期限/);
  assert.doesNotMatch(conclusionText, /下のボタンは社員紹介キャンペーン/);
  assert.equal(classCount(conclusionHtml, "conclusion-official-link"), 2);
  assert.equal(classCount(conclusionHtml, "conclusion-login-note"), 1);
  assert.match(
    conclusionHtml,
    /class="official-link conclusion-official-link" href="https:\/\/network\.mobile\.rakuten\.co\.jp\/campaign\/ichiba-debut\/" rel="noopener noreferrer" target="_blank">楽天市場キャンペーンの公式ページを見る<\/a>/,
  );
  assert.match(
    conclusionHtml,
    /class="official-link conclusion-official-link" href="https:\/\/r10\.to\/hkD5ah" rel="sponsored noopener noreferrer" target="_blank">社員紹介キャンペーンの公式ページを見る<\/a><p class="conclusion-login-note">※公式ページの確認には、楽天アカウントでのログインが必要です。<\/p>/,
  );
  assert.match(
    conclusionHtml,
    /href="https:\/\/network\.mobile\.rakuten\.co\.jp\/campaign\/ichiba-debut\/"[^>]*aria-label="楽天モバイル初めてお申し込みで最大20,000ポイント進呈の画像出典：楽天モバイル公式ページ"/,
  );

  const rankingSectionHtml = sectionHtml(html, "ranking-section");
  assert.ok(rankingSectionHtml);
  const rankingHtml = applicationRankingHtml(html, "mnp");
  const rankingText = plainText(rankingHtml);
  const rankingHeadingHtml = rankingSectionHtml.match(
    /<div class="section-heading">[\s\S]*?<\/div>/,
  )?.[0];
  assert.ok(rankingHeadingHtml);
  assert.match(
    rankingHeadingHtml,
    /<p>楽天モバイル申し込みキャンペーンの獲得可能ポイントランキングは以下の通りです。順位は申込者本人が受け取る固定ポイントだけで決定します。<\/p><p class="ranking-method-note">現在使用している電話番号をそのままで乗り換える\(MNP\)か楽天モバイルで新しい電話番号を取得するかで獲得可能ポイント額が変動するため、タブで分けてランキングを算出しています。<\/p>/,
  );
  const rankingTableText = tableBodyText(rankingHtml);
  const primaryRankingTable = rankingTableHtml(
    rankingHtml,
    "comparison-table-primary",
  );
  const overflowRankingTable = rankingTableHtml(
    rankingHtml,
    "comparison-table-overflow",
  );
  assert.match(
    rankingSectionHtml,
    /<button(?=[^>]*id="sim-only-ranking-tab-mnp")(?=[^>]*aria-selected="true")[^>]*>/,
  );
  assert.match(
    rankingSectionHtml,
    /<button(?=[^>]*id="sim-only-ranking-tab-new-number")(?=[^>]*aria-selected="false")[^>]*>/,
  );
  assert.match(
    rankingSectionHtml,
    /id="sim-only-ranking-panel-new-number"[^>]*hidden=""/,
  );
  assert.match(
    plainText(rankingSectionHtml),
    /電話番号そのまま他社から乗り換え/,
  );
  assert.match(plainText(rankingSectionHtml), /新しい電話番号で契約/);
  assert.equal(tableRowCount(primaryRankingTable), 10);
  assert.equal(tableRowCount(overflowRankingTable), 12);
  assert.equal([...primaryRankingTable.matchAll(/<th\b/g)].length, 7);
  assert.equal(classCount(primaryRankingTable, "ranking-campaign-picture"), 10);
  assert.equal(classCount(overflowRankingTable, "ranking-campaign-picture"), 12);
  assert.equal(classCount(rankingHtml, "mobile-ranking-picture"), 0);
  const rankingLinkLabels = [
    ...rankingHtml.matchAll(/<a class="table-link"[^>]*>([\s\S]*?)<\/a>/g),
  ].map((match) => plainText(match[1]));
  assert.equal(rankingLinkLabels.length, 22);
  assert.equal(rankingLinkLabels.every((label) => label === "公式ページ"), true);
  assert.deepEqual(
    tableHeadCells(primaryRankingTable),
    [
      "キャンペーン",
      "画像",
      "獲得ポイント",
      "おすすめ対象",
      "主な追加条件",
      "開催期間",
      "公式",
    ],
  );
  assert.equal(tableHeadCells(primaryRankingTable).includes("申込方法"), false);
  assert.match(rankingTableText, /終了日未定/);
  assert.doesNotMatch(primaryRankingTable, /<source\b/);
  assert.match(
    primaryRankingTable,
    /data-campaign-code="3327"><img src="\/assets\/campaigns\/official\/3327-mobile\.jpg"/,
  );
  assert.match(
    primaryRankingTable,
    /data-campaign-code="2162"><img src="\/assets\/campaigns\/official\/2162-mobile\.jpg"/,
  );
  assert.match(
    primaryRankingTable,
    /data-campaign-code="1784"><img src="\/assets\/campaigns\/official\/1784-mobile\.png"/,
  );
  const employeeRankingRow = [...primaryRankingTable.matchAll(/<tr>[\s\S]*?<\/tr>/g)]
    .map((match) => match[0])
    .find((row) => row.includes('data-campaign-code="2162"'));
  const referralRankingRow = [...primaryRankingTable.matchAll(/<tr>[\s\S]*?<\/tr>/g)]
    .map((match) => match[0])
    .find((row) => row.includes('data-campaign-code="1784"'));
  assert.ok(employeeRankingRow);
  assert.ok(referralRankingRow);
  assert.match(employeeRankingRow, /class="table-link" href="https:\/\/r10\.to\/hkD5ah"/);
  assert.match(
    employeeRankingRow,
    /<a class="table-link"[^>]*>公式ページ<\/a><span class="ranking-login-note">※要ログイン<\/span>/,
  );
  assert.equal(classCount(rankingHtml, "ranking-login-note"), 1);
  assert.match(
    referralRankingRow,
    /class="table-link" href="https:\/\/network\.mobile\.rakuten\.co\.jp\/campaign\/referral\/"/,
  );
  assert.match(
    referralRankingRow,
    /<span class="table-rank-badge table-rank-badge--3">3<!-- -->位<\/span>/,
  );
  assert.match(
    referralRankingRow,
    /<td class="ranking-recommendation-cell">友人や家族に楽天モバイルユーザーがいる方<\/td>/,
  );
  assert.doesNotMatch(referralRankingRow, /ranking-login-note|※要ログイン/);
  assert.match(
    employeeRankingRow,
    /<td class="ranking-recommendation-cell">2回線目以降・再契約でも高ポイントを狙いたい人<\/td>/,
  );
  assert.match(
    employeeRankingRow,
    /<ul class="ranking-bullet-list"><li>楽天従業員の専用リンクから申し込み<\/li><\/ul>/,
  );
  assert.doesNotMatch(
    employeeRankingRow,
    /楽天従業員の専用URLから紹介ログインし、対象プランを申し込む方/,
  );
  assert.equal(classCount(rankingHtml, "ranking-recommendation-cell"), 22);
  assert.equal(classCount(rankingHtml, "ranking-bullet-list"), 22);
  assert.doesNotMatch(
    rankingHtml,
    /<td class="ranking-recommendation-cell">\s*<ul/,
  );
  assert.match(
    rankingHtml,
    /src="\/assets\/campaigns\/official\/[^"]+"[^>]*alt=""[^>]*loading="lazy"/,
  );
  assert.match(plainText(primaryRankingTable), /10位/);
  assert.doesNotMatch(plainText(primaryRankingTable), /11位/);
  assert.match(plainText(overflowRankingTable), /11位/);
  assert.match(plainText(overflowRankingTable), /22位/);
  assert.match(rankingHtml, /<details class="ranking-overflow">/);
  assert.match(rankingText, /11位以降を表示（残り12件）/);
  assert.match(rankingText, /11位以降を閉じる/);
  assert.match(rankingText, /獲得ポイント/);
  assert.doesNotMatch(rankingHtml, /ranking-mode-note/);
  assert.doesNotMatch(
    rankingText,
    /申込者本人が受け取れる固定ポイントで並べています|ポイントがない特典は0ポイントとして末尾に掲載|割引や追加費用は順位に含めません/,
  );
  assertInOrder(rankingTableText, [
    "20,000",
    "14,000",
    "13,000",
    "11,748",
    "10,000",
    "5,000",
  ]);
  const mnpPoints = rankingPoints(rankingHtml);
  assert.equal(mnpPoints.includes(0), true);
  assert.equal(mnpPoints.findIndex((points) => points === 0) > 0, true);
  assert.equal(mnpPoints.slice(mnpPoints.indexOf(0)).every((points) => points === 0), true);
  assertInOrder(rankingTableText, [
    "【楽天モバイルショップ限定】初めてのお申し込みで3,000ポイント",
    "第2弾【ショップ限定】もう1回線お申し込みでポイント",
    "楽天カード＋楽天モバイル同時申し込み特典",
    "楽天銀行会員向け 楽天モバイル初めて申し込み特典",
  ]);
  assert.doesNotMatch(rankingText, /iPhone対象製品 特価キャンペーン/);

  const detailHtml = applicationDetailsHtml(html, "mnp");
  const detailText = plainText(detailHtml);
  assert.equal(detailArticleCount(detailHtml), 22);
  assert.equal(classCount(detailHtml, "campaign-official-figure"), 22);
  assert.equal(classCount(detailHtml, "campaign-detail-picture"), 22);
  assert.equal(classCount(detailHtml, "campaign-point-summary"), 22);
  assert.equal(classCount(detailHtml, "campaign-official-link"), 22);
  assertDetailStructure(detailHtml, 22);
  const detailOverflow = detailOverflowHtml(detailHtml);
  assert.ok(detailOverflow);
  assert.match(
    detailOverflow,
    /^<details class="ranking-overflow detail-overflow">/,
  );
  assert.equal(detailArticleCount(initiallyVisibleDetailHtml(detailHtml)), 10);
  assert.equal(detailArticleCount(detailOverflow), 12);
  assert.deepEqual(
    detailRanks(detailHtml),
    Array.from({ length: 22 }, (_, index) => index + 1),
  );
  assert.equal(classCount(detailHtml, "campaign-rank-badge--1"), 1);
  assert.equal(classCount(detailHtml, "campaign-rank-badge--2"), 1);
  assert.equal(classCount(detailHtml, "campaign-rank-badge--3"), 1);
  assert.equal(classCount(detailHtml, "campaign-rank-badge--standard"), 19);
  const detailOverflowText = plainText(detailOverflow);
  assert.match(detailOverflowText, /11位以降を表示（残り12件）/);
  assert.match(detailOverflowText, /11位以降を閉じる/);
  assert.doesNotMatch(
    detailHtml,
    /<picture class="official-campaign-picture campaign-detail-picture"[^>]*>\s*<source/,
  );
  assert.match(
    detailHtml,
    /data-campaign-code="3327"><img src="\/assets\/campaigns\/official\/3327-mobile\.jpg"/,
  );
  assert.match(
    detailHtml,
    /data-campaign-code="2162"><img src="\/assets\/campaigns\/official\/2162-mobile\.jpg"/,
  );
  assert.match(
    detailHtml,
    /data-campaign-code="1784"><img src="\/assets\/campaigns\/official\/1784-mobile\.png"/,
  );
  assert.match(
    detailHtml,
    /data-campaign-code="1238"><img src="\/assets\/campaigns\/official\/1238-detail\.(?:png|jpg)"/,
  );
  assert.match(
    detailText,
    /画像：楽天モバイル公式ページ（2026年8月6日確認）/,
  );
  assert.match(
    detailText,
    /画像：楽天モバイル公式ページ（2026年8月16日確認）/,
  );
  assert.doesNotMatch(detailHtml, /<details class="offer-detail"/);
  assert.doesNotMatch(detailHtml, /<summary class="offer-heading"/);
  assert.doesNotMatch(detailText, /詳細を見る/);
  assert.match(detailText, /どんな人におすすめか/);
  assert.doesNotMatch(detailText, /4つの指標で比較スコア/);
  assert.match(detailText, /獲得可能ポイント20,000ポイント/);
  assert.match(detailText, /獲得可能ポイント14,000ポイント/);
  assert.match(detailText, /獲得可能ポイント13,000ポイント/);
  assert.doesNotMatch(detailText, /その他特典/);
  assert.doesNotMatch(detailText, /キャンペーン適用にかかるコスト/);
  assert.equal(
    [...detailHtml.matchAll(
      /<a class="official-link campaign-official-link"[^>]*>([\s\S]*?)<\/a>/g,
    )]
      .map((match) => plainText(match[1]))
      .every((label) => label === "公式ページの情報を見る"),
    true,
  );
  assert.doesNotMatch(detailText, /公式サイトで情報を見る/);
  const employeeDetail = campaignDetailHtml(detailHtml, "2162");
  const referralDetail = campaignDetailHtml(detailHtml, "1784");
  assert.ok(employeeDetail);
  assert.ok(referralDetail);
  assert.deepEqual(
    detailRecommendations(detailHtml),
    rankingRecommendations(rankingHtml),
  );
  assert.match(
    employeeDetail,
    /<div class="campaign-recommendation">[\s\S]*?<p>2回線目以降・再契約でも高ポイントを狙いたい人<\/p>/,
  );
  assert.match(
    referralDetail,
    /<div class="campaign-recommendation">[\s\S]*?<p>友人や家族に楽天モバイルユーザーがいる方<\/p>/,
  );
  const employeeDetailText = plainText(employeeDetail);
  assert.match(
    employeeDetailText,
    /本ページの専用URLからのログイン後に契約し、対象プランの申し込みと利用開始、期限内のRakuten Linkによる10秒以上の通話が必要です。/,
  );
  assert.doesNotMatch(
    employeeDetailText,
    /利用開始とRakuten Linkで10秒以上の通話を期限内に完了する必要がある/,
  );
  assert.doesNotMatch(
    employeeDetailText,
    /通常紹介などの対象キャンペーンとは併用できない/,
  );
  assert.match(
    employeeDetail,
    /class="official-link campaign-official-link" href="https:\/\/network\.mobile\.rakuten\.co\.jp\/campaign\/referral-application-employee\/"/,
  );
  assert.match(
    employeeDetail,
    /class="official-link campaign-entry-link" href="https:\/\/r10\.to\/hkD5ah"[^>]*>キャンペーンにエントリーする<\/a>/,
  );
  assert.match(
    employeeDetail,
    /<div class="campaign-action-buttons">[\s\S]*?<\/div><p class="campaign-action-note">楽天アカウントでのログインが必要です<\/p>/,
  );
  assert.equal(classCount(detailHtml, "campaign-action-group"), 1);
  assert.equal(classCount(detailHtml, "campaign-entry-link"), 1);
  assert.equal(classCount(detailHtml, "campaign-action-note"), 1);
  assert.match(
    employeeDetail,
    /href="https:\/\/network\.mobile\.rakuten\.co\.jp\/campaign\/referral-application-employee\/"[^>]*aria-label="【楽天従業員から紹介された方限定】Rakuten最強プラン紹介キャンペーンの画像出典：楽天モバイル公式ページ"/,
  );
  assert.match(
    referralDetail,
    /class="official-link campaign-official-link" href="https:\/\/network\.mobile\.rakuten\.co\.jp\/campaign\/referral\/"/,
  );
  assert.doesNotMatch(
    referralDetail,
    /campaign-action-group|campaign-entry-link|campaign-action-note|キャンペーンにエントリーする/,
  );
  assert.match(detailText, /キャンペーン開催期間/);
  assert.match(detailText, /キャンペーン適用条件/);
  assert.match(detailText, /おすすめなポイント/);
  assert.match(detailText, /気になるポイント/);
  assert.match(detailText, /楽天従業員から送られる専用URLでの紹介ログインが必要/);
  assert.doesNotMatch(
    detailText,
    /14,000ポイント \+ 0円相当 − 0円 = 14,000円/,
  );
  assert.doesNotMatch(
    detailText,
    /13,000ポイント \+ 0円相当 − 0円 = 13,000円/,
  );
  assert.doesNotMatch(
    detailText,
    /1,000ポイント \+ 0円相当 − 1,000円 = 0円/,
  );
  assert.doesNotMatch(
    detailText,
    /0ポイント \+ 1,100円相当 − 0円 = 1,100円/,
  );
  assert.match(detailText, /15分（標準）通話かけ放題 料金1カ月無料特典/);
});

test("marks only employee referral application links as sponsored", async () => {
  const html = await (await render()).text();
  const referralUrl = "https://r10.to/hkD5ah";
  const anchors = [...html.matchAll(/<a\b([^>]*)>/g)].map((match) => {
    const attributes = match[1];
    return {
      href: attributes.match(/\bhref="([^"]+)"/)?.[1],
      rel: attributes.match(/\brel="([^"]+)"/)?.[1] ?? "",
      target: attributes.match(/\btarget="([^"]+)"/)?.[1],
    };
  });
  const externalAnchors = anchors.filter(({ target }) => target === "_blank");
  const sponsoredAnchors = externalAnchors.filter(({ rel }) =>
    rel.split(/\s+/).includes("sponsored"),
  );
  const referralAnchors = externalAnchors.filter(
    ({ href }) => href === referralUrl,
  );

  assert.equal(sponsoredAnchors.length, 5);
  assert.equal(referralAnchors.length, 5);
  assert.equal(
    sponsoredAnchors.every(({ href }) => href === referralUrl),
    true,
  );
  assert.equal(
    referralAnchors.every(({ rel }) => rel.split(/\s+/).includes("sponsored")),
    true,
  );
  assert.equal(
    externalAnchors.every(({ rel }) =>
      ["noopener", "noreferrer"].every((token) =>
        rel.split(/\s+/).includes(token),
      ),
    ),
    true,
  );
});

test("includes new-number points without mixing MNP-only campaigns", async () => {
  const response = await render("/?application=new-number");
  const html = await response.text();
  const rankingHtml = applicationRankingHtml(html, "newNumber");
  const rankingText = plainText(rankingHtml);
  const rankingTableText = tableBodyText(rankingHtml);
  const primaryRankingTable = rankingTableHtml(
    rankingHtml,
    "comparison-table-primary",
  );
  const overflowRankingTable = rankingTableHtml(
    rankingHtml,
    "comparison-table-overflow",
  );

  assert.match(
    html,
    /<button(?=[^>]*id="sim-only-ranking-tab-new-number")(?=[^>]*aria-selected="false")[^>]*>/,
  );
  assert.equal(tableRowCount(primaryRankingTable), 10);
  assert.equal(tableRowCount(overflowRankingTable), 11);
  assert.match(plainText(primaryRankingTable), /10位/);
  assert.match(plainText(overflowRankingTable), /11位/);
  assert.match(plainText(overflowRankingTable), /21位/);
  assert.match(rankingText, /11位以降を表示（残り11件）/);
  assertInOrder(rankingTableText, [
    "12,000",
    "11,748",
    "11,000",
    "10,000",
    "7,000",
    "5,000",
  ]);
  assert.doesNotMatch(rankingText, /楽天モバイルただいまキャンペーン/);
  assert.doesNotMatch(
    rankingText,
    /他社から乗り換えでポイントプレゼント/,
  );
  assert.match(rankingText, /0ポイント/);
  assert.doesNotMatch(rankingHtml, /ranking-mode-note/);
  assert.doesNotMatch(
    rankingText,
    /申込者本人が受け取れる固定ポイントで並べています|ポイントがない特典は0ポイントとして末尾に掲載|割引や追加費用は順位に含めません/,
  );
  const employeeRankingRow = [...primaryRankingTable.matchAll(/<tr>[\s\S]*?<\/tr>/g)]
    .map((match) => match[0])
    .find((row) => row.includes('data-campaign-code="2162"'));
  assert.ok(employeeRankingRow);
  assert.match(
    employeeRankingRow,
    /<a class="table-link"[^>]*>公式ページ<\/a><span class="ranking-login-note">※要ログイン<\/span>/,
  );
  assert.equal(classCount(rankingHtml, "ranking-login-note"), 1);

  const detailHtml = applicationDetailsHtml(html, "newNumber");
  const detailText = plainText(detailHtml);
  assert.equal(detailArticleCount(detailHtml), 21);
  assert.equal(classCount(detailHtml, "campaign-official-figure"), 21);
  assert.equal(classCount(detailHtml, "campaign-point-summary"), 21);
  assertDetailStructure(detailHtml, 21);
  const detailOverflow = detailOverflowHtml(detailHtml);
  assert.ok(detailOverflow);
  assert.match(
    detailOverflow,
    /^<details class="ranking-overflow detail-overflow">/,
  );
  assert.equal(detailArticleCount(initiallyVisibleDetailHtml(detailHtml)), 10);
  assert.equal(detailArticleCount(detailOverflow), 11);
  assert.deepEqual(
    detailRanks(detailHtml),
    Array.from({ length: 21 }, (_, index) => index + 1),
  );
  const detailOverflowText = plainText(detailOverflow);
  assert.match(detailOverflowText, /11位以降を表示（残り11件）/);
  assert.match(detailOverflowText, /11位以降を閉じる/);
  assert.deepEqual(
    detailRecommendations(detailHtml),
    rankingRecommendations(rankingHtml),
  );
  assert.doesNotMatch(detailHtml, /<details class="offer-detail"/);
  assert.match(detailText, /獲得可能ポイント11,748ポイント/);
  assert.match(detailText, /獲得可能ポイント11,000ポイント/);
  assert.match(detailText, /獲得可能ポイント10,000ポイント/);
  assert.match(
    detailText,
    /【Rakuten最強プランはじめてお申し込み特典】新規ご契約でポイントプレゼント/,
  );
  assert.doesNotMatch(detailText, /楽天モバイルただいまキャンペーン/);
  const employeeDetail = campaignDetailHtml(detailHtml, "2162");
  assert.ok(employeeDetail);
  assert.match(
    employeeDetail,
    /class="official-link campaign-official-link" href="https:\/\/network\.mobile\.rakuten\.co\.jp\/campaign\/referral-application-employee\/"/,
  );
  assert.match(
    employeeDetail,
    /class="official-link campaign-entry-link" href="https:\/\/r10\.to\/hkD5ah"/,
  );
  assert.equal(classCount(detailHtml, "campaign-entry-link"), 1);
  assert.equal(classCount(detailHtml, "campaign-action-note"), 1);

  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, "static HTML ids must be unique");

  const switcherSource = await readFile(
    new URL("../app/components/CampaignApplicationSections.tsx", import.meta.url),
    "utf8",
  );
  assert.match(switcherSource, /URLSearchParams\(window\.location\.search\)/);
  assert.match(switcherSource, /url\.searchParams\.set\("application", "new-number"\)/);
  assert.match(switcherSource, /url\.searchParams\.delete\("application"\)/);
  assert.match(switcherSource, /window\.history\.replaceState/);
});

test("returns 404 for the removed device campaign route", async () => {
  const response = await render("/device-campaigns");
  assert.equal(response.status, 404);
  const html = await response.text();
  assert.match(html, /ページが見つかりません/);
  assert.match(html, /href="\/">トップページへ戻る<\/a>/);
  assert.doesNotMatch(html, /device-ranking-panel|data-application-ranking/);
});

test("uses one horizontally scrollable ranking table on desktop and mobile", async () => {
  const css = await readFile(
    new URL("../app/globals.css", import.meta.url),
    "utf8",
  );
  const mobileCss = css.slice(css.indexOf("@media (max-width: 860px)"));
  const compactMobileCss = css.slice(css.indexOf("@media (max-width: 560px)"));
  const narrowMobileCss = css.slice(css.indexOf("@media (max-width: 420px)"));

  assert.doesNotMatch(mobileCss, /\.table-scroll\s*{\s*display: none;/);
  assert.doesNotMatch(css, /\.mobile-ranking-list\b/);
  assert.doesNotMatch(css, /\.mobile-ranking-card\b/);
  assert.doesNotMatch(css, /\.ranking-mode-note\b/);
  const rankingMethodNoteCss = css.match(
    /\.section-heading \.ranking-method-note\s*{[^}]*}/,
  )?.[0];
  assert.ok(rankingMethodNoteCss);
  assert.match(rankingMethodNoteCss, /margin-top: 16px;/);
  assert.doesNotMatch(
    rankingMethodNoteCss,
    /background|border|padding|color|font-size/,
  );
  assert.match(css, /\.lead p\s*{[^}]*margin-bottom: 16px;/);
  assert.doesNotMatch(css, /\.campaign-score\b|\.score-metric\b/);
  assert.match(
    css,
    /\.campaign-point-summary\s*{[\s\S]*?margin-top: 14px;/,
  );
  assert.match(
    mobileCss,
    /\.ranking-scroll-note\s*{[\s\S]*?display: block;/,
  );
  assert.match(
    css,
    /\.comparison-table\s*{[\s\S]*?min-width: 960px;/,
  );
  assert.match(
    css,
    /\.ranking-campaign-picture\s*{[\s\S]*?width: 96px;[\s\S]*?height: 96px;/,
  );
  assert.match(
    mobileCss,
    /\.campaign-column\s*{[\s\S]*?position: sticky;[\s\S]*?width: 160px;[\s\S]*?min-width: 160px;/,
  );
  assert.match(
    mobileCss,
    /\.ranking-campaign-picture\s*{[\s\S]*?width: 84px;[\s\S]*?height: 84px;/,
  );
  assert.match(
    css,
    /\.campaign-official-figure\s*{[\s\S]*?width: 320px;[\s\S]*?max-width: 100%;/,
  );
  assert.match(css, /\.conclusion-campaign-figure\s*{[\s\S]*?width: 100%;/);
  assert.match(css, /\.conclusion-campaign-picture\s*{[\s\S]*?width: 100%;/);
  assert.doesNotMatch(css, /\.conclusion-campaign-picture\s*{[^}]*aspect-ratio:/);
  assert.match(
    css,
    /\.conclusion-lead\s*{[^}]*font-size: 16px;[^}]*line-height: 1\.8;/,
  );
  assert.match(
    css,
    /\.conclusion-lead p \+ p\s*{[^}]*margin-top: 20px;/,
  );
  assert.match(
    mobileCss,
    /\.conclusion-lead\s*{[^}]*font-size: 15px;[^}]*line-height: 1\.8;/,
  );
  assert.match(
    mobileCss,
    /\.conclusion-lead p \+ p\s*{[^}]*margin-top: 18px;/,
  );
  assert.match(
    css,
    /\.conclusion-highlight\s*{[\s\S]*?background: #fff0df;[\s\S]*?font-weight: var\(--font-weight-strong\);/,
  );
  assert.match(
    css,
    /\.conclusion-official-link\s*{[\s\S]*?width: min\(100%, 360px\);[\s\S]*?margin: 26px 0 0;/,
  );
  assert.match(
    mobileCss,
    /\.conclusion-official-link\s*{[\s\S]*?width: 100%;[\s\S]*?margin-top: 22px;/,
  );
  const conclusionLoginNoteCss = css.match(
    /\.conclusion-login-note\s*{[^}]*}/,
  )?.[0];
  assert.ok(conclusionLoginNoteCss);
  assert.doesNotMatch(conclusionLoginNoteCss, /width:/);
  assert.match(conclusionLoginNoteCss, /margin: 8px 0 0;/);
  assert.match(conclusionLoginNoteCss, /font-size: 12px;/);
  assert.match(conclusionLoginNoteCss, /white-space: nowrap;/);
  assert.match(
    narrowMobileCss,
    /\.conclusion-login-note\s*{[^}]*white-space: normal;/,
  );
  assert.doesNotMatch(css, /\.campaign-detail-article:first-child/);
  assert.match(
    css,
    /\.ranking-official-action\s*{[^}]*display: inline-flex;[^}]*flex-direction: column;[^}]*align-items: center;/,
  );
  assert.match(
    css,
    /\.comparison-table \.ranking-login-note\s*{[^}]*color: var\(--muted\);[^}]*font-size: 0\.72rem;[^}]*white-space: nowrap;/,
  );
  assert.match(
    css,
    /\.table-rank-badge--1,\s*\.campaign-rank-badge--1\s*{[^}]*background: #b58b25;/,
  );
  assert.match(
    css,
    /\.table-rank-badge--2,\s*\.campaign-rank-badge--2\s*{[^}]*background: #818b91;/,
  );
  assert.match(
    css,
    /\.table-rank-badge--3,\s*\.campaign-rank-badge--3\s*{[^}]*background: #a56f4b;/,
  );
  assert.match(
    css,
    /\.campaign-rank-badge\s*{[^}]*background: #70777b;/,
  );
  const campaignRankBaseIndex = css.indexOf(".campaign-rank-badge {");
  for (const rank of [1, 2, 3]) {
    assert.ok(
      css.indexOf(`.campaign-rank-badge--${rank} {`) > campaignRankBaseIndex,
      `detail rank ${rank} color must override the base gray background`,
    );
  }
  assert.match(
    css,
    /\.campaign-detail-picture\s*{[\s\S]*?aspect-ratio: 1 \/ 1;/,
  );
  assert.match(
    css,
    /\.official-campaign-picture img\s*{[\s\S]*?object-fit: contain;/,
  );
  assert.match(
    mobileCss,
    /\.campaign-official-figure\s*{[\s\S]*?width: 100%;/,
  );
  assert.match(
    css,
    /\.campaign-official-link\s*{[^}]*width: min\(100%, 360px\);[^}]*margin: 22px 0 0;/,
  );
  assert.match(
    mobileCss,
    /\.campaign-official-link\s*{[^}]*width: 100%;[^}]*margin: 20px 0 0;/,
  );
  assert.match(
    css,
    /\.campaign-action-buttons\s*{[^}]*display: grid;[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);[^}]*gap: 12px;/,
  );
  assert.match(
    css,
    /--green: #3f7d73;[\s\S]*?\.official-link[\s\S]*?background: var\(--green\);/,
  );
  assert.match(
    css,
    /\.official-link:hover[\s\S]*?background: #2d6159;/,
  );
  assert.match(
    css,
    /\.conclusion-action-group\s*{[^}]*display: grid;[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);[^}]*gap: 12px;[^}]*margin-top: 26px;/,
  );
  assert.match(
    css,
    /\.conclusion-action-group \.conclusion-official-link\s*{[^}]*width: 100%;[^}]*margin: 0;[^}]*white-space: normal;/,
  );
  assert.match(
    css,
    /\.campaign-entry-link\s*{[^}]*border-color: var\(--accent\);[^}]*background: var\(--accent\);/,
  );
  assert.match(
    css,
    /\.campaign-action-note\s*{[^}]*color: var\(--muted\);[^}]*font-size: 12px;[^}]*text-align: center;/,
  );
  assert.match(
    compactMobileCss,
    /\.campaign-action-buttons\s*{[^}]*grid-template-columns: 1fr;[^}]*gap: 10px;/,
  );
  assert.match(
    compactMobileCss,
    /\.conclusion-action-group,[\s\S]*?\.campaign-action-buttons\s*{[^}]*grid-template-columns: 1fr;[^}]*gap: 10px;/,
  );
  assert.match(
    css,
    /\/\* Editorial article layout \*\/[\s\S]*?\.shell\s*{[\s\S]*?width: min\(700px, calc\(100% - 32px\)\);/,
  );
  assert.match(
    css,
    /\.mobile-section-nav\s*{\s*position: sticky;[\s\S]*?top: 60px;[\s\S]*?display: grid;[\s\S]*?height: 48px;/,
  );
  assert.doesNotMatch(css, /\.mobile-section-nav\s*{\s*display: none;/);
  assert.match(
    css,
    /\.choice-condition-grid\s*{[\s\S]*?grid-template-columns: 1fr;/,
  );
  assert.doesNotMatch(css, /\.choice-decision-flow\b/);
});

test("uses self-hosted Noto Sans JP with readable editorial weights", async () => {
  const [layout, css] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  const editorialCss = css.slice(css.indexOf("/* Editorial article layout */"));
  const editorialMobileCss = editorialCss.slice(
    editorialCss.indexOf("@media (max-width: 860px)"),
  );

  assert.match(
    layout,
    /import "@fontsource-variable\/noto-sans-jp\/wght\.css";/,
  );
  assert.match(css, /--font-sans:[\s\S]*?"Noto Sans JP Variable"/);
  assert.match(css, /--font-weight-body: 400;/);
  assert.match(css, /--font-weight-medium: 500;/);
  assert.match(css, /--font-weight-strong: 700;/);
  assert.match(
    css,
    /h1\s*{[\s\S]*?font-weight: var\(--font-weight-strong\);/,
  );
  assert.match(
    css,
    /\.lead-highlight\s*{[\s\S]*?background: #fff0df;[\s\S]*?box-decoration-break: clone;[\s\S]*?-webkit-box-decoration-break: clone;[\s\S]*?font-weight: var\(--font-weight-strong\);/,
  );
  assert.match(
    css,
    /\.lead-question\s*{[\s\S]*?font-weight: var\(--font-weight-body\);/,
  );
  assert.match(
    editorialCss,
    /\.home-hero\s*{[^}]*gap: 0;[^}]*padding: 0;[^}]*border-bottom: 0;/,
  );
  assert.match(
    editorialCss,
    /\.comparison-points,[\s\S]*?margin-top: 48px;/,
  );
  assert.match(
    editorialMobileCss,
    /\.home-hero\s*{[^}]*gap: 0;[^}]*padding: 0;/,
  );
  assert.match(
    editorialMobileCss,
    /\.comparison-points,[\s\S]*?margin-top: 40px;/,
  );
  assert.match(
    css,
    /\.comparison-points h2,[\s\S]*?font-weight: var\(--font-weight-strong\);/,
  );
  assert.match(
    css,
    /\.comparison-points\s*{[\s\S]*?padding: 28px 30px 30px;[\s\S]*?border: 1px solid var\(--line-light\);[\s\S]*?border-radius: 4px;/,
  );
  assert.match(
    css,
    /\.comparison-points h2\s*{[\s\S]*?padding-bottom: 0;[\s\S]*?border-bottom: 0;/,
  );
  assert.match(
    css,
    /\.comparison-points-intro strong\s*{[\s\S]*?color: var\(--ink\);[\s\S]*?font-weight: var\(--font-weight-medium\);/,
  );
  assert.match(
    css,
    /\.comparison-point-list p\s*{[\s\S]*?color: var\(--muted\);/,
  );
  assert.match(
    css,
    /\.comparison-point-list ul\s*{[\s\S]*?color: var\(--muted\);/,
  );
  assert.match(
    editorialCss,
    /\.toc-list a\s*{[\s\S]*?color: #6d6d6d;/,
  );
  assert.match(
    editorialCss,
    /\.toc-overflow summary\s*{[\s\S]*?color: #6d6d6d;/,
  );
  const mobileCss = css.slice(css.indexOf("@media (max-width: 860px)"));
  assert.match(
    mobileCss,
    /\.comparison-points\s*{[\s\S]*?padding: 20px 16px 22px;/,
  );
  assert.match(
    css,
    /\.mobile-section-nav a\s*{[\s\S]*?font-weight: 600;/,
  );
});

test("uses the exact pink wordmark header and keeps icon metadata", async () => {
  const [layout, css, favicon] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../public/favicon.svg", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /url: "\/apple-touch-icon\.png"/);
  assert.match(layout, /sizes: "180x180"/);
  assert.match(
    css,
    /\.site-header\s*{[\s\S]*?background: var\(--accent\);[\s\S]*?border: 0;/,
  );
  assert.match(
    css,
    /\.brand-wordmark\s*{[\s\S]*?color: #fff;[\s\S]*?font-size: clamp\(13px, 4vw, 17px\);[\s\S]*?font-weight: var\(--font-weight-strong\);/,
  );
  assert.match(
    css,
    /\.brand-title-highlight > span\s*{[\s\S]*?color: var\(--accent\);[\s\S]*?background: #fff;/,
  );
  assert.match(css, /\.brand-emblem::before\s*{[\s\S]*?clip-path:/);
  assert.match(css, /\.brand-wordmark::after\s*{[\s\S]*?background: #ffd5e4;/);
  assert.doesNotMatch(css, /\.brand-subtitle\s*{/);
  assert.match(favicon, /viewBox="0 0 32 32"/);
  assert.match(favicon, /fill="#FFF2F6"/);
  assert.match(favicon, /stroke="#C91F5D"/);
  assert.match(favicon, /fill="#BC8620"/);
});

test("stores the finalized editorial artwork at the agreed dimensions", async () => {
  const assets = [
    ["../public/hero-firstview-pop-v2-desktop.png", 700, 525],
    ["../public/hero-firstview-pop-v2-mobile.png", 390, 292],
    ["../public/assets/comparison-point-points-v2.png", 320, 240],
    ["../public/assets/comparison-point-conditions-v2.png", 320, 240],
    ["../public/assets/comparison-point-value-v2.png", 320, 240],
    ["../public/assets/campaign-choice-step-scope-v1.png", 690, 460],
    ["../public/assets/campaign-choice-step-conditions-v1.png", 690, 460],
    ["../public/assets/campaign-choice-step-ranking-v1.png", 690, 460],
    ["../public/og-v2.png", 1200, 630],
    ["../public/apple-touch-icon.png", 180, 180],
  ];

  for (const [relativePath, width, height] of assets) {
    const metadata = await sharp(
      fileURLToPath(new URL(relativePath, import.meta.url)),
    ).metadata();
    assert.equal(metadata.width, width, `${relativePath} width`);
    assert.equal(metadata.height, height, `${relativePath} height`);
  }

  await assert.rejects(
    access(
      fileURLToPath(
        new URL(
          "../public/assets/campaign-types-guide-v2.png",
          import.meta.url,
        ),
      ),
    ),
  );
  await assert.rejects(
    access(
      fileURLToPath(
        new URL(
          "../public/assets/campaign-choice-steps-v3.png",
          import.meta.url,
        ),
      ),
    ),
  );
});
