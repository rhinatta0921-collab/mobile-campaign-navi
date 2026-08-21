import type { ApplicationType } from "@/data/campaigns";

export const OFFICIAL_LINK_CLICK_EVENT = "official_link_click";
export const EMPLOYEE_REFERRAL_CLICK_EVENT = "employee_referral_click";

export type AnalyticsApplicationType = ApplicationType | "general";
export type OfficialLinkType =
  | "image_source"
  | "official_information"
  | "referral_application";
export type OfficialLinkPlacement =
  | "conclusion_image"
  | "conclusion_primary"
  | "ranking"
  | "details_image"
  | "details_primary"
  | "details_referral_application";

type OfficialLinkAnalyticsOptions = {
  applicationType: AnalyticsApplicationType;
  campaignCode: string;
  linkType: OfficialLinkType;
  placement: OfficialLinkPlacement;
  trackEmployeeReferral?: boolean;
};

type OfficialLinkAnalyticsAttributes = {
  "data-analytics-application-type": AnalyticsApplicationType;
  "data-analytics-campaign-code": string;
  "data-analytics-event": typeof OFFICIAL_LINK_CLICK_EVENT;
  "data-analytics-link-type": OfficialLinkType;
  "data-analytics-placement": OfficialLinkPlacement;
  "data-analytics-referral-event"?: typeof EMPLOYEE_REFERRAL_CLICK_EVENT;
};

export function officialLinkAnalyticsAttributes({
  applicationType,
  campaignCode,
  linkType,
  placement,
  trackEmployeeReferral = false,
}: OfficialLinkAnalyticsOptions): OfficialLinkAnalyticsAttributes {
  return {
    "data-analytics-application-type": applicationType,
    "data-analytics-campaign-code": campaignCode,
    "data-analytics-event": OFFICIAL_LINK_CLICK_EVENT,
    "data-analytics-link-type": linkType,
    "data-analytics-placement": placement,
    ...(trackEmployeeReferral
      ? { "data-analytics-referral-event": EMPLOYEE_REFERRAL_CLICK_EVENT }
      : {}),
  };
}
