import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

const outDirectory = fileURLToPath(new URL("../out/", import.meta.url));
const referralUrl = "https://r10.to/hkD5ah";

function attributes(attributeText) {
  return Object.fromEntries(
    [...attributeText.matchAll(/([\w:-]+)="([^"]*)"/g)].map((match) => [
      match[1],
      match[2],
    ]),
  );
}

async function javascriptFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const pathname = `${directory}/${entry.name}`;
    if (entry.isDirectory()) {
      files.push(...(await javascriptFiles(pathname)));
    } else if (entry.name.endsWith(".js")) {
      files.push(pathname);
    }
  }
  return files;
}

test("renders the privacy notice and safe Google privacy links", async () => {
  const html = await readFile(new URL("../out/index.html", import.meta.url), "utf8");
  assert.match(html, /<h2 id="footer-privacy-title">アクセス解析とプライバシー<\/h2>/);
  assert.match(html, /Google AnalyticsはCookieを使用し/);
  assert.match(html, /氏名、メールアドレス等をGoogle[\s\S]*?Analyticsへ送信することはありません/);

  for (const href of [
    "https://policies.google.com/privacy?hl=ja",
    "https://tools.google.com/dlpage/gaoptout?hl=ja",
  ]) {
    const escapedHref = href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(
      html,
      new RegExp(
        `<a href="${escapedHref}" rel="noopener noreferrer" target="_blank">`,
      ),
    );
  }
});

test("annotates every Rakuten official link with the complete event schema", async () => {
  const html = await readFile(new URL("../out/index.html", import.meta.url), "utf8");
  const anchors = [...html.matchAll(/<a\b([^>]*)>/g)].map((match) =>
    attributes(match[1]),
  );
  const officialAnchors = anchors.filter(
    ({ href }) =>
      href?.startsWith("https://network.mobile.rakuten.co.jp/") ||
      href === referralUrl,
  );

  assert.equal(officialAnchors.length, 86);
  for (const anchor of officialAnchors) {
    assert.equal(anchor["data-analytics-event"], "official_link_click");
    assert.match(anchor["data-analytics-campaign-code"], /^\d+$/);
    assert.match(
      anchor["data-analytics-application-type"],
      /^(general|mnp|newNumber)$/,
    );
    assert.match(
      anchor["data-analytics-placement"],
      /^(conclusion_image|conclusion_primary|ranking|details_image|details_primary|details_referral_application)$/,
    );
    assert.match(
      anchor["data-analytics-link-type"],
      /^(image_source|official_information|referral_application)$/,
    );
  }

  const employeeReferralAnchors = officialAnchors.filter(
    ({ href }) => href === referralUrl,
  );
  assert.equal(employeeReferralAnchors.length, 5);
  assert.equal(
    employeeReferralAnchors.every(
      (anchor) =>
        anchor["data-analytics-referral-event"] ===
          "employee_referral_click" &&
        anchor["data-analytics-link-type"] === "referral_application",
    ),
    true,
  );
  assert.equal(
    officialAnchors
      .filter(({ href }) => href !== referralUrl)
      .every((anchor) => !("data-analytics-referral-event" in anchor)),
    true,
  );
  assert.doesNotMatch(
    officialAnchors.map((anchor) => JSON.stringify(anchor)).join("\n"),
    /data-analytics-(?:email|name|user)/i,
  );
});

test("loads GA4 only after the exact production hostname check", async () => {
  const [configSource, analyticsSource, html] = await Promise.all([
    readFile(new URL("../app/site-config.ts", import.meta.url), "utf8"),
    readFile(
      new URL("../app/components/GoogleAnalytics.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../out/index.html", import.meta.url), "utf8"),
  ]);
  const measurementId = configSource.match(
    /GA_MEASUREMENT_ID = "(G-[A-Z0-9]+)"/,
  )?.[1];
  assert.ok(measurementId, "real GA4 measurement ID");
  assert.doesNotMatch(measurementId, /REPLACED|PENDING|EXAMPLE/);
  assert.match(
    analyticsSource,
    /window\.location\.hostname === productionHostname/,
  );
  assert.match(analyticsSource, /allow_google_signals: false/);
  assert.match(analyticsSource, /allow_ad_personalization_signals: false/);
  for (const parameter of [
    "application_type",
    "campaign_code",
    "link_text",
    "link_type",
    "link_url",
    "placement",
  ]) {
    assert.match(analyticsSource, new RegExp(`\\b${parameter}:`));
  }
  assert.doesNotMatch(analyticsSource, /\b(?:email|user_id|user_name)\s*:/i);
  assert.doesNotMatch(
    html,
    /<script[^>]+src="https:\/\/www\.googletagmanager\.com\/gtag\/js/,
  );

  const compiledJavascript = await Promise.all(
    (await javascriptFiles(outDirectory)).map((pathname) =>
      readFile(pathname, "utf8"),
    ),
  );
  const joinedJavascript = compiledJavascript.join("\n");
  assert.match(joinedJavascript, new RegExp(measurementId));
  assert.match(joinedJavascript, /official_link_click/);
  assert.match(joinedJavascript, /employee_referral_click/);
});

test("exports the exact Search Console verification meta tag", async () => {
  const [html, configSource] = await Promise.all([
    readFile(new URL("../out/index.html", import.meta.url), "utf8"),
    readFile(new URL("../app/site-config.ts", import.meta.url), "utf8"),
  ]);
  const verificationToken = configSource.match(
    /GOOGLE_SITE_VERIFICATION =\s*\n?\s*"([^"]+)"/,
  )?.[1];
  assert.ok(verificationToken, "Search Console verification token");

  const verificationTags = [
    ...html.matchAll(
      /<meta(?=[^>]*\bname="google-site-verification")(?=[^>]*\bcontent="([^"]+)")[^>]*>/g,
    ),
  ];
  assert.equal(verificationTags.length, 1);
  assert.equal(verificationTags[0][1], verificationToken);

  const verificationFiles = (await readdir(outDirectory)).filter((filename) =>
    /^google[\w-]+\.html$/.test(filename),
  );
  assert.deepEqual(verificationFiles, []);
});
