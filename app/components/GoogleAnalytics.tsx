"use client";

import { useEffect } from "react";
import {
  EMPLOYEE_REFERRAL_CLICK_EVENT,
  OFFICIAL_LINK_CLICK_EVENT,
} from "@/app/lib/analytics";
import { GA_MEASUREMENT_ID, SITE_URL } from "@/app/site-config";

type Gtag = (
  command: "config" | "event" | "js",
  targetOrDate: string | Date,
  parameters?: Record<string, boolean | string>,
) => void;

declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: Gtag;
  }
}

const productionHostname = new URL(SITE_URL).hostname;
const googleTagScriptId = "google-analytics-tag";

function initializeGoogleAnalytics() {
  window.dataLayer ??= [];
  window.gtag ??= (...args: Parameters<Gtag>) => {
    window.dataLayer!.push(args);
  };

  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID, {
    allow_ad_personalization_signals: false,
    allow_google_signals: false,
    send_page_view: true,
  });

  if (document.getElementById(googleTagScriptId)) return;

  const script = document.createElement("script");
  script.async = true;
  script.id = googleTagScriptId;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`;
  document.head.appendChild(script);
}

function handleOfficialLinkClick(event: MouseEvent) {
  if (!(event.target instanceof Element)) return;

  const link = event.target.closest<HTMLAnchorElement>(
    `a[data-analytics-event="${OFFICIAL_LINK_CLICK_EVENT}"]`,
  );
  if (!link || !window.gtag) return;

  const campaignCode = link.dataset.analyticsCampaignCode;
  const applicationType = link.dataset.analyticsApplicationType;
  const placement = link.dataset.analyticsPlacement;
  const linkType = link.dataset.analyticsLinkType;

  if (!campaignCode || !applicationType || !placement || !linkType) return;

  const parameters = {
    application_type: applicationType,
    campaign_code: campaignCode,
    link_text: link.textContent?.trim().replace(/\s+/g, " ") ?? "",
    link_type: linkType,
    link_url: link.href,
    placement: placement,
  };

  window.gtag("event", OFFICIAL_LINK_CLICK_EVENT, parameters);

  if (
    link.dataset.analyticsReferralEvent === EMPLOYEE_REFERRAL_CLICK_EVENT
  ) {
    window.gtag("event", EMPLOYEE_REFERRAL_CLICK_EVENT, parameters);
  }
}

export function GoogleAnalytics() {
  useEffect(() => {
    document.addEventListener("click", handleOfficialLinkClick);

    if (window.location.hostname === productionHostname) {
      initializeGoogleAnalytics();
    }

    return () => document.removeEventListener("click", handleOfficialLinkClick);
  }, []);

  return null;
}
