import { CONFIG, SELECTORS } from "../config";
import { hasTruthyShredditAttribute } from "../dom";
import {
  blockedSubreddits,
  nsfwSubredditCache,
  pendingSubredditChecks,
  shouldBlock18Plus,
  trackCurrentSubreddit,
} from "../state";

type CommunityAboutResponse = {
  data?: Record<string, unknown>;
};

type CommunityType = "subreddit" | "user";

type CommunityContext = {
  type: CommunityType;
  name: string;
  normalized: string;
  storageKey: string;
  aboutPath: string;
};

const COMMUNITY_ROUTE_PATTERNS: Array<{ type: CommunityType; regex: RegExp }> = [
  { type: "subreddit", regex: /^\/r\/([^/]+)/i },
  { type: "user", regex: /^\/user\/([^/]+)/i },
  { type: "user", regex: /^\/u\/([^/]+)/i },
];

const NSFW_FLAG_KEYS = ["isNsfw", "isNSFW", "is_nsfw", "nsfw", "isAdult"];
const OVER18_FLAG_KEYS = ["over18", "over_18", "isOver18", "is_over_18", "isAdult"];

const decodeHtmlEntities = (value: string): string =>
  value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

const hasTrueFlag = (candidate: Record<string, unknown>, keys: string[]): boolean =>
  keys.some((key) => candidate[key] === true);

const extractBooleanFlag = (input: unknown, block18Plus: boolean): boolean => {
  if (!input || typeof input !== "object") {
    return false;
  }

  const candidate = input as Record<string, unknown>;

  if (hasTrueFlag(candidate, NSFW_FLAG_KEYS)) {
    return true;
  }

  if (!block18Plus) {
    return false;
  }

  return hasTrueFlag(candidate, OVER18_FLAG_KEYS);
};

const extractFlagFromPayload = (
  payload: CommunityAboutResponse | null,
  block18Plus: boolean,
): boolean => {
  if (!payload?.data || typeof payload.data !== "object" || payload.data === null) {
    return false;
  }

  const data = payload.data as Record<string, unknown>;
  if (extractBooleanFlag(data, block18Plus)) {
    return true;
  }

  const nestedCandidates: unknown[] = [];

  if (typeof data.profile === "object" && data.profile) {
    nestedCandidates.push(data.profile);
  }

  if (typeof data.subreddit === "object" && data.subreddit) {
    nestedCandidates.push(data.subreddit);
  }

  return nestedCandidates.some((candidate) => extractBooleanFlag(candidate, block18Plus));
};

const decodePathSegment = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const buildCommunityContext = (): CommunityContext | null => {
  for (const { type, regex } of COMMUNITY_ROUTE_PATTERNS) {
    const match = location.pathname.match(regex);
    if (!match) {
      continue;
    }

    const raw = match[1];
    const decoded = decodePathSegment(raw).trim();
    if (!decoded) {
      continue;
    }

    const normalized = decoded.toLowerCase();
    const storageKey = type === "subreddit" ? normalized : `user:${normalized}`;
    const aboutPath =
      type === "subreddit"
        ? `/r/${encodeURIComponent(normalized)}/about.json`
        : `/user/${encodeURIComponent(decoded)}/about.json`;

    return {
      type,
      name: decoded,
      normalized,
      storageKey,
      aboutPath,
    };
  }

  return null;
};

const redditPageDataIndicatesAdult = (block18Plus: boolean): boolean => {
  const pageDataElements = document.querySelectorAll<HTMLElement>("reddit-page-data[data]");
  for (const element of Array.from(pageDataElements)) {
    const encoded = element.getAttribute("data");
    if (!encoded) {
      continue;
    }

    const decoded = decodeHtmlEntities(encoded);

    try {
      const parsed = JSON.parse(decoded);
      if (!parsed || typeof parsed !== "object") {
        continue;
      }

      const containers: unknown[] = [parsed];
      const parsedRecord = parsed as Record<string, unknown>;

      if (typeof parsedRecord.profile === "object" && parsedRecord.profile) {
        containers.push(parsedRecord.profile);
      }

      if (typeof parsedRecord.subreddit === "object" && parsedRecord.subreddit) {
        containers.push(parsedRecord.subreddit);
      }

      if (containers.some((candidate) => extractBooleanFlag(candidate, block18Plus))) {
        return true;
      }
    } catch {
      if (decoded.includes('"isNsfw":true') || decoded.includes('"isNSFW":true')) {
        return true;
      }

      if (
        block18Plus &&
        (decoded.includes('"over18":true') ||
          decoded.includes('"over_18":true') ||
          decoded.includes('"isOver18":true') ||
          decoded.includes('"isAdult":true'))
      ) {
        return true;
      }
    }
  }

  return false;
};

