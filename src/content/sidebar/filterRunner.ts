import type { ShadowHost } from "../../shared/dom";
import {
  applySidebarPlaceholderToItem,
  clearSidebarPlaceholderFromItem,
  showSidebarLink,
  type SidebarPlaceholderConfig,
} from "./placeholders";

export type SidebarShadowSelectors = {
  sidebarRecentItem: string;
  sidebarRecentLink: string;
  sidebarHost: string;
  communityController?: string;
  communityItem?: string;
  communityItemLink?: string;
  communityItemList?: string;
};

type FilterMode = "recent" | "community";

type FilterContext = {
  config: SidebarPlaceholderConfig;
  selectors: SidebarShadowSelectors;
  blockedSubreddits: Set<string>;
  extractSubredditFromHref: (href: string) => string | null;
  createSidebarPlaceholder: (subreddit: string) => HTMLElement;
  isBlockingEnabled: () => boolean;
  isDebugEnabled: () => boolean;
  debugLog: (...args: unknown[]) => void;
};

type ProcessedItem = {
  listItem: HTMLElement;
  link: HTMLAnchorElement | null;
  source: FilterMode;
};

export type FilterResult = {
  snapshot: string;
  display: string[];
};

const collectProcessedItems = (
  shadowRoot: ShadowRoot,
  mode: FilterMode,
  context: FilterContext,
): ProcessedItem[] => {
  const processedItems: ProcessedItem[] = [];

  const addProcessedItem = (
    listItem: HTMLElement | null,
    link: HTMLAnchorElement | null,
    source: FilterMode,
  ): void => {
    if (!listItem) {
      return;
    }

    const hasPlaceholder = listItem.classList.contains(context.config.placeholderClass);
    if (!hasPlaceholder && !link) {
      return;
    }

    processedItems.push({ listItem, link, source });

    if (source === "community") {
      listItem.classList.add("gym-community-item");
      listItem.dataset.communitySource = "true";
    }
  };

  if (mode === "recent") {
    const recentItems = Array.from(
      shadowRoot.querySelectorAll<HTMLElement>(context.selectors.sidebarRecentItem),
    );

    recentItems.forEach((listItem) => {
      const link = listItem.querySelector<HTMLAnchorElement>(context.selectors.sidebarRecentLink);
      addProcessedItem(listItem, link, "recent");
    });
    return processedItems;
  }

  if (!context.selectors.communityItem) {
    return processedItems;
  }

  if (context.isDebugEnabled()) {
    context.debugLog(
      `Scanning community list for blocked subs (root: ${shadowRoot.host?.nodeName ?? "unknown"})`,
    );
  }

  const communityItems = Array.from(
    shadowRoot.querySelectorAll<HTMLElement>(context.selectors.communityItem),
  );

  communityItems.forEach((communityItem) => {
    const communityItemRoot = (communityItem as ShadowHost | null)?.shadowRoot ?? null;
    const listItem =
      communityItemRoot?.querySelector<HTMLElement>(
        context.selectors.communityItemList ?? "li[role='presentation']",
      ) ?? communityItem.querySelector<HTMLElement>("li");
    const link =
      communityItemRoot?.querySelector<HTMLAnchorElement>(
        context.selectors.communityItemLink ?? "a[href]",
      ) ?? communityItem.querySelector<HTMLAnchorElement>("a[href]");

    addProcessedItem(listItem ?? communityItem, link ?? null, "community");
  });

  return processedItems;
};

export const filterSidebarContent = (
  shadowRoot: ShadowRoot,
  mode: FilterMode,
  context: FilterContext,
): FilterResult | null => {
  if (!context.isBlockingEnabled()) {
    return null;
  }

  const processedItems = collectProcessedItems(shadowRoot, mode, context);
  const handledBlocked = new Set<string>();

  for (let index = 0; index < processedItems.length; index += 1) {
    const { listItem, link, source } = processedItems[index];
    const href = link?.getAttribute("href") ?? "";
    const extracted = href ? context.extractSubredditFromHref(href) : null;
    const existingPlaceholder = listItem.getAttribute("data-blocked-subreddit") ?? "";
    const normalized = (extracted ?? existingPlaceholder)?.toLowerCase() ?? null;
    const hasPlaceholder = listItem.classList.contains(context.config.placeholderClass);
    const isBlocked = normalized ? context.blockedSubreddits.has(normalized) : false;
    const displayName = extracted ?? (existingPlaceholder || normalized || "");

    if (isBlocked && normalized) {
      if (context.isDebugEnabled()) {
        context.debugLog(`Blocking ${displayName} from ${source} list`, {
          href,
          hasPlaceholder,
        });
      }

      const isFirstOccurrence = !handledBlocked.has(normalized);
      if (!isFirstOccurrence) {
        if (hasPlaceholder) {
          clearSidebarPlaceholderFromItem(listItem, link ?? null, context.config);
        } else if (link?.dataset) {
          showSidebarLink(link);
        }
        continue;
      }

      handledBlocked.add(normalized);

      if (!hasPlaceholder || existingPlaceholder !== normalized) {
        applySidebarPlaceholderToItem(
          listItem,
          link ?? null,
          displayName,
          context.config,
          context.createSidebarPlaceholder,
        );
      }
      continue;
    }

    if (hasPlaceholder) {
      if (context.isDebugEnabled()) {
        context.debugLog(`Clearing placeholder for ${displayName} (${source})`);
      }
      clearSidebarPlaceholderFromItem(listItem, link ?? null, context.config);
    } else if (link && link.dataset) {
      showSidebarLink(link);
    }

    if (!extracted && href && context.isDebugEnabled()) {
      context.debugLog(
        `Unrecognized sidebar subreddit href="${href}" text="${link?.textContent?.trim() ?? ""}"`,
      );
    }
  }

  const allSidebarSubs: string[] = [];
  const sidebarDisplay: string[] = [];

  for (let itemIndex = 0; itemIndex < processedItems.length; itemIndex += 1) {
    const { listItem, link } = processedItems[itemIndex];
    if (listItem.classList.contains(context.config.placeholderClass)) {
      const blockedSubredditDisplay =
        listItem.getAttribute("data-blocked-subreddit-display") ??
        listItem.getAttribute("data-blocked-subreddit") ??
        "unknown";
      allSidebarSubs.push(`[BLOCKED:${blockedSubredditDisplay}]`);
      sidebarDisplay.push(`${blockedSubredditDisplay} (blocked)`);
      continue;
    }

    const href = link?.getAttribute("href") ?? "";
    const extracted = href ? context.extractSubredditFromHref(href) : null;

    if (extracted) {
      allSidebarSubs.push(extracted);
      sidebarDisplay.push(extracted);
    } else {
      allSidebarSubs.push("[other]");
      sidebarDisplay.push(link?.textContent?.trim() || "other");
    }
  }

  return {
    snapshot: allSidebarSubs.join(","),
    display: sidebarDisplay,
  };
};
