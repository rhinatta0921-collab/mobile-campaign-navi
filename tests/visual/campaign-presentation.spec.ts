import { expect, test, type Locator, type Page } from "@playwright/test";

async function waitForCampaignImages(page: Page) {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  const failedAssets = await page
    .locator(".official-campaign-picture")
    .evaluateAll(async (pictures) => {
      const urls = new Set<string>();
      for (const picture of pictures) {
        const image = picture.querySelector("img");
        if (image instanceof HTMLImageElement) {
          image.loading = "eager";
          urls.add(image.src);
        }
        for (const source of picture.querySelectorAll("source")) {
          for (const candidate of source.srcset.split(",")) {
            const value = candidate.trim().split(/\s+/)[0];
            if (value) urls.add(new URL(value, location.href).href);
          }
        }
      }
      const results = await Promise.all(
        [...urls].map(async (url) => {
          try {
            return (await fetch(url)).ok ? null : url;
          } catch {
            return url;
          }
        }),
      );
      return results.filter(Boolean);
    });
  expect(failedAssets).toEqual([]);
  await expect
    .poll(() =>
      page.locator(".official-campaign-picture img").evaluateAll((images) =>
        images
          .filter((image) => image.getClientRects().length > 0)
          .every(
            (image) =>
              image instanceof HTMLImageElement &&
              image.complete &&
              image.naturalWidth > 0,
          ),
      ),
    )
    .toBe(true);
}

async function replacePicture(
  picture: Locator,
  fixture: "square" | "landscape" | "portrait",
  presentation?: "natural" | "contain-16x9",
) {
  await picture.evaluate(
    (element, options) => {
      for (const source of element.querySelectorAll("source")) source.remove();
      const image = element.querySelector("img");
      if (!(image instanceof HTMLImageElement)) throw new Error("fixture image missing");
      const dimensions = {
        square: [320, 320],
        landscape: [1600, 600],
        portrait: [750, 972],
      }[options.fixture];
      image.src = `/__visual_fixture__/${options.fixture}.svg`;
      image.width = dimensions[0];
      image.height = dimensions[1];
      if (options.presentation) {
        element.setAttribute("data-desktop-presentation", options.presentation);
      }
    },
    { fixture, presentation },
  );
  await expect
    .poll(() =>
      picture.locator("img").evaluate((image) =>
        image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
      ),
    )
    .toBe(true);
}

test("実データの画像は用途・寸法・レスポンシブ規則を満たす", async ({
  page,
}, testInfo) => {
  await waitForCampaignImages(page);
  const mobile = testInfo.project.name === "mobile";
  const expectedRankingSize = mobile ? 84 : 96;
  const violations = await page
    .locator(".official-campaign-picture")
    .evaluateAll(
      (pictures, expected) =>
        pictures
          .filter((picture) => picture.getClientRects().length > 0)
          .flatMap((picture) => {
          const purpose = picture.getAttribute("data-image-purpose");
          const image = picture.querySelector("img");
          if (!(image instanceof HTMLImageElement)) return ["img missing"];
          const box = picture.getBoundingClientRect();
          if (purpose === "ranking") {
            return Math.abs(box.width - expected.rankingSize) <= 1 &&
              Math.abs(box.height - expected.rankingSize) <= 1
              ? []
              : [`ranking ${box.width}x${box.height}`];
          }
          if (purpose !== "editorial") return [`unknown purpose ${purpose}`];
          const style = getComputedStyle(picture);
          const contentWidth =
            box.width -
            Number.parseFloat(style.borderLeftWidth) -
            Number.parseFloat(style.borderRightWidth);
          const contentHeight =
            box.height -
            Number.parseFloat(style.borderTopWidth) -
            Number.parseFloat(style.borderBottomWidth);
          const ratio = contentWidth / contentHeight;
          const naturalRatio = image.naturalWidth / image.naturalHeight;
          const source = picture.querySelector("source");
          if (
            purpose === "editorial" &&
            expected.mobile &&
            source &&
            !image.currentSrc.endsWith(source.srcset)
          ) {
            return [`mobile source ${image.currentSrc} != ${source.srcset}`];
          }
          if (expected.mobile) {
            return Math.abs(ratio - naturalRatio) <= 0.02
              ? []
              : [`mobile editorial ${ratio} != ${naturalRatio}`];
          }
          const presentation = picture.getAttribute(
            "data-desktop-presentation",
          );
          const expectedRatio =
            presentation === "contain-16x9" ? 16 / 9 : naturalRatio;
          return Math.abs(ratio - expectedRatio) <= 0.02
            ? []
            : [`desktop editorial ${ratio} != ${expectedRatio}`];
          }),
      { mobile, rankingSize: expectedRankingSize },
    );
  expect(violations).toEqual([]);
  if (mobile) {
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
  }
});

