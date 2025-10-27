import { SELECTORS } from "../config";
import { hasTruthyAttribute } from "../dom";
import { shouldBlock18Plus } from "../state";
import { isAlwaysBlockedDomain } from "./domains";

export const isMatureSearchResult = (element: Element): boolean => {
  const block18Plus = shouldBlock18Plus();

  if (element.querySelector(SELECTORS.mature.search.icon)) {
    return true;
  }

  if (element.querySelector(SELECTORS.mature.search.warnings)) {
    return true;
  }

  const trackingContext = element.getAttribute("data-faceplate-tracking-context");
  if (trackingContext) {
    if (trackingContext.includes('"nsfw":true')) {
      return true;
    }
    if (
      block18Plus &&
      (trackingContext.includes('"over18":true') ||
        trackingContext.includes('"over_18":true') ||
        trackingContext.includes('"isOver18":true'))
    ) {
      return true;
    }
  }

  const nsfwBadge = element.querySelector(SELECTORS.mature.search.badges);
  if (nsfwBadge) {
    const badgeElement = nsfwBadge as HTMLElement;
    const badgeText = badgeElement.textContent?.toLowerCase() || "";
    const badgeIcon = badgeElement.getAttribute("icon")?.toLowerCase() || "";
    if (badgeText.includes("nsfw") || badgeIcon.includes("nsfw")) {
      return true;
    }
    if (block18Plus && (badgeText.includes("18+") || badgeIcon.includes("18"))) {
      return true;
    }
  }

  if (element.getAttribute("data-nsfw") === "true" || element.getAttribute("nsfw") === "true") {
    return true;
  }

  if (block18Plus) {
    if (
      hasTruthyAttribute(element, "data-over18") ||
      hasTruthyAttribute(element, "over18") ||
      hasTruthyAttribute(element, "nsfw")
    ) {
      return true;
    }

    const shredditPost = element.closest("shreddit-post");
    if (
      shredditPost &&
      (hasTruthyAttribute(shredditPost, "over18") ||
        hasTruthyAttribute(shredditPost, "nsfw") ||
        hasTruthyAttribute(shredditPost, "data-over18"))
    ) {
      return true;
    }
  }

  if (isAlwaysBlockedDomain(element)) {
    return true;
  }

  return false;
};
