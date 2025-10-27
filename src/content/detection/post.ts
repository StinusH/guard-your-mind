import { SELECTORS } from "../config";
import { hasTruthyAttribute, querySelectorAllWithin, querySelectorWithin } from "../dom";
import { shouldBlock18Plus } from "../state";
import { isAlwaysBlockedDomain } from "./domains";

export const isMaturePost = (element: Element): boolean => {
  const block18Plus = shouldBlock18Plus();

  const badgeElements = querySelectorAllWithin(element, SELECTORS.mature.post.tags);
  for (const badge of badgeElements) {
    const icon = (badge as HTMLElement).getAttribute("icon")?.toLowerCase() ?? "";
    const badgeText = badge.textContent?.toLowerCase() ?? "";

    if (icon.includes("nsfw") || badgeText.includes("nsfw")) {
      return true;
    }

    if (block18Plus && (icon.includes("18") || badgeText.includes("18+"))) {
      return true;
    }
  }

  if (querySelectorWithin(element, SELECTORS.mature.post.blur)) {
    return true;
  }

  if (hasTruthyAttribute(element, "data-nsfw") || hasTruthyAttribute(element, "nsfw")) {
    return true;
  }

  const shredditPostHost = element.closest("shreddit-post");

  if (block18Plus) {
    if (hasTruthyAttribute(element, "data-over18") || hasTruthyAttribute(element, "over18")) {
      return true;
    }

    if (
      shredditPostHost &&
      (hasTruthyAttribute(shredditPostHost, "over18") ||
        hasTruthyAttribute(shredditPostHost, "data-over18"))
    ) {
      return true;
    }

    if (shredditPostHost && hasTruthyAttribute(shredditPostHost, "nsfw")) {
      return true;
    }

    if (querySelectorWithin(element, '[data-over18="true"], [over18="true"]')) {
      return true;
    }
  } else if (shredditPostHost && hasTruthyAttribute(shredditPostHost, "nsfw")) {
    return true;
  }

  const postText =
    querySelectorWithin(element, SELECTORS.mature.post.title)?.textContent ||
    querySelectorWithin(element, "h3")?.textContent ||
    "";
  const postTextLower = postText.toLowerCase();
  if (postTextLower.includes("nsfw")) {
    return true;
  }
  if (block18Plus && postTextLower.includes("18+")) {
    return true;
  }

  const ariaLabel = element.getAttribute("aria-label")?.toLowerCase() || "";
  if (ariaLabel.includes("nsfw")) {
    return true;
  }
  if (block18Plus && ariaLabel.includes("18+")) {
    return true;
  }

  if (isAlwaysBlockedDomain(element)) {
    return true;
  }

  return false;
};