test("結論とランキングタブはコンテンツ表示ポリシーを満たす", async ({
  page,
}, testInfo) => {
  await waitForCampaignImages(page);
  const mobile = testInfo.project.name === "mobile";
  const conclusion = page.locator("#conclusion");
  const ranking = page.locator("#ranking");

  await expect(conclusion).toHaveAttribute(
    "data-content-policy",
    "campaign-content-v1",
  );
  await expect(ranking).toHaveAttribute(
    "data-content-policy",
    "campaign-content-v1",
  );
  await expect(conclusion.locator(".conclusion-highlight")).toHaveCount(1);
  await expect(conclusion.locator(".conclusion-official-link")).toHaveCount(1);
  await expect(conclusion.locator(".conclusion-official-link")).toHaveText(
    "公式ページで情報を確認する",
  );

  const conclusionCode = await conclusion
    .locator(".conclusion-campaign-picture")
    .getAttribute("data-campaign-code");
  const noticeCount = await conclusion.locator(".conclusion-login-note").count();
  expect(noticeCount).toBe(conclusionCode === "2162" ? 1 : 0);
  if (conclusionCode === "2162") {
    await expect(conclusion.locator(".conclusion-login-note")).toHaveText(
      "※楽天アカウントでのログインが必要です。",
    );
    await expect(conclusion.locator(".conclusion-login-note")).toHaveCSS(
      "color",
      "rgb(115, 115, 115)",
    );
  }

  const tabs = ranking.locator(".ranking-tabs");
  const nextVisibleElement = mobile
    ? ranking.locator(".ranking-scroll-note")
    : ranking.locator('[data-application-ranking="mnp"]');
  const [tabsBox, nextBox] = await Promise.all([
    tabs.boundingBox(),
    nextVisibleElement.boundingBox(),
  ]);
  expect(tabsBox).not.toBeNull();
  expect(nextBox).not.toBeNull();
  expect(Math.abs(nextBox!.y - (tabsBox!.y + tabsBox!.height) - 12)).toBeLessThanOrEqual(1);
});

test("表示ポリシーの基準画像と一致する", async ({ page }, testInfo) => {
  await waitForCampaignImages(page);
  const mobile = testInfo.project.name === "mobile";
  const ranking = page.locator(".ranking-campaign-picture").first();
  await replacePicture(ranking, "square");
  await ranking.evaluate((element) => {
    Object.assign((element as HTMLElement).style, {
      left: "0",
      margin: "0",
      position: "fixed",
      top: "0",
      zIndex: "9999",
    });
  });
  await expect(ranking).toHaveScreenshot("ranking.png");

  const conclusion = page.locator(".conclusion-campaign-picture").first();
  await replacePicture(
    conclusion,
    mobile ? "portrait" : "landscape",
    "natural",
  );
  await expect(conclusion).toHaveScreenshot("conclusion.png");

  const detail = page.locator(".campaign-detail-picture").first();
  await replacePicture(detail, "portrait", "contain-16x9");
  const detailWidth = await detail.evaluate(
    (element) => element.getBoundingClientRect().width,
  );
  await detail.evaluate(
    (element, width) => {
      Object.assign((element as HTMLElement).style, {
        left: "0",
        margin: "0",
        position: "fixed",
        top: "0.75px",
        width: `${width}px`,
        zIndex: "9999",
      });
    },
    detailWidth,
  );
  await expect(detail).toHaveScreenshot("detail.png", {
    maxDiffPixelRatio: 0.003,
  });
});