const scheduleCommunityMetadataCheck = (
  community: CommunityContext,
  block18Plus: boolean,
): void => {
  if (!block18Plus && community.type !== "user") {
    return;
  }

  const cacheKey = community.storageKey;

  if (
    blockedSubreddits.has(cacheKey) ||
    pendingSubredditChecks.has(cacheKey) ||
    nsfwSubredditCache.has(cacheKey)
  ) {
    return;
  }

  const metadataPromise = fetch(community.aboutPath, {
    credentials: "same-origin",
  })
    .then<CommunityAboutResponse | null>((response) => {
      if (!response.ok) {
        return null;
      }
      return response.json() as Promise<CommunityAboutResponse>;
    })
    .then((payload) => {
      const isAdultContent = extractFlagFromPayload(payload, block18Plus);
      nsfwSubredditCache.set(cacheKey, isAdultContent);

      if (isAdultContent && community.type === "subreddit") {
        trackCurrentSubreddit("subreddit metadata", community.storageKey);
      }
    })
    .catch((error) => {
      if (CONFIG.debugMode) {
        console.warn(
          "Guard Your Mind failed to fetch community metadata",
          community.storageKey,
          error,
        );
      }
    })
    .finally(() => {
      pendingSubredditChecks.delete(cacheKey);
    });

  pendingSubredditChecks.set(cacheKey, metadataPromise);
};

export const isMatureSubreddit = (): boolean => {
  const block18Plus = shouldBlock18Plus();
  const community = buildCommunityContext();

  const trackSubreddit = (reason: string): void => {
    if (community?.type === "subreddit") {
      trackCurrentSubreddit(reason, community.storageKey);
    }
  };

  if (community?.type === "subreddit" && blockedSubreddits.has(community.storageKey)) {
    return true;
  }

  if (community && redditPageDataIndicatesAdult(block18Plus)) {
    nsfwSubredditCache.set(community.storageKey, true);
    trackSubreddit("reddit-page-data flag");
    return true;
  }

  const body = document.body;
  if (block18Plus && (body?.dataset.over18 === "true" || body?.dataset.isOver18 === "true")) {
    trackSubreddit("body dataset flag");
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
    trackSubreddit("shreddit-app attributes");
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
    trackSubreddit("shreddit-app attributes");
    return true;
  }

  const badgeElement = document.querySelector(SELECTORS.mature.subreddit.badges);
  if (badgeElement) {
    const badgeIcon = (badgeElement as HTMLElement).getAttribute("icon")?.toLowerCase() ?? "";
    const badgeText = badgeElement.textContent?.toLowerCase() ?? "";
    const isNSFWBadge = badgeIcon.includes("nsfw") || badgeText.includes("nsfw");
    const is18Badge = badgeIcon.includes("18") || badgeText.includes("18+");

    if (isNSFWBadge || (block18Plus && is18Badge)) {
      trackSubreddit("subreddit header badge");
      return true;
    }
  }

  const pageTitle = document.title.toLowerCase();
  if (pageTitle.includes("nsfw")) {
    trackSubreddit("page title hint");
    return true;
  }
  if (block18Plus && pageTitle.includes("18+")) {
    trackSubreddit("page title hint");
    return true;
  }

  if (community) {
    const cachedNSFW = nsfwSubredditCache.get(community.storageKey);
    if (cachedNSFW) {
      if (community.type === "subreddit") {
        trackSubreddit("subreddit metadata cache");
      }
      return true;
    }

    if (cachedNSFW === undefined) {
      scheduleCommunityMetadataCheck(community, block18Plus);
    }
  }

  return false;
};
