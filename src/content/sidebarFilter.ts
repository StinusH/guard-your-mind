import type { ShadowHost } from "../shared/dom";

type SidebarShadowSelectors = {
  sidebarRecentItem: string;
  sidebarRecentLink: string;
  sidebarHost: string;
  communityController?: string;
  communityItem?: string;
  communityItemLink?: string;
  communityItemList?: string;
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
  } = deps;

  let lastSidebarState = "";
  let pendingSidebarRefresh = false;
  let sidebarObserver: MutationObserver | null = null;
  let sidebarShadowRoot: ShadowRoot | null = null;
  let communityObserver: MutationObserver | null = null;
  let communityShadowRoot: ShadowRoot | null = null;
  let communityControllerObserver: MutationObserver | null = null;
  let communityShadowRootPoll: number | null = null;

  const debugLog = (...args: unknown[]): void => {
    if (isDebugEnabled()) {
      console.log("[Guard Your Mind][sidebar]", ...args);
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
    source: "recent" | "community" = "recent",
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
    if (!listItem.getAttribute("role")) {
      listItem.setAttribute("role", "presentation");
    }
    listItem.style.opacity = "0.45";
    listItem.style.pointerEvents = "none";
    listItem.style.userSelect = "none";
    listItem.style.filter = "grayscale(1)";
    listItem.style.transition = "opacity 0.2s ease";

    const existingPlaceholder = listItem.querySelector<HTMLElement>(
      `.${config.placeholderClass}-content`,
    );
    if (!existingPlaceholder || source === "community") {
      const placeholderContent = createSidebarPlaceholder(subreddit);
      listItem.innerHTML = "";
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
    listItem.style.removeProperty("opacity");
    listItem.style.removeProperty("pointer-events");
    listItem.style.removeProperty("user-select");
    listItem.style.removeProperty("filter");
    listItem.style.removeProperty("transition");

    if (link) {
      showSidebarLink(link);
    }
  };

  const filterSidebarRecentPages = (
    shadowRoot: ShadowRoot,
    mode: "recent" | "community" = "recent",
  ): void => {
    if (!isBlockingEnabled()) {
      return;
    }

    const processedItems: Array<{
      listItem: HTMLElement;
      link: HTMLAnchorElement | null;
      source: "recent" | "community";
    }> = [];
    const handledBlocked = new Set<string>();

    const addProcessedItem = (
      listItem: HTMLElement | null,
      link: HTMLAnchorElement | null,
      source: "recent" | "community",
    ): void => {
      if (!listItem) {
        return;
      }

      const hasPlaceholder = listItem.classList.contains(config.placeholderClass);
      if (!hasPlaceholder && !link) {
        return;
      }

      processedItems.push({ listItem, link, source });

      if (source === "community") {
        listItem.classList.add("gym-community-item");
        listItem.dataset.communitySource = "true";
      }
    };

    const recentItems = Array.from(
      shadowRoot.querySelectorAll<HTMLElement>(selectors.shadowDOM.sidebarRecentItem),
    );

    if (mode === "recent") {
      recentItems.forEach((listItem) => {
        const link = listItem.querySelector<HTMLAnchorElement>(
          selectors.shadowDOM.sidebarRecentLink,
        );
        addProcessedItem(listItem, link, "recent");
      });
    } else if (selectors.shadowDOM.communityItem) {
      if (isDebugEnabled()) {
        debugLog(
          `Scanning community list for blocked subs (root: ${shadowRoot.host?.nodeName ?? "unknown"})`,
        );
      }
      const communityItems = Array.from(
        shadowRoot.querySelectorAll<HTMLElement>(selectors.shadowDOM.communityItem),
      );

      communityItems.forEach((communityItem) => {
        const communityItemRoot = (communityItem as ShadowHost | null)?.shadowRoot ?? null;
        const listItem =
          communityItemRoot?.querySelector<HTMLElement>(
            selectors.shadowDOM.communityItemList ?? "li[role='presentation']",
          ) ?? communityItem.querySelector<HTMLElement>("li");
        const link =
          communityItemRoot?.querySelector<HTMLAnchorElement>(
            selectors.shadowDOM.communityItemLink ?? "a[href]",
          ) ?? communityItem.querySelector<HTMLAnchorElement>("a[href]");

        addProcessedItem(listItem ?? communityItem, link ?? null, "community");
      });
    }

    for (let index = 0; index < processedItems.length; index += 1) {
      const { listItem, link, source } = processedItems[index];
      const href = link?.getAttribute("href") ?? "";
      const extracted = href ? extractSubredditFromHref(href) : null;
      const existingPlaceholder = listItem.getAttribute("data-blocked-subreddit") ?? "";
      const normalized = (extracted ?? existingPlaceholder)?.toLowerCase() ?? null;
      const hasPlaceholder = listItem.classList.contains(config.placeholderClass);
      const isBlocked = normalized ? blockedSubreddits.has(normalized) : false;
      const displayName = extracted ?? (existingPlaceholder || normalized || "");

      if (isBlocked && normalized) {
        if (isDebugEnabled()) {
          debugLog(`Blocking ${displayName} from ${source} list`, {
            href,
            hasPlaceholder,
          });
        }
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
        if (isDebugEnabled()) {
          debugLog(`Clearing placeholder for ${displayName} (${source})`);
        }
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

  const runFilters = (): void => {
    if (!isBlockingEnabled()) {
      return;
    }

    attachCommunityObserver();

    if (sidebarShadowRoot) {
      filterSidebarRecentPages(sidebarShadowRoot, "recent");
    }

    if (communityShadowRoot) {
      filterSidebarRecentPages(communityShadowRoot, "community");
    } else if (selectors.shadowDOM.communityController) {
      const controller = document.querySelector(selectors.shadowDOM.communityController);
      const root = (controller as ShadowHost | null)?.shadowRoot;
      if (root) {
        communityShadowRoot = root;
        filterSidebarRecentPages(root, "community");
      }
    }
  };

  const triggerRefresh = (): void => {
    if (sidebarShadowRoot) {
      pendingSidebarRefresh = false;
      runFilters();
      return;
    }

    if (!pendingSidebarRefresh) {
      pendingSidebarRefresh = true;
    }
  };

  /**
   * Attaches MutationObservers to the communities list hosted inside a shadow DOM.
   * Some Reddit builds instantiate the controller first and attach the shadow root later,
   * so we gracefully poll for the shadow root before wiring listeners.
   */
  const attachCommunityObserver = (): void => {
    if (!selectors.shadowDOM.communityController) {
      return;
    }

    const controller = document.querySelector(selectors.shadowDOM.communityController);
    if (!controller) {
      if (!communityControllerObserver && document.body) {
        communityControllerObserver = new MutationObserver(() => {
          const candidate = document.querySelector(selectors.shadowDOM.communityController);
          if (candidate && (candidate as ShadowHost).shadowRoot) {
            communityControllerObserver?.disconnect();
            communityControllerObserver = null;
            attachCommunityObserver();
          }
        });

        communityControllerObserver.observe(document.body, {
          childList: true,
          subtree: true,
        });
      }

      return;
    }

    communityControllerObserver?.disconnect();
    communityControllerObserver = null;

    const controllerHost = controller as ShadowHost | null;
    if (!controllerHost) {
      return;
    }

    if (!controllerHost.shadowRoot) {
      if (communityShadowRootPoll === null && typeof window !== "undefined") {
        communityShadowRootPoll = window.setInterval(() => {
          if (!controllerHost.isConnected) {
            if (communityShadowRootPoll !== null) {
              window.clearInterval(communityShadowRootPoll);
              communityShadowRootPoll = null;
            }
            return;
          }

          if (controllerHost.shadowRoot) {
            if (communityShadowRootPoll !== null) {
              window.clearInterval(communityShadowRootPoll);
              communityShadowRootPoll = null;
            }
            attachCommunityObserver();
          }
        }, 50);
      }
      return;
    }

    if (communityShadowRootPoll !== null && typeof window !== "undefined") {
      window.clearInterval(communityShadowRootPoll);
      communityShadowRootPoll = null;
    }

    const root = controllerHost.shadowRoot;

    communityShadowRoot = root;
    filterSidebarRecentPages(root, "community");

    if (communityObserver) {
      communityObserver.disconnect();
    }

    communityObserver = new MutationObserver(() => {
      if (!isBlockingEnabled()) {
        return;
      }
      filterSidebarRecentPages(root, "community");
    });

    communityObserver.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
    });
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
          attachObserver(sidebarShadowRoot);
          attachCommunityObserver();
          runFilters();
        }
      }, 50);
      return;
    }

    sidebarShadowRoot = sidebarElement.shadowRoot;
    attachObserver(sidebarShadowRoot);
    attachCommunityObserver();
    runFilters();
  };

  const resetState = (): void => {
    lastSidebarState = "";
    pendingSidebarRefresh = false;
    runFilters();
  };

  return {
    triggerRefresh,
    observeSidebarDOM,
    resetState,
  };
}
