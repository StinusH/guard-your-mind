import { CONFIG, SELECTORS } from "../config";
import { hasTruthyShredditAttribute } from "../dom";
import {
  blockedSubreddits,
  nsfwSubredditCache,
  pendingSubredditChecks,
  shouldBlock18Plus,
  trackCurrentSubreddit,
} from "../state";
import { log } from "../logger";

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

type AdultFlagEvaluation = {
  flag: boolean;
  reason?: string;
};

const nsfwCommunityReasons = new Map<string, string>();

const COMMUNITY_ROUTE_PATTERNS: Array<{ type: CommunityType; regex: RegExp }> = [
  { type: "subreddit", regex: /^\/r\/([^/]+)/i },
  { type: "user", regex: /^\/user\/([^/]+)/i },
  { type: "user", regex: /^\/u\/([^/]+)/i },
];

const NSFW_FLAG_KEYS = ["isNsfw", "isNSFW", "is_nsfw", "nsfw", "isAdult"];
const OVER18_FLAG_KEYS = ["over18", "over_18", "isOver18", "is_over_18", "isAdult"];

/**
 * Detects whether a recorded blocking reason came solely from an "over18" style flag.
 * We use this to avoid blocking user profiles that merely declare themselves as 18+ adults
 * without explicitly opting into NSFW content.
 */
const isOver18Reason = (reason?: string): boolean =>
  reason ? /over[_]?18/i.test(reason) && !/nsfw/i.test(reason) : false;

const decodeHtmlEntities = (value: string): string =>
  value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

const findTruthyFlagKey = (candidate: Record<string, unknown>, keys: string[]): string | null => {
  for (const key of keys) {
    const value = candidate[key];
    if (value === true || value === "true" || value === 1) {
      return key;
    }
  }
  return null;
};

const evaluateRecordFlag = (
  input: unknown,
  block18Plus: boolean,
  path: string,
): AdultFlagEvaluation => {
  if (!input || typeof input !== "object") {
    return { flag: false };
  }

  const candidate = input as Record<string, unknown>;

  const nsfwKey = findTruthyFlagKey(candidate, NSFW_FLAG_KEYS);
  if (nsfwKey) {
    return { flag: true, reason: `${path}.${nsfwKey}` };
  }

  if (!block18Plus) {
    return { flag: false };
  }

  const overKey = findTruthyFlagKey(candidate, OVER18_FLAG_KEYS);
  if (overKey) {
    return { flag: true, reason: `${path}.${overKey}` };
  }

  return { flag: false };
};

