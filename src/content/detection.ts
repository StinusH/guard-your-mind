import { ALWAYS_BLOCKED_DOMAINS } from "../shared/settings";
import { CONFIG, SELECTORS } from "./config";
import {
  hasTruthyAttribute,
  hasTruthyShredditAttribute,
  querySelectorAllWithin,
  querySelectorWithin,
} from "./dom";
import {
  blockedSubreddits,
  nsfwSubredditCache,
  pendingSubredditChecks,
  shouldBlock18Plus,
  trackCurrentSubreddit,
} from "./state";

type SubredditAboutResponse = {
  data?: {
    over18?: boolean;
    over_18?: boolean;
  };
};

const normalizeHostname = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    let hostname: string;
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
      hostname = new URL(trimmed).hostname;
    } else if (trimmed.includes("/") || trimmed.includes("?")) {
      hostname = new URL(trimmed, window.location.origin).hostname;
    } else {
      hostname = trimmed;
    }

    const normalized = hostname.toLowerCase();
    if (normalized.startsWith("www.")) {
      return normalized.slice(4);
    }
    return normalized;
  } catch {
    return null;
  }
};

const matchesAlwaysBlockedDomain = (hostname: string | null): boolean => {
  if (!hostname) {
    return false;
  }

  const target = hostname.toLowerCase();
  for (const domain of ALWAYS_BLOCKED_DOMAINS) {
    if (target === domain || target.endsWith(`.${domain}`)) {
      return true;
    }
  }
  return false;
};

export const isAlwaysBlockedDomain = (element: Element): boolean => {
  const hostnames = new Set<string>();

  const addCandidate = (candidate: string | null | undefined): void => {
    const normalized = normalizeHostname(candidate);
    if (normalized) {
      hostnames.add(normalized);
    }
  };

  addCandidate(element.getAttribute("domain"));
  addCandidate(element.getAttribute("data-domain"));
  addCandidate(element.getAttribute("content-href"));
  addCandidate(element.getAttribute("href"));

  const shredditPost = element.closest("shreddit-post");
  if (shredditPost) {
    addCandidate(shredditPost.getAttribute("domain"));
    addCandidate(shredditPost.getAttribute("data-domain"));
    addCandidate(shredditPost.getAttribute("content-href"));
  }

  const anchorElements = element.querySelectorAll<HTMLAnchorElement>("a[href]");
  for (let index = 0; index < anchorElements.length && index < 4; index += 1) {
    addCandidate(anchorElements[index].href);
  }

  for (const hostname of hostnames) {
    if (matchesAlwaysBlockedDomain(hostname)) {
      return true;
    }
  }

  return false;
};

const scheduleSubredditMetadataCheck = (subreddit: string, block18Plus: boolean): void => {
  if (!block18Plus) {
    return;
  }

  const normalized = subreddit.toLowerCase();
  if (
    blockedSubreddits.has(normalized) ||
    pendingSubredditChecks.has(normalized) ||
    nsfwSubredditCache.has(normalized)
  ) {
    return;
  }

  const metadataPromise = fetch(`/r/${encodeURIComponent(normalized)}/about.json`, {
    credentials: "same-origin",
  })
    .then<SubredditAboutResponse | null>((response) => {
      if (!response.ok) {
        return null;
      }
      return response.json() as Promise<SubredditAboutResponse>;
    })
    .then((payload) => {
      const isOver18 = Boolean(payload?.data?.over18 ?? payload?.data?.over_18);
      nsfwSubredditCache.set(normalized, isOver18);

      if (isOver18 && !blockedSubreddits.has(normalized)) {
        trackCurrentSubreddit("subreddit metadata", normalized);
      }
    })
    .catch((error) => {
      if (CONFIG.debugMode) {
        console.warn("Guard Your Mind failed to fetch subreddit metadata", normalized, error);
      }
    })
    .finally(() => {
      pendingSubredditChecks.delete(normalized);
    });

  pendingSubredditChecks.set(normalized, metadataPromise);
};

export const isMatureSubreddit = (): boolean => {
  const block18Plus = shouldBlock18Plus();

  const manualMatch = location.pathname.match(/^\/r\/([^/]+)/i);
  const currentSubreddit = manualMatch ? manualMatch[1].toLowerCase() : null;
  if (currentSubreddit && blockedSubreddits.has(currentSubreddit)) {
    return true;
  }

  const body = document.body;
  if (block18Plus && (body?.dataset.over18 === "true" || body?.dataset.isOver18 === "true")) {
    trackCurrentSubreddit("body dataset flag");
    return true;
  }

  const shredditApp = document.querySelector(SELECTORS.mature.subreddit.app);
  const hasRouteNSFWFlag = hasTruthyShredditAttribute(shredditApp, [
    "routeisnsfw",
    "route-is-nsfw",
    "data-routeisnsfw",
    "data-route-is-nsfw",
  ]);
  if (hasRouteNSFWFlag) {
    trackCurrentSubreddit("shreddit-app attributes");
    return true;
  }
  const hasOver18Flag =
    block18Plus &&
    hasTruthyShredditAttribute(shredditApp, [
      "over18",
      "over-18",
      "data-over18",
      "data-over-18",
      "data-subreddit-over18",
    ]);
  if (hasOver18Flag) {
    trackCurrentSubreddit("shreddit-app attributes");
    return true;
  }

  const badgeElement = document.querySelector(SELECTORS.mature.subreddit.badges);
  if (badgeElement) {
    const badgeIcon = (badgeElement as HTMLElement).getAttribute("icon")?.toLowerCase() ?? "";
    const badgeText = badgeElement.textContent?.toLowerCase() ?? "";
    const isNSFWBadge = badgeIcon.includes("nsfw") || badgeText.includes("nsfw");
    const is18Badge = badgeIcon.includes("18") || badgeText.includes("18+");

    if (isNSFWBadge || (block18Plus && is18Badge)) {
      trackCurrentSubreddit("subreddit header badge");
      return true;
    }
  }

  const pageTitle = document.title.toLowerCase();
  if (pageTitle.includes("nsfw")) {
    trackCurrentSubreddit("page title hint");
    return true;
  }
  if (block18Plus && pageTitle.includes("18+")) {
    trackCurrentSubreddit("page title hint");
    return true;
  }

  if (currentSubreddit) {
    const cachedNSFW = nsfwSubredditCache.get(currentSubreddit);
    if (cachedNSFW && !blockedSubreddits.has(currentSubreddit)) {
      trackCurrentSubreddit("subreddit metadata cache", currentSubreddit);
      return true;
    }

    if (cachedNSFW === undefined) {
      scheduleSubredditMetadataCheck(currentSubreddit, block18Plus);
    }
  }

  return false;
};

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
