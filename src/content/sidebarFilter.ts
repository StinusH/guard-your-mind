type SidebarShadowSelectors = {
  sidebarRecentItem: string;
  sidebarRecentLink: string;
  sidebarHost: string;
};

type SidebarConfig = {
  blankedClass: string;
  placeholderClass: string;
};

type SidebarFilterDependencies = {
  config: SidebarConfig;
  selectors: { shadowDOM: SidebarShadowSelectors };
  blockedSubreddits: Set<string>;
  isBlockingEnabled: () => boolean;
  extractSubredditFromHref: (href: string) => string | null;
  createSidebarPlaceholder: (subreddit: string) => HTMLElement;
  isDebugEnabled: () => boolean;
  log: (...args: unknown[]) => void;
};

export type SidebarFilterController = {
  triggerRefresh: () => void;
  observeSidebarDOM: () => void;
  resetState: () => void;
};

const ORIGINAL_DISPLAY_DATA_KEY = "gymOriginalDisplay";

export function createSidebarFilter(deps: SidebarFilterDependencies): SidebarFilterController {
  const {
    config,
    selectors,
    blockedSubreddits,
    isBlockingEnabled,
    extractSubredditFromHref,
    createSidebarPlaceholder,
    isDebugEnabled,
    log,
  } = deps;

  let lastSidebarState = "";
  let pendingSidebarRefresh = false;
  let sidebarObserver: MutationObserver | null = null;
  let sidebarShadowRoot: ShadowRoot | null = null;

  const debugLog = (...args: unknown[]): void => {
    if (isDebugEnabled()) {
      log(...args);
    }
  };

  const hideSidebarLink = (link: HTMLAnchorElement): void => {
    if (!link.dataset[ORIGINAL_DISPLAY_DATA_KEY]) {
      link.dataset[ORIGINAL_DISPLAY_DATA_KEY] = link.style.display || "";
    }

    link.style.setProperty("display", "none", "important");
    link.setAttribute("aria-hidden", "true");
    link.setAttribute("tabindex", "-1");
  };

  const showSidebarLink = (link: HTMLAnchorElement): void => {
    const originalDisplay = link.dataset[ORIGINAL_DISPLAY_DATA_KEY] ?? "";
    if (originalDisplay) {
      link.style.display = originalDisplay;
    } else {
      link.style.removeProperty("display");
    }
    link.removeAttribute("aria-hidden");
    link.removeAttribute("tabindex");
    delete link.dataset[ORIGINAL_DISPLAY_DATA_KEY];
  };

  const applySidebarPlaceholderToItem = (
    listItem: HTMLElement,
    link: HTMLAnchorElement | null,
    subreddit: string,
  ): void => {
    const normalized = subreddit.toLowerCase();
    const existingSubreddit = listItem.getAttribute("data-blocked-subreddit");

    if (existingSubreddit === normalized && listItem.classList.contains(config.placeholderClass)) {
      if (link) {
        hideSidebarLink(link);
      }
      return;
    }

    listItem.classList.add(config.placeholderClass, config.blankedClass);
    listItem.setAttribute("data-blocked-subreddit", normalized);
    listItem.setAttribute("data-blocked-subreddit-display", subreddit);

    const existingPlaceholder = listItem.querySelector<HTMLElement>(
      `.${config.placeholderClass}-content`,
    );
    if (!existingPlaceholder) {
      const placeholderContent = createSidebarPlaceholder(subreddit);
      listItem.appendChild(placeholderContent);
    } else {
      existingPlaceholder.setAttribute("data-placeholder-subreddit", normalized);
    }

    if (link) {
      hideSidebarLink(link);
    }
  };

  const clearSidebarPlaceholderFromItem = (
    listItem: HTMLElement,
    link: HTMLAnchorElement | null,
  ): void => {
    if (!listItem.classList.contains(config.placeholderClass)) {
      return;
    }

    const placeholderContent = listItem.querySelector<HTMLElement>(
      `.${config.placeholderClass}-content`,
    );
    if (placeholderContent) {
      placeholderContent.remove();
    }

    listItem.classList.remove(config.placeholderClass, config.blankedClass);
    listItem.removeAttribute("data-blocked-subreddit");
    listItem.removeAttribute("data-blocked-subreddit-display");

    if (link) {
      showSidebarLink(link);
    }
  };

  const filterSidebarRecentPages = (shadowRoot: ShadowRoot): void => {
    if (!isBlockingEnabled()) {
      return;
    }

    const rawListItems = Array.from(
      shadowRoot.querySelectorAll<HTMLElement>(selectors.shadowDOM.sidebarRecentItem),
    );
    const processedItems: Array<{ listItem: HTMLElement; link: HTMLAnchorElement | null }> = [];
    const handledBlocked = new Set<string>();

    rawListItems.forEach((listItem) => {
      const link = listItem.querySelector<HTMLAnchorElement>(selectors.shadowDOM.sidebarRecentLink);
      const hasPlaceholder = listItem.classList.contains(config.placeholderClass);

      if (!hasPlaceholder && !link) {
        return;
      }

      processedItems.push({ listItem, link });
    });

    for (let index = 0; index < processedItems.length; index += 1) {
      const { listItem, link } = processedItems[index];
      const href = link?.getAttribute("href") ?? "";
      const extracted = href ? extractSubredditFromHref(href) : null;
      const existingPlaceholder = listItem.getAttribute("data-blocked-subreddit") ?? "";
      const normalized = (extracted ?? existingPlaceholder)?.toLowerCase() ?? null;
      const hasPlaceholder = listItem.classList.contains(config.placeholderClass);
      const isBlocked = normalized ? blockedSubreddits.has(normalized) : false;
      const displayName = extracted ?? (existingPlaceholder || normalized || "");

      if (isBlocked && normalized) {
        const isFirstOccurrence = !handledBlocked.has(normalized);
        if (!isFirstOccurrence) {
          if (hasPlaceholder) {
            clearSidebarPlaceholderFromItem(listItem, link ?? null);
          } else if (link?.dataset[ORIGINAL_DISPLAY_DATA_KEY]) {
            showSidebarLink(link);
          }
          continue;
        }

        handledBlocked.add(normalized);

        if (!hasPlaceholder || existingPlaceholder !== normalized) {
          applySidebarPlaceholderToItem(listItem, link ?? null, displayName);
        }
        continue;
      }

      if (hasPlaceholder) {
        clearSidebarPlaceholderFromItem(listItem, link ?? null);
      } else if (link && link.dataset[ORIGINAL_DISPLAY_DATA_KEY]) {
        showSidebarLink(link);
      }

      if (!extracted && href && isDebugEnabled()) {
        debugLog(
          `Unrecognized sidebar subreddit href="${href}" text="${link?.textContent?.trim() ?? ""}"`,
        );
      }
    }

    const allSidebarSubs: string[] = [];
    const sidebarDisplay: string[] = [];

    for (let itemIndex = 0; itemIndex < processedItems.length; itemIndex += 1) {
      const { listItem, link } = processedItems[itemIndex];
      if (listItem.classList.contains(config.placeholderClass)) {
        const blockedSubredditDisplay =
          listItem.getAttribute("data-blocked-subreddit-display") ??
          listItem.getAttribute("data-blocked-subreddit") ??
          "unknown";
        allSidebarSubs.push(`[BLOCKED:${blockedSubredditDisplay}]`);
        sidebarDisplay.push(`${blockedSubredditDisplay} (blocked)`);
        continue;
      }

      const href = link?.getAttribute("href") ?? "";
      const extracted = href ? extractSubredditFromHref(href) : null;

      if (extracted) {
        allSidebarSubs.push(extracted);
        sidebarDisplay.push(extracted);
      } else {
        allSidebarSubs.push("[other]");
        sidebarDisplay.push(link?.textContent?.trim() || "other");
      }
    }

    const currentState = allSidebarSubs.join(",");

    if (currentState === lastSidebarState) {
      return;
    }

    lastSidebarState = currentState;

    if (isDebugEnabled()) {
      debugLog(
        `Sidebar (${location.pathname}): ${sidebarDisplay.length} items. Snapshot: ${sidebarDisplay.join(
          " | ",
        )}`,
      );
    }
  };

  const triggerRefresh = (): void => {
    if (sidebarShadowRoot) {
      pendingSidebarRefresh = false;
      filterSidebarRecentPages(sidebarShadowRoot);
      return;
    }

    if (!pendingSidebarRefresh) {
      pendingSidebarRefresh = true;
    }
  };

  const attachObserver = (root: ShadowRoot): void => {
    sidebarObserver = new MutationObserver(() => {
      if (!isBlockingEnabled()) {
        return;
      }
      triggerRefresh();
    });

    sidebarObserver.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["href"],
    });
  };

  const observeSidebarDOM = (): void => {
    if (!isBlockingEnabled()) {
      return;
    }

    const sidebarElement = document.querySelector(selectors.shadowDOM.sidebarHost);

    if (!sidebarElement) {
      if (isDebugEnabled()) {
        debugLog("Sidebar element not found");
      }
      return;
    }

    if (!sidebarElement.shadowRoot) {
      const checkInterval = setInterval(() => {
        if (sidebarElement.shadowRoot) {
          clearInterval(checkInterval);
          sidebarShadowRoot = sidebarElement.shadowRoot;
          triggerRefresh();
          attachObserver(sidebarShadowRoot);
        }
      }, 50);
      return;
    }

    sidebarShadowRoot = sidebarElement.shadowRoot;
    triggerRefresh();
    attachObserver(sidebarShadowRoot);
  };

  const resetState = (): void => {
    lastSidebarState = "";
    if (pendingSidebarRefresh && sidebarShadowRoot) {
      triggerRefresh();
    }
  };

  return {
    triggerRefresh,
    observeSidebarDOM,
    resetState,
  };
}