const evaluatePayloadAdultFlag = (
  payload: CommunityAboutResponse | null,
  block18Plus: boolean,
): AdultFlagEvaluation => {
  if (!payload?.data || typeof payload.data !== "object" || payload.data === null) {
    return { flag: false };
  }

  const data = payload.data as Record<string, unknown>;
  const dataEval = evaluateRecordFlag(data, block18Plus, "data");
  if (dataEval.flag) {
    return dataEval;
  }

  const nestedCandidates: unknown[] = [];

  if (typeof data.profile === "object" && data.profile) {
    nestedCandidates.push(data.profile);
  }

  if (typeof data.subreddit === "object" && data.subreddit) {
    nestedCandidates.push(data.subreddit);
  }

  for (const [index, candidate] of nestedCandidates.entries()) {
    const label = index === 0 && data.profile === candidate ? "data.profile" : "data.subreddit";
    const evaluation = evaluateRecordFlag(candidate, block18Plus, label);
    if (evaluation.flag) {
      return evaluation;
    }
  }

  return { flag: false };
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

const redditPageDataIndicatesAdult = (block18Plus: boolean): AdultFlagEvaluation => {
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

      for (const [index, candidate] of containers.entries()) {
        const label =
          index === 0
            ? "page"
            : index === 1 && parsedRecord.profile === candidate
              ? "page.profile"
              : "page.subreddit";
        const evaluation = evaluateRecordFlag(candidate, block18Plus, label);
        if (evaluation.flag) {
          return evaluation;
        }
      }
    } catch {
      if (decoded.includes('"isNsfw":true') || decoded.includes('"isNSFW":true')) {
        return { flag: true, reason: 'page string match "isNsfw":true' };
      }

      if (
        block18Plus &&
        (decoded.includes('"over18":true') ||
          decoded.includes('"over_18":true') ||
          decoded.includes('"isOver18":true') ||
          decoded.includes('"isAdult":true'))
      ) {
        return { flag: true, reason: 'page string match "over18":true' };
      }
    }
  }

  return { flag: false };
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
      const evaluation = evaluatePayloadAdultFlag(payload, block18Plus);
      const normalized =
        community.type === "user" && isOver18Reason(evaluation.reason)
          ? { flag: false, reason: evaluation.reason }
          : evaluation;

      nsfwSubredditCache.set(cacheKey, normalized.flag);
      if (normalized.flag) {
        nsfwCommunityReasons.set(cacheKey, normalized.reason ?? "metadata");
      } else {
        nsfwCommunityReasons.delete(cacheKey);
      }

      if (normalized.flag && community.type === "user" && CONFIG.debugMode) {
        log(
          `[Guard Your Mind] blocked user "${community.name}" via community metadata (${normalized.reason ?? "unknown reason"}) (${community.aboutPath})`,
        );
      }

      if (normalized.flag && community.type === "subreddit") {
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

  const logUserBlock = (reason: string): void => {
    if (community?.type === "user" && CONFIG.debugMode) {
      log(`[Guard Your Mind] blocked user "${community.name}" via ${reason}`);
    }
  };

  const setCommunityReason = (reason: string): void => {
    if (community) {
      nsfwCommunityReasons.set(community.storageKey, reason);
    }
  };

  if (community?.type === "subreddit" && blockedSubreddits.has(community.storageKey)) {
    return true;
  }

  if (community) {
    const pageEval = redditPageDataIndicatesAdult(block18Plus);
    const normalized =
      community.type === "user" && isOver18Reason(pageEval.reason)
        ? { flag: false, reason: pageEval.reason }
        : pageEval;

    if (normalized.flag) {
      nsfwSubredditCache.set(community.storageKey, true);
      setCommunityReason(normalized.reason ?? "page data");
      logUserBlock(normalized.reason ?? "reddit-page-data flag");
      trackSubreddit("reddit-page-data flag");
      return true;
    }
  }

  const body = document.body;
  if (
    block18Plus &&
    community?.type === "subreddit" &&
    (body?.dataset.over18 === "true" || body?.dataset.isOver18 === "true")
  ) {
    setCommunityReason("body dataset over18");
    logUserBlock("body dataset flag");
    trackSubreddit("reddit-page-data flag");
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
    setCommunityReason("shreddit-app route nsfw");
    logUserBlock("shreddit-app attributes (route nsfw)");
    trackSubreddit("shreddit-app attributes");
    return true;
  }

  const hasOver18Flag =
    block18Plus &&
    community?.type === "subreddit" &&
    hasTruthyShredditAttribute(shredditApp, [
      "over18",
      "over-18",
      "data-over18",
      "data-over-18",
      "data-subreddit-over18",
    ]);

  if (hasOver18Flag) {
    setCommunityReason("shreddit-app over18");
    logUserBlock("shreddit-app attributes (over18)");
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
      setCommunityReason("subreddit header badge");
      logUserBlock("subreddit header badge");
      trackSubreddit("subreddit header badge");
      return true;
    }
  }

  const pageTitle = document.title.toLowerCase();
  if (pageTitle.includes("nsfw")) {
    setCommunityReason("page title includes nsfw");
    logUserBlock("page title hint");
    trackSubreddit("page title hint");
    return true;
  }
  if (block18Plus && pageTitle.includes("18+")) {
    setCommunityReason("page title includes 18+");
    logUserBlock("page title hint");
    trackSubreddit("page title hint");
    return true;
  }

  if (community) {
    const cachedNSFW = nsfwSubredditCache.get(community.storageKey);
    if (cachedNSFW) {
      if (community.type === "subreddit") {
        trackSubreddit("subreddit metadata cache");
      }
      const reason = nsfwCommunityReasons.get(community.storageKey) ?? "cached metadata";
      logUserBlock(reason);
      return true;
    }

    if (cachedNSFW === undefined) {
      scheduleCommunityMetadataCheck(community, block18Plus);
    }
  }

  return false;
};
