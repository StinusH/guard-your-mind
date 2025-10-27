import { CONFIG, SELECTORS } from "../config";
import { hasTruthyShredditAttribute } from "../dom";
import {
  blockedSubreddits,
  nsfwSubredditCache,
  pendingSubredditChecks,
  shouldBlock18Plus,
  trackCurrentSubreddit,
} from "../state";

type SubredditAboutResponse = {
  data?: {
    over18?: boolean;
    over_18?: boolean;
  };
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
