"use client";

import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useState,
} from "react";
import type { ApplicationType } from "@/data/campaigns";

type CampaignApplicationSectionsProps = {
  detailsTitle: string;
  mnpDetails: ReactNode;
  mnpRanking: ReactNode;
  newNumberDetails: ReactNode;
  newNumberRanking: ReactNode;
  rankingCampaignCount: number;
  rankingTitle: string;
};

const applicationTypes: readonly ApplicationType[] = ["mnp", "newNumber"];

function applicationSlug(applicationType: ApplicationType) {
  return applicationType === "mnp" ? "mnp" : "new-number";
}

function applicationTypeFromLocation(): ApplicationType {
  return new URLSearchParams(window.location.search).get("application") ===
    "new-number"
    ? "newNumber"
    : "mnp";
}

function replaceApplicationUrl(applicationType: ApplicationType) {
  const url = new URL(window.location.href);
  if (applicationType === "newNumber") {
    url.searchParams.set("application", "new-number");
  } else {
    url.searchParams.delete("application");
  }
  window.history.replaceState(
    window.history.state,
    "",
    `${url.pathname}${url.search}${url.hash}`,
  );
}

export function CampaignApplicationSections({
  detailsTitle,
  mnpDetails,
  mnpRanking,
  newNumberDetails,
  newNumberRanking,
  rankingCampaignCount,
  rankingTitle,
}: CampaignApplicationSectionsProps) {
  const [applicationType, setApplicationType] =
    useState<ApplicationType>("mnp");

  useEffect(() => {
    const syncApplicationType = () => {
      setApplicationType(applicationTypeFromLocation());
    };

    syncApplicationType();
    window.addEventListener("popstate", syncApplicationType);
    return () => window.removeEventListener("popstate", syncApplicationType);
  }, []);

  function selectApplicationType(nextApplicationType: ApplicationType) {
    setApplicationType(nextApplicationType);
    replaceApplicationUrl(nextApplicationType);
  }

  function handleTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    currentApplicationType: ApplicationType,
  ) {
    let nextApplicationType: ApplicationType | undefined;

    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      nextApplicationType =
        currentApplicationType === "mnp" ? "newNumber" : "mnp";
    } else if (event.key === "Home") {
      nextApplicationType = "mnp";
    } else if (event.key === "End") {
      nextApplicationType = "newNumber";
    }

    if (!nextApplicationType) return;

    event.preventDefault();
    selectApplicationType(nextApplicationType);
    document
      .getElementById(`sim-only-ranking-tab-${applicationSlug(nextApplicationType)}`)
      ?.focus();
  }

  return (
    <>
      <section
        className="ranking-section"
        id="ranking"
        aria-labelledby="ranking-title"
        data-campaign-derived="ranking"
      >
        <div className="section-heading">
          <p className="section-label">
            端末購入不要・回線申込キャンペーン
            {rankingCampaignCount}種比較
          </p>
          <h2 id="ranking-title">{rankingTitle}</h2>
          <p>
            端末・ルーターの購入が不要で、楽天モバイル回線または対象モバイルプランの申し込み・利用開始が特典の直接条件となるキャンペーンを比較しています。順位は申込者本人が受け取る固定ポイントだけで決定します。
          </p>
          <p className="ranking-method-note">
            現在使用している電話番号をそのままで乗り換える(MNP)か楽天モバイルで新しい電話番号を取得するかで獲得可能ポイント額が変動するため、タブで分けてランキングを算出しています。
          </p>
        </div>

        <div className="ranking-tabs" role="tablist" aria-label="申込方法">
          {applicationTypes.map((item) => {
            const slug = applicationSlug(item);
            const isSelected = applicationType === item;
            return (
              <button
                id={`sim-only-ranking-tab-${slug}`}
                className="ranking-tab"
                key={item}
                type="button"
                role="tab"
                aria-controls={`sim-only-ranking-panel-${slug}`}
                aria-selected={isSelected}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => selectApplicationType(item)}
                onKeyDown={(event) => handleTabKeyDown(event, item)}
              >
                {item === "mnp"
                  ? "電話番号そのまま他社から乗り換え"
                  : "新しい電話番号で契約"}
              </button>
            );
          })}
        </div>

        <p className="ranking-scroll-note">横にスクロールして比較できます</p>

        <div
          id="sim-only-ranking-panel-mnp"
          data-application-ranking="mnp"
          role="tabpanel"
          aria-labelledby="sim-only-ranking-tab-mnp"
          hidden={applicationType !== "mnp"}
        >
          {mnpRanking}
        </div>
        <div
          id="sim-only-ranking-panel-new-number"
          data-application-ranking="new-number"
          role="tabpanel"
          aria-labelledby="sim-only-ranking-tab-new-number"
          hidden={applicationType !== "newNumber"}
        >
          {newNumberRanking}
        </div>
      </section>

      <section
        className="detail-section"
        id="details"
        aria-labelledby="details-title"
        data-campaign-derived="details"
      >
        <div className="section-heading">
          <p className="section-label">詳細</p>
          <h2 id="details-title">{detailsTitle}</h2>
        </div>

        <div data-application-details="mnp" hidden={applicationType !== "mnp"}>
          {mnpDetails}
        </div>
        <div
          data-application-details="new-number"
          hidden={applicationType !== "newNumber"}
        >
          {newNumberDetails}
        </div>
      </section>
    </>
  );
}
