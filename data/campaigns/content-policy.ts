import policy from "./content-policy.json";

export const campaignContentPolicy = policy;

export function getConclusionLoginNotice(campaignCode: string) {
  return campaignCode === policy.conclusion.loginNotice.campaignCode
    ? policy.conclusion.loginNotice.text
    : null;
}
